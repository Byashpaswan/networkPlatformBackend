const Mongoose = require('mongoose');
const mongooseObjectId = Mongoose.Types.ObjectId;
require("dotenv").config({ path: ".env" });
const moment = require('moment');
require("../db/connection");
const wishlistModel = require('../db/wishlist');
var NetworkModel = require("../db/network/Network");
const OfferModel = require('../db/offer/Offer');
const { chunkArrayInGroups, publishJobForWebhook } = require('../helpers/Functions');


const markAccWishlist = async () => {
    return new Promise(async (resolve, reject) => {
        try {

            let networks = await fetchAllNetworks();
            console.log("file: markAccWishlist.js ~ line 26 ~ networks", networks.length)

            if (networks && networks.length) {

                let allWishList = await wishlistModel.searchAppId({}, { app_id: 1, network_id: 1 }, {});
                console.log("file: markAccWishlist.js ~ line 16 ~ allWishList", allWishList.length)

                if (allWishList && allWishList.length) {

                    for (let i = 0; i < allWishList.length; i++) {
                        let app_id = allWishList[i].app_id;
                        let network_id = allWishList[i].network_id
                        let markResult = await processWishlistOffers(app_id, network_id, setIsMyOfferFlagTo = true);
                        console.log("file: markAccWishlist.js ~ line 38 ~ returnnewPromise ~ markResult", markResult)

                        await addOffersToWebhook(network_id, app_id);
                    }
                }
                return resolve(true);
            }
        } catch (error) {
            console.log(error);
            return resolve(true);
        }
    })
}

const processWishlistOffers = async function (appId, network_id, setIsMyOfferFlagTo) {
    try {
        let date_range = moment().subtract(1, 'd').toDate();
        console.log("file: markAccWishlist.js ~ line 55 ~ processWishlistOffers ~ date_range", date_range)
        let filter = {
            network_id: mongooseObjectId(network_id),
            updatedAt: { $gte: date_range },
            app_id: appId,
            status: 1,
            isMyOffer: !setIsMyOfferFlagTo,
        };
        let reflect = { $set: { isMyOffer: setIsMyOfferFlagTo } };
        let res = await OfferModel.updateManyOffer(filter, reflect, {})
        if (res) {
            console.log("network_id", network_id, " ==================> finish", appId)
            return res
        }
    } catch (e) {
        console.log(e.message)
        return false
    }
}

fetchAllNetworks = async () => {
    try {
        let result = await NetworkModel.findAllNetwork({ status: "pending" }, { _id: 1, status: 1, company_name: 1, current_timezone: 1 });
        if (result && result.length) {
            return result;
        }
        return null;
    } catch (e) {
        console.log(e);
        return null;
    }
}

addOffersToWebhook = async (network_id, appId) => {
    // console.log("file: markAccWishlist.js ~ line 98 ~ addOffersToWebhook= ~ addOffersToWebhook called")
    try {
        let date_range = moment().subtract(1, 'd').toDate();
        let filter = {
            network_id: mongooseObjectId(network_id),
            updatedAt: { $gte: date_range },
            app_id: appId,
            status: 1,
            isMyOffer: true,
        };
        // console.log("file: markAccWishlist.js ~ line 95 ~ addOffersToWebhook= ~ filter", filter)

        let offerIds = [];
        let cursor = await OfferModel.getOffersByBatch(filter, { _id: 1 });
        cursor.on("data", async (doc) => {
            offerIds.push(doc['_id']);
            if (offerIds.length >= 50) {
                console.log(offerIds.length, " Job pushed in webhook ===========>", appId)
                await publishJobForWebhook(mongooseObjectId(network_id), offerIds, "offer_update", "Script mark wishlist");
                offerIds = [];
            }
        });
        cursor.on("end", async () => {
            if (offerIds.length) {
                console.log(offerIds.length, " Job pushed in webhook ===========>", appId)
                await publishJobForWebhook(mongooseObjectId(network_id), offerIds, "offer_update", "Script mark wishlist");
                offerIds = [];
            }
        });
        cursor.on("error", async () => {
            if (offerIds.length) {
                console.log(offerIds.length, " Job pushed in webhook ===========>", appId)
                await publishJobForWebhook(mongooseObjectId(network_id), offerIds, "offer_update", "Script mark wishlist");
                offerIds = [];
            }
            console.log("Error while fetching offers...");
        });
    } catch (error) {
        console.log(error);
    }
}

(async () => {
    let ack = await markAccWishlist();
    console.log("file: markAccWishlist.js ~ line 121 ~ ack", ack)
    process.exit()
})()