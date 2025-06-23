const Mongoose = require('mongoose');
const mongooseObjectId = Mongoose.Types.ObjectId;
const Response = require('../../helpers/Response');
const wishlistModel = require('../../db/wishlist');
const moment = require('moment');
const Redis = require('../../helpers/Redis')
const { payloadType } = require('../../constants/config');
const { publishJobForWebhookV2 } = require("../../helpers/Functions");
const Promise = require('promise');
const debug = require("debug")("darwin:Controllers:Wishlist");
const offerModel = require('../../db/offer/Offer');
const NetworkModel = require("../../db/network/Network");
const WorkerStatusModel = require('../../db/WorkerStatus');
const platformController  = require('../../controllers/platform/Platform');
const { PlatformModel } = require('../../db/platform/Platform');
const generalFunction = require("../../helpers/generalFunction");
const helperFunctions = require("../../helpers/Functions");
exports.wishlistParserFromJumbo = async (req, res) => {

  try {
    if (!req.body || !req.body.wishlistData || !req.body.webhookPushStatus || !req.body.wishlistData.length) {
      let response = Response.error();
      response.msg = "Send proper wishlist";
      return res.status(200).json(response);
    }

    let resultMsg = await this.uploadWishListFromJumbo(req.body.wishlistData, req.body.webhookPushStatus, req.body.userDetail);
    let response = Response.success();
    response.payloadType = payloadType.array;
    response.payload = resultMsg.payload;
    response.msg = resultMsg.msg;
    return res.status(200).json(response);
  } catch (e) {
    console.log("file: wishlistParse.js ~ line 113 ~ exports.wishlistParser= ~ e", e)
    let response = Response.error();
    response.msg = "Probably Something Went Wrong, Try again";
    response.error = [e.message];
    return res.status(200).json(response);
  }
}

exports.uploadWishListFromJumbo = async (fileData, webhookPushStatus = null, userDetail = {}) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (fileData && Array.isArray(fileData) && fileData.length) {

        let newAppIds = fileData;

        let oldAppIds = [];
        let removeWishlistIds = [];

        let oldWishlist = await wishlistModel.searchAppId({}, { _id: 0, network_id: 1, app_id: 1, test: 1 }, {});
        for (const item of oldWishlist) {
          if (!item['test'] || (item['test'] && newAppIds.includes(item['app_id']))) {
            oldAppIds.push(item['app_id']);
          }
          if (!newAppIds.includes(item['app_id'])) {
            removeWishlistIds.push(item['app_id']);
          }
        }

        // Delete old Appids
        await wishlistModel.deleteManyAppId({ app_id: { $in: oldAppIds } });

        // Insert new app ids...
        let bulkInsert = [];
        const networkList = [];
        const networks = await NetworkModel.findAllNetwork({}, { _id: 1 });
        for (const netObj of networks) {
          networkList.push(netObj._id)
          for (const appId of newAppIds) {
            let item = { network_id: netObj._id, "app_id": appId.trim(), test: false };
            bulkInsert.push(item);
          }
          await Redis.setRedisSetData('WISHLIST:' + netObj._id.toString(), newAppIds, process.env.REDIS_Exp);
        }
        if (bulkInsert.length) {
          await wishlistModel.insertManyAppIds(bulkInsert);
        }

        // Only new offer push in webhook
        if (webhookPushStatus === "3") {
          let onlyNewAppIds = newAppIds.filter(appId => {
            let index = oldWishlist.findIndex(item => item.app_id === appId);
            if (index < 0) {
              return appId
            }
          })
          newAppIds = onlyNewAppIds;
        }

        let workerIdList = [];
        for (const netObj of networks) {
          let wStatusData = {
            network_id: mongooseObjectId(netObj._id),
            usrName: userDetail.name,
            usrId: userDetail.id,
            wName: 'Generic_Worker_Queue',
            pName: 'UploadWishListFromJumbo',
            status: "InQueue",
            sDetails: { "InQueue": `${moment().toISOString()}CT${newAppIds.length}` }
          };
          let result = await WorkerStatusModel.saveStatus(wStatusData);
          if (result && result._id) {
            workerIdList.push(result._id)
          }
        }

        let workerData = {
          uploadedAppId: newAppIds,
          removeWishlistIds: removeWishlistIds,
          webhookPushStatus: webhookPushStatus,
          workerIdList: workerIdList
        };
        await Redis.setRedisQueueData("GENWORKERQUEUE", JSON.stringify({ "workerName": "UploadWishListFromJumbo", "workerData": workerData }))
      }

      return resolve({
        msg: "WishList Uploaded. processing started. Have patience",
        err: "",
        payload: fileData
      });
    } catch (e) {
      debug(e)
      return resolve({
        msg: 'Wishlist failed to upload, Try Again!!',
        err: e.message
      });
    }
  })
}

exports.addOffersToWebhook = async (appId, date, wbPublishSource = "") => {
  return new Promise(async (resolve, reject) => {
    try {
      let date_range = date;
      let filter = { app_id: appId, status: 1, updatedAt: { $gte: date_range } };

      let offerIdsWithNetwork = {};

      let cursor = await offerModel.getOffersByBatch(filter, { _id: 1, network_id: 1 });
      for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
        if (!offerIdsWithNetwork[doc['network_id'].toString()]) {
          offerIdsWithNetwork[doc['network_id'].toString()] = []
        }
        offerIdsWithNetwork[doc['network_id'].toString()].push(doc['_id'])
      }
      await publishJobForWebhookV2(offerIdsWithNetwork, "offer_update", wbPublishSource);
      resolve(true);
    } catch (error) {
      debug(error);
      resolve(false);
    }
  });
}

exports.applyWishlistOffers = async function (appIds, applyDateRange) {
  return new Promise(async (resolve, reject) => {
    try {
      let filter = { app_id : { $in : appIds }, status : 0, updatedAt : { $gte : moment().subtract(applyDateRange, "d").toDate()}} 
      try{
        let platformTypeData = await platformController.getApplyPlatformType();        
        if(platformTypeData && platformTypeData.length){
          for(let i = 0; i < platformTypeData.length; i++){
            let platforms = await PlatformModel.getPlatform({platform_id : mongooseObjectId(platformTypeData[i]['_id']), status : '1'}, {}, {});
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
                    let offerList = await offerModel.getSearchOffer({ ...filter, advertiser_platform_id : mongooseObjectId(obj._id), platform_id : mongooseObjectId(platformTypeData[i]['_id']) },{ advertiser_offer_id : 1, _id : 1, app_id : 1, plty : 1 }, {});                    
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
                      let redisKey = `APPLY_PLT_ID_WISHLIST_FROM_JUMBO:${obj._id.toString()}`;  
                      let advertiserData = await Redis.getRedisSetLength(redisKey);
                      
                      if(!advertiserData.data){
                        let data = [];
                        let jumbo_index = 1;
                        for(let offer of offerList){
                        data.push({'k' : offer._id, 'v' : offer.advertiser_offer_id, 'plty' : offer.plty });
                          if(data.length >= 20 ){
                            content['offer_data'] = data;
                            content['jumbo_index'] = jumbo_index;
                            await helperFunctions.sendJobToGenericWorker({ workerName : "applyOffers", workerData : content }, priority = 10);
                            await Redis.setRedisSetData(redisKey, jumbo_index, 86400);
                            jumbo_index++;
                            data = [];
                          }                      
                        }
                        if(data && data.length){
                        content['offer_data'] = data;
                        content['jumbo_index'] = jumbo_index;
                        await helperFunctions.sendJobToGenericWorker({ workerName : "applyOffers", workerData : content }, priority = 10);
                        await Redis.setRedisSetData(redisKey, jumbo_index, 86400);
                        jumbo_index++;
                        data = [];
                        }
                      }                      
                    }
                  }
                }
              }
            }
          }
        }
      }catch(error){
        console.log(" error applyOffer from wishlistOffer generic worker function ", error);
      }
      resolve(true);
    } catch (error) {
      debug(error);
      resolve(false);
    }
  });
}

exports.processWishlistOffers = async function (appId, setIsMyOfferFlagTo) {
  return new Promise(async (resolve, reject) => {
    try {
      await offerModel.updateManyOffer(
        { app_id: appId, status: 1, isMyOffer: !setIsMyOfferFlagTo },
        { $set: { isMyOffer: setIsMyOfferFlagTo } },
        { multi: true }
      )
      resolve(true);
    } catch (e) {
      debug(e.message)
      resolve(false);
    }
  });
}