const axios = require("axios");
const debug = require("debug")("darwin:Controller:apiRedisQueue");
const Response = require('../../helpers/Response');
const NetworkModel = require('../../db/network/Network');
const Redis = require("../../helpers/Redis");
const { payloadType } = require("../../constants/config");

exports.getApiRedisQueue = async (req, res) => {
    try {
        let result = [];
        let networkData = await NetworkModel.findAllNetwork({}, { _id: 1, network_unique_id: 1 });
        for (let network of networkData) {
            let key = "APIWRLST:" + network['_id'];
            let redisData = await Redis.getRedisSetData(key);
            if (redisData && !redisData['error'] && redisData['data']) {
                let obj = {
                    networkId: network['_id'],
                    networkUniqueId: network['network_unique_id'],
                    advertiserPlatformIdArray: redisData['data']
                };
                result.push(obj);
            }
        }
        let response = Response.success();
        response.payload = result;
        response.payloadType = payloadType.array;
        response.msg = "success";
        return res.status(200).send(response);
    } catch (error) {
        debug(error);
        let response = Response.error();
        response.error = error.message;
        response.msg = 'Something went wrong. Please try again.';
        return res.status(200).json(response);
    }
}

exports.deleteApiRedisQueueData = async (req, res) => {
    try {
        let key = "APIWRLST:" + req.body.network_id;
        let redisData = await Redis.removeRedisSetMember(key, req.body.advertiser_platform_Id);
        if (req.body.network_id && req.body.advertiser_platform_Id && redisData && !redisData['error'] && redisData['data']) {
            let response = Response.success();
            response.payload = {};
            response.msg = "Redis value has been deleted successfully.";
            return res.status(200).send(response);
        } else {
            let response = Response.error();
            response.error = 'invalid network id or advertiser platform id';
            response.msg = 'Invalid network id or advertiser platform id.';
            return res.status(200).json(response);
        }
    } catch (error) {
        debug(error);
        let response = Response.error();
        response.error = error.message;
        response.msg = 'Something went wrong. Please try again.';
        return res.status(200).json(response);
    }
}

exports.getRabbitMQueueDetails = async (req, res) => {
    try {
        let queueCount = { "Affise": 0, "Offerslook": 0, "Other": 0 };
        const options = {
            method: 'GET',
            url: 'http://54.189.50.9:15672/api/queues',
            params: { page: '1', page_size: '100', name: '', use_regex: 'false', pagination: 'true' },
            headers: { authorization: 'Basic Y29kZTpzMG0zcDRzc3cwcmQ=' }
        };

        let result = await axios.request(options);
        if (result.data && result.data.items) {
            for (const tempObj of result.data.items) {
                if (tempObj.name == "Affise_Api_queue") {
                    queueCount["Affise"] = tempObj.messages
                }
                else if (tempObj.name == "Offerslook_Api_queue") {
                    queueCount["Offerslook"] = tempObj.messages
                }
                else if (tempObj.name == "Offers_Api_queue") {
                    queueCount["Other"] = tempObj.messages
                }
            }
        }

        let response = Response.success();
        response.payload = queueCount;
        response.msg = "Success";
        return res.status(200).send(response);
    } catch (error) {
        console.log("<===== Line 47 ~ getRabbitMqDetails ~ error =====> ", error)
        let response = Response.error();
        response.error = error.message;
        response.msg = 'Something went wrong. Please try again.';
        return res.status(200).json(response);
    }
}