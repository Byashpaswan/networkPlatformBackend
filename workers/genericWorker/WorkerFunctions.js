require("dotenv").config({ path: ".env" });
require("../../db/connection");
const debug = require("debug")("darwin:mainWorker:WorkerStore");
const offerController = require('../../controllers/offer/Offer')
const platformController = require('../../controllers/platform/Platform');
const Promise = require("promise");
const Mongoose = require("mongoose");
const mongooseObjectId = Mongoose.Types.ObjectId;
const moment = require("moment");

/**
 * import files for scraaping worker
 */
const ApplicationDetailsModel = require("../../db/applicationDetails/ApplicationDetails");
const storeData = require("../../helpers/StoreData");

/**
 * import files for apply offer worker
 */
const { applyPlugin, singleOfferApiPlugins } = require("../../plugin");

/**
 * import files for wishlist worker
 */
const wishlistModel = require("../../db/wishlist");
const Network = require("../../db/network/Network");
const rejectedAppIdModal = require("../../db/rejectedAppId");
const WishlistParseController = require("../../controllers/wishlist/wishlistParse");
const Redis = require("../../helpers/Redis");

/**
 * import files for new platform api worker
 */
const { apiPlugins } = require("../../plugin");

/**
 * import files for download center worker
 */
const DownloadCenterModel = require('../../db/DownloadCenterModel');
const Download = require('../../helpers/export/download');

/**
 * import files for push bulk offer worker
 */
const OfferModel = require('../../db/offer/Offer');
const { publishJobForWebhook } = require('../../helpers/Functions');
const helperFunctions = require('../../helpers/Functions');

const { PlatformTypeModel,PlatformModel } = require('../../db/platform/Platform');
const { syncAndUpdateOfferFromAPi } = require('../../plugin/fetchSingleOffer');

const CategoriesModel = require('../../db/Categories');

const blockOfferModel = require('../../db/offer/BlockOffer');

const BATCHSIZE = 1000;
const generalFunction = require('../../helpers/generalFunction')
const processAppIDScraping = async (appIdObject, categories, newCategories) => {

  let data = {};
  const maxNotFoundCount = 30;
  try {
    if (storeData.isNumeric(appIdObject.app_id)) {
      data = await storeData.iosStoreData(appIdObject.app_id, appIdObject.country);
    } else {
      data = await storeData.androidStoreData(appIdObject.app_id, appIdObject.country);
    }
  } catch (error) {
    debug(error);
    return;
  }

  let filter = { _id: mongooseObjectId(appIdObject._id) };

  if (data.message && (data.message == "getaddrinfo EAI_AGAIN itunes.apple.com" || data.message == "Error: getaddrinfo EAI_AGAIN play.google.com")) {
    console.log("Please check your internet connection...", data.message);
    return;
    } else if ((data.message && data.message == "App not found (404)") || (data.statusCode && data.statusCode == 404)) {
    try {
      let projection = { not_found_count: 1 };
      let options = {};
      let result = await ApplicationDetailsModel.getApplicationDetails(filter, projection, options);

      if (result && result[0] && result[0]["not_found_count"] < maxNotFoundCount) {
        await ApplicationDetailsModel.updateApplicationDetails(filter, { $inc: { not_found_count: 1 } });
      } else {
        await ApplicationDetailsModel.updateApplicationDetails(filter, { not_found: true  , is_published : true });
      }
      console.log(appIdObject.app_id, "not found !!");
      return;
    } catch (error) {
      debug(error);
      return;
    }
  } else if (!data.app_id) {
    try {
      await ApplicationDetailsModel.updateApplicationDetails(filter, { not_found: true, is_incorrect_app_id: true });
    } catch (error) {
      debug(error);
      return;
    }
    console.log("Something went wrong while processing", appIdObject.app_id, "app_id...");
    console.log("Error", data);
    return;
  }
  try {
    data["not_found_count"] = 0;
    data["not_found"] = false;
    data['is_published'] = true  ;

    if (!(categories.includes(data['category'].toLowerCase()) || newCategories.includes(data['category'].toLowerCase()))) {
      newCategories.push(data['category'].toLowerCase());
    }

    let result = await ApplicationDetailsModel.updateApplicationDetails(filter, { $set: data, $inc: { __v: 1 } });
    if (result) {
      console.log(data.app_id, "Scraping updated !!");
      return;
    } else {
      console.log(filter._id, "not found in your database !!");
      return;
    }
  } catch (error) {
    debug(error);
    return;
  }
}

const saveCategories = async (newCategories) => {
  let categories = [];
  for (let category of newCategories) {
    categories.push({
      name: category,
      type: 'offer',
      status: 1
    });
  }
  await CategoriesModel.insertMany(categories);
}

exports.applyOfferFromUi = async (workerData)=>{
  return new Promise(async (resolve, reject)=>{
    try{
      let platformTypeData = await PlatformTypeModel.getPlatformTypes({singleApply : true}, { _id :  1 }, {});
        if(platformTypeData && platformTypeData.length){
          for(let i=0; i<platformTypeData.length; i++){
            let platforms = await PlatformModel.getPlatform({ platform_id : mongooseObjectId(platformTypeData[i]['_id']), status : '1'},{},{});
              if(platforms && platforms.length){
                for(let j = 0; j < platforms.length; j++){
                  let obj = platforms[j];
                  let advertiserData = await generalFunction.getAdvertiser(obj.advertiser_id);
                  if(advertiserData && advertiserData['status'] != 'Active'){
                    continue;
                  }
                    if(obj['autoApply']){
                      let credentials = {};
                      obj.credentials.map(apiCredentials => {
                        credentials[apiCredentials.key] = apiCredentials.val;
                      })
                      if(obj.credentials.length > 0 ){                        
                      let offerList = await OfferModel.getSearchOffer({ _id :  { $in : workerData }, advertiser_platform_id: obj._id, network_id: obj.network_id, advertiser_id: obj.advertiser_id }, { advertiser_offer_id: 1, _id: 1, app_id: 1, plty : 1 }, {});
                      if(offerList && offerList.length){
                        let content = {};
                        content['network_id'] = obj.network_id;
                        content['advertiser_id'] = obj.advertiser_id;
                        content['advertiser_name'] = obj.advertiser_name;
                        content['platform_id'] = obj.platform_id;
                        content['advertiser_platform_id'] = obj._id;
                        content['platform_name'] = obj.platform_name;
                        content['credentials'] = credentials;
                        content['payout_percent'] = obj.payout_percent;                                    
                        content['visibility_status'] = obj.offer_visibility_status;
                        let data = [];                        
                        for(let offer of offerList){
                          data.push({ 'k' : offer._id, 'v' : offer.advertiser_offer_id, 'plty' : offer.plty });
                          if(data.length >= 20){
                            content['offer_data'] = data;                                               
                            await helperFunctions.sendJobToGenericWorker({ workerName: "applyOffers", workerData: content }, priority = 10);
                            data = [];
                          }
                        }                                        
                        if(data && data.length){
                          content['offer_data'] = data;
                          await helperFunctions.sendJobToGenericWorker({ workerName: "applyOffers", workerData: content }, priority = 10);
                          data = [];
                        }
                      }
                    }
                  }
                }
              }
            }
          }  
      return resolve(true);
    }catch(error){
      console.log(" error applyOffer from ui generic worker function ", error)
    }
  })
}
exports.syncOfferFromCron = async (workerData) => {
  return new Promise(async(resolve, reject) => {
    try{
      let offer_ids  = [];
      let jobPriority = 14;

      if(workerData && Object.keys(workerData).length > 0 ){
        let redisKey = `SYNC_PLT_ID:${workerData.network_id}:${workerData.platform_id}`
        let redisData  = await Redis.getRedisSetLength(redisKey);
        let redisIndex = 1;
        if(redisData.data && +redisData.data > 0 ){
          return resolve(true);
        } 
        let OneHr = moment().subtract(1, 'hours').startOf('hour').toDate();
        let offerCursor = await OfferModel.find(workerData, { _id: 1, appliedTime : 1 , syncTime : 1, advertiser_platform_id : 1, advertiser_id: 1}).cursor();

        for(let offer = await offerCursor.next(); offer != null; offer = await offerCursor.next()){
          let flag  = true;
          if(flag && offer.appliedTime && moment(offer.appliedTime).isBefore(workerData.dateFrom)){
            flag = false;
          }
          if(flag && offer.appliedTime && moment(offer.appliedTime).isAfter(OneHr)){
            flag = false;
          }
          if(flag && offer.syncTime && moment(offer.syncTime).isAfter(OneHr)){
            flag = false;
          }
          let advertiserData = await generalFunction.getAdvertiser(offer.advertiser_id);
          if(advertiserData && advertiserData['status'] == 'Active'){
            let platformData = await generalFunction.getPlatform(offer.advertiser_platform_id);
            if(platformData && platformData['status'] == '1'){
              if(flag){
                offer_ids.push(offer['_id'].toString());
              }
            }
          }

          if(offer_ids.length >= 20 ){
            let content  = {
              workerName: "syncOffer",
              workerData: offer_ids,
              // redisKey: redisKey,
              redisIndex:redisIndex,
              network_id : workerData['network_id'],
              platform_id : workerData['platform_id']
            }
            await helperFunctions.sendJobToGenericWorker(content, jobPriority);
            await Redis.setRedisSetData(redisKey, redisIndex, 86400);
            redisIndex++;
            offer_ids = [];
          }
        }
        if(offer_ids.length > 0 ){
          let content = {
            workerName: "syncOffer",
            workerData: offer_ids,
            // redisKey: redisKey,
            redisIndex:redisIndex,
            network_id : workerData['network_id'],
            platform_id : workerData['platform_id']
          }
          await helperFunctions.sendJobToGenericWorker(content, jobPriority);
          redisIndex++;
        }
        return resolve(true);
      }else{
        return resolve(true);
      }
    }catch(err){
      console.log("err", err);
      return resolve(true);
    }
  })
}

exports.runScrapAppidData = async workerData => {
  console.log("runScrapAppidData => workerData", workerData);
  return new Promise(async (resolve, reject) => {
    try {
      if (workerData.length > 0) {
        let categories = await CategoriesModel.getDistinctCategories({ type: 'offer' }, 'name');
        let newCategories = [];

        for (const appIdObject of workerData) {
          await processAppIDScraping(appIdObject, categories, newCategories);

          if (newCategories.length >= BATCHSIZE) {
            await saveCategories(newCategories);
            categories = categories.concat(newCategories);
            newCategories = [];
          }
        }

        if (newCategories.length) {
          await saveCategories(newCategories);
          categories = categories.concat(newCategories);
        }

        return resolve(true);
      } else {
        return resolve(false);
      }
    } catch (error) {
      debug(error);
      return resolve(false);
    }
  });
};

exports.runApplyOfferWorker = async workerData => {
  // console.log("runApplyOfferWorker => workerData", workerData)

  return new Promise(async (resolve, reject) => {
    try {
      let content = workerData; //JSON.parse(msg.content.toString());
      // console.log("file: WorkerFunctions.js ~ line 159 ~ runApplyOfferWorker ~ workerData ====> ", workerData)
      let ackMsg = false;
      if (content && Object.keys(content).length) {
        // console.log("file: WorkerFunctions.js ~ line 163 ~ runApplyOfferWorker ~ jobContent.platform_name", content.platform_name)
        if (content.platform_name && applyPlugin[content.platform_name.trim()] && content.credentials && Object.keys(content.credentials).length) {
          try {
            ackMsg = await applyPlugin[content.platform_name.trim()].ApplyApiCall(content);
              if(content.index){
                await Redis.removeRedisSetMember(`APPLY_PLT_ID:${content.advertiser_platform_id}`,content.index);
              }
              if(content.index2){ // apply offer by genericWorkerRedis  when upload wishlist from darwin.
                await Redis.removeRedisSetMember(`APPLY_PLT_ID_WISHLIST:${content.advertiser_platform_id}`,content.index2);
              }
              if(content.jumbo_index){ // apply offer by genericWorkerRedis  when upload wishlist from jumbo.
                await Redis.removeRedisSetMember(`APPLY_PLT_ID_WISHLIST_FROM_JUMBO:${content.advertiser_platform_id}`,content.jumbo_index);
              }
              if(content.jumbo){
                await Redis.removeRedisSetMember(`APPLY_PLT_ID2:${content.network_id}` , content.advertiser_platform_id + content.jumbo );
              }
            // console.log("file: WorkerFunctions.js ~ line 167 ~ runApplyOfferWorker ~ ackMsg", ackMsg)
          } catch (e) {
            debug(e);
            return resolve(false);
          }
        }
        else {
          ackMsg = "Api Not Ready OR credentials not Provided!!";
          return resolve(ackMsg);
        }
      }
      return resolve(ackMsg);
    } catch (error) {
      debug(error);
      return resolve(false);
    }
  });
};

exports.runWishlistWorker = async workerData => {
  // console.log("runWishlistWorker => workerData", workerData)

  return new Promise(async (resolve, reject) => {
    try {
      let content = workerData; //JSON.parse(msg.content.toString());
      // console.log("file: WorkerFunctions.js ~ line 199 ~ returnnewPromise ~ content", content)
      if (content && content.app_id && content.network_id) {
        let app_id = content.app_id.toString();

        let appIdCountRedisKey = `WLSTAPPCNT:${app_id}`;
        let appIdCount = await Redis.getRedisHashMultipleData(appIdCountRedisKey);
        // console.log("file: WorkerFunctions.js ~ line 204 ~ returnnewPromise ~ appIdCount", appIdCount)
        if (appIdCount.data && appIdCount.data['allCnt'] > 2) {
          let result = await rejectedAppIdModal.searchAppId({ app_id: app_id });
          if (result.length <= 0) {
            let networkList = await Network.findAllNetwork({}, { _id: 1 });
            for (const netObj of networkList) {
              // console.log("file: WorkerFunctions.js ~ line 211 ~ returnnewPromise ~ networkId", netObj)
              let appIdExits = await Redis.checkMemberInRedisSet('WISHLIST:' + netObj._id.toString(), app_id);
              if (!appIdExits.data) {
                let isExistsInDb = await wishlistModel.findOne({ network_id : netObj._id , app_id : app_id});
                if(isExistsInDb){
                  return resolve(true);
                }
                let result = await wishlistModel.insertManyAppIds({ network_id: netObj._id, app_id: app_id, test: false, liveType: "script" });
                // console.log("file: WorkerFunctions.js ~ line 212 ~ returnnewPromise ~ result", result)
                if (result) {
                  Redis.delRedisData('WISHLIST:' + netObj._id.toString())
                  await WishlistParseController.processWishlistOffers([app_id], netObj._id, (setIsMyOfferFlagTo = true));
                }
                else {
                  console.log("Wishlist Worker, Not added in wishlist ", err);
                }
              }
            }
          }
        }
      }
      return resolve(true);
    } catch (e) {
      debug(e);
      return resolve(false);
    }
  });
};

exports.runReUploadWishlistWorker = async workerData => {
  console.log("runReUploadWishlistWorker Worker start ============>")
  return new Promise(async (resolve, reject) => {
    try {
      const daysBeforeNow = 3;
      let content = workerData;

      if (content && Array.isArray(content) && content.length) {
        let date_range = moment().subtract(daysBeforeNow, "d").toDate(); // 3 days
        for (let tmpObj of content) {
          await WishlistParseController.addOffersToWebhook(tmpObj.network_id, [tmpObj.app_id], date_range, "Upload from Jumbo");
        }
        return resolve(true);
      }
    } catch (error) {
      console.log("file: WorkerFunctions.js ~ line 265 ~ returnnewPromise ~ error", error)
      return reject(false);
    }
  });
};

exports.processReUploadedWishListScheduler = async workerData => {
  console.log("processReUploadedWishListScheduler Worker start ============>")
  return new Promise(async (resolve, reject) => {
    try {
      const daysBeforeNow = 3000;
      let content = workerData;

      if (content && content.network_id && content.appIds.length) {
        let date_range = moment().subtract(daysBeforeNow, "d").toDate(); // 3 days
        for (const appid of content.appIds) {
          await WishlistParseController.addOffersToWebhook(content.networkId, [appid], date_range, "Upload from Jumbo");
        }
      }
      return resolve(true);
    } catch (error) {
      console.log("file: WorkerFunctions.js ~ line 265 ~ returnnewPromise ~ error", error)
      return reject(false);
    }
  });
};

exports.runUploadWishlistWorker = async workerData => {
  console.log("runUploadWishlistWorker Worker start ============>")
  return new Promise(async (resolve, reject) => {
    try {
      const daysBeforeNow = 3;
      const DATE_RANGE = process.env.MY_OFFER_DATE_RANGE || 7;
      let content = workerData;

      if (content && content.network_id) {
        let network_id = content.network_id;
        let uploadedAppId = content.uploadedAppId;
        let removeWishlistIds = content.removeWishlistIds;
        let webhookPushStatus = content.webhookPushStatus;

        // for new offer only and all offers to push
        if (webhookPushStatus === "2" || webhookPushStatus === "3") {
          let date_range = moment().subtract(daysBeforeNow, "d").toDate(); // 3 days
          await WishlistParseController.addOffersToWebhook(network_id, uploadedAppId, date_range, "Upload Wishlist");
        }

        // Old strategies
        // await WishlistParseController.applyAndMarkWishlistOffers({
        //   network_id: network_id,
        //   status: 0,
        //   newAppIds: uploadedAppId,
        //   updatedAt: { $gte: moment().subtract(DATE_RANGE, "d").toDate() }
        // });


        // this is marked offer  status_label applied and set status is 3  filter= based on app_id and netId,status 0 , updatedAt
        await WishlistParseController.applyWishlistOffersV2({
          network_id: network_id,
          newAppIds: uploadedAppId,
          updatedAt: { $gte: moment().subtract(DATE_RANGE, "d").toDate() }
        });

        if (removeWishlistIds.length > 0) {
          // Old strategies
          // await WishlistParseController.processWishlistOffers(removeWishlistIds,network_id,(setIsMyOfferFlagTo = false));

           // this make offer unmark isMyoffer false based on app_id and netwId and status 1
          await WishlistParseController.processWishlistOffersV2(removeWishlistIds, network_id, (setIsMyOfferFlagTo = false));
        }
        rejectedAppIdModal.deleteManyAppId({ app_id: { $in: uploadedAppId } });

        // Old strategies
        // await WishlistParseController.processWishlistOffers(uploadedAppId, network_id, true, 1, date_range);
         // this is maked offer isMyoffer true (filter networkId,status 1 and isMyoffer :false)
        await WishlistParseController.processWishlistOffersV2(uploadedAppId, network_id, (setIsMyOfferFlagTo = true));
        return resolve(true);
      }
    } catch (error) {
      debug("file: WorkerFunctions.js ~ line 291 ~ returnnewPromise ~ error", error)
      return reject(false);
    }
  });
};

exports.runNewPlatformApi = async workerData => {
  // console.log("runNewPlatformApi => workerData", workerData)

  return new Promise(async (resolve, reject) => {
    try {
      let content = workerData; //JSON.parse(msg.content.toString());

      if (
        content.platform_name &&
        content.credentials &&
        Object.keys(content.credentials).length
      ) {
        try {
          let ackMsg = null;
          let platform_name = content.platform_name;

          if (apiPlugins[platform_name.trim()]) {
            ackMsg = await apiPlugins[platform_name.trim()].offersApiCall(
              content
            );
          } else {
            ackMsg = "Api Not Ready!!";
          }
          return resolve(ackMsg);
        } catch (e) {
          debug(e);
          return resolve(false);
        }
      } else {
        return resolve(false);
      }
    } catch (error) {
      debug(error);
      return resolve(false);
    }
  });
};

exports.runDownloadCenterWorker = async workerData => {
  let content = workerData;
  return new Promise(async (resolve, reject) => {
    try {
      let filter = { _id: mongooseObjectId(content) };
      let projection = { networkId: 1, userDetails: 1, query: 1, report: 1, downloadId: 1 };
      let result = {};
      let notFoundCount = 1;
      while (notFoundCount <= 3) {
        result = await DownloadCenterModel.findOneDoc(filter, projection, {});
        if (result && result['_id']) {
          notFoundCount = 4;
        } else {
          console.log("===>> Download id " + content + " not found count " + notFoundCount);
          if (notFoundCount < 3) {
            await sleep(10000);
          }
          notFoundCount++;
        }
      }
      if (result && result['_id']) {
        await Download.downloadReport(result);
        return resolve(true);
      } else {
        console.log("===>> Invalid download id " + content);
        return resolve(true);
      }
    } catch (error) {
      debug(error);
      return resolve(false);
    }
  });
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms)); // 10000
}

exports.pushBulkOffer = async (workerData, workerId) => {
  let content = workerData;
  // console.log("file: WorkerFunctions.js ~ line 398 ~ content", content)
  return new Promise(async (resolve, reject) => {
    try {
      if (content && content.networkId && workerId) {
        await Mongoose.connection.db.collection('worker_status').updateOne({ _id: mongooseObjectId(workerId) }, { $set: { status: 'Processing', updatedAt: moment().toDate() } });

        let filter = {};
        if (content.offerId) {
          filter['_id'] = { $in: content.offerId };
        }
        else if (content.search) {
          filter = content.search;
        }
        // console.log("file: WorkerFunctions.js ~ line 415 ~ returnnewPromise ~ filter", filter)

        if (Object.keys(filter).length) {
          let totalProcessedOfferCount = 0;
          let totalOffer = [];
          let cursor = await OfferModel.getOffersByBatch(filter, { '_id': 1 });
          for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
            totalOffer.push(doc['_id']);
            if (totalOffer.length >= 50) {
              let res = await publishJobForWebhook(mongooseObjectId(content.networkId), totalOffer, "offer_update", "Push Offer", 10);
              totalOffer = [];
              if (res) {
                totalProcessedOfferCount += res
                if (totalProcessedOfferCount >= 1000) {
                  await Mongoose.connection.db.collection('worker_status').updateOne({ _id: mongooseObjectId(workerId) }, { $set: { updatedAt: moment().toDate() }, $inc: { count: totalProcessedOfferCount } });
                  totalProcessedOfferCount = 0;
                }
              }
            }
          }
          if (totalOffer.length) {
            let res = await publishJobForWebhook(mongooseObjectId(content.networkId), totalOffer, "offer_update", "Push Offer", 10);
            totalOffer = [];
            if (res) {
              totalProcessedOfferCount += res
            }
          }
          await Mongoose.connection.db.collection('worker_status').updateOne({ _id: mongooseObjectId(workerId) }, { $set: { status: 'Completed', updatedAt: moment().toDate() }, $inc: { count: totalProcessedOfferCount } });
          totalProcessedOfferCount = 0;

          // cursor.on("data", async (doc) => {
          //   // console.log("file: WorkerFunctions.js ~ line 422 ~ cursor.on ~ doc", doc)
          //   totalOffer.push(doc['_id']);
          //   if (totalOffer.length >= 50) {
          //     let tempOfferId = totalOffer;
          //     // console.log("Job pushed in webhook ===========> ", totalOffer.length)
          //     totalOffer = [];
          //     // console.log("file: WorkerFunctions.js ~ line 424 ~ cursor.on ~ totalOffer", totalOffer.length)
          //     await publishJobForWebhook(mongooseObjectId(content.networkId), tempOfferId, "offer_update", "Push Offer", 10);
          //   }
          // });
          // cursor.on("end", async () => {
          //   if (totalOffer.length) {
          //     let tempOfferId = totalOffer;
          //     // console.log("Job pushed in webhook ===========> ", totalOffer.length)
          //     totalOffer = [];
          //     // console.log("file: WorkerFunctions.js ~ line 424 ~ cursor.on ~ totalOffer", totalOffer.length)
          //     await publishJobForWebhook(mongooseObjectId(content.networkId), tempOfferId, "offer_update", "Push Offer", 10);
          //   }
          // });
          // cursor.on("error", async () => {
          //   console.log("Error while publishing offers into webhook...");
          //   if (totalOffer.length) {
          //     let tempOfferId = totalOffer;
          //     // console.log("Job pushed in webhook ===========> ", totalOffer.length)
          //     totalOffer = [];
          //     // console.log("file: WorkerFunctions.js ~ line 424 ~ cursor.on ~ totalOffer", totalOffer.length)
          //     await publishJobForWebhook(mongooseObjectId(content.networkId), tempOfferId, "offer_update", "Push Offer", 10);
          //   }
          // });

        }
      }
      return resolve(true);
    } catch (error) {
      console.log("file: genericWorker/WorkerFunctions.js ~ line 467 ~ pushBulkOffer ~ catch ~ error ~ ", error)
      debug(error);
      return resolve(false);
    }
  });
};

exports.syncOffer = async (workerData, redisIndex = null, redisKey = null, network_id = null, platform_id = null) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (workerData && workerData.length) {
        let credentials = {};
        let payoutPercent = {};
        let res = false ;
        let advPlatRes ;
        // let workId   =  Math.floor(1000 + Math.random() * 9000);
        // let index = 0  ;
        let offer_id = '';
        for(let i = 0; i < workerData.length; i++){
          let doc = await offerController.getOfferData(workerData[i]);
          offer_id = workerData[i];
          if (doc && doc.advertiser_platform_id && !credentials[doc.advertiser_platform_id]) {
            advPlatRes  = await platformController.getAdvertiserPlatformData(doc.advertiser_platform_id);            
            if(advPlatRes && Object.keys(advPlatRes).length > 0 && advPlatRes.status == '0'){              
              continue;
            }
            if(advPlatRes && advPlatRes.credentials){
              credentials[doc.advertiser_platform_id] = advPlatRes['credentials'].reduce((obj, curr) => {
                obj[curr.key] = curr.val;
                return obj;
              }, {});
            }else{
              let status = '', adv_status = '';
              // update status of offer no_link from applied ,
              if(!doc['tracking_link'] || !doc['tracking_link'].trim()){
                adv_status = 0;
                status = 0; 
              }else{
                adv_status = 1;
                // doc status not in  5 , -2
                if(doc['status'] == 5 || doc['status'] == -2 ){
                  status = doc['status'];
                }else{
                  status = 1 
                }
              }
              if(doc['status'] != status || adv_status != doc['adv_status']){
                // update in db 
                // remove offer: redisKey
                let status_label = '';
                if(status == 1 ){
                  status_label = 'active'
                }else if(status == 0 ){
                  status_label = 'no_link'
                }else if(status == 5 ){
                  status_label = 'paused'
                }else if(status == -2){
                  status_label = 'unmanaged';
                }
                await OfferModel.updateStatus({_id : mongooseObjectId(doc._id)}, { status, adv_status, status_label })
                let key = `OFFER:${offer_id}`
                // delete from redis.
                await Redis.delRedisData(key);
              }
              return resolve(true);
            }   

            payoutPercent[doc.advertiser_platform_id] = parseFloat(advPlatRes['payout_percent']);
          }
          let advertiserData = await generalFunction.getAdvertiser(doc.advertiser_id);
          let isActiveAdv = false;
          if(advertiserData && advertiserData['status'] == 'Active'){
            isActiveAdv = true;
          }
          if ( isActiveAdv && doc.network_id && doc.advertiser_id && doc.platform_id && doc.advertiser_name && doc.platform_name && doc.advertiser_platform_id && credentials[doc.advertiser_platform_id]) {
            let content = {
              'network_id': doc.network_id,
              'advertiser_id': doc.advertiser_id,
              'advertiser_name': doc.advertiser_name,
              'platform_id': doc.platform_id,
              'platform_name': doc.platform_name,
              'advertiser_platform_id': doc.advertiser_platform_id,
              'advertiser_offer_id': doc.advertiser_offer_id,
              'payout_percent': payoutPercent[doc.advertiser_platform_id],
              'credentials': credentials[doc.advertiser_platform_id],
              'plty' : doc.plty,
              'nid':doc.nid,
              'plid':doc.plid,
              'visibility_status' : advPlatRes.offer_visibility_status,
              'appidCountData': {},
              'domain' : credentials[doc.advertiser_platform_id]['network_id']
            };
            let oldOfferData = []
            oldOfferData.push(doc)
            await syncAndUpdateOfferFromAPi(content, doc.platform_name, doc.advertiser_offer_id, oldOfferData);
            // console.log(" after sync ", workId ," time -> ", moment().format('HH:mm:ss.SSS'));
          }
        };
        if(redisIndex){
          if(redisKey){
            await Redis.removeRedisSetMember(redisKey, redisIndex);
          }else{
            let redisKey1 = `SYNC_PLT_ID:${network_id}:${platform_id}`
            let redisKey2 = `SYNC_PLT_ID_FILTER:${network_id}:${platform_id}`
            await Redis.removeRedisSetMember(redisKey1,redisIndex);
            let redisData = await Redis.getRedisSetLength(redisKey1);
            if(+redisData.data == 0 ){
              await Redis.delRedisData(redisKey2);
            } 
          }
        }
        return resolve(true);
      }else{
        return resolve(true);
      }
    } catch (error) {
      console.log("sync offer error ==> ", error);
      return resolve(false);
    }
  });
};

exports.autoSyncOffer = async (offerData) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (offerData) {
        await syncAndUpdateOfferFromAPi(offerData, offerData.platform_name, offerData.advertiser_offer_id);
      }
      return resolve(true);
    } catch (error) {
      console.log("sync offer error ==> ", error);
      return resolve(false);
    }
  });
};

exports.wAutoSyncOffer = async (workerData) => {
  // console.log("wAutoSyncOffer => workerData", workerData)

  return new Promise(async (resolve, reject) => {
    try {
      let content = workerData; //JSON.parse(msg.content.toString());
      // console.log("file: WorkerFunctions.js ~ line 159 ~ wAutoSyncOffer ~ workerData ====> ", workerData)
      if (content && Object.keys(content).length) {
        if (content.platform_name && singleOfferApiPlugins[content.platform_name.trim()] && content.credentials && Object.keys(content.credentials).length) {
          let advOfferList = content.advOfLst;
          delete content.advOfLst;
          for (const advOffId of advOfferList) {
            try {
              await syncAndUpdateOfferFromAPi(content, content.platform_name, advOffId);
              await Mongoose.connection.collection('wAutoSync').deleteOne({ _id: mongooseObjectId(content.jobId) });
            } catch (e) {
              debug(e);
            }
          }
        }
      }
    } catch (error) {
      debug(error);
    }
    return resolve(true);
  });
};

// for making offer block  to unblock with help of adv_off_hash
exports.unblockOfferFromAdvOfferHash = async function (workerData) {
  return new Promise(async (resolve, reject) => {
    try {
      let content = workerData; //JSON.parse(msg.content.toString());
      // console.log("file: WorkerFunctions.js ~ line 159 ~ unblockOfferFromAdvOfferHash ~ workerData ====> ", workerData)
      if (content && Object.keys(content).length) {
        let dbRes = await OfferModel.getSearchOffer({ adv_off_hash: content.advOfferHash }, { _id: 1, network_id: 1 });
        for (const doc of dbRes) {
          // console.log("file: WorkerFunctions.js:605 ~ returnnewPromise ~ doc:", doc)
          let result = await OfferModel.updateOffer({ _id: doc._id, isBlacklist: { $gt: 0 } }, { isBlacklist: 0 }, {})
          if (result) {
            await blockOfferModel.deleteManyBlockOffer({ _id: doc._id });
            await Redis.delRedisData(`OFFER:${doc._id.toString()}`);
            await publishJobForWebhook(doc.network_id, doc._id, 'offer_update', "Unblock Offer")
          }
        }
      }
    } catch (error) {
      debug(error);
    }
    return resolve(true);
  });
}