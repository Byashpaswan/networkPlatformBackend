require("dotenv").config({
  path: ".env"
});
const debug = require("debug")("darwin:worker:myOffer");
require("../../db/connection");
const Mongoose = require("mongoose");
const rabbitMq = require("../../helpers/rabbitMQ");
const RabbitMqWorker = require("../../helpers/rabbitmqWorker");
const Promise = require("promise");
const consumer_queue = "filter_my_offer";
const mongooseObjectId = Mongoose.Types.ObjectId;

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
      consume(channel, consumer_queue, { persistent: true, durable: true });
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
  let content = JSON.parse(msg.content.toString());
  // debug(content);
  return new Promise(async (resolve, reject) => {
    try {
      if (content.tracking_link && content.country && content.preview_url) {
        let result = await rabbitMq.makeRequest({
          method: "post",
          url: "http://stage.c2a.in/working_api.php",
          headers: {
            "User-Agent": "Console app",
            token: "tempToken",
            "api-method": "my_offers"
          },
          params: {
            token: "tempToken",
            preview_url: content.preview_url
            // preview_url: "https://play.google.com/store/apps/details?id=de.mcoins.applike",
          }
        });
        result = result.data;
        // debug(result);
        if (result && result.success) {
          if (result.message == "Valid Offer") {
            rabbitMq.publish_Content(
              false,
              "live_working_offer",
              content,
              true,
              true,
              false,
              0
            );
            return resolve(true);
          } else {
            return resolve(false);
          }
        } else {
          return resolve(false);
        }
      } else {
        return resolve(false);
      }
    } catch (e) {
      debug(e);
      return resolve(false);
    }
  });
}

this.callApi();
