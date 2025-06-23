const Mongoose = require('mongoose');
require("dotenv").config({
    path: ".env"
});
const mongooseObjectId = Mongoose.Types.ObjectId;
const OfferModel = require("../db/offer/Offer");
const NetworkModel = require("../db/network/Network");
const AppIdSummaryModel = require("../db/appIdSummary");
const moment = require('moment');
const BATCH_SIZE = 50;
require("../db/connection");
const debug = require("debug")("darwin:Script:appIdSummary");
var { SummaryLogModel } = require("../db/click/sourceSummary/sourceSummary");

async function getNetworkList() {
    try {
        let networks = await NetworkModel.findAllNetwork({}, { _id: 1, company_name: 1 });
        return networks;
    }
    catch (error) {
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

function formatAppIdSummaryDocument(doc, network_id, timeInterval) {
    let avg = 0;
    if (doc.revenue && doc.usd_ofr_count) {
        avg = parseFloat(doc.revenue / doc.usd_ofr_count).toFixed(4);
    }
    let date = moment(timeInterval.startTime).toDate();
    let temp = {
        network_id: network_id,
        app_id: doc['_id'].app_id,
        offers_avg_payout: avg,
        adv_summary: doc.adv_count,
        ofr_summary: doc.offer_count,
        usd_ofr_summary: doc.usd_ofr_count,
        date: date,
        remarks: ''
    };
    return temp;
}

function logSummaryResult(network_id, records_count, timeInterval, report_name) {
    return new Promise(async (resolve, reject) => {
        try {
            //console.log("logSummaryResult" , records_count);
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

async function insertAppIdSummary(timeInterval, network_id) {
    return new Promise(async (resolve, reject) => {
        try {
            if (timeInterval.startTime && timeInterval.endTime && network_id) {
                let filter = {
                    network_id: network_id,
                    createdAt: {
                        $gte: timeInterval.startTime.toDate(),
                        $lt: timeInterval.endTime.toDate(),
                    }
                };
                let group_by = {
                    _id: {
                        app_id: "$app_id",
                        advertiser_id: "$advertiser_id"
                    },
                    revenue: { $sum: { $toDouble: { $cond: [{ currency: 'USD' }, "$revenue", 0] } } },
                    count: { $sum: 1 },
                    usd_ofr_count: { $sum: { $cond: [{ currency: 'USD' }, 1, 0] } }
                };
                let group_pipeline = {
                    "$group": {
                        "_id": {
                            "app_id": "$_id.app_id",
                        },
                        "offer_count": { "$sum": "$count" },
                        "adv_count": { "$sum": 1 },
                        "revenue": { "$sum": "$revenue" },
                        "usd_ofr_count": { "$sum": "$usd_ofr_count" },
                    }
                };

                let cursor = await OfferModel.fetchSummaryUsingStream(filter, group_by, group_pipeline);
                let records_count = 0;
                let result_buffer = [];
                cursor.on("data", async function (doc) {
                    records_count++;
                    let summary = formatAppIdSummaryDocument(doc, network_id, timeInterval);
                    result_buffer.push(summary);
                    if (result_buffer.length >= BATCH_SIZE) {
                        let insert_docs = result_buffer;
                        result_buffer = [];
                        try {
                            await AppIdSummaryModel.bulkInsertSummary(insert_docs);
                        } catch (err) {
                            console.log("Error while inserting into AppIdSummaryModel", err.message);
                        }
                    }
                });

                cursor.on("end", async () => {
                    try {
                        await AppIdSummaryModel.bulkInsertSummary(result_buffer);
                    } catch (err) {
                        console.log("Error while inserting into AppIdSummaryModel", err.message);
                    }

                    result_buffer = [];
                    try {
                        await logSummaryResult(network_id, records_count, timeInterval, "AppIdSummary");
                    } catch (err) {
                        console.log("Err while saving logs in SourceAdv", err.message);
                    }
                    resolve(true);
                });

                cursor.on("error", async () => {
                    try {
                        await AppIdSummaryModel.bulkInsertSummary(result_buffer);
                    } catch (err) {
                        console.log("Error while inserting into AppIdSummaryModel", err.message);
                    }

                    result_buffer = [];
                    try {
                        await logSummaryResult(network_id, records_count, timeInterval, "AppIdSummary");
                    } catch (err) {
                        console.log("Err while saving logs in SourceAdv", err.message);
                    }
                    resolve(true);
                });
            }
        } catch (error) {
            console.log("error in insertAppIdSummary", error);
            reject(false);
        }
    });
}

function processAppIdSummary(network_id) {
    return new Promise(async (resolve, reject) => {
        try {
            let lastLogValue = await SummaryLogModel.getLastLogTimeSlot(network_id, "AppIdSummary");
            let slotTime;
            if (lastLogValue.length == 0) {
                slotTime = process.env.APP_ID_SUMMARY_DATE_START;
            } else {
                slotTime = lastLogValue[0].timeSlot;
            }
            let currentTime = moment().endOf('d');;
            let timeInterval = getDateIntervalDaily(moment(slotTime));
            if (timeInterval) {
                let timeDiff = moment.duration(currentTime.diff(timeInterval.startTime)).asDays();
                while (timeDiff > 1) {
                    await insertAppIdSummary(timeInterval, network_id);
                    timeInterval = getDateIntervalDaily(timeInterval.startTime);
                    timeDiff = moment.duration(currentTime.diff(timeInterval.startTime)).asDays();
                }
            }
            return resolve(true);
        } catch (error) {
            debug(error);
            return reject(false);
        }
    });
}

exports.createAppIdSummary = async function () {
    try {
        let networks = await getNetworkList();
        for (let i = 0; i < networks.length; i++) {
            // if (networks[i]._id.toString() == "5e4d056eeb383b291949a3df") // for testing use...
            await processAppIdSummary(mongooseObjectId(networks[i]._id));
        }
        // process.exit();
    } catch (error) {
        debug(error);
        // process.exit();
    }
}

// this.createAppIdSummary();