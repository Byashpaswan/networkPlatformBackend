const Mongoose = require("mongoose");
const mongooseObjectId = Mongoose.Types.ObjectId;
require("dotenv").config({ path: ".env" });
const moment = require("moment");
require("../db/connection");
const crypto = require('crypto');
const NetworkModel = require("../db/network/Network");
const { ClickLogModel, ConversionModel } = require("../db/click/clickLog");
const { LiveAdvOffPubSouSummaryModel } = require('../db/click/sourceSummary/sourceSummary');

let currentTime = moment().subtract(15, 'minutes');
const BATCHSIZE = 50;

function getTimeSlot(timeString) {
    let timeSlot = moment(timeString).startOf('minute');
    let minutes = timeSlot.minutes();
    if (minutes >= 30) {
        timeSlot.subtract((minutes - 30), 'minutes');
    } else {
        timeSlot.subtract(minutes, 'minutes');
    }
    return timeSlot;
}

async function updateClicks(doc) {
    try {
        let filter = {
            network_id: doc['network_id'],
            offer_id: doc['offer_id'],
            publisher_id: doc['publisher_id'],
            source: doc['source'],
            timeSlot: doc['timeSlot']
        };
        let update = {
            $set: {
                offer_name: doc['offer_name'],
                advertiser_id: doc['advertiser_id'],
                advertiser_offer_id: doc['advertiser_offer_id']
            },
            $inc: {
                conversion: 0,
                payout: 0,
                revenue: 0,
                hold_revenue: 0,
                pre_conversion: 0,
                click: doc['clickIds'].length
            }
        };
        let options = { upsert: true };
        await LiveAdvOffPubSouSummaryModel.updateOneDoc(filter, update, options);
        await ClickLogModel.updateClicks({ _id: { $in: doc['clickIds'] } }, { $set: { report: true } }, { timestamps: false });
        console.log('===>> clickIds ' + doc['clickIds'] + ' processed...');
    } catch (error) {
        console.error(error);
    }
}

async function updateConversions(doc) {
    try {
        let filter = {
            network_id: doc['network_id'],
            offer_id: doc['offer_id'],
            publisher_id: doc['publisher_id'],
            source: doc['source'],
            timeSlot: doc['timeSlot']
        };
        let update = {
            $set: {
                offer_name: doc['offer_name'],
                advertiser_id: doc['advertiser_id'],
                advertiser_offer_id: doc['advertiser_offer_id']
            },
            $inc: {
                click: 0,
                pre_conversion: 0,
                conversion: doc['conversionIds'].length,
                publisher_conversion: doc['publisher_conversion'],
                payout: doc['payout'],
                publisher_payout: doc['publisher_payout'],
                revenue: doc['revenue'],
                hold_revenue: doc['hold_revenue']
            }
        };
        let options = { upsert: true };
        await LiveAdvOffPubSouSummaryModel.updateOneDoc(filter, update, options);
        await ConversionModel.updateConversions({ _id: { $in: doc['conversionIds'] } }, { $set: { report: true } }, { timestamps: false });
        console.log('===>> conversionIds ' + doc['conversionIds'] + ' processed...');
    } catch (error) {
        console.error(error);
    }
}

async function processLiveReportClicks(networkId) {
    try {
        let liveReportData = {};
        let cursor = await ClickLogModel.getClicksByCursor(
            { network_id: networkId, report: false, createdAt: { $lte: currentTime.toDate() } },
            { _id: 1, network_id: 1, offer_id: 1, publisher_id: 1, source: 1, createdAt: 1, offer_name: 1, advertiser_id: 1, advertiser_offer_id: 1 }
        );
        cursor.on("data", async (doc) => {
            let timeSlot = getTimeSlot(doc['createdAt']);
            let hashData = {
                network_id: doc['network_id'].toString(),
                offer_id: doc['offer_id'].toString(),
                publisher_id: doc['publisher_id'],
                source: doc['source'],
                timeSlot: timeSlot.toDate().getTime()
            };
            let hash = encodeURIComponent(crypto.createHash('md5').update(JSON.stringify(hashData)).digest('hex'));
            if (liveReportData[hash]) {
                liveReportData[hash]['clickIds'].push(mongooseObjectId(doc['_id']));
            } else {
                liveReportData[hash] = {
                    network_id: mongooseObjectId(doc['network_id']),
                    offer_id: mongooseObjectId(doc['offer_id']),
                    publisher_id: doc['publisher_id'],
                    source: doc['source'],
                    timeSlot: timeSlot.toDate(),
                    offer_name: doc['offer_name'],
                    advertiser_id: mongooseObjectId(doc['advertiser_id']),
                    advertiser_offer_id: doc['advertiser_offer_id'],
                    clickIds: [mongooseObjectId(doc['_id'])]
                }
            }
            if (Object.keys(liveReportData).length >= BATCHSIZE) {
                let tempLiveReportData = liveReportData;
                liveReportData = {};
                for (let key in tempLiveReportData) {
                    await updateClicks(tempLiveReportData[key]);
                }
            }
        });
        cursor.on("end", async () => {
            let tempLiveReportData = liveReportData;
            liveReportData = {};
            for (let key in tempLiveReportData) {
                await updateClicks(tempLiveReportData[key]);
            }
        });
        cursor.on("error", async () => {
            let tempLiveReportData = liveReportData;
            liveReportData = {};
            for (let key in tempLiveReportData) {
                await updateClicks(tempLiveReportData[key]);
            }
        });
    } catch (error) {
        console.error(error);
    }
}

async function processLiveReportConversions(networkId) {
    try {
        let liveReportData = {};
        let cursor = await ConversionModel.getConversionsByCursor(
            { network_id: networkId, report: false, createdAt: { $lte: currentTime.toDate() } },
            { _id: 1, network_id: 1, offer_id: 1, publisher_id: 1, aff_source: 1, createdAt: 1, offer_name: 1, advertiser_id: 1, advertiser_offer_id: 1, final_payout: 1, revenue_click: 1, hold_revenue: 1, publisher_conversion: 1, publisher_payout: 1 }
        );
        cursor.on("data", async function (doc) {
            let timeSlot = getTimeSlot(doc['createdAt']);
            let hashData = {
                network_id: doc['network_id'].toString(),
                offer_id: doc['offer_id'].toString(),
                publisher_id: doc['publisher_id'],
                source: doc['aff_source'],
                timeSlot: timeSlot.toDate().getTime()
            };
            let hash = encodeURIComponent(crypto.createHash('md5').update(JSON.stringify(hashData)).digest('hex'));
            if (liveReportData[hash]) {
                liveReportData[hash]['conversionIds'].push(mongooseObjectId(doc['_id']));
                liveReportData[hash]['payout'] += parseFloat(doc['final_payout']) || 0;
                liveReportData[hash]['revenue'] += +doc['revenue_click'] || 0;
                liveReportData[hash]['hold_revenue'] += +doc['hold_revenue'] || 0;
                liveReportData[hash]['publisher_conversion'] += parseInt(doc['publisher_conversion']) || 0;
                liveReportData[hash]['publisher_payout'] += parseFloat(doc['publisher_payout']) || 0;
            } else {
                liveReportData[hash] = {
                    network_id: mongooseObjectId(doc['network_id']),
                    offer_id: mongooseObjectId(doc['offer_id']),
                    publisher_id: doc['publisher_id'],
                    source: doc['aff_source'],
                    timeSlot: timeSlot.toDate(),
                    offer_name: doc['offer_name'],
                    advertiser_id: mongooseObjectId(doc['advertiser_id']),
                    advertiser_offer_id: doc['advertiser_offer_id'],
                    conversionIds: [mongooseObjectId(doc['_id'])],
                    payout: parseFloat(doc['final_payout']) || 0,
                    revenue: +doc['revenue_click'] || 0,
                    hold_revenue: +doc['hold_revenue'] || 0,
                    publisher_conversion: parseInt(doc['publisher_conversion']) || 0,
                    publisher_payout: parseFloat(doc['publisher_payout']) || 0
                }
            }
            if (Object.keys(liveReportData).length >= BATCHSIZE) {
                let tempLiveReportData = liveReportData;
                liveReportData = {};
                for (let key in tempLiveReportData) {
                    await updateConversions(tempLiveReportData[key]);
                }
            }
        });
        cursor.on("end", async () => {
            let tempLiveReportData = liveReportData;
            liveReportData = {};
            for (let key in tempLiveReportData) {
                await updateConversions(tempLiveReportData[key]);
            }
        });
        cursor.on("error", async () => {
            let tempLiveReportData = liveReportData;
            liveReportData = {};
            for (let key in tempLiveReportData) {
                await updateConversions(tempLiveReportData[key]);
            }
        });
    } catch (error) {
        console.error(error);
    }
}

exports.startLiveReportScript = async () => {
    try {
        let networks = await NetworkModel.findAllNetwork({ status: "pending" }, { _id: 1 });
        if (networks && networks.length) {
            for (let network of networks) {
                if (network['_id']) {
                    await processLiveReportClicks(mongooseObjectId(network['_id']));
                    await processLiveReportConversions(mongooseObjectId(network['_id']));
                }
            }
        }
    } catch (error) {
        console.error(error);
    }
};

// this.startLiveReportScript();