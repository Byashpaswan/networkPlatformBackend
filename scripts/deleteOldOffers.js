require("dotenv").config({ path: ".env" });
require("../db/connection");

const OFFER_DELETE_RANGE = process.env.OFFER_DELETE_RANGE || 60;
const OFFER_LEAD_CONVERSION_FILTER_RANGE = process.env.OFFER_LEAD_CONVERSION_FILTER_RANGE || 180;

const moment = require('moment');
const debug = require("debug")("darwin:Script:DeleteOldOffers");
const OfferModel = require("../db/offer/Offer");
const { DeletedOffersModel } = require("../db/offer/DeletedOffers");
const { DailyAdvertiserOfferPublisherSummaryModel } = require("../db/click/sourceSummary/sourceSummary");
let deleteOfferCount = 0


exports.deleteOldOffers = async () => {

    try {

        let filter = {}
        let projection = {}
        let options = { $sort: { "_id": -1 } };

        let cursor = await OfferModel.getAllOfferByCursor(filter, projection, options);
        cursor.on("data", function (offer) {
            let offerLastUpdatedDays = moment.duration(moment().startOf("day").diff(moment(offer.updatedAt))).asDays();
            if (offerLastUpdatedDays > OFFER_DELETE_RANGE) {
                checkLeadConversionAndProccessDeleteOffer(offer)
            }
        });

        cursor.on("end", async () => {
            debug('Old offers deleted count: ', deleteOfferCount)
        });

        cursor.on("error", async (error) => {
            debug('error non Live offer deleted: ', deleteOfferCount)
            debug(error);
        });

    } catch (error) {
        debug(error)
    }
}

const checkLeadConversionAndProccessDeleteOffer = async (offer) => {

    try {

        let filter = { network_id: offer.network_id, offer_id: offer._id, conversion: { $gte: 1 } };
        let projection = { _id: 0, offer_id: 1, pre_conversion: 1, conversion: 1, updatedAt: 1 };
        let options = { $sort: { timeSlot: -1 } }
        
        let offerStas = await DailyAdvertiserOfferPublisherSummaryModel.findSlotDoc(filter, projection, options);
        if (offerStas) {

            if (!offerStas.pre_conversion && !offerStas.conversion) {
                await shiftOffersToDeletedOffersTable("noLeadNoConversion", offer);
            }
            else if (offerStas.pre_conversion && !offerStas.conversion) {
                let lastLeadConversionDays = moment.duration(moment().startOf("day").diff(moment(offerStas.updatedAt))).asDays();
                if (lastLeadConversionDays > OFFER_DELETE_RANGE) {
                    await shiftOffersToDeletedOffersTable("leadWithNoConversion", offer);
                }
            }
            else if (offerStas.conversion) {
                let offerLastUpdatedDays = moment.duration(moment().startOf("day").diff(moment(offer.updatedAt))).asDays();
                let lastLeadConversionDays = moment.duration(moment().startOf("day").diff(moment(offerStas.updatedAt))).asDays();
                if (offerLastUpdatedDays > OFFER_LEAD_CONVERSION_FILTER_RANGE && lastLeadConversionDays > OFFER_LEAD_CONVERSION_FILTER_RANGE) {
                    await shiftOffersToDeletedOffersTable("leadWithConversion", offer);
                }
            }
        }
        // else {
        //     await shiftOffersToDeletedOffersTable("noStats", offer);
        // }
    } catch (error) {
        debug(error)
    }
}

const shiftOffersToDeletedOffersTable = async (offerDeleteType, offer) => {
    
    try {
        deleteOfferCount += 1
        let deleteOffer = {}
        if (offerDeleteType == "noLeadNoConversion" || offerDeleteType == "leadWithNoConversion") {
            deleteOffer['_id'] = offer._id;
            deleteOffer['network_id'] = offer.network_id;
            deleteOffer['advertiser_offer_id'] = offer.advertiser_offer_id;
            deleteOffer['platform_id'] = offer.platform_id;
            deleteOffer['advertiser_id'] = offer.advertiser_id;
            deleteOffer['advertiser_platform_id'] = offer.advertiser_platform_id;
            deleteOffer['app_id'] = offer.app_id;
            deleteOffer['status_label'] = offer.status_label;
            deleteOffer['status'] = offer.status;
            deleteOffer['offer_hash'] = offer.offer_hash;
            deleteOffer['createdAt'] = offer.createdAt;
            deleteOffer['updatedAt'] = offer.updatedAt;
        }
        else if (offerDeleteType == "leadWithConversion") {
            deleteOffer = offer
        }
        
        await DeletedOffersModel.saveOldOffers(deleteOffer);
        await OfferModel.deleteBulkOffer({ _id: offer._id });
    } catch (error) {
        debug(error)
    }
}

// this.deleteOldOffers()