const Mongoose = require('mongoose');
const debug = require("debug")("darwin:Controller:platform");
const mongooseObjectId = Mongoose.Types.ObjectId;
const  PostbackModel  = require('../../db/postback/Postback');
const PublisherModel  = require('../../db/publisher/Publisher');
const Response = require('../../helpers/Response');
const { payloadType } = require('../../constants/config');
const Functions = require("../../helpers/Functions");


exports.showPostback = async (req, res) => {
    let currentPublisher = await PublisherModel.searchOnePublisher({_id:req.body.pubObjId},{pid:1})
    let filter = {};
    let projection = {};
    let invalidSearch = false;

    filter = { publisher_id: +currentPublisher.pid }
    filter['network_id']= mongooseObjectId(req.user.userDetail.network[0]) ;
    
    PostbackModel.showPostback(filter,projection)
    .then(result=>{
        let response = Response.success();
        response.payloadType = payloadType.array;
        response.payload = [];
        response.payload = result;
        response.msg = "successfully get postback";
        if(result.length==0) 
        {
            let response = Response.error();
            response.msg = "No Postback Found !!";
            response.error=["no Postback found"];
            return res.status(200).json(response);
        }
        return res.status(200).send( response )
    })
    .catch(err => {
        let response = Response.error();
        response.msg = "No Postback Found !!";
        response.error = [err.message];
        return res.status(200).json(response);
    })
}

exports.deletePostback = (req, res) => {
    if (req.params.id && mongooseObjectId.isValid(req.params.id.trim()))
    {
        let filter = { _id: req.params.id, network_id: mongooseObjectId(req.user.userDetail.network[0]) };
        let option = {}
        PostbackModel.deletePostback(filter, option).then(result => {
            let response = Response.success();
            response.payloadType = payloadType.object;
            response.payload = {};
            response.msg = "Successfully deleted";
            return res.status(200).send(response)
        })
            .catch(err => {
                let response = Response.error();
                response.payloadType = payloadType.array;
                response.error = [err.message];
                response.msg = "Error in deleting postback";
                return res.status(400).send(response)
            })
    }
    else {
        let response = Response.error();
        response.payloadType = payloadType.array;
        response.error = ["Invalid Request"];
        response.msg = "Invalid Request";
        return res.status(400).send(response) 
    }
    

}


exports.updatePostback = (req, res) => {
    if (req.params.id && mongooseObjectId.isValid(req.params.id.trim()))
    {
        
        let filter = { _id: req.params.id, network_id: mongooseObjectId(req.user.userDetail.network[0]) }
        let parameters = Functions.trimArray(JSON.parse(req.body.parameter));
        let customParameters = Functions.trimArray(JSON.parse(req.body.customParameter));
        let queryParams = '';
        var keys = ['name', 'value'];
        for (let key of parameters) {
            let test = Functions.obsKeysToString(key, keys, '={')
            queryParams = queryParams + test
        }
        for (let key of customParameters) {
            let test = Functions.objectKeyToStringTrimmed(key, keys, '=');
            queryParams = queryParams + test;
        }
        queryParams = queryParams.substring(0, queryParams.length - 1);
        queryParams = queryParams.replace(/\s/g, '');
        token = Functions.Salt(10)
        let update = {
            network_id: req.user.userDetail.network,
            publisher_name: req.body.publisher_name,
            publisher_id: req.body.publisher_id,
            endpoint: req.body.postbackurl,
            parm: queryParams,
            token: token,
            status: "1"
        };
        PostbackModel.updatePostback(filter, update).then(result => {
            let response = Response.success();
            response.payloadType = payloadType.array;
            response.msg = "successfully updated postback";
            return res.status(200).send(response)
        }).catch(err => {
            let response = Response.error();
            response.payloadType = payloadType.array;
            response.error = [err.message];
            response.msg = "Unable to save postback, Try Later";
            return res.status(400).send(response)
        })
    }
    else {
        let response = Response.error();
        response.payloadType = payloadType.array;
        response.error = ["Invalid Request"];
        response.msg = "Invalid Request";
        return res.status(400).send(response) 
    }
    
}