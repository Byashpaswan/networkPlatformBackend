const Mongoose = require('mongoose');
const mongooseObjectId = Mongoose.Types.ObjectId;

require("dotenv").config({ path: ".env" });
const { ConversionModel } = require("../db/click/clickLog");
const moment = require('moment');
require("../db/connection");
const debug = require("debug")("darwin:Script:HourlyUpdateWishlist");
const BATCH_RANGE = 1; //in days
const BATCH_SIZE = 50;
const rejectedAppIdModal = require('../db/rejectedAppId')
const WishListController = require('../controllers/wishlist/wishlistParse');
const wishlistModel = require('../db/wishlist');
const { chunkArrayInGroups } = require('../helpers/Functions');
const CONVERSION_CRITERIA = 3;
const Redis = require('../helpers/Redis');

exports.findConvertingPackages = async () => {
    try {
        debug('Start Script');
        let date_range = generateDateRange();
        if (date_range) {
            let filter = {
                createdAt: {
                    $gt: date_range,
                }
            };
            let group_by = { _id: { app_id: "$app_id", network_id: "$network_id" }, conversion: { $sum: 1 } };
            let result = await ConversionModel.fetchAggregateResult(filter, group_by);
            if (result.length) {
                await processConvertingPackages(result);
            }
        }
    }
    catch (e) {
        console.log(e.message);
    }
}

async function processConvertingPackages(ConvertingPackages) {
    let batchLen = 0;
    let appIdBatch = [];
    let appIdBatchWithConversion = [];
    let rejectedAppId = await rejectedAppIdModal.searchAppId({}, { app_id: 1, _id: 0 });
    let rejectedAppIdArray = rejectedAppId.map(el => el.app_id);
    for (let temp of ConvertingPackages) {
        let network_id = temp._id['network_id'];
        let app_id = temp._id['app_id'];
        if (app_id && temp.conversion >= CONVERSION_CRITERIA) {
            if (!appIdBatch[network_id]) {
                appIdBatch[network_id] = [];
                appIdBatchWithConversion[network_id] = [];
            }
            if (!appIdBatch[network_id].includes(app_id)) {
                appIdBatch[network_id].push(app_id);
                appIdBatchWithConversion[network_id][app_id] = temp.conversion || 0;
                batchLen++;
            }
        }
        if (batchLen >= BATCH_SIZE) {
            await FilterAndAddConvertingWishlist(appIdBatch, appIdBatchWithConversion, rejectedAppIdArray);
            appIdBatch = [];
            appIdBatchWithConversion = [];
            batchLen = 0;
        }
    }

    if (batchLen > 0) {
        await FilterAndAddConvertingWishlist(appIdBatch, appIdBatchWithConversion, rejectedAppIdArray);
        appIdBatch = [];
        appIdBatchWithConversion = [];
        batchLen = 0;
    }
}

function generateDateRange() {
    let date = null;
    try {
        date = moment()
            .endOf("day")
            .subtract(BATCH_RANGE, "days")
            .toDate();
    } catch (err) {
    }
    return date;
}

async function FilterAndAddConvertingWishlist(app_idSet, appIdBatchWithConversion, rejectedAppIdArray) {
    try {
        let batch = [];
        for (let network_id in app_idSet) {
            if (app_idSet[network_id].length) {
                let tempArray = await chunkArrayInGroups(app_idSet[network_id], 15);
                for (let pkgArray of tempArray) {
                    let wishList_res = await wishlistModel.searchAppId({ network_id: mongooseObjectId(network_id), app_id: { $in: pkgArray } }, { app_id: 1 }, {});

                    if (wishList_res.length) {
                        wishList_res.map(obj => {
                            let index = app_idSet[network_id].indexOf(obj.app_id);
                            if (index >= 0) {
                                app_idSet[network_id].splice(index, 1);
                            }
                        })
                    }

                    let rjectedAppId = pkgArray.filter(app_id => {
                        return rejectedAppIdArray.includes(app_id);
                    });

                    if (rjectedAppId.length) {
                        rjectedAppId.map(app_id => {
                            let index = app_idSet[network_id].indexOf(app_id);
                            if (index >= 0) {
                                app_idSet[network_id].splice(index, 1);
                            }
                        })
                    }
                }
                for (let app_id of app_idSet[network_id]) {
                    let conv = appIdBatchWithConversion[network_id][app_id];
                    batch.push({ app_id: app_id, network_id: network_id, liveType: 'script', conversion: conv || 0 });
                    if (batch.length >= 50) {
                        try {
                            await wishlistModel.insertManyAppIds(batch);
                            debug(batch.length, ' Inserted');
                        } catch { }
                        batch = [];
                    }
                }
            }
            if (app_idSet[network_id].length) {
                try {
                    debug('Reflecting to Offers...', app_idSet[network_id].length, ' AppIds');
                    await WishListController.processWishlistOffers(app_idSet[network_id], network_id, setIsMyOfferFlagTo = true);
                    // Redis.delRedisHashData('wishlist', network_id.toString());
                    Redis.delRedisData('WISHLIST:' + network_id.toString());
                }
                catch (err) { console.log(err.message); }
            }

        }
        if (batch.length) {
            try {
                await wishlistModel.insertManyAppIds(batch);
                debug(batch.length, ' Inserted');
            } catch { }
            batch = [];
        }
    }
    catch (e) {
        console.log(e.message)
    }
}

// this.findConvertingPackages();
