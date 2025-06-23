require("dotenv").config({ path: ".env" });
require('../db/connection');

const Mongoose = require('mongoose');
const mongooseObjectId = Mongoose.Types.ObjectId;
const moment = require('moment');
const debug = require("debug")("darwin:cron:apply");
const { PlatformTypeModel, PlatformModel } = require('../db/platform/Platform');
const OfferModel = require('../db/offer/Offer');
// const { singleOfferApiPlugins } = require("../plugin");
const  helperFunctions  = require("../helpers/Functions");
const platformType = require('../controllers/platform/Platform')
const networkModel = require('../db/network/Network')
const Redis = require('../helpers/Redis')



exports.sendSyncOfferFilterJobToWorker =  async ()=>{
    try{
        let platform_array = await platformType.getSingleSyncPlatformType();
        let networkData = await networkModel.findAllNetwork({}, { _id : 1, nid : 1 });
        let redisIndex = 1;
        for(let m = 0 ; m < platform_array.length; m++){
            let jobs = 0;
            let platformTypeData = platform_array[m];
            for(let i = 0; i < networkData.length; i++ ){
                let network = networkData[i];
                let dateTo = moment().format();                
                let dateFrom = moment().subtract(15, 'd').startOf('d').format();
                // let OneHr = moment().subtract(1, 'hours').startOf('hour').toDate();
                let redisKey = `SYNC_PLT_ID_FILTER:${networkData[i]['_id']}:${platformTypeData['_id']}`
                let redisData  = await Redis.getRedisData(redisKey);
                if(redisData.data){
                    continue;
                }
                let filterData = {
                    updatedAt  : { $gte: dateFrom, $lte: dateTo },
                    network_id : mongooseObjectId(network['_id']),
                    platform_id : mongooseObjectId(platformTypeData._id), 
                    status: { $in : [ -1 ]} 
                }
                let content = {
                    workerName: "syncOfferFilter",
                    workerData: filterData,
                }
                await helperFunctions.sendJobToGenericWorker(content, 12);
                await Redis.setRedisData(redisKey, redisIndex, 172800);
            }
        }

    }catch(err){
        console.log(" err ->", err);        
    }
}

exports.syncWaitingForApprovalOffer = async () => {
    try {
        let offer_ids  = [];
        let jobPriority = 14;
         
        let platform_array = await platformType.getSingleSyncPlatformType();
        let networkData = await networkModel.findAllNetwork({}, { _id : 1 , appliedTime : 1, nid : 1 });
        // debug(platform_array)
        for (let m = 0; m < platform_array.length; m++) {
            let jobs = 0;
            let platformTypeData = platform_array[m];
            for(let i = 0; i < networkData.length; i++){ 
                let redisKey = `SYNC_PLT_ID:${networkData[i].nid}:${platformTypeData['plty']}`
                let redisData  = await Redis.getRedisSetLength(redisKey);
                let redisIndex = 1;
                if(redisData.data && +redisData.data > 0 ){
                    continue;
                } 

                let dateTo = moment().format();
                let dateFrom = moment().subtract(7, 'd').startOf('d').format();
                let OneHr = moment().subtract(1, 'hours').startOf('hour').toDate();
                // appliedTime  btn  last 7 days  1 hr before
                //  and sync time before 1 hr              
                let offerList = await OfferModel.getSearchOffer({ updatedAt  : { $gte: dateFrom, $lte: dateTo }, network_id : mongooseObjectId(networkData[i]['_id']), platform_id : mongooseObjectId(platformTypeData._id) ,  status: { $in : [ 2, 3 ]} }, { _id: 1, appliedTime : 1 , syncTime : 1 }, {}).toArray();
                for(let i = 0; i < offerList.length ; i++){
                    let flag = true ;
                    if(flag &&  offerList[i].appliedTime && moment(offerList[i].appliedTime).isBefore(dateFrom)){

                        flag = false;
                    }
                    if(flag && offerList[i].appliedTime &&  moment(offerList[i].appliedTime).isAfter(OneHr)){
                        flag = false;
                    }
                    if(flag && offerList[i].syncTime && moment(offerList[i].syncTime).isAfter(OneHr)){
                        flag = false
                    }

                    if(flag)
                    offer_ids.push(offerList[i]['_id'].toString());
             
                    if(offer_ids.length >= 20 ){
                        let content = {
                            workerName: "syncOffer",
                            workerData: offer_ids,
                            redisKey: redisKey,
                            redisIndex:redisIndex
                        }
                        pubRes = await helperFunctions.sendJobToGenericWorker(content, priority = jobPriority);
                        await Redis.setRedisSetData(redisKey, redisIndex, 86400);
                        redisIndex++;
                        offer_ids = []                  
                    } 
                }
                if(offer_ids.length > 0){
                    let content = {
                        workerName: "syncOffer",
                        workerData: offer_ids,
                        redisKey: redisKey,
                        redisIndex:redisIndex
                    }
                    offer_ids  = []
                    pubRes = await helperFunctions.sendJobToGenericWorker(content, priority = jobPriority);
                    await Redis.setRedisSetData(redisKey, redisIndex, 86400);
                    redisIndex++;
                } 
                // debug(offerList.length);                                                                                                                       
            debug(platformTypeData.plty + "waiting for approval Job Inserted ", jobs);
            }                                     
        }
    }
    catch (err) {
        debug(err)
    }
    process.exit()
};

// (async () => {
    // await this.syncWaitingForApprovalOffer();
    //    await this.sendSyncOfferFilterJobToWorker();
// })();