require("dotenv").config({ path: ".env" });
require("../db/connection");

const moment = require("moment");
const mongoose = require("mongoose");
const mongooseObjectId = mongoose.Types.ObjectId;

const NetworkModel = require("../db/network/Network");
const OfferModel = require('../db/offer/Offer');
const Function = require('../helpers/Functions');
const { SourceOfferPublisherSummaryModel } = require("../db/click/sourceSummary/sourceSummary");
const blockOfferModel = require('../db/offer/BlockOffer');
const Redis = require("../helpers/Redis")

const LEAD_COUNT = +process.env.LEAD_COUNT || 30;
const REPORT_HOUR = +process.env.REPORT_HOUR || 1;
const BLOCKED_HOUR = +process.env.BLOCKED_HOUR || 24;
const EXPIRE_TIME = +process.env.EXPIRE_TIME || 48;

const genLeadConversionSummary = async (netObj) => {
    try {
        for (let [nid, networkId] of Object.entries(netObj)) {
            let filter = {
                network_id: mongooseObjectId(networkId),
                timeSlot: {
                    $gte: moment().subtract(REPORT_HOUR, 'h').startOf('h').toDate(),
                    $lte: moment().toDate()
                }
            }
            let project = { offer_id: 1, pre_conversion: 1, conversion: 1, timeSlot: 1, };
            // console.log(filter, project)
            let summaryObj = {};
            let cursor = await SourceOfferPublisherSummaryModel.getReportsSummary(filter, project);
            for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
                // console.log("======================", doc)
                if (doc.conversion || doc.pre_conversion) {
                    if (summaryObj[doc.offer_id]) {
                        summaryObj[doc.offer_id]['con'] = summaryObj[doc.offer_id]['con'] + +doc.conversion;
                        summaryObj[doc.offer_id]['pcon'] = summaryObj[doc.offer_id]['pcon'] + +doc.pre_conversion;
                    } else {
                        summaryObj[doc.offer_id] = {
                            "nid": nid,
                            "ofid": mongooseObjectId(doc.offer_id),
                            "con": +doc.conversion,
                            "pcon": +doc.pre_conversion,
                            "tslot": moment(doc.timeSlot).startOf('h').toDate(),
                            "expireAt": moment(doc.timeSlot).add(EXPIRE_TIME, 'h').toDate()
                        }
                    }
                }
            }
            let tempArray = Object.values(summaryObj)
            // console.log("tempArray=====>", tempArray.length);
            if (tempArray.length) {
                await mongoose.connection.db.collection("leadConversionSummary").insertMany(tempArray);
                tempArray = []
            }
        }
    } catch (error) {
        console.log(error);
    }
}

const blockOffer = async (netObj) => {
    let tempArray = [];

     // do unblock from autoBlock 
    try {
        // let result = await mongoose.connection.db.collection("blockedOffer").find({}, { _id: 1 }).toArray();
        let result = await blockOfferModel.findAllBlockOffer({ status: 2 }, { _id: 1, updatedAt: 1 });
        // console.log("blockedOffer====> ", result.length)
        for (const data of result) {
            if (moment.duration(moment().diff(moment(data.updatedAt))).asHours() >= BLOCKED_HOUR) {
                let result = await blockOfferModel.deleteOneBlockOffer({ _id: data._id })
                if (result) {
                    await OfferModel.updateOffer(
                        { "_id": data._id, isBlacklist: 2 },
                        { $set: { isBlacklist: 0 } },
                        {}
                    );
                    await Redis.delRedisData(`OFFER:${data._id.toString()}`);
                    await Function.publishJobForWebhook(netObj[data.nid], [data._id], 'offer_update', "Unblock Offer");
                }
            }
        }
    } catch (error) {
        console.log(error);
    }

 
    // after unblock , update autoBlock based these conditions .
    try {
        let leadConData = await mongoose.connection.db.collection('leadConversionSummary').find({}, {}).toArray()
        let groupObj = {};
        for (const doc of leadConData) {
            if (groupObj[doc.ofid]) {
                groupObj[doc.ofid]['con'] += +doc.con;
                groupObj[doc.ofid]['pcon'] += +doc.pcon;
            } else {
                groupObj[doc.ofid] = JSON.parse(JSON.stringify(doc))
            }
        }
        // console.log("leadConversionSummary ====> ", Object.values(groupObj).length)
        let convertedBlockOffer = [];
        for (const doc of Object.values(groupObj)) {
            // console.log("======================", doc)
            let tempObj = {};
            if (doc.con == 0) {
                if (doc.pcon > LEAD_COUNT) {
                    let isBlocked = await blockOfferModel.findOneBlockOffer({ _id: doc.ofid })
                    if (!isBlocked) {
                        let offFound = await OfferModel.updateOffer(
                            { "_id": doc.ofid, isBlacklist: 0 },
                            { $set: { isBlacklist: 2 } },
                            {}
                        );
                        if (offFound) {
                            // console.log("offFound======>", offFound);
                            tempObj["_id"] = doc.ofid;
                            tempObj["nid"] = doc.nid;
                            tempObj["status"] = 2
                            tempArray.push(tempObj);
                            await Redis.delRedisData(`OFFER:${doc.ofid.toString()}`);
                            await Function.publishJobForWebhook(netObj[doc.nid], [doc.ofid], 'offer_update', "Block Offer");
                        }
                    }
                }
            } else {
                let result = await blockOfferModel.deleteOneBlockOffer({ _id: doc.ofid });
                if (result) {
                    await OfferModel.updateOffer(
                        { "_id": doc.ofid, isBlacklist: 2 },
                        { $set: { isBlacklist: 0 } },
                        {}
                    );
                    await Redis.delRedisData(`OFFER:${doc.ofid.toString()}`);
                    await Function.publishJobForWebhook(netObj[doc.nid], [doc.ofid], 'offer_update', "Unblock Offer");
                }
            }
        }
    } catch (error) {
        console.log(error);
    }



    try {
        // console.log("blockedOffer=======>", tempArray.length);
        if (tempArray.length) {
            // await mongoose.connection.db.collection("blockedOffer").insertMany(tempArray);
            await blockOfferModel.insertManyBlockOffer(tempArray);
        }
    } catch (error) {
        console.log(error);
    }
}

exports.runAutoBlock = async () => {
    try {
        let networks = await NetworkModel.findAllNetwork({}, { _id: 1, nid: 1 });
        // console.log(networks)
        if (networks && networks.length) {
            let networkObj = {};
            networks.map(ele => networkObj[ele.nid] = ele._id)
            await genLeadConversionSummary(networkObj);
            await blockOffer(networkObj);
        }
    } catch (error) {
        console.log(error);
    }
};

// this.runAutoBlock()