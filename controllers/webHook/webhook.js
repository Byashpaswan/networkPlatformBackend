const Mongoose = require('mongoose');
const mongooseObjectId = Mongoose.Types.ObjectId;
const OfferModel = require('../../db/offer/Offer');
const publisherModel = require('../../db/publisher/Publisher')
const webhookModel = require('../../db/webhook')
const Response = require('../../helpers/Response');
const { payloadType } = require('../../constants/config');
const Redis = require('../../helpers/Redis');
const { result } = require('lodash');


exports.saveWebhookSetting = async(req,res)=>{
    try{
       const obj = new webhookModel({
        method: req.body.Data.Methods,
        offersKeys: req.body.Data.DataKey,
        url :req.body.Data.url,
        token: req.body.Data.token,
        key: req.body.Data.KeyName,
        event: req.body.Data.Events,
        pid : req.body.Data.pid,
        network_id :req.user.userDetail.network[0]
       })
       let Setting_exists = await webhookModel.findwebhookSetting({'network_id' : req.user.userDetail.network[0]})
       if(Setting_exists && Setting_exists.length){
        let response = Response.error();
        response.msg = "Web-Hook settings already exists..!";
        return res.status(200).json(response);
       }
      await webhookModel.saveSetting(obj).then(result=>{
        Redis.setRedisHashData("webhooksetting:", result.network_id, result, 3600)
        let response = Response.success();
        response.msg = "Web-Hook settings saved succesfully";
        return res.status(200).json(response);
      }).catch(err=>{
        let response = Response.error();
        response.msg = "Something went wrong while saving Data..!";
        response.error = [err.message];
        return res.status(200).json(response);
      })
    }catch(err){
        let response = Response.error();
        response.msg = "Something went wrong !";
        response.error = [err.message];
        return res.status(200).json(response);
    }
}

exports.updateWebhookSetting = async(req,res)=>{
  try{
    let filter ={network_id:req.user.userDetail.network[0]}
    let option = {new:true}
    let update = {
      $set:{
        method: req.body.Data.Methods,
        offersKeys: req.body.Data.DataKey,
        url :req.body.Data.url,
        token: req.body.Data.token,
        key: req.body.Data.KeyName,
        pid : req.body.Data.pid,
        event: req.body.Data.Events,
      }
    }
   await webhookModel.updateSetting(filter,update,option).then(result=>{
    if(result){
      Redis.setRedisHashData("webhooksetting:", result.network_id, result, 3600)
      let response = Response.success();
      response.msg = "Web-Hook settings updated succesfully";
      return res.status(200).json(response);
     }else{
      let response = Response.error();
      response.msg = "No data found..!";
      response.error = [err.message];
      return res.status(200).json(response);
     }
   }).catch(err=>{
     let response = Response.error();
     response.msg = "Something went wrong while update Settings..!";
     response.error = [err.message];
     return res.status(200).json(response);
   })
 }catch(err){
     let response = Response.error();
     response.msg = "Something went wrong !";
     response.error = [err.message];
     return res.status(200).json(response);
 }
}

exports.getOffersKeys = (req, res) => {

    let allKeysOfOffersModel = Object.keys(OfferModel.schema.paths);
    let allNestedKeysOfOffersModel = Object.keys(OfferModel.schema.singleNestedPaths);
    let deleteKeysOffersModel = ['network_id',
        'offer_hash',
        'version',
        'isApiOffer',
        'liveType',
        'isMyOffer',
        'adv_platform_payout_percent',
        'isScraped',
        '__v',
        'revenue_type',
        'payout_type',
        'offer_capping',
        'device_targeting',
        'geo_targeting',
        '_id'];

    allKeysOfOffersModel = allKeysOfOffersModel.filter(item => !deleteKeysOffersModel.includes(item));
    allKeysOfOffersModel.push('link')
    let deleteallNestedKeysOfOffersModel = [
        'revenue_type._id',
        'payout_type._id',
        'geo_targeting._id',
        'geo_targeting.country_allow.key',
        'geo_targeting.country_allow.value',
        'geo_targeting.country_allow._id',
        'geo_targeting.country_deny.key',
        'geo_targeting.country_deny.value',
        'geo_targeting.country_deny._id',
        'geo_targeting.city_allow.key',
        'geo_targeting.city_allow.value',
        'geo_targeting.city_allow._id',
        'geo_targeting.city_deny.key',
        'geo_targeting.city_deny.value',
        'geo_targeting.city_deny._id',
        'device_targeting.os_version',
        'device_targeting.device.$',
        'device_targeting.os.$',
        'device_targeting.os_version.os',
        'device_targeting.os_version.version',
        'device_targeting.os_version.version_condition',
        'device_targeting.os_version._id'];
    allNestedKeysOfOffersModel = allNestedKeysOfOffersModel.filter(item => !deleteallNestedKeysOfOffersModel.includes(item));

    let offerArray = [];
    offerArray.push(allKeysOfOffersModel);
    offerArray.push(allNestedKeysOfOffersModel);

    let response = Response.success();
    response.payloadType = payloadType.array;
    response.payload = offerArray;
    response.msg = "Keys of Offer Collection"
    return res.status(200).json(response);
}

exports.getPublishers = async(req,res) =>{
  try{
    let filter ={network_id:req.user.userDetail.network[0]}
    let projection = {pid:1, company:1, _id:0}
    await publisherModel.getPublisherList(filter,projection).then(result=>{
      let response = Response.success();
      response.payloadType = payloadType.array;
      response.payload = result ;
      return res.status(200).json(response);
    })
  }catch{
    let response = Response.error();
     response.msg = "Something went wrong while fetching publishers list..!";
     response.error = [err.message];
     return res.status(200).json(response);
  }
}

exports.fetcheWebhookSetting = async(req,res) =>{
  try{
    let filter ={network_id:req.user.userDetail.network[0]}
    await webhookModel.findwebhookSetting(filter).then(result=>{
      let response = Response.success();
      response.payloadType = payloadType.array;
      response.payload = result;
      response.msg = "successfully find WHsetting."
      return res.status(200).json(response);
    }).catch(err=>{
      let response = Response.error();
      response.msg = "Settings not found..!";
      response.error = [err.message];
      return res.status(200).json(response);
    })

  }catch(err){
      let response = Response.error();
      response.msg = "Something went worong..!";
      response.error = [err.message];
      return res.status(200).json(response);
  }
}

exports.deleteSetting = async(req,res) =>{
  try{
    let filter = {network_id:req.user.userDetail.network[0]}
    await webhookModel.deletewebhookSetting(filter).then(result=>{
      if(result){
        Redis.delRedisHashData('webhooksetting:',result.network_id);
        let response = Response.success();
        response.payloadType = payloadType.array;
        response.msg = "successfully delete WebHook Setting."
        return res.status(200).json(response);
      }
    })
  }catch(err){
    let response = Response.error();
      response.msg = "Something went worong..!";
      response.error = [err.message];
      return res.status(200).json(response);
  }
}

exports.change_Flag = async(req,res) =>{
  try{
    let search = {network_id:req.user.userDetail.network[0]}
    let update = {$set:{pause:req.body.flag_value}}
    let option = {new:true}
    webhookModel.updateSetting(search,update,option).then(result=>{
    Redis.setRedisHashData("webhooksetting:", result.network_id, result, 3600)
      let response = Response.success();
      response.payloadType = payloadType.array;
      response.msg = "Flag changed successfully."
      return res.status(200).json(response);
    })
  }catch{
    let response = Response.error();
    response.msg = "Something went worong while changing flag ..!";
    response.error = [err.message];
    return res.status(200).json(response);
  }
}