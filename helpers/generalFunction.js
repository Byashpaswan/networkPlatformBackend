const mongoose = require('mongoose');
const AdvertiserModel = require('../db/advertiser/Advertiser');
const mongooseObjectId = mongoose.Types.ObjectId;
const Redis = require('./Redis');
const {PlatformModel} = require('../db/platform/Platform')
const PublisherModel  = require('../db/publisher/Publisher');
exports.getAdvertiser = async (advertiser_id) => {
    try {
        let redisKey = `AID_DETAILS:${advertiser_id.toString()}`;
        let redisData = await Redis.getRedisHashMultipleData(redisKey);
        if (redisData.data) {
            redisData.data['aid'] = parseInt(redisData.data['aid']);
            return redisData.data;
        } else {
            let advertiserData  = await AdvertiserModel.searchOneAdvertiser({ _id: mongooseObjectId(advertiser_id) }, { _id:1 , status:1 , aid:1, company:1 ,payCal:1, name:1}) || {};
            if(advertiserData && Object.keys(advertiserData).length > 0 ){
                await Redis.setRedisHashMultipleData(redisKey, advertiserData , 3600);
                return advertiserData;
            }else{
                return {};
            }
        }
    } catch(err) {
        console.log("err ", err);
        return {}
    }
}

exports.getPlatform = async (platform_id) =>{
    try{
        let redisKey = `PLATFORM_DETAILS:${platform_id}`;
        let redisData = await Redis.getRedisHashMultipleData(redisKey);
        if(redisData && redisData.data){
            let pltObj = {};
                pltObj['credentials'] = JSON.parse(redisData.data['credentials']);
                pltObj['autoApply'] = JSON.parse(redisData.data['autoApply']);
                pltObj['autoFetch'] = JSON.parse(redisData.data['autoFetch']);
                pltObj['apiStatus'] = JSON.parse(redisData.data['apiStatus']);
                pltObj['status'] = redisData.data['status'];
                pltObj['advertiser_id'] = redisData.data['advertiser_id'];
                pltObj['network_id'] = redisData.data['network_id'];
                pltObj['advertiser_name'] = redisData.data['advertiser_name'];
                pltObj['aid'] = parseInt(redisData.data['aid']);
                pltObj['plty'] = parseInt(redisData.data['plty']);
                pltObj['plid']  = parseInt(redisData.data['plid']);
                pltObj['platform_name'] = redisData.data['platform_name'];
                pltObj['platform_id'] = redisData.data['platform_id'];
                pltObj['offer_visibility_status'] = redisData.data['offer_visibility_status'];
                pltObj['payout_percent'] = redisData.data['payout_percent'];
            return pltObj;
        }else{
            let projections = { credentials:1, autoApply:1, autoFetch:1, status:1, advertiser_id:1, advertiser_name:1, aid:1, plty:1, plid:1, platform_name:1, platform_id:1, apiStatus:1, offer_visibility_status:1, payout_percent:1, network_id  :1  };
            let platformData = await PlatformModel.getOnePlatform({ _id : mongooseObjectId(platform_id)}, projections) || {};
            if(platformData && Object.keys(platformData).length > 0){
                let pltObj = {};
                pltObj['credentials'] = JSON.stringify(platformData['credentials']);
                pltObj['autoApply'] = JSON.stringify(platformData['autoApply']);
                pltObj['autoFetch'] = JSON.stringify(platformData['autoFetch']);
                pltObj['apiStatus'] = JSON.stringify(platformData['apiStatus']);
                pltObj['status'] = platformData['status'];
                pltObj['advertiser_id'] = platformData['advertiser_id'];
                pltObj['network_id'] = platformData['network_id'];
                pltObj['advertiser_name'] = platformData['advertiser_name'];
                pltObj['aid'] = platformData['aid'];
                pltObj['plty'] = platformData['plty'];
                pltObj['plid']  = platformData['plid'];
                pltObj['platform_name'] = platformData['platform_name'];
                pltObj['platform_id'] = platformData['platform_id'];
                pltObj['offer_visibility_status'] = platformData['offer_visibility_status'];
                pltObj['payout_percent'] = platformData['payout_percent'];
                await Redis.setRedisHashMultipleData(redisKey, pltObj, 3600);
                return platformData;
            }else{
                return {};
            }
        }
    }catch(error){
        console.log(" Error getPlatform",error);
        return {};
    }
}

exports.getPublisher = async (publisher_id) =>{
    let redisKey = `PUBLISHER_DETAILS:${publisher_id}`;
    let redisData = await Redis.getRedisHashMultipleData(redisKey);
    if(redisData && redisData.data){
        let pubObj = {};
            pubObj['status'] = redisData.data['status'];
            pubObj['cut_percentage'] = JSON.parse(redisData.data['cut_percentage']);
            pubObj['api_details'] = JSON.parse(redisData.data['api_details']);
            pubObj['ofr_type'] = redisData.data['ofr_type'];
            pubObj['name'] = redisData.data['name'];
            pubObj['payCal'] = redisData.data['payCal'];
            pubObj['pid'] = +redisData.data['pid']; 
            pubObj['pol'] = +redisData.data['pol'];
            pubObj['company'] = redisData.data['company'];
        return pubObj;
    }else{
        let projections = { status: 1, cut_percentage:1, ofr_type:1, name:1, payCal:1, pid:1,pol:1, api_details:1, company:1,};
        let publisherData = await PublisherModel.getPublisher({_id : mongooseObjectId(publisher_id)},projections,{}) || {};
        if(publisherData && Object.keys(publisherData).length > 0 ){
            let pubObj = {};
            pubObj['status'] = publisherData['status'];
            pubObj['cut_percentage'] = JSON.stringify(publisherData['cut_percentage']);
            pubObj['api_details'] = JSON.stringify(publisherData['api_details']);
            pubObj['ofr_type'] = publisherData['ofr_type'];
            pubObj['name'] = publisherData['name'];
            pubObj['payCal'] = publisherData['payCal'];
            pubObj['pid'] = publisherData['pid']; 
            pubObj['pol'] = publisherData['pol'];
            pubObj['company'] = publisherData['company'];
            await Redis.setRedisHashMultipleData(redisKey, pubObj, 3600);
            return publisherData;
        }
    }
}