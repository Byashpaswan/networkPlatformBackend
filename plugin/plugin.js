const Mongoose = require('mongoose');
const mongooseObjectId = Mongoose.Types.ObjectId;
const Promise = require('promise');
const moment = require('moment');

const debug = require("debug")("darwin:plugin:plugin");
const pluginApis = require("./index");
const axios = require('axios');
const Producer = require('../helpers/rabbitMQ');
const Redis = require('../helpers/Redis');
const OfferModel = require('../db/offer/Offer');
const OfferStatsModel = require('../db/offer/OfferApiStats');
const AdvertiserModel = require("../db/advertiser/Advertiser");
const PublisherModel = require('../db/publisher/Publisher');
const { DeletedOffersModel } = require("../db/offer/DeletedOffers");
const { config } = require('../constants/Global');
const { PlatformModel } = require("../db/platform/Platform");
// const { sendJobToGenericWorker, publishJobForWebhook, generateHash, getDeviceAppId, saveUpdatedOffer,updatedOfferSyncTime, getWishlistList, parseUrl, getPublisherOffer, getAid, getNid, getPlid, getPlty } = require('../helpers/Functions');
const helpersFunction = require('../helpers/Functions');
const webhookModel = require('../db/webhook.js')
const priorityRabbitMQ = require('../helpers/priorityRabbitMQ.js')
const crypto = require("crypto");
const platformController = require('../controllers/platform/Platform.js');
const offerController = require("../controllers/offer/Offer.js")
const { saveGoalBasedOfferInAdvertiserOfferNetwork  , FindOfferIdLocation , saveDomain}  = require('./OfferIdAndGoalIdentification.js');
const applicationDetails = require('../db/applicationDetails/ApplicationDetails.js')
const webhook_queue = "webhook_queue";

const getOldImportantFields = () => {
    return ['offer_name', 'preview_url', 'kpi', 'revenue', 'payout', 'device_targeting', 'geo_targeting', 'isTargeting', 'offer_capping', 'description', 'isCapEnabled', 'status_label', 'tracking_link', 'app_id', 'isMyOffer', 'isPublic']
}

exports.updateStatusApplyApiRes = async (offer_id) =>{
    let offerData = await offerController.getOfferData(offer_id);
    if(offerData.status == 3 || offerData.status == 0 ){
        let appliedTime = new Date();
        await OfferModel.updateStatus({_id : mongooseObjectId(offer_id)}, { status : 2, status_label:'waitingForApproval', appliedTime });
        let key = `OFFER:${offer_id}`
        // delete from redis.
        await Redis.delRedisData(key);
    }
}

exports.updateMessageInRedis = async (platform_name, offer_id , msg)=>{
    if(msg){
        let message_hash = crypto.createHash("md5").update(msg).digest("hex");
        let redisKey1 = `APPLY_OFFER_RES:${platform_name}:MSG:${message_hash}`;
        let redisKey2 = `APPLY_OFFER_RES:${platform_name}:SET:${message_hash}`;
        await Redis.setRedisData(redisKey1, msg, 259200);
        await Redis.setRedisSetData(redisKey2, offer_id, 259200);
    }
}

exports.sendToSyncOffer = async (offer_id, plty) => {
    let jobPriority = 14; 
    let data = [];
    let singlePlatformTypeData = await platformController.getSingleSyncPlatformType() || [];
    singlePlatformTypeData.map(ele=>{
        if(ele.plty == plty){
            data.push(offer_id);
        }
    })
    if(data.length){
        let content = {
            workerName: "syncOffer",
            workerData: data
        }
        await helpersFunction.sendJobToGenericWorker(content, jobPriority);
    }
}

exports.updateStatusDelete = async (content) =>{
    let filter = { network_id : mongooseObjectId(content.network_id), advertiser_platform_id : mongooseObjectId(content.advertiser_platform_id), advertiser_offer_id : content.advertiser_offer_id }
    let comments = ` offer deleted when not fetched data from api ${new Date()}`
    await OfferModel.updateStatus(filter, { status : -1, status_label : 'deleted', comments, adv_status : -1});
}

exports.getOfferVisiblity = async (id) => {
    let visibility = 'approval_required:false';
    let allPlt = {};
    let redisData = await Redis.getRedisHashMultipleData('ADVPTVS');
    if (redisData && !redisData['err'] && redisData['data'] && redisData['data'][id]) {
        allPlt = redisData.data;
    } else {
        let platforms = await PlatformModel.getPlatform({}, { offer_visibility_status: 1, visibilityUpdate: 1 });
        for (let plt of platforms) {
            // allPlt[plt._id] = plt.offer_visibility_status;
            allPlt[plt._id] = `${plt.offer_visibility_status || 'approval_required'}:${plt.visibilityUpdate || false}`
        }
        await Redis.setRedisHashMultipleData('ADVPTVS', allPlt, 3600);
    }
    // if (allPlt[id] == 'public') {
    //     visibility = 'public';
    // } else if (allPlt[id] == 'private') {
    //     visibility = 'private';
    // }
    if (allPlt[id]) {
        visibility = allPlt[id];
    }
    return visibility;
}

function checkValidAppId (app_id) {

    const androidAppIdRegex = /^([A-Za-z]{1}[A-Za-z\d_]*\.)+[A-Za-z][A-Za-z\d_]*$/;    
    if(androidAppIdRegex.test(app_id)) {
        return true ; 
    } else {
        return false ;
    }
    

}

exports.InsertUpdateOffer = async (fields, offers, jobContent, isSecondary = false , oldOfferData = [] ) => {

let domainMap = new Map();
    return new Promise(async (resolve, reject) => {

        let offerLog = this.defaultLog();
        try {

            let InsertOfferList = [];
            let deleteFromDeleted = [];
            let isApplyJobAvailable = false;
            let multiCommandStack = [];
            let redisOfferHashKeyList = [];
            let appIdCountData = jobContent['appidCountData']  || {};

            // Getting wishlist data for ismyoffer check
            let wishlist = await helpersFunction.getWishlistList(jobContent.network_id);

            offerLog.total_offers = Object.keys(offers).length;

            let offer_visible = await this.getOfferVisiblity(jobContent['advertiser_platform_id']);
            let visibility = offer_visible.split(":");

            let pubList = await PublisherModel.getPublisherList({ network_id: mongooseObjectId(jobContent['network_id']), status: 'Active', appr_adv_opt: { $in: [104, 105, 106] } }, { pid: 1, appr_adv_opt: 1, appr_adv: 1 }, {});

            // for (const adv_offer_id of keysArray) {
            for (let [adv_offer_id, newOffer] of Object.entries(offers)) {

              await  FindOfferIdLocation(newOffer['tracking_link'] , newOffer['advertiser_offer_id'] , domainMap) ;
                // let newOffer = offers[adv_offer_id];
                // newOffer['offer_visible'] = offer_visible;
                newOffer['offer_visible'] = visibility[0];

                // Check offer is in wishlist or not then mark isMyOffer according
                if (newOffer['app_id']) {
                    newOffer['isMyOffer'] = wishlist.includes(newOffer['app_id']);
                    if (appIdCountData[newOffer.app_id]) {
                        appIdCountData[newOffer.app_id] += 1;
                    }
                    else {
                        appIdCountData[newOffer.app_id] = 1;
                    }
                     
                    if(newOffer['device_targeting']['os'].length == 0){
                        if(checkValidAppId(newOffer['app_id'])){
                            newOffer['device_targeting'].os.push("android");
                        }else if(!isNaN(newOffer['app_id'])){
                            newOffer['device_targeting'].os.push("ios");
                        }
                    }

                    await checkApp_idExist(newOffer);
                }

                if (newOffer['status_label'] == 'active') {
                    offerLog.approved_offers++;
                }
                if (newOffer['status_label'] == 'no_link') {
                    offerLog.no_link_offers++;
                }

                // create offer_hash of new app
                if (!newOffer['offer_hash']) {
                    newOffer['offer_hash'] = helpersFunction.generateHash(fields, newOffer);
                }

                newOffer['pubOff'] = await helpersFunction.getPublisherOffer(jobContent['advertiser_id'], newOffer['payout'], pubList);
                if (!newOffer.nid && newOffer.network_id) {
                    newOffer['nid'] = await helpersFunction.getNid(newOffer.network_id);
                }
                if (!newOffer.aid && newOffer.advertiser_id) {
                    newOffer['aid'] = await helpersFunction.getAid(newOffer.advertiser_id);
                }
                if (!newOffer.plty && newOffer.platform_id) {
                    newOffer['plty'] = await helpersFunction.getPlty(newOffer.platform_id);
                }
                if (!newOffer.plid && newOffer.advertiser_platform_id) {
                    newOffer['plid'] = await helpersFunction.getPlid(newOffer.advertiser_platform_id);
                }

                if(newOffer.adv_status || newOffer.adv_status == 0 ){
                    // TODO : in  every plugin set adv_status.
                }else{
                    if(newOffer.tracking_link && newOffer.tracking_link.trim()){
                        newOffer['adv_status'] = 1; // advertiser offer status active 
                    }else{
                        newOffer['adv_status'] = 0; // advertiser offer status no_link
                    }
                }
               

                // checking offer has update, new offer or deleted
                let offerResponse = await checkOfferUpdate(newOffer, isSecondary, oldOfferData);
                // console.log(" offerresponse -> ", offerResponse);
                if (offerResponse.isNewOffer || (offerResponse.isDeletedOffer && offerResponse.offerData)){                    
                    // add all auto approved publishers list
                    if (offerResponse.isDeletedOffer) {
                        deleteFromDeleted.push(offerResponse.offerData["_id"])
                        newOffer["_id"] = offerResponse.offerData["_id"]
                    }                                                              
                    // update sync time 
                    if(offerResponse.offerSyncTime){
                        newOffer['syncTime'] = moment(Date.now()).toDate();
                    }
                    InsertOfferList.push(newOffer);
                    offerLog.new_offers++;
                }         
                
                if (offerResponse.isUpdateNeeded){
                    // add previous assign publisher
                    let alertOnOffer  =  false ;
                    if (offerResponse.offerData && offerResponse.offerData['pubOff'] && offerResponse.offerData['pubOff'].length){
                        offerResponse.offerData['pubOff'].map(ele => {
                            if(ele.pay){
                                alertOnOffer = true ;
                            }
                            let index = newOffer['pubOff'].findIndex(obj => obj.id == ele.id);
                            if (index >= 0){
                                newOffer['pubOff'][index] = ele;
                            }else{
                                newOffer['pubOff'].push(ele);
                            }
                        })
                    }

                    if(alertOnOffer && newOffer.revenue != offerResponse.offerData.revenue){
                        // TODO:set alert notification on network pannel with offer_id and old and new both revenue.
                    }
                    // If visibility status update is false then no need to update offer_visible
                    if (visibility[1] == 'false') {
                        delete newOffer['offer_visible'];
                    }

                    // app_id, preview_url, geo_targeting no update...
                    // TODO : advertiser_platform_setting  to delete or set app_id , preview_url, geo_targeting, tracking_link
                    delete newOffer['app_id']
                    delete newOffer['preview_url']                                 
                    delete newOffer['geo_targeting'] 

                    if (newOffer['status_label'] == 'no_link') {                    
                        delete newOffer['tracking_link']
                    }      
                    if(offerResponse.isStatusUpdate){
                        newOffer['status_label'] = offerResponse['status']['status_label'] || '';
                        newOffer['status'] = offerResponse['status']['status'];
                        if(offerResponse['status']['comment']){
                            newOffer['comments'] = offerResponse['status']['comment'] || '';
                        }                        
                    }else{
                        delete newOffer['status_label']
                        delete newOffer['status']
                    }
                    // update sync time 
                    if(offerResponse.offerSyncTime){
                        newOffer['syncTime'] = moment(Date.now()).toDate();
                    }

                    let delete_flag = false;
                    // no need to update if not exists or null value 
                    if(!newOffer.nid){
                        delete newOffer['nid'];
                        delete_flag  = true;
                    }
                    if(!newOffer.plty){
                        delete newOffer['plty'];
                        delete_flag = true;
                    }
                    if(!newOffer.plid){
                        delete newOffer['plid'];
                        delete_flag = true;
                    }
                    if(!newOffer.aid){
                        delete newOffer['aid'];
                        delete_flag = true ;
                    }
                    let time = Date.now();
                    if(delete_flag){
                        await Redis.setRedisData(`OFFER_UPDATE_NULL:${newOffer['advertiser_platform_id']}:${newOffer['advertiser_offer_id']}`, time.toString(), 259200)
                    }
                    await this.saveUpdatedOffer(newOffer);
                    // multiCommandStack.push({ "key": `OH:${newOffer.advertiser_platform_id}:${newOffer.advertiser_offer_id}`, "value": newOffer.offer_hash })
                    offerLog.updated_offers++;
                }
                else if(!offerResponse.isUpdateNeeded && offerResponse.offerSyncTime){  
                    await this.updatedOfferSyncTime(newOffer); // update in offer Only syncTime
                    offerLog.up_to_date_offers++;                   
                }
                else {
                    offerLog.up_to_date_offers++;
                }

                // Insert offers in table by batch
                if (InsertOfferList.length >= 200) {
                    let tempResult = await this.InsertNewOffer(InsertOfferList, jobContent, isApplyJobAvailable, wishlist);
                    if (tempResult) {
                        InsertOfferList = [];
                        isApplyJobAvailable = false;
                    }
                }

                // If offer found in deleted table and has update then delete from deleted table
                if (deleteFromDeleted.length >= 200) {
                    let tempResult = await DeletedOffersModel.deleteManyOffers({ _id: { $in: deleteFromDeleted } });
                    if (tempResult) {
                        deleteFromDeleted = [];
                    }
                }
            }
            try{
              if(domainMap && domainMap.size > 0 ){
              await saveDomain(domainMap , jobContent['advertiser_platform_id'] , jobContent['network_id']) ;
              }
            }catch(error){
              console.log("Error : "  , error );
            }
            jobContent['appidCountData'] = appIdCountData;

            // Insert offers in table by batch if batch length < 200
            if (InsertOfferList.length > 0) {
                let tempResult = await this.InsertNewOffer(InsertOfferList, jobContent, isApplyJobAvailable, wishlist);
                if (tempResult) {
                    InsertOfferList = [];
                    isApplyJobAvailable = false;
                }
            }


            // If offer found in deleted table and has update then delete from deleted table < 200
            if (deleteFromDeleted.length > 0) {
                let tempResult = await DeletedOffersModel.deleteManyOffers({ _id: { $in: deleteFromDeleted } });
                if (tempResult) {
                    deleteFromDeleted = [];
                }
            }

            // console.log("offerLog =====> ", offerLog)
            resolve(offerLog);
        }
        catch (err) {
            console.error(err);
            resolve(offerLog);
        }
    });
}

const checkOfferUpdate = async (newOffer, isSecondary, oldOfferData) => {

    let response = { isUpdateNeeded: false, offerData: null, isNewOffer: false, isDeletedOffer: false, isLinkAvailable: false, isStatusUpdate : false  , offerSyncTime : false};

    try {
        // key for search offer hash in redis
        let redisKey = `OH:${newOffer.advertiser_platform_id}:${newOffer.advertiser_offer_id}`;
        let search = { network_id : mongooseObjectId(newOffer.network_id), advertiser_platform_id : mongooseObjectId(newOffer.advertiser_platform_id), advertiser_offer_id : newOffer.advertiser_offer_id};

        // find  offer hash from redis. 
        let redisData = await Redis.getRedisData(redisKey);
        redisData = redisData.data;  
        let hash = [];
        if(redisData){
            hash = redisData.split(':');
        }
        if(redisData && hash.length == 3 ){
            let newofferHash = `000:${newOffer.offer_hash}`;

            if(hash[0] == 'DEL'){
                if(hash[1] == newOffer.offer_hash){
                    return response; // when hash match with deleteOffer hash. 
                }else{
                    let deletedOfferData = await DeletedOffersModel.getSearchOffer(search, {}, { sort : { updatedAt : -1 } },  readFromSecondary = true);
                    if(deletedOfferData && deletedOfferData.length){
                        // if duplicate offer found in deleted offer table save offer id in redis
                        if(deletedOfferData.length > 1 ){
                            let key = `DUPOFFDEL:${newOffer.network_id}:${newOffer.advertiser_platform_id}:${newOffer.advertiser_offer_id}`
                            let data = deletedOfferData.map(offer => offer._id + "")
                            await Redis.setRedisSetData(key, data, 259200);
                        }
                        response['offerSyncTime'] = true;
                        response['offerData'] = deletedOfferData[0];
                        response['isDeletedOffer'] = true;
                    }
                    // redis data delete of redisKey................................... 
                    await Redis.delRedisData(redisKey);
                    return response;
                }
            }else if(hash[0] == "LNK"){ // when link present in old offer  
                response['isLinkAvailable'] = true;
                if(hash[1] == newOffer.offer_hash){
                    // newofferHash = `LNK:${newOffer.offer_hash}`;
                    if(hash[2] == '-1'){
                        // when offer status is deleted 
                        if(!isSecondary){
                            oldOfferData = await OfferModel.getSearchOffer(search, {}, { sort : {updatedAt : -1 }},  readFromSecondary = true);
                        }
                        if(oldOfferData && oldOfferData.length){
                            // If duplicate offer found in ofer table save offfer id in redis  
                            if(oldOfferData.length > 1 ){
                                let key = `DUPOFF:${newOffer.network_id}:${newOffer.advertiser_platform_id}:${newOffer.advertiser_offer_id}`;
                                let data = oldOfferData.map(offer => offer._id + "");
                                await Redis.setRedisSetData(key, data, 259200) ;
                            }
                            response['offerData'] = oldOfferData[0];
                        }
                        response.isUpdateNeeded = true;
                        response.offerData = oldOfferData[0];
                        response['isStatusUpdate'] = true;
                        if(newOffer['tracking_link'] && newOffer['tracking_link'].trim()){
                            response['status'] = {
                                status : 1 ,
                                status_label : 'active',
                                comment : `On offer sync offer status change from deleted to active at ${Date.now()}`
                            }
                            newofferHash = `LNK:${newOffer.offer_hash}:1`;
                        }else{
                            response['status'] = {
                                status : 0 ,
                                status_label : 'no_link',
                                comment : `On offer sync offer status change from deleted to no_link at ${Date.now()}`
                            }
                            newofferHash = `000:${newOffer.offer_hash}:0`;
                        }
                        await Redis.setRedisData(redisKey, newofferHash, process.env.OFFERHASH_EXP);
                    }
                    response['offerSyncTime'] = true;                   
                }else{
                    if(newOffer['tracking_link'] && newOffer['tracking_link'].trim()){
                        newofferHash = `LNK:${newOffer.offer_hash}:${hash[2]}`;
                    }else{
                        response['isStatusUpdate'] = true;
                        response['status'] = {
                            status : 0 ,
                            status_label : 'no_link',
                            comment : `On offer sync offer status change from active to no_link at ${Date.now()}`
                        }
                        newofferHash = `000:${newOffer.offer_hash}:0`;
                    }
                    response['offerSyncTime'] = true;
                    response['isUpdateNeeded'] = true;
                    // send offer data ........ imp                    
                    // seach  in offer table offer is already there or not. 
                    if(!isSecondary){
                        oldOfferData = await OfferModel.getSearchOffer(search, {}, { sort : {updatedAt : -1 }},  readFromSecondary = true);
                    }
                    if(oldOfferData && oldOfferData.length){
                        // If duplicate offer found in ofer table save offfer id in redis  
                        if(oldOfferData.length > 1 ){
                            let key = `DUPOFF:${newOffer.network_id}:${newOffer.advertiser_platform_id}:${newOffer.advertiser_offer_id}`;
                            let data = oldOfferData.map(offer => offer._id + "");
                            await Redis.setRedisSetData(key, data, 259200) ;
                        }
                        response['offerData'] = oldOfferData[0];
                    }
                    
                    // update redis with new hash ....................................imp
                    await Redis.setRedisData(redisKey, newofferHash, process.env.OFFERHASH_EXP);                   
                }                
                return response;
            }else if(hash[0] == '000'){
                if(hash[1] == newOffer.offer_hash){
                    if(hash[2] == '-1'){
                        // when offer status is deleted 
                        if(!isSecondary){
                            oldOfferData = await OfferModel.getSearchOffer(search, {}, { sort : {updatedAt : -1 }},  readFromSecondary = true);
                        }
                        if(oldOfferData && oldOfferData.length){
                            // If duplicate offer found in ofer table save offfer id in redis  
                            if(oldOfferData.length > 1 ){
                                let key = `DUPOFF:${newOffer.network_id}:${newOffer.advertiser_platform_id}:${newOffer.advertiser_offer_id}`;
                                let data = oldOfferData.map(offer => offer._id + "");
                                await Redis.setRedisSetData(key, data, 259200) ;
                            }
                            response['offerData'] = oldOfferData[0];
                        }
                        response.isUpdateNeeded = true;
                        response.offerData = oldOfferData[0];
                        response['isStatusUpdate'] = true;
                        if(newOffer['tracking_link'] && newOffer['tracking_link'].trim()){
                            response['status'] = {
                                status : 1 ,
                                status_label : 'active',
                                comment : `On offer sync offer status change from deleted to active at ${Date.now()}`
                            }
                            newofferHash = `LNK:${newOffer.offer_hash}:1`;
                        }else{
                            response['status'] = {
                                status : 0 ,
                                status_label : 'no_link',
                                comment : `On offer sync offer status change from deleted to no_link at ${Date.now()}`
                            }
                            newofferHash = `000:${newOffer.offer_hash}:0`;
                        }
                        await Redis.setRedisData(redisKey, newofferHash, process.env.OFFERHASH_EXP);
                    }
                    response['offerSyncTime'] = true;                   
                }else{                      
                    //// waiting update here 
                    // seach  in offer table offer is already there or not. 
                    if(!isSecondary){
                        oldOfferData = await OfferModel.getSearchOffer(search, {}, { sort : {updatedAt : -1 }},  readFromSecondary = true);
                    }
                    if(oldOfferData && oldOfferData.length){
                        // If duplicate offer found in ofer table save offfer id in redis  
                        if(oldOfferData.length > 1 ){
                            let key = `DUPOFF:${newOffer.network_id}:${newOffer.advertiser_platform_id}:${newOffer.advertiser_offer_id}`;
                            let data = oldOfferData.map(offer => offer._id + "");
                            await Redis.setRedisSetData(key, data, 259200);
                        }                        
                    }
                    if(newOffer['tracking_link'] && newOffer['tracking_link'].trim()){                        
                        response['isStatusUpdate'] = true;
                        response['status'] = {
                            status : 1 , 
                            status_label : 'active'
                        }
                        newofferHash = `LNK:${newOffer.offer_hash}:1`;                       
                    }else{
                        if(hash[2] == '-1'){
                            response['isStatusUpdate'] = true;
                            response['status'] = {
                                status : 0 , 
                                status_label : 'no_link'
                            }
                            newofferHash = `000:${newOffer.offer_hash}:0`;
                        }else{
                            newofferHash = `000:${newOffer.offer_hash}:${hash[2]}`;
                        }                        
                    }                    
                    response['isUpdateNeeded'] = true;
                    response['offerData'] = oldOfferData[0]; 
                    // send offer data ........ imp
                    
                    response['offerSyncTime'] = true; 
                    // update redis 
                    await Redis.setRedisData(redisKey, newofferHash, process.env.OFFERHASH_EXP);
                }
                return response;
            }
        }else{
            if(redisData && hash.length < 3 ){
                await Redis.delRedisData(redisKey);
            }
            // when offer hash not found in redis.
            // seach  in offer table offer is already there or not. 
            if(!isSecondary){
                oldOfferData = await OfferModel.getSearchOffer(search, {}, { sort : {updatedAt : -1 }},  readFromSecondary = true);
            }
            if(oldOfferData && oldOfferData.length){
                // If duplicate offer found in ofer table save offfer id in redis  
                if(oldOfferData.length > 1 ){
                    let key = `DUPOFF:${newOffer.network_id}:${newOffer.advertiser_platform_id}:${newOffer.advertiser_offer_id}`;
                    let data = oldOfferData.map(offer => offer._id + "");
                    await Redis.setRedisSetData(key, data, 259200);
                }
                
                let oldOfferHash = `000:${oldOfferData[0].offer_hash}:${oldOfferData[0]['status']}`;
                let newOfferHash = `000:${newOffer.offer_hash}`;
                // if tracking  link already available
                if(oldOfferData[0].tracking_link && oldOfferData[0].tracking_link.trim()){
                    response['isLinkAvailable'] = true;
                    oldOfferHash = `LNK:${oldOfferData[0].offer_hash}:${oldOfferData[0]['status']}`;
                }
                if(newOffer['tracking_link'] && newOffer['tracking_link'].trim()){
                    newOfferHash = `LNK:${newOffer.offer_hash}`; 
                }
                
                if(oldOfferData[0].offer_hash == newOffer.offer_hash){ 
                    if(oldOfferData[0]['status'] == -1){
                        response.isUpdateNeeded = true;
                        response.offerData = oldOfferData[0];
                        response['isStatusUpdate'] = true;
                        if(newOffer['tracking_link'] && newOffer['tracking_link'].trim()){
                            response['status'] = {
                                status : 1 ,
                                status_label : 'active',
                                comment : `On offer sync offer status change from deleted to active at ${Date.now()}`
                            }
                            newOfferHash = `${newOfferHash}:1`;
                        }else{
                            response['status'] = {
                                status : 0 ,
                                status_label : 'no_link',
                                comment : `On offer sync offer status change from deleted to no_link at ${Date.now()}`
                            }
                            newOfferHash = `${newOfferHash}:0`;
                        }
                        response['offerSyncTime'] = true;
                        await Redis.setRedisData(redisKey, newOfferHash, process.env.OFFERHASH_EXP);                                             
                    }else{
                        response['offerSyncTime'] = true;
                        await Redis.setRedisData(redisKey, oldOfferHash, process.env.OFFERHASH_EXP); 
                    }
                    
                }else{

                    if(newOffer['tracking_link'] && newOffer['tracking_link'].trim()){  // 
                        newOfferHash  = `LNK:${newOffer.offer_hash}`; 
                        // when in newoffer having link  
                        if(!response['isLinkAvailable']){ // in db no link 
                            response['isStatusUpdate'] = true; 
                            response['status'] = {
                                status: 1, 
                                status_label : 'active',
                            }
                            newOfferHash = `${newOfferHash}:1`
                        }else{
                            // in db link   
                            if(oldOfferData[0]['status'] == '-1'){
                                response['isStatusUpdate'] = true; 
                                response['status'] = {
                                    status: 1, 
                                    status_label : 'active',
                                    comment : `On offer sync offer status change from deleted to active at ${Date.now()}`
                                }
                                newOfferHash = `${newOfferHash}:1`
                            }else{
                                newOfferHash = `${newOfferHash}:${oldOfferData[0]['status']}`
                            }
                        }
                        response['isUpdateNeeded'] = true;
                        response['offerData'] = oldOfferData[0];
                        response['offerSyncTime'] = true;
                    }else{
                        // tracking link not present in new offer .
                        if(response['isLinkAvailable']){ // in db  link
                            response['isStatusUpdate'] = true;                
                            response['status'] = {
                                status : 0 ,
                                status_label : 'no_link',
                                comment : `On offer sync offer status change from active to no_link at ${Date.now()}`
                            }
                            newOfferHash = `${newOfferHash}:0`                                
                        }else{
                            // in db no link 
                            if(oldOfferData[0]['status'] == '-1'){
                                response['isStatusUpdate'] = true;                
                                response['status'] = {
                                    status : 0,
                                    status_label : 'no_link',
                                    comment : `On offer sync offer status change from delete to no_link at ${Date.now()}`
                                }
                                newOfferHash = `${newOfferHash}:0`
                            }else{
                                newOfferHash = `${newOfferHash}:${oldOfferData[0]['status']}`
                            }
                        }
                        response['isUpdateNeeded'] = true;
                        response['offerData'] = oldOfferData[0];
                        response['offerSyncTime'] = true;                                                       
                    } 
                    await  Redis.setRedisData(redisKey, newOfferHash, process.env.OFFERHASH_EXP);                                                         
                }                           
                return response;
            }
            // If not found in offer table
            else{
                //search in deleted table
                let deletedOfferData = await DeletedOffersModel.getSearchOffer(search, {}, { sort: { updatedAt: -1 }}, readFromSecondary = true);
                if(deletedOfferData && deletedOfferData.length){
                    // if duplicated offer found in deleted offer table save offer id in redis 
                    if(deletedOfferData.length > 1 ){
                        let key = `DUPOFFDEL:${newOffer.network_id}:${newOffer.advertiser_platform_id}:${newOffer.advertiser_offer_id}`
                        let data = deletedOfferData.map(offer => offer._id + "");
                        await Redis.setRedisSetData(key, data, 259200);
                    }
                    // if found in deleted table and not match with new offer hash then marked as deleted offer
                    if(deletedOfferData[0].offer_hash !== newOffer.offer_hash){
                        response['offerData'] = deletedOfferData[0];
                        response['isDeletedOffer'] = true; // age jake redis pdate karega.
                        response['offerSyncTime'] = true;
                    }else{
                        await Redis.setRedisData(redisKey, `DEL:${deletedOfferData[0].offer_hash}`, process.env.OFFERHASH_EXP);
                    }                   
                }
                // If offer not found in deleted and not found in offer table then marked as new offer
                else{
                    response['isNewOffer'] = true;  
                    response['offerSyncTime'] = true;                 
                }
                return response;
            }
        }
    } catch (error) {
        console.log(error)
        return response;
    }
    return response;
}
exports.saveUpdatedOffer = async (newOffer) => {
    try {
        let search = { network_id: mongooseObjectId(newOffer.network_id), advertiser_platform_id: mongooseObjectId(newOffer.advertiser_platform_id), advertiser_offer_id: newOffer.advertiser_offer_id };
        OfferModel.updateOffer(search, { $set: newOffer }, { returnNewDocument: true, multi: false, timestamps: true })
            .then(result => {
                if (result) {
                    if (result.status == 1) {
                        this.publishJobForWebhook(result.network_id, [result._id], 'offer_update', "From Api Update");
                    }
                    Redis.delRedisData('OFFER:' + result._id.toString());
                }
            })
            .catch(err => {
                debug(err);
            })
    } catch (error) {
        debug(error)
    }
}
exports.publishJobForWebhook = async (network_id, offersIds, event, source = "", priority = 1) => {

    let pushedOfferCount = 0;

    let webhookSetting = await Redis.getRedisHashData("webhooksetting:", network_id).data;
    if (!webhookSetting || !webhookSetting.length) {
        webhookSetting = await webhookModel.findwebhookSetting({ network_id: mongooseObjectId(network_id) })
        Redis.setRedisHashData("webhooksetting:", network_id, webhookSetting, 3600)
    }
    if (webhookSetting && webhookSetting.length && (webhookSetting[0].event == event || webhookSetting[0].event == 'both') && webhookSetting[0].pause == false) {
        if (offersIds.length > 50) {
        } else {
            let webHookJobData = { offersId: offersIds, network_id: webhookSetting[0]['network_id'], event: webhookSetting[0].event, source: source, ver: 1 }
            let pubRes = await priorityRabbitMQ.publish_Content(isMultipleContent = false, webhook_queue, webHookJobData, true, true, priority);
            if (pubRes) { pushedOfferCount += offersIds.length }
        }
    }
    return pushedOfferCount;
}
exports.updatedOfferSyncTime = async (newOffer) =>{
    try{
        // console.log(" seacOfferTime update newOffer -> " , newOffer);
        let search = { network_id: mongooseObjectId(newOffer.network_id), advertiser_platform_id: mongooseObjectId(newOffer.advertiser_platform_id), advertiser_offer_id: newOffer.advertiser_offer_id }
        await OfferModel.updateOffer(search, { $set: {'syncTime' : moment(Date.now()), 'adv_status' : newOffer.adv_status } }, { returnNewDocument: true, multi: false, timestamps: true })
    }catch(err){
        console.log(" err ", err);
        debug(err)
    }
}

const checkApp_idExist = async (newOffer) => {
    try { 
        const app_ids = new Map();
        let country = '';
         // Extract country information from newOffer
         if (newOffer.geo_targeting && newOffer.geo_targeting.country_allow && newOffer.geo_targeting.country_allow.length > 0 && newOffer.geo_targeting.country_allow.length <= 4) {
            const countryKey = newOffer.geo_targeting.country_allow[0]['value'].toLowerCase();
            const tempObjCountry = config.country.find(ele => ele.key.toLowerCase() === countryKey);
            country = tempObjCountry && tempObjCountry.key ? tempObjCountry.key.toLowerCase() : '';
        }

        const key = `AppId:${newOffer.app_id}`;
        const redisData = await Redis.getRedisData(key);
        const app_Id_key = newOffer.app_id;

        if (redisData.data == null) {
            const appdata = await applicationDetails.findOneApp_id({ app_id: newOffer.app_id });

            if (appdata && Object.keys(appdata).length > 0) {
                if (!appdata.country && country) {
                    app_ids.set(app_Id_key, { app_id: newOffer.app_id, country });
                    await Redis.setRedisData(key, country);
                } else {
                    await Redis.setRedisData(key, appdata.country);
                }
            } else {
                 // if not in db
                app_ids.set(app_Id_key, { app_id: newOffer.app_id, country });
                await Redis.setRedisData(key, country);
            }
            //if redisData having empty string and newoffer's having country
        } else if (!redisData.data && country) {
            app_ids.set(app_Id_key, { app_id: newOffer.app_id, country });
            await Redis.setRedisData(key, country);
        }

        if (app_ids.size > 0) {
            const mapdata = app_ids.get(app_Id_key);
            if (mapdata && Object.keys(mapdata).length > 0) {
                Object.assign(mapdata, {
                    is_incorrect_app_id: false,
                    is_published: false,
                    not_found_count: 0,
                    not_found: false
                });

             await applicationDetails.findOneAndUpdateApplication(
                    { app_id: app_Id_key },
                    { $set: mapdata },
                    { upsert: true }
                );

            }
        }
    } catch (err) {
        console.error('Error in checkApp_idExist:', err);
    }
};

exports.InsertNewOffer = async (newOfferArray, jobContent, isApplyJobAvailable, wishlist) => {

    return new Promise(async (resolve, reject) => {
        try {
            let result = await OfferModel.insertManyOffers(newOfferArray);
            debug('total offer ', newOfferArray.length, 'inserted', result.length);

            if (result && result.length) {
                await setOfferHashIntoRedis(result);
                await addDomainsInAdvertiser(result, jobContent);
                await saveGoalBasedOfferInAdvertiserOfferNetwork(result) ; //
                await sendToWebhook(result, jobContent.network_id);
                // if (isApplyJobAvailable) {
                //     await publishApplyJobs(result, jobContent, wishlist);
                // }
            }
        } catch (error) {
            console.log(error);
        }
        resolve(true);
    });
}

const getPublisherList = async (jobContent) => {

    return new Promise(async (resolve, reject) => {

        let publisherOffersList = []

        try {
            let network_id = jobContent.network_id;
            let pubVisibilityStatus = jobContent.visibility_status;
            let pubPayoutPercent = jobContent.payout_percent;
            let allPublisherList = jobContent.publishers

            if (!pubPayoutPercent) {
                pubPayoutPercent = 100;
            }

            if (Array.isArray(allPublisherList) && allPublisherList.length && pubVisibilityStatus) {

                let status = 0;
                let status_label = 'no_link';

                if (pubVisibilityStatus == 'auto_approve') {
                    status = 1;
                    status_label = 'active';
                }

                if (allPublisherList.includes('all') && network_id) {

                    allPublisherList = [];
                    let tempPubList = await PublisherModel.getPublisherList({ network_id: mongooseObjectId(network_id), status: 'Active' }, { pid: 1 }, {});
                    if (tempPubList) {
                        allPublisherList = tempPubList.map(obj => { return obj.pid })
                    }
                }

                for (i = 0; i < allPublisherList.length; i++) {
                    publisherOffersList.push({ publisher_id: allPublisherList[i], publisher_offer_status_label: status_label, publisher_offer_status: status, publisher_payout_percent: pubPayoutPercent });
                }
            }

            resolve(publisherOffersList);
        } catch (error) {
            resolve(publisherOffersList);
        }
    })

}

const getStatus = (newOffer) => {
    let status_label = newOffer.status_label;
    let status = config.OFFERS_STATUS.unmanaged.value;
    if (status_label && config.OFFERS_STATUS[status_label]) {
        status = config.OFFERS_STATUS[status_label].value;
    }
    return status;
}

const addDomainsInAdvertiser = async (result, jobContent) => {
    try {
        let domains = [];
        for (let item of result) {
            if (item['tracking_link'] && item['tracking_link'].trim() && !domains.includes(item['tracking_link'])) {
                domains.push(helpersFunction.parseUrl(item['tracking_link']))
            }
        }
        await PlatformModel.updatePlatform(
            { "_id": mongooseObjectId(jobContent['advertiser_platform_id']), "network_id": mongooseObjectId(jobContent['network_id']) },
            { $addToSet: { "domain": { $each: domains } } }
        );
        let advertiser = await AdvertiserModel.getAdvertiser(
            { "_id": mongooseObjectId(jobContent['advertiser_id']) }, { "platforms": 1 },
            {}
        );
        if (advertiser && advertiser.length && advertiser[0]['platforms']) {
            let platforms = await updateDomainInPlatforms(advertiser[0]['platforms'], jobContent['advertiser_platform_id'], domains);
            if (platforms) {
                await AdvertiserModel.updateAdvertiser({ "_id": mongooseObjectId(jobContent['advertiser_id']) }, { $set: { "platforms": platforms } });
            }
        }
        // for (let item of result) {
        //     if (item['tracking_link'] && item['tracking_link'].trim()) {
        //         try {
        //             await PlatformModel.updatePlatform(
        //                 {
        //                     "_id": mongooseObjectId(item['advertiser_platform_id']),
        //                     "network_id": mongooseObjectId(item['network_id'])
        //                 },
        //                 { $addToSet: { "domain": parseUrl(item['tracking_link']) } }
        //             );
        //             let advertiser = await AdvertiserModel.getAdvertiser({ "_id": mongooseObjectId(item['advertiser_id']) }, { "platforms": 1 }, {});
        //             if (advertiser[0]['platforms']) {
        //                 let platforms = await updateDomainInPlatforms(advertiser[0]['platforms'], item['advertiser_platform_id'], parseUrl(item['tracking_link']));
        //                 if (platforms) {
        //                     await AdvertiserModel.updateAdvertiser({ "_id": mongooseObjectId(item['advertiser_id']) }, { $set: { "platforms": platforms } });
        //                 }
        //             }
        //         } catch (error) {
        //             debug(error);
        //         }
        //     }
        // }
    } catch (error) {
        debug(error);
    }
}

const sendToWebhook = async (result, network_id) => {
    try {
        let offerIds = result.reduce((arr, curr) => {
            if (curr.status == 1) {
                arr.push(curr._id);
            }
            return arr;
        }, []);
        await helpersFunction.publishJobForWebhook(network_id, offerIds, "offer_create", "From Api New Offer")
    } catch (error) {
        debug(error)
    }
}

const setOfferHashIntoRedis = async (result) => {
    try {

        // let multiCommandStack = result.map(obj => ({ "key": `OH:${obj.advertiser_platform_id}:${obj.advertiser_offer_id}`, "value": obj.offer_hash }));
        let multiCommandStack = result.map(obj => {
            let tempCommand = { "key": `OH:${obj.advertiser_platform_id}:${obj.advertiser_offer_id}`, "value": obj.offer_hash };
            if (obj.tracking_link) {
                tempCommand['value'] = `LNK:${obj.offer_hash}`
            }
            return tempCommand
        })
        // This is used to set redis key value at one time
        if (multiCommandStack.length) {
            let result = await Redis.setMultipleKeyWithExpire(multiCommandStack, process.env.OFFERHASH_EXP);
            if (result.error) {
                debug(result)
                for (const obj of object) {
                    Redis.setRedisData(obj.key, obj.value, process.env.OFFERHASH_EXP);
                }
            }
            multiCommandStack = []
        }
    } catch (error) {
        debug(error)
    }
}

const publishApplyJobs = async (offers, jobContent, allWishlist) => {

    if (offers && offers.length) {

        let tempContent = {
            'network_id': jobContent.network_id,
            'nid': jobContent.nid || await helpersFunction.getNid(jobContent.network_id),
            'advertiser_id': jobContent.advertiser_id,
            'aid': jobContent.aid || await helpersFunction.getAid(jobContent.advertiser_id),
            'advertiser_name': jobContent.advertiser_name,
            'platform_id': jobContent.platform_id,
            'plty': jobContent.plty || await helpersFunction.getPlty(jobContent.platform_id),
            'advertiser_platform_id': jobContent.advertiser_platform_id,
            'plid': jobContent.plid || await helpersFunction.getPlid(jobContent.advertiser_platform_id),
            'platform_name': jobContent.platform_name,
            'credentials': jobContent.credentials,
            'payout_percent': jobContent.payout_percent,
            'publishers': jobContent.publishers,
            'visibility_status': jobContent.offer_visibility_status
        };

        let offerData = [];
        for (let singleOffer of offers) {
            if (!singleOffer.tracking_link && singleOffer.status == config.OFFERS_STATUS['applied'].value && allWishlist.includes(singleOffer.app_id)) {
                offerData.push({ 'k': singleOffer._id, 'v': singleOffer.advertiser_offer_id })
            }
            if (offerData.length >= 20) {
                content['offer_data'] = offerData;
                await helpersFunction.sendJobToGenericWorker({ workerName: "applyOffers", workerData: tempContent }, priority = 10);
                offerData = [];
            }
        }
        if (offerData.length) {
            content['offer_data'] = offerData;
            await helpersFunction.sendJobToGenericWorker({ workerName: "applyOffers", workerData: tempContent }, priority = 10);
            offerData = []
        }
    }
}

const updateDomainInPlatforms = (platforms, platform_id, domain) => {
    let newPlatforms = platforms.slice();
    let isModify = false;
    for (let item of newPlatforms) {
        if (item && item['platform_id'] && platform_id && item['platform_id'].toString() == platform_id.toString()) {
            item['domain'] = domain.reduce((arr, ele) => {
                if (!arr.includes(ele)) {
                    arr.push(ele)
                }
                return arr;
            }, item['domain'])
            isModify = true;
        }
        // if ((item['platform_id'].toString() == platform_id.toString()) && (!item['domain'].includes(domain))) {
        //     item['domain'].push(domain);
        //     isModify = true;
        // }
    }
    if (!isModify) {
        return false;
    }
    return newPlatforms;
}



// API related functions ===============>
exports.makeRequest = async function (newConfig) {
    try {
        // if (newConfig.url) {
        //     console.log("Hit URL : ", newConfig.url)
        // }
        return await axios(newConfig);
    } catch (error) {
        if(error.code == 'ECONNABORTED'){
            return 'ECONNABORTED';
        }
        if (error.response) {
            return error.response;
        }
        return null;
    }
}

// exports.ImportantFields = ['offer_name', 'preview_url', 'kpi', 'revenue', 'payout', 'device_targeting', 'geo_targeting', 'isTargeting', 'offer_capping', 'description', 'isCapEnabled', 'tracking_link', 'app_id', 'isMyOffer', 'isPublic'];
// exports.ImportantFields = ['offer_name', 'kpi', 'revenue', 'payout', 'device_targeting', 'isTargeting', 'offer_capping', 'description', 'isCapEnabled', 'tracking_link', 'isMyOffer', 'isPublic'];
exports.ImportantFields = ['revenue', 'offer_name', 'description', 'kpi', 'tracking_link', 'device_targeting', 'geo_targeting'];

exports.getOffersFields = (allowed, not_allowed) => {
    return [
        { field: 'offer_name', action: 'getOfferName' },
        { field: 'goal', action: 'getGoals' },
        { field: 'category', action: 'getCategory' },
        { field: 'currency', action: 'getCurrency' },
        { field: 'advertiser_offer_id', action: 'getOfferId' },
        { field: 'thumbnail', action: 'getThumbnail' },
        { field: 'description', action: 'getDescription' },
        { field: 'kpi', action: 'getKpi' },
        { field: 'preview_url', action: 'getPreviewUrl' },
        { field: 'tracking_link', action: 'getTrackingLink' },
        { field: 'expired_url', action: 'getExpiredUrl' },
        { field: 'start_date', action: 'getStartDate' },
        { field: 'end_date', action: 'getEndDate' },
        { field: 'revenue', action: 'getRevenue' },
        { field: 'revenue_type', action: 'getRevenueType' },
        { field: 'payout', action: 'getPayout' },
        { field: 'payout_type', action: 'getPayoutType' },
        { field: 'approvalRequired', action: 'getApprovalRequired' },
        { field: 'isCapEnabled', action: 'getIsCapEnabled' },
        { field: 'isgoalEnabled', action: 'getIsGoalEnabled' },
        { field: 'offer_capping', action: 'getOfferCapping' },
        { field: 'isTargeting', action: 'getIsTargeting' },
        { field: 'geo_targeting', action: 'getGeoTargeting' },
        { field: 'device_targeting', action: 'getDeviceTargeting' },
        { field: 'creative', action: 'getCreative' },
        { field: 'offer_visible', action: 'getOfferVisible' },
        { field: 'status_label', action: 'getStatusLabel' },
        { field: 'redirection_method', action: 'getRedirectionMethod' }
    ];
}

exports.defaultLog = () => {
    let apiStats = {
        approved_offers: 0,
        no_link_offers: 0,
        new_offers: 0,
        apply_offers: 0,
        updated_offers: 0,
        up_to_date_offers: 0,
        total_offers: 0,
    };
    return apiStats;
}

exports.getAppId = (url) => {
    let app_id = '';
    if (url) {
        let response = helpersFunction.getDeviceAppId(url);
        if (response && response.app_id) {
            app_id = response.app_id;
        }
    }
    return app_id;
}

exports.addUpdateExtraFields = (newOffer, ImportantFields, oldOffer) => {

    newOffer['offer_hash'] = helpersFunction.generateHash(ImportantFields, newOffer);
    newOffer['revenue_type'] = this.getRevenueType(newOffer, oldOffer);
    newOffer['payout_type'] = this.getPayoutType(newOffer, oldOffer);
    newOffer['status'] = getStatus(newOffer, oldOffer);
    return newOffer;
}

exports.getRevenueType = (newOffer, oldOffer = {}) => {

    let revenue_type = newOffer.revenue_type;
    let tempRevenueType = { enum_type: 'unknown', offer_type: '' };
    let tempKey = '';

    if (revenue_type && revenue_type.offer_type) {

        tempRevenueType = revenue_type;
        tempRevenueType.enum_type = 'unknown';
        config.OFFERS_REVENUE_TYPE.map((key, index) => {

            tempKey = tempRevenueType.offer_type.toUpperCase();
            if (key && key.toUpperCase() === tempKey) {
                tempRevenueType.enum_type = key;
                return true;
            }
            else if (tempKey.indexOf(key.toUpperCase()) !== -1) {
                tempRevenueType.enum_type = key;
            }
        })
    }
    if (tempRevenueType.enum_type == '') {
        tempRevenueType.enum_type = 'unknown';
    }
    return tempRevenueType;
}

exports.getPayoutType = (newOffer, oldOffer = {}) => {

    let payout_type = newOffer.payout_type;
    let tempPayoutType = { enum_type: 'unknown', offer_type: '' };
    let tempKey = '';

    if (payout_type && payout_type.offer_type) {

        tempPayoutType = payout_type;
        tempPayoutType.enum_type = 'unknown';
        config.OFFERS_REVENUE_TYPE.map((key, index) => {

            tempKey = tempPayoutType.offer_type.toUpperCase();
            if (key && key.toUpperCase() === tempKey) {
                tempPayoutType.enum_type = key;
                return true;
            }
            else if (tempKey.indexOf(key.toUpperCase()) !== -1) {
                tempPayoutType.enum_type = key;
            }
        })
    }
    if (tempPayoutType.enum_type == '') {
        tempPayoutType.enum_type = 'unknown';
    }
    return tempPayoutType;
}

exports.addExtraFields = (offer, content) => {
    offer['platform_id'] = content.platform_id;
    offer['plty'] = content.plty
    offer['platform_name'] = content.platform_name;
    offer['advertiser_id'] = content.advertiser_id;
    offer['aid'] = content.aid;
    offer['network_id'] = content.network_id;
    offer['nid'] = content.nid;
    offer['advertiser_name'] = content.advertiser_name;
    offer['advertiser_platform_id'] = content.advertiser_platform_id;
    offer['plid'] = content.plid;
    offer['app_id'] = this.getAppId(offer['preview_url']);
    offer['isMyOffer'] = false;
    offer['isPublic'] = false;
    offer['liveType'] = 1;
    offer['isApiOffer'] = true;
    offer['status'] = getStatus(offer);
    if (offer.advertiser_offer_id && offer.tracking_link) {
        let urlData = new URL(offer.tracking_link);
        offer['adv_off_hash'] = crypto.createHash("md5").update(offer.advertiser_offer_id + urlData.hostname).digest("hex");
    }
    if (offer['offer_visible'] != "private") {
        offer['isPublic'] = true;
    }
    try {
        offer['revenue'] = +((+offer['revenue']).toFixed(3));
        offer['payout'] = (+offer['payout']).toFixed(3);
        offer['revenue_type'] = this.getRevenueType(offer);
        offer['payout_type'] = this.getPayoutType(offer);
        if (content.payout_percent) {
            offer['adv_platform_payout_percent'] = content.payout_percent
            offer['payout'] = ((offer['revenue'] * (+content.payout_percent)) / 100) || 0;
        }
    }
    catch (e) {
        console.error(e)
        offer['payout'] = 0;
    }
    try {
        if (offer['goal'].length && content.payout_percent) {
            offer['goal'].map(tempGoal => {
                if (tempGoal.revenue) tempGoal.payout = ((tempGoal.revenue * (+content.payout_percent)) / 100) || 0;
            })
        }
    } catch (error) { }
    return offer;
}

exports.applyOfferStatusUpdate = async (advertiser_offer_id, offer_id, status_label, network_id, advertiser_id, advertiser_platform_id, ImportantFields) => {
    return new Promise(async (resolve, reject) => {
        try {
            let status = '';
            if (status_label && config.OFFERS_STATUS[status_label]) {
                status = config.OFFERS_STATUS[status_label].value;
            }
            if ((status == 0 || status) && mongooseObjectId.isValid(offer_id)) {
                let offer = await OfferModel.getOneOffer({ _id: offer_id });
                // let offer = await OfferModel.getOneOffer({ _id: offer_id, advertiser_offer_id: advertiser_offer_id, network_id: mongooseObjectId(network_id), advertiser_id: mongooseObjectId(advertiser_id), advertiser_platform_id: mongooseObjectId(advertiser_platform_id) });
                if (offer && offer._id) {
                    offer['status_label'] = status_label;
                    offer['status'] = status;
                    offer_hash = helpersFunction.generateHash(ImportantFields, offer);
                    let offerupdate = await OfferModel.findandupdateOffer({ _id: offer._id }, { offer_hash: offer_hash, status_label: offer['status_label'], status: offer['status'] });
                    if (offerupdate) {
                        // debug('offer updated');
                        return resolve(true);
                    }
                }
                // debug('offer not found');
                return resolve(false);
            }
            return resolve(false);
        }
        catch (e) {
            console.error(e);
            return resolve(false);
        }
    });
}

exports.publishWorkingLinkJobs = async (offers, jobContent) => {
    let checkOffer = [];
    offers.map(obj => {
        if (obj.tracking_link && obj.preview_url) {
            let temp = {};
            temp['tracking_link'] = obj.tracking_link;
            temp['_id'] = obj._id;
            temp['preview_url'] = obj.preview_url;
            temp['country'] = "kr";
            temp['visibility_status'] = jobContent.visibility_status;
            temp['publishers'] = jobContent.publishers;
            temp['payout_percent'] = jobContent.payout_percent;
            if (obj.geo_targeting && obj.geo_targeting.country_allow && obj.geo_targeting.country_allow[0]) {
                temp['country'] = obj.geo_targeting.country_allow[0].key;
            }
            checkOffer.push(temp);
        }
    })
    if (checkOffer.length) {
        await Producer.publish_Content(true, 'filter_my_offer', checkOffer, true, true, false, 0);
    }
}

exports.mergeOfferLog = (currentLog, tempLog) => {
    let log = {
        approved_offers: currentLog.approved_offers + tempLog.approved_offers || 0,
        no_link_offers: currentLog.no_link_offers + tempLog.no_link_offers || 0,
        new_offers: currentLog.new_offers + tempLog.new_offers || 0,
        apply_offers: currentLog.apply_offers + tempLog.apply_offers || 0,
        updated_offers: currentLog.updated_offers + tempLog.updated_offers || 0,
        up_to_date_offers: currentLog.up_to_date_offers + tempLog.up_to_date_offers || 0,
        total_offers: currentLog.total_offers + tempLog.total_offers || 0,
    };
    return log;
}

exports.lockOfferApiStats = async (offerStats, content, start_time, remarks = "") => {
    try {
        let filter = {
            _id: mongooseObjectId(content.offer_api_stats_id)
        }
        let reflect = {
            stats: offerStats,
            remarks: remarks,
            time_taken: moment().diff(start_time, 'seconds')
        };

        await OfferStatsModel.updateSingleOfferStatsApi(filter, reflect);
        return true;
    }
    catch (e) {
        debug(e.message);
        return false;
    }
}

exports.publishOfferApiStats = async (offerLog, content, remarks) => {
    try {
        let stats = new OfferStatsModel({
            network_id: mongooseObjectId(content.network_id),
            advertiser_id: mongooseObjectId(content.advertiser_id),
            advertiser_name: content.advertiser_name,
            advertiser_platform_id: mongooseObjectId(content.advertiser_platform_id),
            platform_id: mongooseObjectId(content.platform_id),
            platform_name: content.platform_name,
            stats: offerLog,
            remarks: remarks
        });
        let result = await stats.save();
        return result._id
    }
    catch (e) {
        debug(e.message);
        return false;
    }
}
