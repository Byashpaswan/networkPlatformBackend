const Mongoose = require('mongoose');
const mongooseObjectId = Mongoose.Types.ObjectId;
const AppIdSummaryModel = require('../../db/appIdSummary');
const PackageSummaryModel = require('../../db/packageSummary');
const Response = require('../../helpers/Response');
const { payloadType } = require('../../constants/config');
const moment = require('moment');
const debug = require("debug")("darwin:Controller:Summary:appidSummary");
const { campaigns } = require('../../controllers/campaigns/Campaigns');
const jwt = require('jsonwebtoken');

exports.getSummary = async (req, res) => {

    let filter = {};
    let options = {};
    let page = 1;
    let limit = 50;
    let skpage = 0;

    if (req.body.limit && !isNaN(req.body.limit)) {
        limit = parseInt(req.body.limit);
    }
    if (req.body.page && !isNaN(req.body.page)) {
        page = parseInt(req.body.page)

        skpage = (page - 1) * limit;
    }
    if (req.body.start_date && req.body.end_date) {
        filter['date'] = { $gte: moment(req.body.start_date.trim()).toDate(), $lte: moment(req.body.end_date.trim()).toDate() }
    }
    if (req.body.app_id) {
        filter['app_id'] = req.body.app_id.trim();
    }

    filter['network_id'] = mongooseObjectId(req.user.userDetail.network[0]);
    try {
        let output = { result: [], totalAppidCount: 0, campaigns: [], campaignsError: null };
        let result = []
        if (req.body.showAllAppid) {
            delete filter['date'];
            result = await PackageSummaryModel.getAllSearchRecord(filter, limit, skpage);
            if (result.length) {
                let countData = await PackageSummaryModel.getTotalPagesCount(filter);
                if (countData) {
                    output['totalAppidCount'] = countData;
                }
                output['result'] = result
            }
        }
        else {
            result = await AppIdSummaryModel.searchSummaryByDate(filter, limit, skpage);
            if (result.length) {
                let countObject = await AppIdSummaryModel.getTotalPagesCount(filter);
                if (countObject.length) {
                    output['totalAppidCount'] = countObject[0]['total'];
                }
                output['result'] = result
            }
        }

        let camp = await campaigns();
        if (camp && camp.length && !(camp instanceof Error)) {
            output['campaigns'] = camp;
        } else {
            output['campaignsError'] = camp;
        }

        output['pageSize'] = limit;
        output['page'] = page;

        let response = Response.success();
        response.payloadType = payloadType.object;
        response.payload = output;
        response.msg = "success";
        return res.status(200).json(response);
    }
    catch (err) {
        console.log("file: appIdSummary.js ~ line 78 ~ exports.getSummary= ~ err", err)
        let response = Response.error();
        response.msg = "Unable to fetch Records";
        response.error = [err.message];
        return res.status(400).json(response);
    }
}

exports.getExternalPackageSummary = async (req, res) => {
    try {
        let startDate = moment().startOf('day').subtract(1, 'month');
        let endDate = moment().endOf('day');
        let filter = { date: { '$gte': startDate.toDate(), '$lte': endDate.toDate() } };
        let page = 1;
        let options = { limit: 50, skip: 0, lookup: true, description: false };
        if (req.query.network_id) {
            if (mongooseObjectId.isValid(req.query.network_id)) {
                filter['network_id'] = mongooseObjectId(req.query.network_id);
            } else {
                let response = Response.error();
                response.error = ['invalid network_id'];
                response.msg = 'Invalid network_id.';
                return res.status(200).json(response);
            }
        } else if (req.query.token) {
            let token = req.query.token;
            jwt.verify(token, process.env.SECREAT_KEY, function (err, decoded) {
                if (err) {
                    let response = Response.error();
                    response.msg = "Unauthorized access, Token doesn't match.";
                    response.error = [err.message];
                    return res.status(200).json(response);
                } else {
                    filter['network_id'] = mongooseObjectId(decoded['network_id']);
                }
            });
        } else {
            let response = Response.error();
            response.error = ['please enter network_id or token'];
            response.msg = 'Please enter network_id or token.';
            return res.status(200).json(response);
        }
        if (req.query.app_id && req.query.app_id.trim()) {
            filter['app_id'] = req.query.app_id.trim();
        }
        if (req.query.start_date && req.query.start_date.trim() && req.query.end_date && req.query.end_date.trim()) {
            filter['date'] = { $gte: moment(req.query.start_date.trim()).startOf('day').toDate(), $lte: moment(req.query.end_date.trim()).endOf('day').toDate() }
        }
        if (req.query.limit && !isNaN(req.query.limit)) {
            options['limit'] = parseInt(req.query.limit);
        }
        if (req.query.page && !isNaN(req.query.page)) {
            page = parseInt(req.query.page);
        }
        options['skip'] = (page - 1) * options['limit'];
        if (req.query.common == 0) {
            options['lookup'] = false;
        }
        if (req.query.description == 1) {
            options['description'] = true;
        }
        let output = { 'page': page, 'limit': options['limit'], 'totalPage': 0, 'data': [] };
        let result = await AppIdSummaryModel.getExternalPackageSummary(filter, options);
        if (result && result.length) {
            output['data'] = result;
            let totalRecord = await AppIdSummaryModel.getTotalPagesCount(filter);
            if (totalRecord && totalRecord[0]) {
                let totalPage = Math.ceil(totalRecord[0]['total'] / options['limit']);
                output['totalPage'] = totalPage;
            }
        }
        let response = Response.success();
        response.payloadType = payloadType.object;
        response.payload = output;
        response.msg = "success";
        return res.status(200).json(response);
    } catch (error) {
        let response = Response.error();
        response.error = [error.message];
        response.msg = 'Something went wrong. Please try again later.';
        return res.status(200).json(response);
    }
}