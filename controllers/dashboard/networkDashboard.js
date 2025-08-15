const Mongoose = require('mongoose');
const debug = require("debug")("darwin:Controller:networkDashboard");
const mongooseObjectId = Mongoose.Types.ObjectId;
const Response = require('../../helpers/Response');
const { payloadType } = require('../../constants/config');
const moment = require('moment');
const { DailySummaryModel, AdvertiserSummaryModel, PublisherSummaryModel, SourceAdvertiserAffiliateSummaryModel } = require('../../db/click/sourceSummary/sourceSummary');
const { ConversionModel } = require('../../db/click/clickLog');
const AdvertiserModel = require("../../db/advertiser/Advertiser");
const PublisherModel = require("../../db/publisher/Publisher");
const { DashboardStatsModel } = require("../../db/dashboard/Dashboard");
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

async function getAllStats(dateRange, networkId) {
    let result = {
        "allStatsForCurrentDateRange": { click: 0, conversion: 0, payout: 0, revenue: 0, clickFailed: 0, conversionFailed: 0, offers: 0, newOffers: 0 },
        "allStatsForPreviousDateRange": { click: 0, conversion: 0, payout: 0, revenue: 0, clickFailed: 0, conversionFailed: 0, offers: 0, newOffers: 0 }
    };
    try {
        // let redisData = await redis.getRedisHashData("dashboard", "allStats:" + networkId + ":" + dateRange);
        // if (!redisData['error'] && redisData['data']) {
        //     return redisData['data'];
        // }

        let filter = {};
        let groupBy = {};
        let sortBy = {};

        filter['network_id'] = networkId;
        filter['timeSlot'] = getDateRange(dateRange);

        if (dateRange == 'this_month/last_month') {
            groupBy = { _id: { "year": { $year: { "date": "$timeSlot", "timezone": "Asia/Kolkata" } }, "month": { $month: { "date": "$timeSlot", "timezone": "Asia/Kolkata" } } }, click: { $sum: "$click" }, clickFailed: { $sum: "$clickFailed" }, conversion: { $sum: "$conversion" }, conversionFailed: { $sum: "$conversionFailed" }, offers: { $sum: "$offers" }, newOffers: { $sum: "$newOffers" }, payout: { $sum: "$payout" }, revenue: { $sum: "$revenue" } };
            sortBy = { '_id.year': 1, '_id.month': 1 };
        } else {
            groupBy = { _id: { "year": { $year: { "date": "$timeSlot", "timezone": "Asia/Kolkata" } }, "month": { $month: { "date": "$timeSlot", "timezone": "Asia/Kolkata" } }, "day": { $dayOfMonth: { "date": "$timeSlot", "timezone": "Asia/Kolkata" } } }, click: { $sum: "$click" }, clickFailed: { $sum: "$clickFailed" }, conversion: { $sum: "$conversion" }, conversionFailed: { $sum: "$conversionFailed" }, offers: { $sum: "$offers" }, newOffers: { $sum: "$newOffers" }, payout: { $sum: "$payout" }, revenue: { $sum: "$revenue" } };
            sortBy = { '_id.year': 1, '_id.month': 1, '_id.day': 1 };
        }

        let allStats = await DashboardStatsModel.countStats({}, groupBy, sortBy);

        if (dateRange == 'last_7_days/7_days_before_last_7_days') {
            let date = moment(filter['timeSlot']['$gte']).add(7, 'days');
            for (let item of allStats) {
                let day = ("0" + item['_id']['day']).slice(-2);
                let month = ("0" + (item['_id']['month'] - 1)).slice(-2);
                let year = item['_id']['year'];
                let currentDate = moment().set({ 'year': year, 'month': month, 'date': day }).startOf('day');

                if (date <= currentDate) {
                    result['allStatsForCurrentDateRange']['click'] += item['click'];
                    result['allStatsForCurrentDateRange']['clickFailed'] += item['clickFailed'];
                    result['allStatsForCurrentDateRange']['conversion'] += item['conversion'];
                    result['allStatsForCurrentDateRange']['conversionFailed'] += item['conversionFailed'];
                    result['allStatsForCurrentDateRange']['offers'] += item['offers'];
                    result['allStatsForCurrentDateRange']['payout'] += item['payout'];
                    result['allStatsForCurrentDateRange']['revenue'] += item['revenue'];
                    if (item['newOffers']) {
                        result['allStatsForCurrentDateRange']['newOffers'] += item['newOffers'];
                    }
                } else {
                    result['allStatsForPreviousDateRange']['click'] += item['click'];
                    result['allStatsForPreviousDateRange']['clickFailed'] += item['clickFailed'];
                    result['allStatsForPreviousDateRange']['conversion'] += item['conversion'];
                    result['allStatsForPreviousDateRange']['conversionFailed'] += item['conversionFailed'];
                    result['allStatsForPreviousDateRange']['offers'] += item['offers'];
                    result['allStatsForPreviousDateRange']['payout'] += item['payout'];
                    result['allStatsForPreviousDateRange']['revenue'] += item['revenue'];
                    if (item['newOffers']) {
                        result['allStatsForPreviousDateRange']['newOffers'] += item['newOffers'];
                    }
                }
            }
        } else {
            if (allStats && allStats.length) {
                if (allStats[0]) {
                    result['allStatsForPreviousDateRange'] = {
                        'click': allStats[0]['click'],
                        'clickFailed': allStats[0]['clickFailed'],
                        'conversion': allStats[0]['conversion'],
                        'conversionFailed': allStats[0]['conversionFailed'],
                        'offers': allStats[0]['offers'],
                        'payout': allStats[0]['payout'],
                        'revenue': allStats[0]['revenue']
                    };
                    if (allStats[0]['newOffers']) {
                        result['allStatsForPreviousDateRange']['newOffers'] = allStats[0]['newOffers'];
                    }
                }
                if (allStats[1]) {
                    result['allStatsForCurrentDateRange'] = {
                        'click': allStats[1]['click'],
                        'clickFailed': allStats[1]['clickFailed'],
                        'conversion': allStats[1]['conversion'],
                        'conversionFailed': allStats[1]['conversionFailed'],
                        'offers': allStats[1]['offers'],
                        'payout': allStats[1]['payout'],
                        'revenue': allStats[1]['revenue']
                    };
                    if (allStats[1]['newOffers']) {
                        result['allStatsForCurrentDateRange']['newOffers'] = allStats[1]['newOffers'];
                    }
                }
            }
        }

        // let currentMinutes = moment().format('mm');
        // let exp = 70 - currentMinutes;
        // if (exp > 30) {
        //     exp = exp - 30;
        // }

        // redis.setRedisHashData("dashboard", "allStats:" + networkId + ":" + dateRange, result, (exp * 60));
        return result;
    } catch (error) {
        debug(error);
        return result;
    }
}

async function getOverallStats(dateRange, networkId) {
    let result = [];
    try {
        let redisData = await redis.getRedisHashData("dashboard", "overallStats:" + networkId + ":" + dateRange);
        if (!redisData['error'] && redisData['data'] && redisData['data'].length) {
            return redisData['data'];
        }

        let filter = {};
        let groupBy = {};
        let sortBy = {};

        filter['network_id'] = networkId;
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
        result = await DailySummaryModel.countStats({}, groupBy, sortBy);

        let currentMinutes = moment().format('mm');
        let exp = 70 - currentMinutes;
        if (exp > 30) {
            exp = exp - 30;
        }

        redis.setRedisHashData("dashboard", "overallStats:" + networkId + ":" + dateRange, result, (exp * 60));

        return result;
    } catch (error) {
        debug(error);
        return result;
    }
}

async function getTopAdvertisers(dateRange, networkId, limit) {
    let result = [];
    try {
        let redisData = await redis.getRedisHashData("dashboard", "topAdvertisers:" + networkId + ":" + dateRange);
        if (!redisData['error'] && redisData['data'] && redisData['data'].length) {
            return redisData['data'];
        }

        let filter = {};
        let groupBy = {};
        let sortBy = {};

        filter['network_id'] = networkId;
        filter['timeSlot'] = getDateRange(dateRange);
        groupBy['advertiser_id'] = "$advertiser_id";
        sortBy = { conversion: -1 };
        result = await AdvertiserSummaryModel.getAdvertiserStat({}, groupBy, sortBy, limit);

        let currentMinutes = moment().format('mm');
        let exp = 70 - currentMinutes;
        if (exp > 30) {
            exp = exp - 30;
        }

        redis.setRedisHashData("dashboard", "topAdvertisers:" + networkId + ":" + dateRange, result, (exp * 60));

        return result;
    }
    catch (error) {
        debug(error);
        return result;
    }
}

async function getTopPublishers(dateRange, networkId, limit) {
    let result = [];
    try {
        let redisData = await redis.getRedisHashData("dashboard", "topPublishers:" + networkId + ":" + dateRange);
        if (!redisData['error'] && redisData['data'] && redisData['data'].length) {
            return redisData['data'];
        }

        let filter = {};
        let groupBy = {};
        let sortBy = {};

        filter['network_id'] = networkId;
        filter['timeSlot'] = getDateRange(dateRange);
        groupBy['publisher_id'] = "$publisher_id";
        sortBy = { conversion: -1 };
        result = await PublisherSummaryModel.getPublisherStat({}, groupBy, sortBy, limit);

        let currentMinutes = moment().format('mm');
        let exp = 70 - currentMinutes;
        if (exp > 30) {
            exp = exp - 30;
        }

        redis.setRedisHashData("dashboard", "topPublishers:" + networkId + ":" + dateRange, result, (exp * 60));

        return result;
    }
    catch (error) {
        debug(error);
        return result;
    }
}

async function getTopAppIds(dateRange, networkId, limit) {
    let result = [];
    try {
        let redisData = await redis.getRedisHashData("dashboard", "topAppIds:" + networkId + ":" + dateRange);
        if (!redisData['error'] && redisData['data'] && redisData['data'].length) {
            return (redisData['data'].slice(0, limit));
        }

        let filter = {};
        let groupBy = {};
        let sortBy = {};

        filter['network_id'] = networkId;
        filter['createdAt'] = getDateRange(dateRange);
        groupBy['app_id'] = "$app_id";
        sortBy = { conversion: -1 }
        result = await ConversionModel.getStatsCount(filter, groupBy, sortBy, 50);

        let currentMinutes = moment().format('mm');
        let exp = 70 - currentMinutes;
        if (exp > 30) {
            exp = exp - 30;
        }

        redis.setRedisHashData("dashboard", "topAppIds:" + networkId + ":" + dateRange, result, (exp * 60));

        return (result.slice(0, limit));
    }
    catch (error) {
        debug(error);
        return result;
    }
}

async function getAdvertisersAndPublishersCount(dateRange, networkId) {
    let result = {
        totalAdvertisers: 0,
        activeAdvertisers: 0,
        liveAdvertisers: 0,
        totalPublishers: 0,
        activePublishers: 0,
        livePublishers: 0,
    };
    try {
        let redisData = await redis.getRedisHashData("dashboard", "advertisersAndPublishers:" + networkId + ":" + dateRange);
        if (!redisData['error'] && redisData['data']) {
            return redisData['data'];
        }

        let filter = {};
        filter['network_id'] = networkId;
        filter['timeSlot'] = getDateRange(dateRange);

        let publishers = await PublisherModel.getPublishersByAggregate({ network_id: networkId }, { _id: { status: "$status" }, count: { $sum: 1 } });
        if (publishers.length) {
            for (let item of publishers) {
                result['totalPublishers'] += item['count'];
                if (item['_id'] && item['_id']['status'] && item['_id']['status'] == "Active") {
                    result['activePublishers'] = item['count'];
                }
            }
        }

        let advertisers = await AdvertiserModel.getAdvertisersByAggregate({ network_id: networkId }, { _id: { status: "$status" }, count: { $sum: 1 } });
        if (advertisers.length) {
            for (let item of advertisers) {
                result['totalAdvertisers'] += item['count'];
                if (item['_id'] && item['_id']['status'] && item['_id']['status'] == "Active") {
                    result['activeAdvertisers'] = item['count'];
                }
            }
        }

        let group = {
            _id: null,
            advertiser_id: { $addToSet: '$advertiser_id' },
            publisher_id: { $addToSet: '$publisher_id' },
        };

        let filteredData = await SourceAdvertiserAffiliateSummaryModel.fetchDailySummary(filter, group);
        if (filteredData && filteredData[0]) {
            result['liveAdvertisers'] = filteredData[0]['advertiser_id'].length;
            result['livePublishers'] = filteredData[0]['publisher_id'].length;
        }

        let currentMinutes = moment().format('mm');
        let exp = 70 - currentMinutes;
        if (exp > 30) {
            exp = exp - 30;
        }

        redis.setRedisHashData("dashboard", "advertisersAndPublishers:" + networkId + ":" + dateRange, result, (exp * 60));
        return (result);
    }
    catch (error) {
        debug(error);
        return result;
    }
}

exports.getDashboardData = async (req, res) => {
    try {
       console.log("re.body---dashoard",req.body)
        let dateRangeForAllStats = "today/yesterday";
        let dateRangeForStatistics = "today";
        let dateRangeForAdvertisers = "today";
        let dateRangeForAppIds = "today";
        let dateRangeForAdvertisersAndPublishers = "today";
        let limitForAdvertisers = 5;
        let limitForAppIds = 5;

        if (req.body['dateRangeForAllStats']) {
            dateRangeForAllStats = req.body['dateRangeForAllStats'];
        }
        if (req.body['dateRangeForStatistics']) {
            dateRangeForStatistics = req.body['dateRangeForStatistics'];
        }
        if (req.body['dateRangeForAdvertisers']) {
            dateRangeForAdvertisers = req.body['dateRangeForAdvertisers'];
        }
        if (req.body['dateRangeForAppIds']) {
            dateRangeForAppIds = req.body['dateRangeForAppIds'];
        }
        if (req.body['dateRangeForAdvertisersAndPublishers']) {
            dateRangeForAdvertisersAndPublishers = req.body['dateRangeForAdvertisersAndPublishers'];
        }
        // if (req.body['limitForAdvertisers']) {
        //     limitForAdvertisers = +req.body['limitForAdvertisers'];
        // }
        if (req.body['limitForAppIds']) {
            limitForAppIds = +req.body['limitForAppIds'];
        }

        let networkId = mongooseObjectId(req.user.userDetail.network[0]);
         console.log("networkId--",networkId)
        let output = {};

        if (req.body['getAllStats']) {
            output = await getAllStats(dateRangeForAllStats, networkId);
          console.log("output getallStats--",output)
        }
        if (req.body['getOverallStat']) {
            output['overallStat'] = await getOverallStats(dateRangeForStatistics, networkId);
        }
        if (req.body['getTopAdvertiserStat']) {
            output['advertisers'] = await getTopAdvertisers(dateRangeForAdvertisers, networkId, limitForAdvertisers);
            output['publishers'] = await getTopPublishers(dateRangeForAdvertisers, networkId, limitForAdvertisers);
        }
        if (req.body['getTopAppIdStat']) {
            output['appIds'] = await getTopAppIds(dateRangeForAppIds, networkId, limitForAppIds);
        }
        if (req.body['getAdvertisersAndPublishers']) {
            output['advertisersAndPublishers'] = await getAdvertisersAndPublishersCount(dateRangeForAdvertisersAndPublishers, networkId);
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

