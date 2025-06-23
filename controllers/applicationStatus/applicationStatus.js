const debug = require("debug")("darwin:Script:AllAppIdReport");
const Response = require('../../helpers/Response')
const ApplicationStatusModel = require('../../db/applicationStatus/applicationStatus') ;
const Moment = require('moment');
const { setRedisData , getRedisData } = require('../../helpers/Redis');
const { payloadType } = require('../../constants/config');




exports.getAllAppStatus = async () => {
    try {
        let redisData = await getRedisData("APPLICATIONSTATUS");
        if (redisData && !redisData['error'] && redisData['data'] && redisData['data'].length) {
            return JSON.parse(redisData['data']);
        }
        let data  = await await ApplicationStatusModel.getApplicationDetails({}, {}); 
        if (data && data.length) {
            await setRedisData("APPLICATIONSTATUS", data, 0);
        }
        return data;
    } catch (err) {
        return err;
    }
}

exports.getAppDetails = async (req, res) => {
    try {
        let data = await this.getAllAppStatus();
        if (data instanceof Error) {
            let response = Response.error();
            response.msg = "Something went wrong please try again!";
            response.error = [data.message];
            return res.status(200).send(response);
        }
        let response = Response.success();
        response.payloadType = payloadType.object;
        response.payload = data;
        response.msg = "Success";
        return res.status(200).json(response);
    } catch (err) {
        let response = Response.error();
        response.msg = "Something went wrong please try again!";
        response.error = [err.message];
        return res.status(200).send(response);
    }
}
