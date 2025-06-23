const Mongoose = require('mongoose');
const debug = require("debug")("darwin:Controller:platform");
const mongooseObjectId = Mongoose.Types.ObjectId;
const PostbackModel = require('../../db/postback/Postback');
const PostbackHoldModel = require('../../db/postback/PostbackHold');
const PublisherModel = require('../../db/publisher/Publisher');
const Response = require('../../helpers/Response');
const { payloadType } = require('../../constants/config');
const Functions = require("../../helpers/Functions");

exports.addPostback = async (req, res) => {
    try {
        let invalidReqMsg = "";
        if (!req.params.id || !mongooseObjectId.isValid(req.params.id.trim())) invalidReqMsg = "Send publisher id!";
        if (!req.body.parameter) invalidReqMsg = "Parameters is required!";
        if (!req.body.postbackurl) invalidReqMsg = "Postback url is required!";
        if (invalidReqMsg) {
            let response = Response.error();
            response.msg = invalidReqMsg;
            return res.status(400).send(response);
        }

        let pubData = await PublisherModel.searchOnePublisher(
            { _id: mongooseObjectId(req.params.id) },
            { name: 1, pid: 1, company: 1 }
        );
        if (!pubData) {
            let response = Response.error();
            response.msg = "Publisher not found!";
            return res.status(204).send(response);
        }

        let postbackExitsData = await PostbackModel.getPostback(
            { network_id: mongooseObjectId(req.user.userDetail.network[0]), publisher_id: pubData.pid, endpoint: req.body.postbackurl },
            {}
        );
        if (postbackExitsData && postbackExitsData.length) {
            let response = Response.error();
            response.msg = "Postback already exits!";
            return res.status(204).send(response);
        }

        let queryParams = '';

        let parameters = Functions.trimArray(JSON.parse(req.body.parameter));
        for (let key of parameters) {
            let test = Functions.obsKeysToString(key, ['name', 'value'], '={')
            queryParams = queryParams + test
        }
        if (req.body.customParameter) {
            let customParameters = Functions.trimArray(JSON.parse(req.body.customParameter));
            for (let key of customParameters) {
                let test = Functions.objectKeyToStringTrimmed(key, ['name', 'value'], '=');
                queryParams = queryParams + test;
            }
        }

        let postbackData = {
            network_id: mongooseObjectId(req.user.userDetail.network[0]),
            publisher_id: pubData.pid,
            publisher_name: pubData.company,
            endpoint: req.body.postbackurl,
            parm: queryParams,
            token: Functions.Salt(10),
            status: "1"
        }
        await PostbackModel.savePostback(postbackData);

        let response = Response.success();
        response.payloadType = payloadType.array;
        response.payload = { 'publisher_id': pubData.pid };
        response.msg = "successfully save postback";
        return res.status(200).send(response)
    } catch (error) {
        let response = Response.error();
        response.payloadType = payloadType.array;
        response.msg = "Server internal error!";
        return res.status(500).send(response)
    }
}

exports.changeStatus = async (req, res) =>{

    try{
        let filter = {};
        if (req.params.publisher_id) {
            filter = { _id: mongooseObjectId(req.params.publisher_id) }
            
        }else{
            let response = Response.error();
            response.msg = " please provide publisher_id !";
            return res.status(404).json(response);
        }
        await PublisherModel.findAndUpdatePublisher(filter , { "Apistatus" : req.body.status } )
        let response = Response.success();
        response.payload = [];
        response.msg = `Successfully publisher ${req.body.status} updated `;
        return res.status(200).send(response)

    }catch(err){
        let response = Response.error();
        response.msg = " Something went wrong !" ;
        return res.status(404).json(response);

    }
}
exports.showPostback = async (req, res) => {
    try {
        let invalidSearch = false;
        let filter = { 'network_id': mongooseObjectId(req.user.userDetail.network[0]) };
        if (req.params.publisher_id) {
            if (!isNaN(req.params.publisher_id)) filter = { publisher_id: +req.params.publisher_id }
            else invalidSearch = true;
        }
        else if (req.params.id) {
            if (mongooseObjectId.isValid(req.params.id.trim())) filter = { _id: mongooseObjectId(req.params.id) }
            else invalidSearch = true;
        }
        else if (req.accountid && req.user_category != 'advertiser') filter = { publisher_id: +req.accountid }

        if (invalidSearch) {
            let response = Response.error();
            response.msg = "Send proper request!";
            return res.status(404).json(response);
        }
        let postbackList = await PostbackModel.showPostback(filter, {});
        if (!postbackList || !postbackList.length) {
            let response = Response.error();
            response.msg = "No Postback Found !!";
            return res.status(204).json(response);
        }

        let response = Response.success();
        response.payload = postbackList;
        response.msg = "successfully get postback";
        return res.status(200).send(response)
    } catch (error) {
        console.log(error);
        let response = Response.error();
        response.msg = "Server internal error!";
        return res.status(500).json(response);
    }
}
exports.updatePostback = async (req, res) => {
    try {
        let invalidReqMsg = "";
        if (!req.params.id || !mongooseObjectId.isValid(req.params.id.trim())) invalidReqMsg = "Send postback id!";
        if (!req.body.postbackurl) invalidReqMsg = "Postback url is required!";
        if (invalidReqMsg) {
            let response = Response.error();
            response.msg = invalidReqMsg;
            return res.status(400).send(response);
        }

        let filter = { _id: mongooseObjectId(req.params.id) }
        let queryParams = '';
        if (req.body.parameter) {
            let parameters = Functions.trimArray(JSON.parse(req.body.parameter));
            for (let key of parameters)
                queryParams = queryParams + Functions.obsKeysToString(key, ['name', 'value'], '={')
        }
        if (req.body.customParameter) {
            let customParameters = Functions.trimArray(JSON.parse(req.body.customParameter));
            for (let key of customParameters)
                queryParams = queryParams + Functions.objectKeyToStringTrimmed(key, ['name', 'value'], '=')
        }
        queryParams = queryParams.substring(0, queryParams.length - 1);
        queryParams = queryParams.replace(/\s/g, '');

        let updateData = { endpoint: req.body.postbackurl };
        if (queryParams) updateData['parm'] = queryParams;

        let updateResult = await PostbackModel.updatePostback(filter, updateData);
        if (!updateResult) {
            let response = Response.error();
            response.payloadType = payloadType.array;
            response.msg = "Unable to update postback, Try Later";
            return res.status(400).send(response)
        }

        let response = Response.success();
        response.payloadType = payloadType.array;
        response.msg = "Hold postback successfully updated, Wait for approve!";
        return res.status(200).send(response)
    } catch (error) {
        let response = Response.error();
        response.payloadType = payloadType.array;
        response.msg = "Server internal error!";
        return res.status(500).send(response)
    }
}
exports.deletePostback = async (req, res) => {
    try {
        if (!req.params.id) {
            let response = Response.error();
            response.msg = "Send postback id!";
            return res.status(400).json(response);
        }

        let delStatus = await PostbackModel.deletePostback({ _id: mongooseObjectId(req.params.id) });
        if (!delStatus) {
            let response = Response.error();
            response.msg = "Not found!";
            return res.status(404).json(response);
        }
        let response = Response.success();
        response.msg = "Delete successfully!";
        return res.status(200).json(response);
    } catch (error) {
        console.log(error);
        let response = Response.error();
        response.msg = "Server internal error!";
        return res.status(500).send(response);
    }
}

exports.getAllHoldPostback = async (req, res) => {
    try {
        let invalidSearch = false;
        let filter = { 'network_id': mongooseObjectId(req.user.userDetail.network[0]) };
        if (req.params.publisher_id) {
            if (!isNaN(req.params.publisher_id)) filter = { publisher_id: +req.params.publisher_id }
            else invalidSearch = true;
        }
        else if (req.params.id) {
            if (mongooseObjectId.isValid(req.params.id.trim())) filter = { _id: mongooseObjectId(req.params.id) }
            else invalidSearch = true;
        }
        else if (req.accountid && req.user_category != 'advertiser') filter = { publisher_id: +req.accountid }

        if (invalidSearch) {
            let response = Response.error();
            response.msg = "Send proper request!";
            return res.status(404).json(response);
        }
        let postbackList = await PostbackHoldModel.getAllHoldPostback(filter, {});
        if (!postbackList || !postbackList.length) {
            let response = Response.error();
            response.msg = "No Hold Postback Found!";
            return res.status(204).json(response);
        }

        let response = Response.success();
        response.payload = postbackList;
        response.msg = "Success!";
        return res.status(200).send(response)
    } catch (error) {
        console.log(error);
        let response = Response.error();
        response.msg = "Server internal error!";
        return res.status(500).json(response);
    }
}
exports.saveHoldPostback = async (req, res) => {
    try {
        let invalidReqMsg = "";
        if (!req.body.publisher_id) invalidReqMsg = "Send publisher id!";
        if (!req.body.parameter) invalidReqMsg = "Parameters is required!";
        if (!req.body.postbackurl) invalidReqMsg = "Postback url is required!";
        if (invalidReqMsg) {
            let response = Response.error();
            response.msg = invalidReqMsg;
            return res.status(400).send(response);
        }

        let pubData = await PublisherModel.searchOnePublisher(
            { pid: req.body.publisher_id, network_id: mongooseObjectId(req.user.userDetail.network[0]) },
            { name: 1, pid: 1, company: 1 }
        );
        if (!pubData) {
            let response = Response.error();
            response.msg = "Publisher not found!";
            return res.status(204).send(response);
        }

        let holdPostbackExitsData = await PostbackHoldModel.getHoldPostback(
            { network_id: mongooseObjectId(req.user.userDetail.network[0]), pid: req.body.publisher_id, endpoint: req.body.postbackurl }
        );
        if (holdPostbackExitsData) {
            let response = Response.error();
            response.msg = "Hold postback already exits!";
            return res.status(204).send(response);
        }

        let queryParams = '';

        let parameters = Functions.trimArray(JSON.parse(req.body.parameter));
        for (let key of parameters) {
            let test = Functions.obsKeysToString(key, ['name', 'value'], '={')
            queryParams = queryParams + test
        }
        if (req.body.customParameter) {
            let customParameters = Functions.trimArray(JSON.parse(req.body.customParameter));
            for (let key of customParameters) {
                let test = Functions.objectKeyToStringTrimmed(key, ['name', 'value'], '=');
                queryParams = queryParams + test;
            }
        }

        let holdPostbackData = {
            network_id: mongooseObjectId(req.user.userDetail.network[0]),
            publisher_id: pubData.pid,
            publisher_name: pubData.company,
            endpoint: req.body.postbackurl,
            parm: queryParams,
            token: Functions.Salt(10),
            status: "3"
        }
        await PostbackHoldModel.saveHoldPostback(holdPostbackData);

        let response = Response.success();
        response.payload = { 'publisher_id': req.body.publisher_id };
        response.msg = "Wait for approval!";
        return res.status(200).send(response)
    } catch (error) {
        console.log(error);
        let response = Response.error();
        response.msg = "Server internal error!";
        return res.status(500).send(response);
    }
}
exports.updateHoldPostback = async (req, res) => {
    try {
        let invalidReqMsg = "";
        if (!req.params.id || !mongooseObjectId.isValid(req.params.id.trim())) invalidReqMsg = "Send hold postback id!";
        if (!req.body.postbackurl) invalidReqMsg = "Postback url is required!";
        if (invalidReqMsg) {
            let response = Response.error();
            response.msg = invalidReqMsg;
            return res.status(400).send(response);
        }

        let filter = { _id: mongooseObjectId(req.params.id) }
        let queryParams = '';
        if (req.body.parameter) {
            let parameters = Functions.trimArray(JSON.parse(req.body.parameter));
            for (let key of parameters)
                queryParams = queryParams + Functions.obsKeysToString(key, ['name', 'value'], '={')
        }
        if (req.body.customParameter) {
            let customParameters = Functions.trimArray(JSON.parse(req.body.customParameter));
            for (let key of customParameters)
                queryParams = queryParams + Functions.objectKeyToStringTrimmed(key, ['name', 'value'], '=')
        }
        queryParams = queryParams.substring(0, queryParams.length - 1);
        queryParams = queryParams.replace(/\s/g, '');

        let updateData = { endpoint: req.body.postbackurl };
        if (queryParams) updateData['parm'] = queryParams;

        let updateResult = await PostbackHoldModel.updateHoldPostback(filter, updateData);
        if (!updateResult) {
            let response = Response.error();
            response.payloadType = payloadType.array;
            response.msg = "Unable to update postback, Try Later";
            return res.status(400).send(response)
        }

        let response = Response.success();
        response.payloadType = payloadType.array;
        response.msg = "Hold postback successfully updated, Wait for approve!";
        return res.status(200).send(response)
    } catch (error) {
        let response = Response.error();
        response.payloadType = payloadType.array;
        response.msg = "Server internal error!";
        return res.status(500).send(response)
    }
}
exports.approveHoldPostback = async (req, res) => {
    try {
        if (!req.params.holdPostbackId) {
            let response = Response.error();
            response.msg = "Send postback id!";
            return res.status(400).json(response);
        }

        let holdPostbackData = await PostbackHoldModel.deleteAndGetHoldPostbackData({ _id: mongooseObjectId(req.params.holdPostbackId) });
        if (!holdPostbackData) {
            let response = Response.error();
            response.msg = "Not found!";
            return res.status(404).json(response);
        }
        // console.log({ endpoint: holdPostbackData.endpoint, param: holdPostbackData.parm.slice(0, -1) });
        holdPostbackData.parm = holdPostbackData.parm.slice(0, -1);
        holdPostbackData.status = '1';
        delete holdPostbackData.createdAt;
        delete holdPostbackData.updatedAt;
        let updateResult = await PostbackModel.updatePostback(
            { network_id: mongooseObjectId(req.user.userDetail.network[0]), publisher_id: holdPostbackData.publisher_id },
            holdPostbackData,
            { upsert: true, new: true });
        if (!updateResult) {
            let response = Response.error();
            response.msg = "Unable to update postback, Try Later ";
            return res.status(400).send(response)
        }

        let response = Response.success();
        response.msg = "New Postback Activated successfully!";
        return res.status(200).json(response);
    } catch (error) {
        console.log(error);
        let response = Response.error();
        response.msg = "Server internal error!";
        return res.status(500).send(response);
    }
}
exports.deleteHoldPostback = async (req, res) => {
    try {
        if (!req.params.holdPostbackId) {
            let response = Response.error();
            response.msg = "Send postback id!";
            return res.status(400).json(response);
        }

        let delStatus = await PostbackHoldModel.deleteHoldPostback({ _id: mongooseObjectId(req.params.holdPostbackId) });
        if (!delStatus) {
            let response = Response.error();
            response.msg = "Not found!";
            return res.status(404).json(response);
        }
        let response = Response.success();
        response.msg = "Delete successfully!";
        return res.status(200).json(response);
    } catch (error) {
        console.log(error);
        let response = Response.error();
        response.msg = "Server internal error!";
        return res.status(500).send(response);
    }
}