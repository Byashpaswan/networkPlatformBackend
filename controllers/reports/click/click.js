const Mongoose = require('mongoose');
const debug = require("debug")("darwin:Controller:report:click");
const mongooseObjectId = Mongoose.Types.ObjectId;
const Response = require('../../../helpers/Response');
var redis = require("../../../helpers/Redis");
var { ClickLogModel } = require("../../../db/click/clickLog");
const { payloadType } = require('../../../constants/config');
const { setRedisHashData } = require('../../../helpers/Redis');
const { filterHash, getCacheData } = require('../../../helpers/Functions');
var Moment = require('moment');

exports.getClickReport = async (req, res) => {
    req.setTimeout(100000);
    try {
        let filter = {};
        let projection = {};
        let limit = 100;
        let page = 1;
        let skip = 0;
        let sort = { "_id.year": -1, "_id.month": -1, "_id.day": -1 }
        startDate = Moment(req.body.data.start_date).toDate();
        endDate = Moment(req.body.data.end_date).toDate();
        filter = { createdAt: { $gte: startDate, $lte: endDate } };
        //filter["is_conversion"] = true;
        // filter = {network_id:mongooseObjectId(req.user.userDetail.network[0])};
        filter["network_id"] = mongooseObjectId(
            req.user.userDetail.network[0]
        );
        if (req.body.data.offer_id) {
            if (mongooseObjectId.isValid(req.body.data.offer_id.trim())) {
                filter['offer_id'] = mongooseObjectId(req.body.data.offer_id.trim());
            }
            else {
                filter['offer_name'] = { $regex: req.body.data.offer_id.trim(), $options: 'i' };
            }
        }
        //
        if (req.user_category == 'advertiser') {
            filter["advertiser_id"] = req.user.userDetail.parentId;
        } else if (req.user_category == 'network') {
            if (req.loginType == 'advertiser') {
                filter["advertiser_id"] = req.loginId;
            }
            if (req.loginType == 'publisher') {
                filter["publisher_id"] = +req.accountid;
            }
            else {
                if (!req.permissions.includes("adv.list")) {
                    // if (req.user.userDetail.parentId.length && req.advertiser.length) {
                    advertiser = req.advertiser.map(data => data.id);
                    filter["advertiser_id"] = { $in: advertiser };
                }
            }
        }
        else if (req.user_category == 'publisher') {
            filter['publisher_id'] = +req.accountid;
        }

        if (req.body.data.publisher_id) {
            filter['publisher_id'] = +req.body.data.publisher_id;
        }
        if (req.body.data.advertiser_id) {
            filter['advertiser_id'] = mongooseObjectId(req.body.data.advertiser_id);
        }

        if (req.body.data.source) {
            filter[req.body.data.source] = req.body.data.sourceValue;
        }
        if (req.body.projection.limit && req.body.projection.limit != 0) {
            limit = +req.body.projection.limit;
        }
        if (req.body.projection.page && req.body.projection.page != 0) {
            page = +req.body.projection.page;
            skip = (page - 1) * limit;
        }

        if (req.body.projection.groupfilter) {
            if (req.body.projection.groupfilter.trim() == 'day') {
                if (req.body.projection.day.includes('Day')) {
                    projection['year'] = { $year: "$createdAt" };
                    projection['month'] = { $month: "$createdAt" };
                    projection['day'] = { $dayOfMonth: "$createdAt" };
                } else if (req.body.projection.day.includes('Month')) {
                    projection['month'] = { $month: "$createdAt" };
                    projection['year'] = { $year: "$createdAt" };
                } else {
                    projection['year'] = { $year: "$createdAt" };
                    projection['month'] = { $month: "$createdAt" };
                    projection['day'] = { $dayOfMonth: "$createdAt" };
                }
            }
            else if (req.body.projection.groupfilter.trim() == 'offer') {
                projection['offer_name'] = "$offer_name";
                projection['offer_id'] = "$offer_id";
            }
            else if (req.body.projection.groupfilter.trim() == 'publisher') {
                projection['publisher_id'] = "$publisher_id";
            }
            else if (req.body.projection.groupfilter.trim() == 'advertiser') {
                projection['advertiser_id'] = "$advertiser_id";
            }
            else {
                sort = { conversion: -1 };
                projection[req.body.projection.groupfilter.trim()] = '$' + req.body.projection.groupfilter.trim();
            }
        } else {
            if (req.body.projection.day.includes('Day')) {
                projection['year'] = { $year: "$createdAt" };
                projection['month'] = { $month: "$createdAt" };
                projection['day'] = { $dayOfMonth: "$createdAt" };
            } else if (req.body.projection.day.includes('Month')) {
                projection['month'] = { $month: "$createdAt" };
                projection['year'] = { $year: "$createdAt" };
            } else {
                projection['year'] = { $year: "$createdAt" };
                projection['month'] = { $month: "$createdAt" };
                projection['day'] = { $dayOfMonth: "$createdAt" };
            }
        }
        if (req.body.sort && Object.keys(req.body.sort).length) {
            sort = {};
            sort = req.body.sort;
        }
        //
        // let key = filterHash({ filter: filter, projection: projection, limit: limit, skip: skip, sort: sort });
        // let hash = req.path;
        // let data = await getCacheData(hash, key);
        let result = { data: [], sum: null };
        let data = await ClickLogModel.getDailySummary(filter, projection, limit, skip, sort);
        if (data) {
            result['data'] = data;
            result['page'] = page;
            result['pageSize'] = limit;
            try {
                sumReport = await ClickLogModel.getReportSummary(filter);
                if (sumReport) {
                    result['sum'] = sumReport[0]
                }
            }
            catch {
            }
            try {
                let countRes = await ClickLogModel.getSummaryCount(filter, projection);
                if (countRes && countRes.length) {
                    result['total'] = countRes[0].total;
                }
            }
            catch {
            }
            // setRedisHashData(hash, key, result, process.env.REDIS_OFFER_EXP)
        }
        // else {
        //     result = data;
        // }
        if (!data) {
            let response = Response.error();
            response.msg = "error while fetch data";
            return res.status(200).json(response);
        }
        if (result['data'].length == 0) {
            let response = Response.success();
            response.payloadType = payloadType.array;
            response.payload = result;
            response.msg = "No record found";
            return res.status(400).send(response)
        }
        let response = Response.success();
        response.payloadType = payloadType.array;
        response.payload = result;
        response.msg = "success";
        return res.status(200).send(response)
    }
    catch (e) {
        let response = Response.error();
        response.msg = "fail to load data";
        response.error = [e.message]
        return res.status(400).send(response)
    }
}

exports.getClickDb = (req, res) => {

    let [filter, projection] = [{}, {}];
    let options = { sort: { _id: 1 } };
    ClickLogModel.clicks(filter, projection, options)
        .then(result => {
            if (!result) {
                let response = Response.error();
                response.payloadType = payloadType.array;
                response.payload = [];
                response.msg = "fail";
                return res.status(400).send(response)
            }
            let response = Response.success();
            response.payloadType = payloadType.array;
            response.payload = result;
            response.msg = "success";
            return res.status(200).send(response)
        })
        .catch(err => {
            let response = Response.error();
            response.payloadType = payloadType.array;
            response.error = [err.message];
            response.msg = "fail";
            return res.send(response)
        })
}
