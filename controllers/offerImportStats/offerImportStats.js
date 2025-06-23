const Mongoose = require('mongoose');
const mongooseObjectId = Mongoose.Types.ObjectId;
const offerImportStatModel = require('../../db/offerImportStats');
const Response = require('../../helpers/Response');
const { payloadType } = require('../../constants/config');
const moment = require('moment');
const debug = require("debug")("darwin:Controller:Summary:offerimportStats");

exports.getStatsData = async(req,res)=>{
    try{
    
        let filter={},groupBy={};
        filter['network_id'] = mongooseObjectId(req.user.userDetail.network[0]);
        let userResult = await offerImportStatModel.findDistinctData(filter);
        if(userResult.length > 0){
            filter['createdAt'] = {$gte:moment(req.query.start_date.trim()).startOf('day').toDate() , $lte:moment(req.query.end_date.trim()).endOf('day').toDate()}
            if(req.query.user_id != 'All_User'){
                filter['userId'] = mongooseObjectId(req.query.user_id);
            }
            if(req.query.user == 'true'){
                groupBy['userId']="$userId";
            }
            if(req.query.advertiser == 'true'){
                groupBy['advertiser_id'] = '$advertiser_id';
            }
            if(req.query.user == 'false' && req.query.advertiser == 'false'){
                offerImportStatModel.FindData(filter)
                    .then(async result=>{
                        //console.log(result);
                        if(result.length > 0){
                            let response = Response.success();
                            response.payloadType = payloadType.array;
                            response.payload = [result , userResult ];
                            response.msg = "Data Found";
                            return res.status(200).json(response);
                        }
                        else{
                            let response = Response.success();
                            response.payloadType = payloadType.array;
                            response.payload = [result,userResult];
                            response.msg = "Data not found";
                            return res.status(200).json(response);
                        }
                    }).catch(err=>{
                        console.log(err,"=============Error in getStatsData  FindData query=========================");
                        let response = Response.error();
                        response.msg = "error updating";
                        response.error = [err.message];
                        return res.status(400).json(response);
                    });
            }
            else{
                offerImportStatModel.GroupByData(filter,groupBy)
                    .then(async result=>{
                        //console.log(result);
                        if(result.length > 0){
                            let response = Response.success();
                            response.payloadType = payloadType.array;
                            response.payload = [result , userResult ];
                            response.msg = "Data Found";
                            return res.status(200).json(response);
                        }
                        else{
                            let response = Response.success();
                            response.payloadType = payloadType.array;
                            response.payload = [result,userResult];
                            response.msg = "Data not found";
                            return res.status(200).json(response);
                        }
                    }).catch(err=>{
                        console.log(err,"=============Error in getStatsData  GroupByData query=========================");
                        let response = Response.error();
                        response.msg = "error updating";
                        response.error = [err.message];
                        return res.status(400).json(response);
                    });
            }
            
        }else{
            let response = Response.success();
            response.payloadType = payloadType.array;
            response.payload = [userResult];
            response.msg = "Data not found";
            return res.status(200).json(response);
        }
       
    }
    catch(err){
        console.log(err,"=====================error in getStatsData============================");
        let response = Response.error();
        response.msg = "error updating";
        response.error = [err.message];
        return res.status(400).json(response);
    }
}
