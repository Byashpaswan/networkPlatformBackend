const Mongoose = require("mongoose");
const mongooseObjectId = Mongoose.Types.ObjectId;
require("dotenv").config({ path: ".env" });
const moment = require("moment");
const debug = require("debug")("darwin:script:updateOffers");
require('../db/connection');
const Redis = require('../helpers/Redis');
const OfferModel = require("../db/offer/Offer");
const NetworkModel = require("../db/network/Network");
const arguments = process.argv;


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

async function updateOneOffer(offer) {
    try {
        if (offer['publisher_offers'] && offer['publisher_offers'].length) {
            let pubOff = [];
            let payout = +offer['payout'];
            let revenue = +offer['revenue'];
            for (let item of offer['publisher_offers']) {
                let payPer = parseInt(item['publisher_payout_percent']);
                if (payPer == 0 || revenue == 0) {
                    payout = 0;
                } else if (!isNaN(payPer) && revenue) {
                    payout = revenue * item['publisher_payout_percent'] / 100;
                } else {
                    Redis.setRedisSetData('invalidOffers', offer['_id']);
                }
                pubOff.push({
                    id: item['publisher_id'],
                    pay: payout,
                    pubOffSt: !isNaN(item['publisher_offer_status']) ? item['publisher_offer_status'] : 0
                });
            }
            await OfferModel.updateOne({ _id: offer['_id'] }, { $set: { pubOff: pubOff } }, { timestamps: false });
            console.log("Updated ===>> Offer " + offer['_id'] + ".");
        }
    } catch (error) {
        Redis.setRedisSetData('invalidOffers', offer['_id']);
        debug(error);
    }
}

async function processOneOffer(offer_id) {
    return new Promise(async (resolve, reject) => {
        try {
            let offer = await OfferModel.findOne({ _id: offer_id, }, { publisher_offers: 1, payout: 1, revenue: 1 });
            if (offer && offer['_id']) {
                await updateOneOffer(offer);
            } else {
                console.log("Error ===>> Offer not found.");
            }
            return resolve();
        } catch (error) {
            debug(error);
            return reject();
        }
    });
}

async function processManyOffers(networkId, startDate, endDate) {
    return new Promise(async (resolve, reject) => {
        try {
            let cursor = await OfferModel.find(
                {
                    network_id: networkId,
                    createdAt: {
                        $gte: startDate.toDate(),
                        $lte: endDate.toDate()
                    }
                },
                { publisher_offers: 1, payout: 1, revenue: 1 }
            ).lean().cursor({ batchSize: 500 });
            cursor.on("data", async (doc) => {
                updateOneOffer(doc);
            });

            cursor.on("end", async () => { });

            cursor.on("error", async () => { });

            return resolve();
        } catch (error) {
            debug(error);
            return reject();
        }
    });
}

exports.startUpdateOffersScript = async () => {
    try {
        if (arguments[2] && mongooseObjectId.isValid(arguments[2])) {
            await processOneOffer(mongooseObjectId(arguments[2]));
        } else if (arguments[2] && arguments[3]) {
            let startDate = moment(arguments[2], 'DD/MM/YYYY');
            let endDate = moment(arguments[3], 'DD/MM/YYYY').endOf('day');
            if (startDate.isValid() && endDate.isValid()) {
                let networks = await getNetworks();
                if (networks && networks.length) {
                    for (let network of networks) {
                        await processManyOffers(network['_id'], startDate, endDate);
                    }
                }
            } else {
                console.log('Error ===>> Invalid start date or end date.');
            }
        } else {
            console.log('Error ===>> Invalid command line arguments.');
        }
    } catch (error) {
        debug(error);
    }
};

this.startUpdateOffersScript();


// node scripts/updateOffers.js  01/01/2022 01/04/2022