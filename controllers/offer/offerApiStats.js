const Mongoose = require('mongoose');
const mongooseObjectId = Mongoose.Types.ObjectId;
const AdvertiserModel = require('../../db//advertiser/Advertiser');
const OfferApiStatsModel = require('../../db/offer/OfferApiStats');

const Response = require('../../helpers/Response');
const { payloadType } = require('../../constants/config');
const moment = require('moment');
const { distinct } = require('../../db/offer/OfferApiStats');
const { PlatformModel } = require('../../db/platform/Platform');
const debug = require("debug")("darwin:Controller:OfferApiStats");
const Producer = require('../../helpers/priorityRabbitMQ');
const { incrbyRedisData, getRedisData, removeRedisSetMember } = require('../../helpers/Redis');
const { apiPlugins } = require("../../plugin");
const { publishOfferApiStats, defaultLog } = require("../../plugin/plugin");
const Promise = require('promise');
const Functions = require("../../helpers/Functions");

const AdvertiserOfferStats = require('../../db/offer/AdvertiserOfferStats');
const {SourceAdvertiserAffiliateSummaryModel} =require('../../db/click/sourceSummary/sourceSummary')

exports.getOfferApiStats = async (req, res) => {
    let limit = 1;
    if (req.query.advertiser && mongooseObjectId.isValid(req.query.advertiser.trim())) {
        if (req.query.limit && !isNaN(req.query.limit)) {
            limit = parseInt(req.query.limit);
        }
        let advertiser_id = mongooseObjectId(req.query.advertiser.trim());
        try {
            let result = await OfferApiStatsModel.getCompleteOfferApiStats({
                advertiser_id: advertiser_id, network_id: mongooseObjectId(req.user.userDetail.network[0])
            }, {}, limit);
            if (result && result.length > 0) {
                let response = Response.success();
                response.payloadType = payloadType.array;
                response.payload = result;
                response.msg = "success";
                return res.status(200).json(response);
            }
            else {
                let response = Response.error();
                response.msg = "No Log Availabe";
                response.error = ["No Log Availabe"];
                return res.status(200).json(response);
            }
        }
        catch (err) {
            let response = Response.error();
            response.msg = "Not found";
            response.error = [err.message];
            return res.status(200).json(response);
        }
    } else {
        let response = Response.error();
        response.msg = "Invalid Request or Missing mandatory Parameters";
        response.error = ["Invalid Request"];
        return res.status(200).json(response);
    }
}

exports.getallofferApistats = async function (req, res) {
    try {
        let filter = {};
        let groupBy = {}
        let sort = { advertiser_name: 1 };
        let options = { sort: sort, limit: 10, skip: 0 };

        filter['network_id'] = mongooseObjectId(req.user.userDetail.network[0]);
        if (req.query.start_date && req.query.end_date) {
            filter['createdAt'] = {
                $gte: moment(req.query.start_date.trim()).startOf('day').toDate(),
                $lte: moment(req.query.end_date.trim()).endOf('day').toDate()
            };
        }
        if (req.query.advertiser) {
            filter["advertiser_id"] = mongooseObjectId(req.query.advertiser);
        }

        groupBy = { _id: "$advertiser_platform_id", latestDate: { $max: { $mergeObjects: [{ "createdAt": "$createdAt" }, "$$ROOT"] } } };

        if (req.query.limit && !isNaN(req.query.limit)) {
            options['limit'] = +req.query.limit;
        }
        if (req.query.current_page && !isNaN(req.query.current_page)) {
            options['skip'] = +req.query.limit * (+req.query.current_page - 1);
        }

        let data = await OfferApiStatsModel.getStatsOffers(filter, groupBy, options);
        let count = await OfferApiStatsModel.countStatsOffers(filter, groupBy);
        let result = { data: [], totalCount: 0 };
        if (data && count[0]) {
            result = { data: data, totalCount: count[0] };
        }
        let response = Response.success();
        response.payloadType = payloadType.array;
        response.payload = result;
        response.msg = "Success";
        return res.status(200).send(response);
    } catch (e) {
        console.log(e);
        let response = Response.error();
        response.payloadType = payloadType.array;
        response.error = [e.message];
        response.msg = "Something Went Wrong!";
        return res.status(400).send(response);
    }
}

exports.getAdvertiserName = async (req, res) => {
    let filter = {
        network_id: mongooseObjectId(req.user.userDetail.network[0]),
    }
    let projection = {
        company: 1,
        aid:1
    }
    let result = await AdvertiserModel.getAdvertiserName(filter, projection)
    let response = Response.success();
    response.payloadType = payloadType.array;
    response.payload = result;
    response.msg = "success";
    return res.status(200).send(response)
}

exports.updateOfferInstantly = async (req, res) => {
    try {

        let redisRes = await getRedisData("REFRESHAPI:" + req.user.userDetail.network[0]);
        if (redisRes && redisRes.data) {
            if (redisRes.data >= 15) {
                let response = Response.success();
                response.msg = "Limit has reached, Try after 1 Hour ";
                return res.status(200).send(response)
            }
        }

        if (!req.body || !req.body.advertiser_id) {
            let response = Response.error();
            response.msg = "Select Active Adertiser";
            return res.status(400).send(response);
        }

        let jobPushedComplete = false;
        let filter = {
            network_id: mongooseObjectId(req.user.userDetail.network[0]),
            advertiser_id: mongooseObjectId(req.body.advertiser_id),
            status: "1"
        }

        let platformList = await PlatformModel.getPlatform(filter, {});
        if (platformList && platformList.length > 0) {
            for (let m = 0; m < platformList.length; m++) {
                let obj = platformList[m];
                let credentials = {};
                let content = {};
                obj.credentials.map(apiCredentials => {
                    credentials[apiCredentials.key] = apiCredentials.val;
                })
                content['network_id'] = obj.network_id;
                content['advertiser_id'] = obj.advertiser_id;
                content['advertiser_name'] = obj.advertiser_name;
                content['platform_id'] = obj.platform_id;
                content['platform_name'] = obj.platform_name;
                content['credentials'] = credentials;
                content['offer_live_type'] = obj.offer_live_type;
                content['visibility_status'] = obj.offer_visibility_status;
                content['publishers'] = obj.publishers;
                content['payout_percent'] = obj.payout_percent;
                content['advertiser_platform_id'] = obj._id;
                if (obj.credentials.length > 0) {
                    let publish_queue = await getPublicQueueForApi(obj.platform_name)
                    let offerLog = defaultLog();
                    let saveStatus = await publishOfferApiStats(offerLog, content, remarks = "In Queue From UI");
                    if (saveStatus) {
                        content['offer_api_stats_id'] = saveStatus;
                        content['fetch_offer_from_ui'] = true;
                        let publish_result = await Producer.publish_Content(false, publish_queue, content, true, true, 20);
                        if (!publish_result) {
                            let response = Response.error();
                            response.msg = "Error when publish jobs";
                            return res.status(400).send(response);
                        }
                        await removeRedisSetMember(`APIWRLST:${content.network_id}`, content.advertiser_platform_id)
                        jobPushedComplete = true;
                    }
                }
            }
            if (jobPushedComplete) {
                await incrbyRedisData("REFRESHAPI:" + req.user.userDetail.network[0], 1, 3600);
                let response = Response.success();
                response.msg = "Check offer after 5 minutes";
                return res.status(200).send(response)
            }
        }
        else {
            let response = Response.success();
            response.msg = "No Platfrom Active";
            return res.status(200).send(response)
        }
    } catch (error) {
        console.log("file: offerApiStats.js ~ line 198 ~ updateOfferInstantly ~ error", error)
        let response = Response.error();
        response.error = [error.message];
        response.msg = "Something Went Wrong!";
        return res.status(400).send(response);
    }
}

const getPublicQueueForApi = async (platform_name) => {

    if (platform_name == "Affise") {
        return "Affise_Api_queue"
    }
    else if (platform_name == "Offerslook") {
        return "Offerslook_Api_queue"
    }
    else {
        return "Offers_Api_queue"
    }
}

exports.getApiOffersForTestApi = async (req, res) => {

    try {

        if (!req.body.credentials && !req.body.platform_name) {
            let response = Response.error();
            response.msg = "Send Advertiser Platform Id";
            return res.status(400).send(response);
        }

        let { credentials, platform_name } = req.body;
        credentials = credentials.reduce((acc, curr) => {
            acc[curr.key] = curr.val;
            return acc
        }, {});

        let result;
        try {
            let page = 1
            if (platform_name.trim() == 'Offer18') {
                page = 0
            }
            result = await apiPlugins[platform_name.trim()].apiCall(credentials, page, 100);
        } catch (apiCallError) {
            let response = Response.error();
            response.msg = 'Update Network Domain or Api url not working, error';
            return res.status(400).send(response);
        }

        if (result && result.data) {
            let response = Response.success();
            response.payload = result.data;
            response.msg = "success";
            return res.status(200).send(response)
        }
        else {
            let response = Response.error();
            response.msg = 'Check Network Domain or Api url not working';
            return res.status(200).send(response);
        }
    } catch (error) {
        debug(error)
        let response = Response.error();
        response.error = [error.message];
        response.msg = "Something Went Wrong!";
        return res.status(400).send(response);
    }
}

exports.getAdvertiserOffers = async (req, res) => {

    try {
        let filter = {};
        let groupBy = {}
        let sort = { advertiser_name: 1 };
        let options = { sort: sort, limit: 10, skip: 0 }

        filter["network_id"] = mongooseObjectId(req.user.userDetail.network[0])
         if(req.query.status!=='' && req.query.status!=='Live'){
            filter['status']=req.query.status.trim();
         }
         if (req.query.status === 'Live' && req.query.start_date && req.query.end_date) {
            let startDate = moment(req.query.start_date.trim()).startOf('day').toDate();
            let endDate = moment(req.query.end_date.trim()).endOf('day').toDate();
            let filteredData = await SourceAdvertiserAffiliateSummaryModel.fetchDailySummary(
                {
                    'network_id': mongooseObjectId(req.user.userDetail.network[0]),
                    'timeSlot': { $gte: startDate, $lte: endDate }
                },
                { _id: null, advertiser_id: { $addToSet: '$advertiser_id' } }
            );
            if (!filteredData || !filteredData[0] || !filteredData[0]['advertiser_id'].length) {
                let response = Response.error();
                response.msg = "No Advertiser Found";
                return res.status(204).json(response);
            }
                filter['advertiser_id'] = { $in: filteredData[0]['advertiser_id'] };
        }
       if (req.query.advertiser && req.query.status.trim() !=='Live') {
         filter["advertiser_id"] = mongooseObjectId(req.query.advertiser.trim());
      }



        groupBy = { _id: "$advertiser_id", latestDate: { $max: { $mergeObjects: [{ "createdAt": "$createdAt" }, "$$ROOT"] } } };
        if (req.query.limit && !isNaN(req.query.limit)) {
            options['limit'] = +req.query.limit;
        }
        if (req.query.current_page && !isNaN(req.query.current_page)) {
            options['skip'] = +req.query.limit * (+req.query.current_page - 1);
        }
        let advertiserdata = await AdvertiserOfferStats.getStatsOffers(filter, groupBy, options)
        let count = await AdvertiserOfferStats.countStatsOffers(filter, groupBy);
        let result = { data: [], totalCount: 0 };
        if (advertiserdata && count[0]) {
            result = { data: advertiserdata, totalCount: count[0] }
        }
        let response = Response.success();
        response.payloadType = payloadType.array;
        response.payload = result;
        response.msg = 'success';
        return res.status(200).send(response)

    }
    catch (error) {

        let response = Response.error();
        response.payloadType = payloadType.array;
        response.error = [error.message];
        response.msg = "Something Went Wrong!";
        return res.status(400).send(response);

    }
}

