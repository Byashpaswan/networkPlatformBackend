const Mongoose = require('mongoose');
const mongooseObjectId = Mongoose.Types.ObjectId;
const Response = require('../../helpers/Response');
const fastCsv = require('fast-csv');
const fs = require('fs');
const rejectedAppIdModal = require('../../db/rejectedAppId')
const wishlistModel = require('../../db/wishlist');
const DATE_RANGE = process.env.MY_OFFER_DATE_RANGE || 7;
const moment = require('moment');
const Redis = require('../../helpers/Redis')
const { payloadType } = require('../../constants/config');
const {
  chunkArrayInGroups,
  publishJobForWebhook,
  sendJobToGenericWorker
} = require("../../helpers/Functions");
const Promise = require('promise');
const debug = require("debug")("darwin:Controllers:Wishlist");
const networkModel = require("../../db/network/Network");
const offerModel = require('../../db/offer/Offer');
const WorkerStatusModel = require('../../db/WorkerStatus');
const daysBeforeNow = 3;
const helperFunctions = require('../../helpers/Functions')
const platformController = require('../../controllers/platform/Platform');
const OfferModel = require('../../db/offer/Offer');
const { PlatformModel }  = require('../../db/platform/Platform');
const generalFunction = require('../../helpers/generalFunction');
exports.fetchWishlist = async (req, res) => {
  try {
    let filter = {
      network_id: mongooseObjectId(req.user.userDetail.network[0])
    };
    let projection = {
      app_id: 1,
      conversion: 1
    };
    let options = {};
    let result = await wishlistModel.searchAppId(filter, projection, options);
    if (result) {
      let response = Response.success();
      response.payloadType = payloadType.array;
      response.payload = result;
      response.msg = "successfully fetch data.";
      return res.status(200).json(response);
    } else {
      let response = Response.error();
      response.msg = "unable to fetch wishlist data";
      response.error = [""];
      return res.status(200).json(response);
    }
  } catch (err) {
    console.log(err.message);
    let response = Response.error();
    response.msg = "Probably Something Went Wrong, Try again";
    response.error = [err.message];
    return res.status(200).json(response);
  }
}

exports.addAppId = async (req, res) => {
  try {
    filter = {
      network_id: mongooseObjectId(req.user.userDetail.network[0])
    }
    projection = {
      app_id: 1
    };
    options = {}
    let result = await wishlistModel.searchAppId(filter, projection, options);
    if (result) {
      let response = Response.success();
      response.payloadType = payloadType.array;
      response.payload = result;
      response.msg = "successfully fetch data.";
      return res.status(200).json(response);
    } else {
      let response = Response.error();
      response.msg = "unable to fetch wishlist data";
      response.error = [""];
      return res.status(200).json(response);
    }
  } catch (e) {
    let response = Response.error();
    response.msg = "Probably Something Went Wrong, Try again";
    response.error = [e.message];
    return res.status(200).json(response);
  }
}

exports.wishlistParser = async (req, res) => {
  try {
    const fileRows = [];
    fastCsv.parseFile(req.file.path)
      .on("data", function (data) {
        if (data && data[0] && !fileRows.includes((data[0]).trim()))
          fileRows.push((data[0]).trim());
      }).on("end", async () => {
        fs.unlinkSync(req.file.path);
        // let validationError = validateCsvData(fileRows);
        // if (validationError) {
        //     // return res.status(403).json({ error: validationError });
        // }
        let resultMsg = await this.uploadWishList(req.user.userDetail.network[0], fileRows, req.body.webhookPushStatus, req.user.userDetail);
        if (resultMsg.err) {
          let response = Response.error();
          response.msg = resultMsg.msg;
          response.error = [resultMsg.err];
          return res.status(200).json(response);
        } else {
          let response = Response.success();
          response.payloadType = payloadType.array;
          response.payload = resultMsg.payload;
          response.msg = resultMsg.msg;
          return res.status(200).json(response);
        }
      });
  } catch (e) {
    console.log("file: wishlistParse.js ~ line 113 ~ exports.wishlistParser= ~ e", e)
    let response = Response.error();
    response.msg = "Probably Something Went Wrong, Try again";
    response.error = [e.message];
    return res.status(200).json(response);
  }
}

exports.wishlistParserFromJumbo = async (req, res) => {

  try {
    if (!req.body || !req.body.wishlistData || !req.body.webhookPushStatus || !req.body.wishlistData.length) {
      let response = Response.error();
      response.msg = "Send proper wishlist";
      return res.status(200).json(response);
    }

    const fileData = req.body.wishlistData;
    const webhookPushStatus = req.body.webhookPushStatus;
    const userDetail = req.body.userDetail;

    let resultMsg = {};
    let networks = await networkModel.findAllNetwork({}, { _id: 1 });
    for (let netObj of networks) {
      resultMsg = await this.uploadWishList(netObj._id, fileData, webhookPushStatus, userDetail);
    }
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
  return res.status(200).json("OK");
}

function validateCsvData(rows) {
  // const dataRows = rows.slice(1, rows.length); //ignore header at 0 and get rest of the rows
  // for (let i = 0; i < dataRows.length; i++) {
  //     const rowError = validateCsvRow(dataRows[i]);
  //     if (rowError) {
  //         return `${rowError} on row ${i + 1}`
  //     }
  // }
  return;
}

function validateCsvRow(row) {
  // if (!row[0]) {
  //     return "invalid Package id"
  // }
  // else if (!Number.isInteger(Number(row[1]))) {
  //     return "invalid roll number"
  // }
  // else if (!moment(row[2], "YYYY-MM-DD").isValid()) {
  //     return "invalid date of birth"
  // }
  return;
}

exports.addOffersToWebhook = async (network_id, newAppIds, date, wbPublishSource = "", workerId = "") => {
  try {
    let date_range = date;
    let filter = {
      network_id: mongooseObjectId(network_id),
      status: 1,
      updatedAt: { $gte: date_range }
    };
    if (newAppIds.length > 1) {
      filter['app_id'] = { $in: newAppIds };
    } else {
      filter['app_id'] = newAppIds[0];
    }

    let offerIds = [];
    let totalProcessedOfferCount = 0;
    let cursor = await offerModel.getOffersByBatch(filter, { _id: 1 });
    for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
      offerIds.push(doc['_id']);
      if (offerIds.length >= 50) {
        let res = await publishJobForWebhook(mongooseObjectId(network_id), offerIds, "offer_update", wbPublishSource);
        totalProcessedOfferCount += res
        offerIds = [];
        if (totalProcessedOfferCount >= 1000 && workerId) {
          await WorkerStatusModel.updateStatus({ _id: mongooseObjectId(workerId) }, { $inc: { count: totalProcessedOfferCount } });
          totalProcessedOfferCount = 0;
        }
      }
    }
    if (offerIds.length) {
      let res = await publishJobForWebhook(mongooseObjectId(network_id), offerIds, "offer_update", wbPublishSource);
      totalProcessedOfferCount += res
      totalOffer = [];
    }
    if (workerId) {
      await WorkerStatusModel.updateStatus({ _id: mongooseObjectId(workerId) }, { $inc: { count: totalProcessedOfferCount } });
      totalProcessedOfferCount = 0;
    }

    // cursor.on("data", async (doc) => {
    //   offerIds.push(doc['_id']);
    //   if (offerIds.length >= 50) {
    //     publishJobForWebhook(mongooseObjectId(network_id), offerIds, "offer_update", wbPublishSource);
    //     offerIds = [];
    //   }
    // });
    // cursor.on("end", async () => {
    //   if (offerIds.length) {
    //     publishJobForWebhook(mongooseObjectId(network_id), offerIds, "offer_update", wbPublishSource);
    //     offerIds = [];
    //   }
    // });
    // cursor.on("error", async () => {
    //   if (offerIds.length) {
    //     publishJobForWebhook(mongooseObjectId(network_id), offerIds, "offer_update", wbPublishSource);
    //     offerIds = [];
    //   }
    //   console.log("Error while fetching offers...");
    // });
  } catch (error) {
    debug(error);
  }
}

exports.uploadWishList = async (network_id, fileData, webhookPushStatus = null, userDetail = {}) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (fileData && Array.isArray(fileData) && fileData.length) {
        let newAppIds = fileData;

        // delete old app ids...
        let oldWishlist = await wishlistModel.searchAppId({ network_id: mongooseObjectId(network_id) }, { _id: 0, app_id: 1, test: 1 }, {});
        let oldAppIds = [];
        let appIdsToSetMyOffer = [];
        for (let item of oldWishlist) {
          if (!item['test'] || (item['test'] && newAppIds.includes(item['app_id']))) {
            oldAppIds.push(item['app_id']);
          }
          if (!newAppIds.includes(item['app_id'])) {
            appIdsToSetMyOffer.push(item['app_id']);
          }
        }
        await wishlistModel.deleteManyAppId({ network_id: mongooseObjectId(network_id), app_id: { $in: oldAppIds } });
        // if (appIdsToSetMyOffer.length > 0) {
        //   this.processWishlistOffers(appIdsToSetMyOffer, network_id, setIsMyOfferFlagTo = false);
        // }
        //rejectedAppIdModal.deleteManyAppId({ "app_id": { $in: newAppIds } });

        // insert new app ids...
        let bulkInsert = [];
        newAppIds.forEach(obj => {
          if (obj && obj.trim()) {
            let item = { network_id: mongooseObjectId(network_id), "app_id": obj.trim(), test: false };
            bulkInsert.push(item);
          }
        });
        if (bulkInsert.length) {
          await wishlistModel.insertManyAppIds(bulkInsert);
        }
        // try {
        //   //let date_range = moment().subtract(daysBeforeNow, 'd').toDate(); // 3 days
        //   //addOffersToWebhook(network_id, newAppIds, date_range);
        //   //this.applyAndMarkWishlistOffers({ "network_id": network_id, status: 0, "newAppIds": newAppIds, "updatedAt": { $gte: moment().subtract(DATE_RANGE, 'd').toDate() } });
        //   //this.processWishlistOffers(newAppIds, network_id, true, 1, date_range);
        // } catch (error) {
        //   debug(error);
        // }
        await Redis.delRedisData('WISHLIST:' + network_id.toString());
        await Redis.setRedisSetData('WISHLIST:' + network_id.toString(), fileData, process.env.REDIS_Exp);

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

        let workerData = {
          uploadedAppId: newAppIds,
          removeWishlistIds: appIdsToSetMyOffer,
          network_id: network_id,
          webhookPushStatus: webhookPushStatus
        };

        let wStatusData = {
          network_id: mongooseObjectId(network_id),
          usrName: userDetail.name,
          usrId: userDetail.id,
          wName: 'Generic_Worker_Queue',
          pName: 'UploadWishList',
          status: "InQueue",
          sDetails: { "InQueue": moment().toDate() }
        };
        let result = await WorkerStatusModel.saveStatus(wStatusData);
        if (result && result._id) {
          let pubRes = await Redis.setRedisQueueData("GENWORKERQUEUE", JSON.stringify({ "workerName": "UploadWishList", "workerData": workerData, workerId: result._id.toString() }))
          if (!pubRes) {
            await WorkerStatusModel.updateStatus({ _id: mongooseObjectId(result._id.toString()) }, { $set: { status: 'Failed', "sDetails.Failed": moment().toDate() } });
            return resolve({
              msg: 'Wishlist failed to upload, Try Again!!',
              err: ''
            });
          }
        }
        else {
          return resolve({
            msg: 'Wishlist failed to upload, Try Again!!',
            err: ''
          });
        }
        // await sendJobToGenericWorker({ workerName: "processUploadedWishList", workerData: workerData }, 17);
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

exports.processWishlistOffers = async function (newAppIds, network_id, setIsMyOfferFlagTo, status, date) {
  let date_range = null;
  if (date) {
    date_range = date;
  } else {
    try {
      date_range = moment().subtract(DATE_RANGE, 'd').toDate();
    } catch {
      date_range = moment().subtract(7, 'd').toDate();
    }
  }
  try {
    if (newAppIds.length) {
      let filter = {
        network_id: mongooseObjectId(network_id),
        isMyOffer: !setIsMyOfferFlagTo,
        updatedAt: { $gte: date_range }
      };
      if (status == 1 || status == 0) {
        filter['status'] = status;
      }
      let reflect = { $set: { isMyOffer: setIsMyOfferFlagTo } };
      if (newAppIds.length == 1) {
        filter['app_id'] = newAppIds[0];
        await reflectToOffers(filter, reflect);
      } else {
        let groupItem = await chunkArrayInGroups(newAppIds, 5);
        for (let idArray of groupItem) {
          filter['app_id'] = { $in: idArray };
          await reflectToOffers(filter, reflect);
        }
      }
    }
  } catch (e) {
    debug(e.message)
  }
}

exports.refreshUploadedWishList = async (req, res) => {
  try {

    let wishlist = await wishlistModel.searchAppId({}, { _id: 0, network_id: 1, app_id: 1 }, {});
    let uploadedAppIds = wishlist.map(obj => obj.app_id);
    await sendJobToGenericWorker({ workerName: "processReUploadedWishList", workerData: wishlist }, 16);

    let response = Response.success();
    response.payloadType = payloadType.array;
    response.payload = uploadedAppIds;
    response.msg = "WishList Re Uploaded. processing started. Have patience";
    return res.status(200).json(response);
  } catch (e) {
    console.log("file: wishlistParse.js ~ line 317 ~ exports.refreshUploadedWishList= ~ e", e)
    let response = Response.error();
    response.msg = "Wishlist failed to upload, Try Again!!";
    response.error = [e.message];
    return res.status(200).json(response);
  }
}

exports.reuploadedWishListFromScheduler = async (networkId) => {
  try {
    let wishlist = await wishlistModel.searchAppId({ network_id: mongooseObjectId(networkId) }, { _id: 0, network_id: 1, app_id: 1 }, {});
    if (wishlist && wishlist.length) {
      let workerData = { network_id: networkId, appIds: wishlist.map(obj => obj.app_id) };
      await sendJobToGenericWorker({ workerName: "processReUploadedWishListScheduler", workerData: workerData }, 16);
    }
  } catch (e) {
    console.log("file: wishlistParse.js ~ line 418 ~ exports.reuploadedWishListFromScheduler= ~ e", e)
  }
}

exports.uploadedWishListFromScheduler = async (schedulerData) => {
  try {
    await this.uploadWishList(schedulerData.NetworkId, schedulerData.uploadedAppIds, schedulerData.webhookPushStatus, schedulerData.userDetail);
  } catch (e) {
    console.log("file: wishlistParse.js ~ line 426 ~ exports.uploadedWishListFromScheduler= ~ e", e)
  }
}

exports.processWishlistOffersV2 = async function (newAppIds, network_id, setIsMyOfferFlagTo) {
  try {
    if (newAppIds.length) {
      let filter = { network_id: mongooseObjectId(network_id), status: 1, isMyOffer: !setIsMyOfferFlagTo };
      let reflect = { $set: { isMyOffer: setIsMyOfferFlagTo } };

      for (let app_id of newAppIds) {
        filter['app_id'] = app_id;
        await reflectToOffers(filter, reflect);
      }
    }
  } catch (e) {
    debug(e.message)
  }
}

exports.applyWishlistOffersV2 = async function (search) {
  try {
    if (search['newAppIds'] && search['newAppIds'].length) {
      let filter = { network_id: mongooseObjectId(search['network_id']), status: 0, updatedAt: search['updatedAt'], app_id : { $in : search['newAppIds'] } };
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
                console.log(" advertiserdta -> ", advertiserData);
                if(obj['autoApply']){
                  let credentials = {};
                  obj.credentials.map(apiCredentials => {
                    credentials[apiCredentials.key] = apiCredentials.val;
                  })
                  if(obj.credentials.length > 0 ){
                    let offerList = await OfferModel.getSearchOffer({ ...filter, advertiser_platform_id : mongooseObjectId(obj._id), platform_id : mongooseObjectId(platformTypeData[i]['_id'])},{ advertiser_offer_id : 1, _id : 1, app_id : 1, plty : 1 }, {});                    
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
                      let redisKey = `APPLY_PLT_ID_WISHLIST:${obj._id.toString()}`;  
                      let advertiserData = await Redis.getRedisSetLength(redisKey);
                      
                      if(!advertiserData.data){
                        let data = [];
                        let index2 = 1;
                        for(let offer of offerList){
                        data.push({'k' : offer._id, 'v' : offer.advertiser_offer_id, 'plty' : offer.plty });
                          if(data.length >= 20 ){
                            content['offer_data'] = data;
                            content['index2'] = index2;
                            await helperFunctions.sendJobToGenericWorker({ workerName : "applyOffers", workerData : content }, priority = 10);
                            await Redis.setRedisSetData(redisKey, index2, 86400);
                            index2++;
                            data = [];
                          }                      
                        }
                        if(data && data.length){
                        content['offer_data'] = data;
                        content['index2'] = index2;
                        await helperFunctions.sendJobToGenericWorker({ workerName : "applyOffers", workerData : content }, priority = 10);
                        await Redis.setRedisSetData(redisKey, index2, 86400);
                        index2++;
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
    }
  }catch (error){
    debug(error);
  }
}

exports.applyAndMarkWishlistOffers = async function (search) {
  try {
    if (search['newAppIds'] && search['newAppIds'].length) {
      let filter = {
        network_id: mongooseObjectId(search['network_id']),
        updatedAt: search['updatedAt']
      };
      if (search['status'] == 0) {
        filter['status'] = search['status'];
      }
      let reflect = { $set: { isMyOffer: true } }; // status: 3, status_label: "applied"
      if (search['newAppIds'].length == 1) {
        filter['app_id'] = search['newAppIds'][0];
        await reflectToOffers(filter, reflect);
      } else {
        let groupItem = await chunkArrayInGroups(search['newAppIds'], 5);
        for (let idArray of groupItem) {
          filter['app_id'] = { $in: idArray };
          await reflectToOffers(filter, reflect);
        }
      }
    }
  } catch (error) {
    debug(error);
  }
}

async function reflectToOffers(filter, reflect) {
  try {
    return await Mongoose.connection.db.collection('offers').updateMany(filter, reflect, { multi: true });
    return true;
  } catch {
    return false;
  }
}

exports.getWishlists = async (req, res) => {
  let filter = {};
  let projection = {
    "_id": 1,
    "conversion": 1,
    "liveType": 1,
    "test": 1,
    "network_id": 1,
    "app_id": 1,
    "createdAt": 1,
  };
  let options = {};
  try {
    let result = await wishlistModel.searchAppId(filter, projection, options);
    if (result && result.length) {
      let response = Response.success();
      response.payloadType = payloadType.array;
      response.payload = result;
      response.msg = "Wishlists fetched successfully!";
      return res.status(200).json(response);
    } else {
      let response = Response.error();
      response.msg = "No record found!";
      response.error = [""];
      return res.status(200).json(response);
    }
  } catch (err) {
    let response = Response.error();
    response.msg = "Probably something went wrong, Try again!";
    response.error = [err.message];
    return res.status(200).json(response);
  }
}

exports.autoApply = async function (search) {
  try {
    if (search['newAppIds']) {
      let filter = {
        network_id: mongooseObjectId(search['network_id']),
        status: 0,
        updatedAt: search['updatedAt']
      };
      let reflect = { $set: { status: 3, status_label: "applied" } };
      if (search['newAppIds'].length == 1) {
        filter['app_id'] = search['newAppIds'][0];
        await reflectToOffers(filter, reflect);
      } else {
        let groupItem = await chunkArrayInGroups(search['newAppIds'], 5);
        for (let idArray of groupItem) {
          filter['app_id'] = { $in: idArray };
          await reflectToOffers(filter, reflect);
        }
      }
    }
  } catch (error) {
    debug(error);
  }
}

exports.addWishlist = async (req, res) => {
  let data = [];
  let app_ids = req.body.app_id.split(',');
  try {
    let appIdData = [];
    if (app_ids.length > 1) {
      await rejectedAppIdModal.deleteManyAppId({ app_id: { $in: app_ids } });
      appIdData = await wishlistModel.searchAppId({ app_id: { $in: app_ids }, network_id: mongooseObjectId(req.body.network_id) }, { _id: 0, app_id: 1 });
    } else if (app_ids.length == 1) {
      await rejectedAppIdModal.deleteManyAppId({ app_id: app_ids[0] });
      appIdData = await wishlistModel.searchAppId({ app_id: app_ids[0], network_id: mongooseObjectId(req.body.network_id) }, { _id: 0, app_id: 1 });
    }
    for (let data of appIdData) {
      const index = app_ids.indexOf(data['app_id']);
      if (index > -1) {
        app_ids.splice(index, 1);
      }
    }
    for (let app_id of app_ids) {
      data.push({
        network_id: mongooseObjectId(req.body.network_id),
        app_id: app_id.trim(),
        test: req.body.test
      });
    }

    try {
      if (!req.body.test && app_ids && app_ids.length) {
        this.processWishlistOffers(app_ids, mongooseObjectId(req.body.network_id), true);
        await Redis.setRedisSetData('WISHLIST:' + req.body.network_id.toString(), app_ids, process.env.REDIS_Exp);
      }
      let date_range = moment().subtract(DATE_RANGE, 'd').toDate();
      // this.autoApply({ "network_id": req.body.network_id, "newAppIds": app_ids, "updatedAt": { $gte: date_range } });
      this.applyWishlistOffersV2({ "network_id": req.body.network_id, "newAppIds": app_ids, "updatedAt": { $gte: date_range } });
    } catch (error) {
      debug(error);
    }

    if (data && data.length) {
      let result = await wishlistModel.insertManyAppIds(data);
      if (result && result.length) {
        let response = Response.success();
        response.payloadType = payloadType.array;
        response.payload = result;
        response.msg = "Wishlist added successfully!";
        return res.status(200).json(response);
      } else {
        let response = Response.error();
        response.msg = "Probably something went wrong!";
        response.error = "";
        return res.status(200).json(response);
      }
    } else {
      let response = Response.error();
      response.msg = "App ids already exists!";
      response.error = "";
      return res.status(200).json(response);
    }
  } catch (err) {
    let response = Response.error();
    response.msg = "Probably something went wrong, Try again!";
    response.error = [err.message];
    return res.status(200).json(response);
  }
}

exports.deleteWishlistById = async (req, res) => {
  let filter = {
    "app_id": req.params.app_Id
  };
  let item = {
    "app_id": req.params.app_Id,
    "network_id": req.body.network_id
  }
  try {
    let result = await wishlistModel.deleteManyAppId(filter);
    if (result['deletedCount']) {
      try {
        let networks = await networkModel.findAllNetwork({}, { _id: 1 });
        for (let network of networks) {
          this.processWishlistOffers([req.params.app_Id], mongooseObjectId(network._id), false);
          Redis.removeRedisSetMember('WISHLIST:' + network._id.toString(), req.params.app_Id);
        }
      } catch (error) {
        console.log(error);
      }
      await rejectedAppIdModal.insertOne(item)
      let response = Response.success();
      response.payloadType = payloadType.array;
      response.payload = result;
      response.msg = "Wishlist deleted successfully!";
      return res.status(200).json(response);
    } else {
      let response = Response.error();
      response.msg = "No record found!";
      response.error = [""];
      return res.status(200).json(response);
    }
  } catch (err) {
    let response = Response.error();
    response.msg = "Probably something went wrong, Try again!";
    response.error = [err.message];
    return res.status(200).json(response);
  }
}

exports.deleteMultipleWishlists = async (req, res) => {
  let search = {};
  let chunkIds = [];
  let filterType = '';
  let deleteGroup = [];
  search['network_id'] = mongooseObjectId(req.user.userDetail.network[0]);
  if ((Array.isArray(req.body._ids) && req.body._ids.length)) {
    deleteGroup = req.body._ids;
    filterType = '_id';
  } else if ((Array.isArray(req.body.app_ids) && req.body.app_ids.length)) {
    deleteGroup = req.body.app_ids;
    filterType = 'app_id';
  } else {
    let response = Response.error();
    response.msg = "Please enter _ids or app_ids";
    return res.status(200).json(response);
  }
  try {
    chunkIds = await chunkArrayInGroups(deleteGroup, 5);
    let count = 0;
    for (let idArray of chunkIds) {
      search[filterType] = {
        '$in': idArray
      };
      try {
        let result = await wishlistModel.deleteManyAppId(search);
        if (result.deletedCount != 0) {
          count = count + result.deletedCount;
        }
      } catch (error) {
        debug(error);
      }
    }
    if (count > 0) {
      let response = Response.success();
      response.msg = "Wishlists deleted successfully.";
      return res.status(200).json(response);
    } else {
      let response = Response.error();
      response.msg = "No record found.";
      return res.status(200).json(response);
    }
  } catch (err) {
    let response = Response.error();
    response.msg = "Probably Something Went Wrong, Try again";
    response.error = [err.message];
    return res.status(200).json(response);
  }
}

// fetch wishlist by network_id or app_id or (network_id and app_id)
exports.fetchWishlistByNetworkId = async (req, res) => {
  try {
    let filter = {};
    if (req.body.filter.network_id) {
      filter['network_id'] = mongooseObjectId(req.body.filter.network_id);
    }
    if (req.body.filter.app_id) {
      filter['app_id'] = req.body.filter.app_id;
    }
    let projection = {};
    let options = {};
    let result = await wishlistModel.searchUniqueAppId(filter, projection, options);
    if (result && result.length) {
      let response = Response.success();
      response.payloadType = payloadType.array;
      response.payload = result;
      response.msg = "Wishlists fetched successfully!";
      return res.status(200).json(response);
    } else {
      let response = Response.error();
      response.msg = "No record found!";
      response.error = [""];
      return res.status(200).json(response);
    }
  } catch (err) {
    let response = Response.error();
    response.msg = "Probably something went wrong, Try again!";
    response.error = [err.message];
    return res.status(200).json(response);
  }
}

exports.fetchWishlistNotIn = async (req, res) => {
  try {
    let filter = {
      'app_id': {
        $nin: req.body.addedAppIds
      },
      'test': false
    };
    let projection = {};
    let options = {};
    let result = await wishlistModel.searchUniqueAppId(filter, projection, options);
    if (result && result.length) {
      let response = Response.success();
      response.payloadType = payloadType.array;
      response.payload = result;
      response.msg = "Wishlists fetched successfully!";
      return res.status(200).json(response);
    } else {
      let response = Response.error();
      response.msg = "No record found!";
      response.error = [""];
      return res.status(200).json(response);
    }
  } catch (err) {
    let response = Response.error();
    response.msg = "Probably something went wrong, Try again!";
    response.error = [err.message];
    return res.status(200).json(response);
  }
}

exports.addMultipleWishlist = async (req, res) => {
  let app_ids = [];
  let network_id = mongooseObjectId(req.body.network_id);
  let data = [];

  for (let item of req.body.wishlists) {
    if (!item.test) {
      app_ids.push(item.app_id);
    }
    data.push({
      app_id: item.app_id,
      test: item.test,
      network_id: network_id,
    });
  }

  let item = {
    network_id: network_id,
  };
  if (app_ids.length == 1) {
    item['app_id'] = app_ids[0];
  } else {
    item['app_id'] = { $in: app_ids };
  }
  try {
    try {
      this.processWishlistOffers(app_ids, network_id, true);
      await Redis.setRedisSetData('WISHLIST:' + network_id.toString(), app_ids, process.env.REDIS_Exp);
    } catch (error) {
      console.log(error);
    }

    await rejectedAppIdModal.deleteManyAppId(item);

    wishlistModel.insertManyAppIds(data)
      .then(result => {
        let response = Response.success();
        response.payloadType = payloadType.array;
        response.payload = result;
        response.msg = "Wishlist added successfully!";
        return res.status(200).json(response);
      })
      .catch(err => {
        let response = Response.error();
        response.msg = "Probably something went wrong, Try again!";
        response.error = [err.message];
        return res.status(200).json(response);
      });
  } catch (err) {
    let response = Response.error();
    response.msg = "Probably something went wrong, Try again!";
    response.error = [err.message];
    return res.status(200).json(response);
  }
}

exports.deleteMultipleWishlist = async (req, res) => {
  let deleteCount = 0;

  let data = [];

  for (let item of req.body.appIds) {
    try {
      let result = await wishlistModel.deleteManyAppId({ "app_id": item });
      deleteCount = deleteCount + result['deletedCount'];
    } catch (error) {
      console.log(error);
    }
    let obj = {
      app_id: item
    };
    if (req.body.network_id && req.body.network_id.length) {
      obj['network_id'] = mongooseObjectId(req.body.network_id);
    } else {
      obj['network_id'] = mongooseObjectId("5e4d056eeb383b291949a3df");
    }
    data.push(obj);
  }

  try {
    if (deleteCount) {
      try {
        let networks = await networkModel.findAllNetwork({}, { _id: 1 });
        for (let network of networks) {
          this.processWishlistOffers(req.body.appIds, mongooseObjectId(network._id), false);
          for (let appId of req.body.appIds) {
            Redis.removeRedisSetMember('WISHLIST:' + network._id.toString(), appId);
          }
        }
        await rejectedAppIdModal.insertManyAppId(data);

      } catch (error) {
        console.log(error);
      }
      let response = Response.success();
      response.payloadType = payloadType.array;
      // response.payload = result;
      response.msg = "Wishlist deleted successfully!";
      return res.status(200).json(response);
    } else {
      let response = Response.error();
      response.msg = "No record found!";
      response.error = [""];
      return res.status(200).json(response);
    }
  } catch (err) {
    console.log(err);
    let response = Response.error();
    response.msg = "Probably something went wrong, Try again!";
    response.error = [err.message];
    return res.status(200).json(response);
  }
}
