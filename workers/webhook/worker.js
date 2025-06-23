require("dotenv").config({
  path: ".env"
});
const debug = require("debug")("darwin:worker:webhook");
require("../../db/connection");
const Mongoose = require("mongoose");
const rabbitMq = require("../../helpers/rabbitMQ");
const RabbitMqWorker = require("../../helpers/rabbitmqWorker");
const Promise = require("promise");
const consumer_queue = "webhook_queue";
const mongooseObjectId = Mongoose.Types.ObjectId;
const webhookModel = require('../../db/webhook')
const OfferModel = require('../../db/offer/Offer');
const axios = require('axios');
const Function = require('../../helpers/Functions');
const Network = require('../../db/network/Network');
const AdvertiserModel = require('../../db/advertiser/Advertiser');
const Redis = require('../../helpers/Redis');
const moment = require("moment");

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


exports.callApi = async () => {
  try {
    RabbitMqWorker.createWorker(function (channel) {
      consume(channel, consumer_queue, { persistent: true, durable: true, maxPriority: 20 });
    });
  } catch (err) {
    debug("callApi error while worker start", err);
  }
};
async function ProcessWork(msg, channel) {
  try {
    if (msg !== null && msg.content) {
      let ok = await callWorkingApi(msg);
      // debug(ok, "&&&&&&&&&&&&&&&&&&&&&");
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
async function callWorkingApi(msg) {

  return new Promise(async (resolve, reject) => {

    try {
      await Redis.setHashData("WRQUEUESTATUS", consumer_queue, moment().toISOString());

      let content = JSON.parse(msg.content.toString());
      if (content.network_id && content.event) {


        // Find webhook setting
        let WHsetting = [];
        let WHSettingRedis = await Redis.getRedisHashData("webhooksetting:", content.network_id);
        if (!WHSettingRedis.error && WHSettingRedis.data && WHSettingRedis.data[0]) {
          WHsetting = WHSettingRedis.data;
        } else {
          WHsetting = await webhookModel.findwebhookSetting({ network_id: content.network_id });
          Redis.setRedisHashData("webhooksetting:", content.network_id, WHsetting, 3600);
        }

        // Find network data
        let networkData = {};
        let networkDataRedis = await Redis.getRedisHashData('networks', content.network_id);
        if (!networkDataRedis.error && networkDataRedis.data && networkDataRedis.data._id) {
          networkData = networkDataRedis.data;
        } else {
          let networkDataDB = await Network.isNetworkExist(
            { _id: content.network_id },
            { network_unique_id: 1, network_publisher_setting_string: 1, country: 1, status: 1, company_name: 1, domain: 1 }
          );
          networkData = networkDataDB[0];
          Redis.setRedisHashData('networks', content.network_id, networkData, 36000);
        }

        // Find pushed offer detail according to setting(projection)
        let search = { _id: { $in: content.offersId } };
        let projection = { 'advertiser_id': 1, 'ewt': 1 }
        for (let key of WHsetting[0].offersKeys) { projection[key] = 1 }
        let offersData = await OfferModel.getSearchOffer(search, projection, {})

        // Find inactive advertiser
        let allInActiveAdvertiser = (await Redis.getRedisSetData("INACTIVEADVERTISER:" + content.network_id.toString())).data;
        if (!allInActiveAdvertiser.length) {
          allInActiveAdvertiser = []
          let advertiserIds = await AdvertiserModel.getAdvertiser({ network_id: mongooseObjectId(content.network_id), "status": "InActive" }, { _id: 1 })
          for (let obj of advertiserIds) { allInActiveAdvertiser.push("" + obj._id) }
          Redis.setRedisSetData("INACTIVEADVERTISER:" + content.network_id.toString(), allInActiveAdvertiser)
        }

        // Prepare and Filter offer accroding to inactive advertiser to push in webhook
        let webhookOffers = []
        for (let singleOffer of offersData) {
          if (!allInActiveAdvertiser.includes("" + singleOffer.advertiser_id)) {
            // console.log("callWorkingApi -> allInActiveAdvertiser.includes(singleOffer.advertiser_id)", allInActiveAdvertiser.includes(""+singleOffer.advertiser_id), ""+singleOffer.advertiser_id)
            if (projection.link) {
              singleOffer['link'] = Function.generateTrackingLink(networkData, singleOffer._id, WHsetting[0].pid, singleOffer.advertiser_id, networkData.network_publisher_setting_string)
            }
            webhookOffers.push(singleOffer)
          }
        }
        // console.log("callWorkingApi -> webhookOffers", webhookOffers.length)
        try {
          if (webhookOffers.length) {
            let key = "WPCNT:" + content.network_id + ":" + moment.utc().format('DD/MM/YY:HH');
            Redis.incrbyRedisData(key, webhookOffers.length, process.env.MAX_WEBHOOK_PUSHED_OFFER_TIME || 86400);
          }
        } catch (error) {
          debug(error);
        }


        let webHookData = {}
        webHookData[WHsetting[0]['key']] = { "network_id": mongooseObjectId(content.network_id), "offers": webhookOffers, "token": WHsetting[0]['token'] };

        let config = {
          method: WHsetting[0].method,
          url: WHsetting[0].url,
          data: webHookData,
          headers: {
            'Content-Type': "application/x-www-form-urlencoded"
          }
        }
        // console.log("callWorkingApi -> config", config)

        axios(config).then(res => {
          return resolve(true);
        }).catch(err => {
          // console.log(err.response);
          return resolve(false);
        })
      }
      else {
        return resolve(false);
      }
    } catch (e) {
      debug(e);
      console.log(e)
      return resolve(false);
    }
  });
}

this.callApi();
