
const Mongoose = require('mongoose');
const debug = require("debug")("darwin:Controller:publisherDashboard");
const mongooseObjectId = Mongoose.Types.ObjectId;
const Response = require('../../helpers/Response');
const { payloadType } = require('../../constants/config');
const moment = require('moment');
const { SourceOfferPublisherSummaryModel } = require('../../db/click/sourceSummary/sourceSummary');
const PublisherModel = require('../../db/publisher/Publisher');
const { ConversionModel } = require('../../db/click/clickLog');
var redis = require("../../helpers/Redis");

function getDateRange(option) {
    let date = {};
    if (option == "today") {
        date['startDate'] = moment().startOf('day');
        date['endDate'] = moment();
    } else if (option == "yesterday") {
        date['startDate'] = moment().subtract(1, 'day').startOf('day');
        date['endDate'] = moment().subtract(1, 'day').endOf('day');
    } else if (option == "this_week") {
        date['startDate'] = moment().startOf('week');
        date['endDate'] = moment();
    } else if (option == "last_week") {
        date['startDate'] = moment().subtract(1, 'week').startOf('week');
        date['endDate'] = moment().subtract(1, 'week').endOf('week');
    } else if (option == "this_month") {
        date['startDate'] = moment().startOf('month');
        date['endDate'] = moment();
    } else if (option == "last_month") {
        date['startDate'] = moment().subtract(1, 'month').startOf('month');
        date['endDate'] = moment().subtract(1, 'month').endOf('month');
    } else if (option == "today/yesterday") {
        date['startDate'] = moment().subtract(1, 'day').startOf('day');
        date['endDate'] = moment();
    } else if (option == "last_7_days/7_days_before_last_7_days") {
        date['startDate'] = moment().subtract(14, 'day').startOf('day');
        date['endDate'] = moment().subtract(1, 'day').endOf('day');
    } else if (option == "this_month/last_month") {
        date['startDate'] = moment().subtract(1, 'month').startOf('month');
        date['endDate'] = moment();
    }
    return { $gte: date['startDate'].toDate(), $lte: date['endDate'].toDate() };
}

async function getAllStats(dateRange, networkId, publisherId) {
    let result = {
        "allStatsForCurrentDateRange": { click: 0, conversion: 0, payout: 0 },
        "allStatsForPreviousDateRange": { click: 0, conversion: 0, payout: 0 }
    };
    try {
        let redisData = await redis.getRedisHashData("dashboard", "allStats:" + networkId + ":" + publisherId + ":" + dateRange);
        if (!redisData['error'] && redisData['data']) {
            return redisData['data'];
        }

        let filter = {};
        let groupBy = {};
        let group = {};
        let sortBy = {};

        filter['network_id'] = networkId;
        filter['publisher_id'] = publisherId;
        filter['timeSlot'] = getDateRange(dateRange);

        if (dateRange == 'this_month/last_month') {
            groupBy["year"] = { $year: { "date": "$timeSlot", "timezone": "Asia/Kolkata" } };
            groupBy["month"] = { $month: { "date": "$timeSlot", "timezone": "Asia/Kolkata" } };
            group = { _id: groupBy, click: { $sum: "$click" }, conversion: { $sum: "$publisher_conversion" }, payout: { $sum: "$publisher_payout" } };
            sortBy = { '_id.year': 1, '_id.month': 1 };

            let allStats = await SourceOfferPublisherSummaryModel.statsCount(filter, group, sortBy);

            for (let item of allStats) {
                if (item['_id']['month'] == moment(filter['timeSlot']['$gte']).format('M')) {
                    result['allStatsForPreviousDateRange']['click'] = item['click'];
                    result['allStatsForPreviousDateRange']['conversion'] = item['conversion'];
                    result['allStatsForPreviousDateRange']['payout'] = item['payout'];
                } else if (item['_id']['month'] == moment(filter['timeSlot']['$lte']).format('M')) {
                    result['allStatsForCurrentDateRange']['click'] = item['click'];
                    result['allStatsForCurrentDateRange']['conversion'] = item['conversion'];
                    result['allStatsForCurrentDateRange']['payout'] = item['payout'];
                }
            }
        } else {
            groupBy["year"] = { $year: { "date": "$timeSlot", "timezone": "Asia/Kolkata" } };
            groupBy["month"] = { $month: { "date": "$timeSlot", "timezone": "Asia/Kolkata" } };
            groupBy["day"] = { $dayOfMonth: { "date": "$timeSlot", "timezone": "Asia/Kolkata" } };
            group = { _id: groupBy, click: { $sum: "$click" }, conversion: { $sum: "$publisher_conversion" }, payout: { $sum: "$publisher_payout" } };
            sortBy = { '_id.year': 1, '_id.month': 1, '_id.day': 1 };

            let allStats = await SourceOfferPublisherSummaryModel.statsCount(filter, group, sortBy);

            if (dateRange == "today/yesterday") {
                for (let item of allStats) {
                    if (item['_id']['day'] == moment(filter['timeSlot']['$gte']).format('D')) {
                        result['allStatsForPreviousDateRange']['click'] = item['click'];
                        result['allStatsForPreviousDateRange']['conversion'] = item['conversion'];
                        result['allStatsForPreviousDateRange']['payout'] = item['payout'];
                    } else if (item['_id']['day'] == moment(filter['timeSlot']['$lte']).format('D')) {
                        result['allStatsForCurrentDateRange']['click'] = item['click'];
                        result['allStatsForCurrentDateRange']['conversion'] = item['conversion'];
                        result['allStatsForCurrentDateRange']['payout'] = item['payout'];
                    }
                }
            } else {
                let date = moment(filter['timeSlot']['$gte']).add(7, 'days');
                for (let item of allStats) {
                    let day = ("0" + item['_id']['day']).slice(-2);
                    let month = ("0" + (item['_id']['month'] - 1)).slice(-2);
                    let year = item['_id']['year'];
                    let currentDate = moment().set({ 'year': year, 'month': month, 'date': day }).startOf('day');
                    if (date <= currentDate) {
                        result['allStatsForCurrentDateRange']['click'] += item['click'];
                        result['allStatsForCurrentDateRange']['conversion'] += item['conversion'];
                        result['allStatsForCurrentDateRange']['payout'] += item['payout'];
                    } else {
                        result['allStatsForPreviousDateRange']['click'] += item['click'];
                        result['allStatsForPreviousDateRange']['conversion'] += item['conversion'];
                        result['allStatsForPreviousDateRange']['payout'] += item['payout'];
                    }
                }
            }
        }

        let currentMinutes = moment().format('mm');
        let exp = 70 - currentMinutes;
        if (exp > 30) {
            exp = exp - 30;
        }

        redis.setRedisHashData("dashboard", "allStats:" + networkId + ":" + publisherId + ":" + dateRange, result, (exp * 60));

        return result;
    } catch (error) {
        debug(error);
        return result;
    }
}

async function getOverallStats(dateRange, networkId, publisherId) {
    let result = [];
    try {
        let redisData = await redis.getRedisHashData("dashboard", "overallStats:" + networkId + ":" + publisherId + ":" + dateRange);
        if (!redisData['error'] && redisData['data'] && redisData['data'].length) {
            return redisData['data'];
        }

        let filter = {};
        let groupBy = {};
        let group = {};
        let sortBy = {};

        filter['network_id'] = networkId;
        filter['publisher_id'] = publisherId;
        filter['timeSlot'] = getDateRange(dateRange);

        if (dateRange == 'today' || dateRange == 'yesterday') {
            groupBy['hour'] = { $hour: { "date": "$timeSlot", "timezone": "Asia/Kolkata" } };
            sortBy = { '_id.hour': 1 };
        } else {
            groupBy["year"] = { $year: { "date": "$timeSlot", "timezone": "Asia/Kolkata" } };
            groupBy["month"] = { $month: { "date": "$timeSlot", "timezone": "Asia/Kolkata" } };
            groupBy["day"] = { $dayOfMonth: { "date": "$timeSlot", "timezone": "Asia/Kolkata" } };
            sortBy = { '_id.year': 1, '_id.month': 1, '_id.day': 1 };
        }
        group = { _id: groupBy, click: { $sum: "$click" }, conversion: { $sum: "$publisher_conversion" }, payout: { $sum: "$publisher_payout" } };

        result = await SourceOfferPublisherSummaryModel.statsCount(filter, group, sortBy);

        let currentMinutes = moment().format('mm');
        let exp = 70 - currentMinutes;
        if (exp > 30) {
            exp = exp - 30;
        }

        redis.setRedisHashData("dashboard", "overallStats:" + networkId + ":" + publisherId + ":" + dateRange, result, (exp * 60));

        return result;
    } catch (error) {
        debug(error);
        return result;
    }
}

async function getTopAppIds(dateRange, networkId, limit, publisherId) {
    let result = [];
    try {
        let redisData = await redis.getRedisHashData("dashboard", "topAppIds:" + networkId + ":" + publisherId + ":" + dateRange);
        if (!redisData['error'] && redisData['data'] && redisData['data'].length) {
            return (redisData['data'].slice(0, limit));
        }

        let filter = {};
        let groupBy = {};
        let sortBy = {};

        filter['network_id'] = networkId;
        filter['createdAt'] = getDateRange(dateRange);
        filter['publisher_id'] = +publisherId;
        groupBy['app_id'] = "$app_id";
        sortBy = { conversion: -1 };

        result = await ConversionModel.getPubStatsCount(filter, groupBy, sortBy, 50);

        let currentMinutes = moment().format('mm');
        let exp = 70 - currentMinutes;
        if (exp > 30) {
            exp = exp - 30;
        }

        redis.setRedisHashData("dashboard", "topAppIds:" + networkId + ":" + publisherId + ":" + dateRange, result, (exp * 60));

        return (result.slice(0, limit));
    }
    catch (error) {
        debug(error);
        return result;
    }
}

exports.getDashboardData = async (req, res) => {
    try {
        let dateRangeForAllStats = "today/yesterday";
        let dateRangeForStatistics = "today";
        let dateRangeForAppIds = "today";
        let limitForAppIds = 5;

        if (req.body['dateRangeForAllStats']) {
            dateRangeForAllStats = req.body['dateRangeForAllStats'];
        }
        if (req.body['dateRangeForStatistics']) {
            dateRangeForStatistics = req.body['dateRangeForStatistics'];
        }
        if (req.body['dateRangeForAppIds']) {
            dateRangeForAppIds = req.body['dateRangeForAppIds'];
        }
        if (req.body['limitForAppIds']) {
            limitForAppIds = +req.body['limitForAppIds'];
        }

        let networkId = mongooseObjectId(req.user.userDetail.network[0]);
        let publisherId = req.accountid;
        let output = {};

        if (req.body['getAllStats']) {
            output = await getAllStats(dateRangeForAllStats, networkId, publisherId);
        }
        if (req.body['getOverallStat']) {
            output['overallStat'] = await getOverallStats(dateRangeForStatistics, networkId, publisherId);
        }
        if (req.body['getTopAppIdStat']) {
            output['appIds'] = await getTopAppIds(dateRangeForAppIds, networkId, limitForAppIds, publisherId);
        }

        let response = Response.success();
        response.payloadType = payloadType.object;
        response.payload = output;
        response.msg = "Success";
        return res.status(200).json(response);
    } catch (error) {
        let response = Response.error();
        response.payloadType = payloadType.array;
        response.error = [error.message];
        response.msg = "Error while getting dashboard data!";
        return res.status(200).send(response);
    }
}