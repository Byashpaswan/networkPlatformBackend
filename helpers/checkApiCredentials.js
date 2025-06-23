const Response = require('./Response');
const Mongoose = require('mongoose');
const debug = require("debug")("darwin:Controller:Advertiser");
const mongooseObjectId = Mongoose.Types.ObjectId;
const publisherModel = require("../db/publisher/Publisher");
const Redis = require('../helpers/Redis');
const { filterHash } = require('../helpers/Functions');
exports.checkCredentials = async (req,res,next)=>{
    try{
        if(!req.headers.secretkey){
            let response = Response.error();
            response.msg = "secret key missing";
            return res.status(200).json(response);
        }
        if(!req.headers.apikey){
            let response = Response.error();
            response.msg = "api key missing";
            return res.status(200).json(response);
        }
        let secretKey = req.headers.secretkey;
        let apiKey = req.headers.apikey;
        let publisherData = await getPublisherData(apiKey,secretKey);
        if(!publisherData){
            let response = Response.error();
            response.msg = "wrong api key or secret key";
            return res.status(200).json(response);
        }else if(publisherData['status'] != 'Active'){
            let response = Response.error();
            response.msg = "Publisher Account Inactive";
            return res.status(200).json(response);
        }else if(publisherData['Apistatus'] == false ){
            let response = Response.error();
            response.msg = "Publisher's Api Inactive";
            return res.status(200).json(response); 
        }
        req.secretKey = req.headers.secretkey;
        req.apiKey = req.headers.apikey;
        req.publisherData = publisherData;
        next();
    }catch(err){
        debug(err)
        let response = Response.error();
        response.msg = "something went wrong";
        return res.status(200).json(response);
    }
}


getPublisherDataFromDb = async (apiKey, secretKey, credentialsHash)=>{
   try{
        let filter = {'api_details.api_key':apiKey,'api_details.secret_key':secretKey};
        let projection = {pid:1,network_id:1,status:1 , pol : 1  , Apistatus : 1};
        let publisherData = await publisherModel.findPublisher(filter,projection);
        if(publisherData.length){ 
            Redis.setRedisHashData('publisherCredentials', credentialsHash, publisherData[0], 36000);
            return publisherData[0];
        }else{
            return null;
        }
   }catch(err){
       return null;
   }
}

getPublisherData = async (apiKey, secretKey) =>
{
    let credentialsHash = filterHash({ apiKey: apiKey, secretKey: secretKey });
    try {
        let res = await Redis.getRedisHashData('publisherCredentials', credentialsHash);
        if (res && res.data) {
            return res.data;
        }
        else {
            let publisherData = await getPublisherDataFromDb(apiKey, secretKey, credentialsHash);
            return publisherData;
        }
    }
    catch{
        let publisherData = await getPublisherDataFromDb(apiKey, secretKey, credentialsHash);
        return publisherData;
    }
}