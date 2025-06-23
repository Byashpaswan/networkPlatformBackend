const Mongoose = require("mongoose");
require("dotenv").config({ path: ".env" });
var moment = require("moment");
const mongooseObjectId = Mongoose.Types.ObjectId;
const debug = require("debug")("darwin:Script:Dashboard");
require('../db/connection');

const { DailySummaryModel, SummaryLogModel } = require('../db/click/sourceSummary/sourceSummary');
const { ClickFailedModel } = require("../db/click/clickfails");
const { ConversionFailed } = require("../db/conversion/conversionFailed");
const Offers = require("../db/offer/Offer");
const NetworkModel = require("../db/network/Network");
const PublisherModel = require("../db/publisher/Publisher");
const UserModel = require("../db/user/User");
const { DashboardStatsModel } = require("../db/dashboard/Dashboard");
const { SourceOfferPublisherSummaryModel } = require('../db/click/sourceSummary/sourceSummary');
const { ConversionModel } = require('../db/click/clickLog');
const redis = require("../helpers/Redis");

async function getNetworks() {
    try {
        let result = await NetworkModel.findAllNetwork({ status: "pending" }, { _id: 1 });
        if (result && result.length) {
            return result;
        }
        return null;
    } catch (error) {
        debug(error);
        return null;
    }
}

function getDateIntervalDaily(lastSlotTime) {
    try {
        let dateStart = moment(lastSlotTime).add(1, "days");
        let endDate = moment(dateStart).add(1, "days");
        return { startTime: dateStart, endTime: endDate };
    } catch (error) {
        debug(error);
        return null;
    }
}

function logSummaryResult(network_id, records_count, timeInterval, report_name) {
    return new Promise(async (resolve, reject) => {
        try {
            let timeSlot = moment(timeInterval.startTime);
            let newLog = new SummaryLogModel({
                network_id: network_id,
                summary_count: records_count,
                report_name: report_name,
                timeSlot: timeSlot.toDate(),
            });
            await newLog.save();
            console.log("end event called", network_id, records_count, timeSlot.toDate(), report_name);
            resolve();
        } catch (e) {
            console.log("error : while saving SourceSummary log");
            console.log(e);
            reject(e);
        }
    });
}

async function insertDashboardTotalStats(timeInterval, networkId) {
    return new Promise(async (resolve, reject) => {
        try {
            let network_id = mongooseObjectId(networkId);
            let dateRange = { $gte: timeInterval.startTime.toDate(), $lt: timeInterval.endTime.toDate() };
            let timeSlot = timeInterval.startTime.toDate();

            let totalStats = await DailySummaryModel.countTotalStats(
                { network_id: network_id, timeSlot: dateRange },
                { _id: null, click: { $sum: "$click" }, conversion: { $sum: "$conversion" }, payout: { $sum: "$payout" }, revenue: { $sum: "$revenue" } }
            );

            let totalOffers = await Offers.countOffers({ network_id: network_id, updatedAt: dateRange });

            let newOffers = await Offers.countOffers({ network_id: network_id, createdAt: dateRange });

            let totalClickFailed = await ClickFailedModel.getAllCount({ network_id: network_id, createdAt: dateRange });

            let totalConversionFailed = await ConversionFailed.countConversionFailed({ network_id: networkId.toString(), createdAt: dateRange });

            let data = { click: 0, conversion: 0, payout: 0, revenue: 0, clickFailed: 0, conversionFailed: 0, offers: 0 };
            if (totalStats && totalStats[0]) {
                data['click'] = totalStats[0]['click'];
                data['conversion'] = totalStats[0]['conversion'];
                data['payout'] = totalStats[0]['payout'];
                data['revenue'] = totalStats[0]['revenue'];
            }

            if (totalOffers) {
                data['offers'] = totalOffers;
            }

            if (newOffers) {
                data['newOffers'] = newOffers;
            }

            if (totalClickFailed) {
                data['clickFailed'] = totalClickFailed;
            }

            if (totalConversionFailed) {
                data['conversionFailed'] = totalConversionFailed;
            }

            await DashboardStatsModel.updateOneDoc({ network_id: network_id, timeSlot: timeSlot }, data, { upsert: true });

            if (!(moment().startOf('days').isSame(timeInterval.startTime))) {
                await logSummaryResult(network_id, 1, timeInterval, "DashboardTotalStats");
            } else {
                console.log("end event called", network_id, 1, moment(timeInterval.startTime).toDate(), "DashboardTotalStats");
            }
            resolve(true);
        } catch (err) {
            console.log("error in insertDashboardTotalStats", err);
            reject(false);
        }
    });
}

async function processDashboardTotalStats(networkId) {
    return new Promise(async (resolve, reject) => {
        try {
            let lastLogValue = await SummaryLogModel.getLastLogTimeSlot(mongooseObjectId(networkId), "DashboardTotalStats");
            let slotTime;
            if (lastLogValue.length == 0) {
                slotTime = moment(process.env.DASHBOARD_START_DATE).toDate();
            } else {
                slotTime = lastLogValue[0].timeSlot;
            }
            let currentTime = moment();
            let timeInterval = getDateIntervalDaily(moment(slotTime));
            if (timeInterval) {
                let timeDiff = moment.duration(currentTime.diff(timeInterval.startTime)).asDays();
                while (timeDiff > 0) {
                    await insertDashboardTotalStats(timeInterval, networkId);
                    timeInterval = getDateIntervalDaily(timeInterval.startTime);
                    timeDiff = moment.duration(currentTime.diff(timeInterval.startTime)).asDays();
                }
            }
            return resolve();
        } catch (error) {
            debug(error);
            return reject();
        }
    });
}

exports.startDashboardScript = async () => {
    try {
        let networks = await getNetworks();
        if (networks && networks.length) {
            for (let network of networks) {
                // if (network._id.toString() == "5e4d056eeb383b291949a3df") // for testing...
                await processDashboardTotalStats(network['_id']);
            }
        }
        // process.exit();
    } catch (error) {
        debug(error);
    }
};

// this.startDashboardScript();


///////////////////////////////////////////////////////////////////
//                      publisher dashboard                      //
///////////////////////////////////////////////////////////////////

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

async function getUsers(networkId) {
    try {
        // todo add index on last_login
        let result = await UserModel.getUsers({ network: mongooseObjectId(networkId), last_login: { $gte: moment().subtract(1, 'days') } }, { parent_id: 1 });
        if (result && result.length) {
            return result;
        }
        return null;
    } catch (error) {
        debug(error);
        return null;
    }
}

async function processPublisherDashboardAllStats(networkId, publisherId, dateRange) {
    return new Promise(async (resolve, reject) => {
        try {
            let result = {
                "allStatsForCurrentDateRange": { click: 0, conversion: 0, payout: 0 },
                "allStatsForPreviousDateRange": { click: 0, conversion: 0, payout: 0 }
            };

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

            await redis.setRedisHashData("dashboard", "allStats:" + networkId + ":" + publisherId + ":" + dateRange, result, 900);

            return resolve();
        } catch (error) {
            debug(error);
            return reject();
        }
    });
}

async function processPublisherDashboardOverallStats(networkId, publisherId, dateRange) {
    return new Promise(async (resolve, reject) => {
        try {
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

            let result = await SourceOfferPublisherSummaryModel.statsCount(filter, group, sortBy);

            redis.setRedisHashData("dashboard", "overallStats:" + networkId + ":" + publisherId + ":" + dateRange, result, 900);

            return resolve();
        } catch (error) {
            debug(error);
            return reject();
        }
    });
}

async function processPublisherDashboardTopAppIds(networkId, publisherId, dateRange) {
    return new Promise(async (resolve, reject) => {
        try {
            let filter = {};
            let groupBy = {};
            let sortBy = {};

            filter['network_id'] = networkId;
            filter['createdAt'] = getDateRange(dateRange);
            filter['publisher_id'] = +publisherId;
            groupBy['app_id'] = "$app_id";
            sortBy = { conversion: -1 };

            let result = await ConversionModel.getPubStatsCount(filter, groupBy, sortBy, 50);

            redis.setRedisHashData("dashboard", "topAppIds:" + networkId + ":" + publisherId + ":" + dateRange, result, 900);

            return resolve();
        } catch (error) {
            debug(error);
            return reject();
        }
    });
}

exports.startPublisherDashboardScript = async () => {
    try {
        let networks = await getNetworks();
        if (networks && networks.length) {
            for (let network of networks) {
                let users = await getUsers(network['_id']);
                if (users && users.length) {
                    for (let user of users) {
                        if (user['parent_id'] && user['parent_id'][0]) {
                            let publisher = await PublisherModel.getPublisher({ _id: mongooseObjectId(user['parent_id'][0]) }, { pid: 1 });
                            if (publisher && publisher['pid']) {
                                for (let dateRange of ['today/yesterday', 'last_7_days/7_days_before_last_7_days', 'this_month/last_month']) {
                                    await processPublisherDashboardAllStats(network['_id'], publisher['pid'], dateRange);
                                }
                                for (let dateRange of ['today', 'yesterday', 'this_week', 'last_week', 'this_month', 'last_month']) {
                                    await processPublisherDashboardOverallStats(network['_id'], publisher['pid'], dateRange);
                                    await processPublisherDashboardTopAppIds(network['_id'], publisher['pid'], dateRange);
                                }
                            }
                        }
                    }
                }
            }
        }
        process.exit();
    } catch (error) {
        debug(error);
    }
};

// this.startPublisherDashboardScript();