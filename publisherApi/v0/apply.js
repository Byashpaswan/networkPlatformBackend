const Mongoose = require('mongoose');
const debug = require("debug")("darwin:Controller:Advertiser");
const mongooseObjectId = Mongoose.Types.ObjectId;
const offersModel = require("../../db/offer/Offer");
const Response = require('../../helpers/Response');
const { payloadType } = require('../../constants/config');
const { config } = require('../../constants/Global');
const PublisherOfferRequest = require('../../db/offer/liveOfferApply')
exports.applyPublisherOffer = async(req,res)=>{
    try{
        let publisherData = req.publisherData;
        if (req.query.offer_id, mongooseObjectId.isValid(req.query.offer_id)){
            let checkExist = await checkOfferExistance(req.query.offer_id,publisherData);
            if(checkExist.length){
                let status = "";
                if(checkExist[0]['request_status'] == 'pending'){
                    status="already applied";
                }if(checkExist[0]['request_status'] == 'rejected'){
                    status="rejected";
                }if(checkExist[0]['request_status'] == 'approved'){
                    status="approved";
                }
                let response = Response.success();
                response.msg = "Success";
                response.payloadType = "object";
                response.payload = {status:status}
                return res.status(200).json(response);
            }
            let filter = { _id: mongooseObjectId(req.query.offer_id), network_id: publisherData['network_id'], status: 1 };
            let projection = { offer_name: 1, publisher_offers: 1 };
            let offerData = await offersModel.getSearchOffer(filter, projection,{});
            if (offerData.length){
                let offerPublisherDetails = offerData[0]['publisher_offers'];
                let pids = new Map();
                for(let obj of offerPublisherDetails){
                    pids.set(parseInt(obj.publisher_id),obj.publisher_offer_status_label)
                }
                if(!pids.has(publisherData['pid'])){
                    let result = await updateOfferPublisher(req.query.offer_id,publisherData);
                    if(result){
                        let result1 = await insertPublisherOfferRequest(req.query.offer_id, publisherData, offerData)
                        if(result1){
                            let response = Response.success();
                            response.msg = "Success";
                            response.payloadType = "object";
                            response.payload = {status:'pending'}
                            return res.status(200).json(response);
                        }else{
                            let response = Response.error();
                            response.msg = "Offer Not Applied, Try again Later";
                            return res.status(200).json(response);
                        }
                    }else{
                        let response = Response.error();
                        response.msg = "Offer Not Applied, Try again Later";
                        return res.status(200).json(response);
                    }
                }else if(pids.get(publisherData['pid']) == "applied" || pids.get(publisherData['pid']) == "rejected" || pids.get(publisherData['pid']) == "active"){
                    let status = pids.get(publisherData['pid']);
                    if(status == "active"){
                        status = "already approved";
                    }
                    let response = Response.success();
                    response.msg = "Success";
                    response.payloadType = "object";
                    response.payload = {status:status}
                    return res.status(200).json(response);
                }else{
                    let result1 = await insertPublisherOfferRequest(req.query.offer_id, publisherData, offerData)
                    if(result1){
                        let response = Response.success();
                        response.msg = "Success";
                        response.payloadType = "object";
                        response.payload = {status:'pending'}
                        return res.status(200).json(response);
                    }else{
                        let response = Response.error();
                        response.msg = "Offer Not Applied, Try again Later";
                        return res.status(200).json(response);
                    }
                }
            }
            else {
                let response = Response.error();
                response.msg = "Wrong Offer";
                response.error = ["Offer Not Exists"];
                return res.status(200).json(response);
            }
        }
        else {
            let response = Response.error();
            response.msg = "Invalid Offer Id";
            response.error = ["Invalid Offer Id"];
            return res.status(200).json(response);
        }
    }
    catch (err) {
        let response = Response.error();
        response.msg = "something went wrong, Try Again";
        return res.status(200).json(response);
    }
    
}

updateOfferPublisher = async(offerId,publisherData)=>{
    try{
        let filter={_id:mongooseObjectId(offerId)};
        let updateData = { publisher_offer_status_label: config.OFFERS_STATUS.applied.label, publisher_offer_status: config.OFFERS_STATUS.applied.value, publisher_id: publisherData['pid'], publisher_payout_percent: 0 };
        let update = {$push:{publisher_offers:updateData}};
        let updateResult = await offersModel.updateOffer(filter,update,{});
        if(updateResult){
            return true;
        }else{
            return false;
        }
    }catch(err){
        return false;
    }   
}

insertPublisherOfferRequest = async (offer_id, publisherData, offerData)=>{
   try{
    let apply=new PublisherOfferRequest({
        network_id: publisherData['network_id'],
        offer_id: offer_id,
        publisher_id: publisherData['pid'],
        offerName: offerData[0]['offer_name'],
        request_status: 'pending'
    });
    let output = await apply.save();
    if(output){
        return true;
    }else{
        return false;
    }
   }catch(err){
     return false;
   }
}


checkOfferExistance= async (offerId,publisherData)=>{
    try{
        let filter={offer_id:mongooseObjectId(offerId),network_id: publisherData['network_id'],publisher_id: publisherData['pid']};
        let projection = {}
        let result = await PublisherOfferRequest.isOfferExists(filter,projection,{});
        if(result){
            return result;
        }else{
            return null;
        }
    }catch(err){
        return null;
    }
}