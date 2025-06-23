const Mongoose = require('mongoose');
require("dotenv").config({ path: ".env" });
const moment = require('moment');
require("../db/connection");
const debug = require("debug")("darwin:Script:FilterAndDeleteWishlist");
const BATCH_RANGE = 1; //in days
const wishlistModel = require('../db/wishlist');
const WishListController = require('../controllers/wishlist/wishlistParse');
const Redis = require('../helpers/Redis');


exports.filterWishlist = async function () {
  try {
    let date_range = generateDateRange();
    if (date_range) {
      let filter = {
        createdAt: {
          $lte: date_range
        }
      };
      let oldWishlist = await wishlistModel.searchAppId(filter, { app_id: 1, network_id: 1, _id: 0 });
      let result = await wishlistModel.deleteManyAppId(filter);
      if (result.deletedCount > 0) {
        let appIdBatch = await formatWishlistByNetworkId(oldWishlist);
        let saveFlagMsg = await setIsMyOfferFlagFalse(appIdBatch);
        console.log("Day before today wishlist data deleted ", saveFlagMsg, (new Date()).toISOString());
      }
    }
  } catch (err) {
    console.log(err.message);
  }
};

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

async function formatWishlistByNetworkId(oldWishlist) {

  let appIdBatch = []

  for (let obj of oldWishlist) {
    let network_id = obj.network_id
    let app_id = obj.app_id

    if (!appIdBatch[network_id]) {
      appIdBatch[network_id] = [];
    }
    if (!appIdBatch[network_id].includes(app_id)) {
      appIdBatch[network_id].push(app_id);
    }
  }
  return appIdBatch;
}


async function setIsMyOfferFlagFalse(appIdBatch) {

  let saveFlagMsg = "success";

  for (let network_id in appIdBatch) {
    if (appIdBatch[network_id].length) {
      try {
        await WishListController.processWishlistOffers(appIdBatch[network_id], network_id, setIsMyOfferFlagTo = false);
        // Redis.delRedisHashData('wishlist', network_id.toString());
        Redis.delRedisData('WISHLIST:' + network_id.toString());
      }
      catch (err) {
        saveFlagMsg = "error"
        console.log(err.message);
      }
    }
  }

  return saveFlagMsg;
}

// this.filterWishlist();
