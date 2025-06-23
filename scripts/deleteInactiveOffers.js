require("dotenv").config({ path: ".env" });
require("../db/connection");

const Mongoose = require("mongoose");
const mongooseObjectId = Mongoose.Types.ObjectId;
const moment = require('moment');
const BATCH_SIZE = 1000;
const OFFER_DELETE_UPDATE_RANGE = 30;
const OfferModel = require("../db/offer/Offer");
const NetworkModel = require("../db/network/Network");
const { OffersSourceAdvAffSummaryModel } = require("../db/click/sourceSummary/sourceSummary");

exports.deleteInactiveOffers = async () => {
    try {
        let deleteTimeRange = moment().startOf("hour").subtract(OFFER_DELETE_UPDATE_RANGE, "days").toDate();
        if (deleteTimeRange) {

            let networkList = await getNetworkList();
            if (networkList) {
                for (const networkObj of networkList) {

                    let allOffersBatch = [];
                    let filter = { network_id: mongooseObjectId(networkObj._id), 'updatedAt': { $lte: deleteTimeRange } };
                    let projection = { _id: 1, updatedAt: 1, status: 1 };

                    let cursor = await OfferModel.getOffersByBatch(filter, projection);
                    for (let tempOffer = await cursor.next(); tempOffer != null; tempOffer = await cursor.next()) {

                        if (tempOffer.status != 1) {
                            allOffersBatch.push(tempOffer._id);
                        } else {
                            try {
                                let result = await OffersSourceAdvAffSummaryModel.findSlotDoc({ offer_id: tempOffer._id });
                                // console.log(result.offer_id)
                                if (!result) {
                                    allOffersBatch.push(tempOffer._id);
                                }
                            }
                            catch (e) {
                                console.log(e);
                            }
                        }
                        if (allOffersBatch.length >= BATCH_SIZE) {
                            try {
                                let dbResult = await OfferModel.deleteBulkOffer({ _id: { $in: allOffersBatch } });
                                console.log("No Stats Offer deleted ~ ", dbResult.deletedCount, ", All Offers By Batch: ", allOffersBatch.length)
                                allOffersBatch = [];
                            }
                            catch (error) {
                                console.log(error)
                            }
                        }
                    }
                    if (allOffersBatch.length > 0) {
                        try {
                            let dbResult = await OfferModel.deleteBulkOffer({ _id: { $in: allOffersBatch } });
                            console.log("No Stats Offer deleted ~ ", dbResult.deletedCount)
                            allOffersBatch = [];
                        }
                        catch (error) {
                            console.log(error)
                        }
                    }
                }
            }
        }
    }
    catch (e) {
        console.log(e)
    }
    process.exit(1);
}

async function getNetworkList() {
    try {
        let result = await NetworkModel.findAllNetwork({ status: "pending" }, { _id: 1 });
        if (result && result.length) return result;
    } catch (e) {
        console.log(e);
        return null;
    }
}

this.deleteInactiveOffers();