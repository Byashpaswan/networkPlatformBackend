const axios = require('axios');
const Response = require('../../helpers/Response');
const { payloadType } = require('../../constants/config');
const { setRedisData, getRedisData } = require('../../helpers/Redis');

exports.campaigns = async () => {
    try {
        let redisData = await getRedisData("CAMPAIGNS");
        if (redisData && !redisData['error'] && redisData['data'] && redisData['data'].length) {
            return JSON.parse(redisData['data']);
        }
        let url = 'http://affise.c2a.in/campaigns.php';
        let result = await axios({
            method: 'get',
            url: url
        });
        let data = [];
        if (result && result['data']) {
            for (const [key, value] of Object.entries(result['data'])) {
                value['app_id'] = key;
                if (value['status'] && value['status'].trim()) {
                    data.push(value);
                }
            }
        }
        if (data && data.length) {
            await setRedisData("CAMPAIGNS", data, 300);
        }
        return data;
    } catch (err) {
        return err;
    }
}

exports.getCampaigns = async (req, res) => {
    try {
        let data = await this.campaigns();
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