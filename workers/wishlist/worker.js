require("dotenv").config({ path: ".env" });
require("../../db/connection");

const Mongoose = require("mongoose");
const Promise = require("promise");
const mongooseObjectId = Mongoose.Types.ObjectId;

const debug = require("debug")("darwin:worker:wishlist");
const RabbitMqWorker = require("../../helpers/rabbitmqWorker");
const WishlsitModel = require("../../db/wishlist");
const rejectedAppIdModal = require('../../db/rejectedAppId')
const WishlistParseController = require('../../controllers/wishlist/wishlistParse');
const Redis = require('../../helpers/Redis')
const moment = require('moment');

const consumer_queue = "wishlist_offer_flag_queue";
const DATE_RANGE = process.env.MY_OFFER_DATE_RANGE || 7;

/**
 * Main functions to start worker
 */
exports.callApi = async () => {
  try {
    RabbitMqWorker.createWorker(function (channel) {
      consume(channel, consumer_queue, { persistent: true, durable: true });
    });
  } catch (err) {
    debug("callApi error while worker start", err);
  }
};

/**
 * Starting consume published job
 * Parameters : channel => one session started by RabbitMqWorker
 * Parameters : queue => name of the queue which all the jobs hold
 * Parameters : option => durablity, persistent of message, you can add anoter option also, must be a json object
 */
function consume(channel, queue, option) {
  channel
    .assertQueue(queue, option)
    .then(res => {
      channel.prefetch(1);
      channel.consume(
        queue,
        msg => {
          ProcessWork(msg, channel);
        },
        {
          noAck: false
        }
      );
    })
    .catch(err => {
      console.log("Error while asserting queue", err);
    });
}

/**
 * Start processing job given by consumer
 * Parameters : msg => holding content of job
 * Parameters : channel => one session started by RabbitMqWorker
 */
async function ProcessWork(msg, channel) {
  try {
    if (msg !== null && msg.content) {
      let ok = await callWorkingApi(msg);
      // debug("Response from worker ", ok);
      if (ok) {
        channel.ack(msg);
      } else {
        channel.ack(msg, true);
      }
    } else {
      channel.ack(msg);
    }
  } catch (err) {
    console.log("error while processing worker", err);
  }
}

/**
 * Produce output of given job
 * Parameters : msg => holding content of job
 */
async function callWorkingApi(msg) {

  let content = JSON.parse(msg.content.toString());
  // debug(content);

  return new Promise(async (resolve, reject) => {
    try {

      if (content && content.app_id && content.network_id) {

        let app_id = content.app_id.toString()
        let network_id = content.network_id

        let appIdCountRedisKey = network_id + ":" + app_id
        let appIdCount = await Redis.getRedisHashData('wishlistappidcount', appIdCountRedisKey);

        if (appIdCount.data >= 2) {
          let result = await rejectedAppIdModal.searchAppId({ "app_id": app_id });

          if (result.length <= 0) {
            let item = { network_id: network_id, app_id: app_id, test: false, 'liveType': 'script' };
            WishlsitModel.insertManyAppIds(item).then(async result => {
              if (result) {
                let appIdArray = [app_id]
                await WishlistParseController.processWishlistOffers(appIdArray, network_id, setIsMyOfferFlagTo = true)
              }
            }).catch(err => {
              console.log("Wishlist Worker, Not added in wishlist ", err);
            });
          }
          return resolve(true);
        }
        else {
          if (!appIdCount.data) {
            appIdCount.data = 0
          }
          await Redis.setRedisHashData('wishlistappidcount', appIdCountRedisKey, appIdCount.data + 1, process.env.WISHLIST_APPID_COUNT_EXP_TIME);
          return resolve(true);
        }
      }
    } catch (e) {
      debug(e);
      return resolve(false);
    }
  });
}

this.callApi();
