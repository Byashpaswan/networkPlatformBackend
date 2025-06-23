require("dotenv").config({
  path: ".env"
});
require("../../db/connection");

const { applyPlugin } = require("../../plugin");
//const rabbitMq = require("../../helpers/rabbitMQ");
const RabbitMqWorker = require("../../helpers/rabbitmqWorker");
const Promise = require("promise");
const consumer_queue = "Apply_Offers_Api_queue";
const debug = require("debug")("darwin:worker:apply");

function consume(channel, queue, option) {
  channel
    .assertQueue(queue, option)
    .then(res => {
      channel.prefetch(10);
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
    RabbitMqWorker.createWorker(function(channel) {
      consume(channel, consumer_queue, { persistent: true, durable: true });
    });
  } catch (err) {
    debug("callApi error while worker start", err);
  }
};
async function ProcessWork(msg, channel) {
  try {
    if (msg !== null && msg.content) {
      let ok = await FetchOffers(msg);
      // debug(ok);
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
async function FetchOffers(msg) {
  let content = JSON.parse(msg.content.toString());
  // debug(content);
  return new Promise(async (resolve, reject) => {
    if (
      content.platform_name &&
      content.credentials &&
      Object.keys(content.credentials).length
    ) {
      let ackMsg = null;
      let platform_name = content.platform_name;
      try {
        if (applyPlugin[platform_name.trim()]) {
          ackMsg = await applyPlugin[platform_name.trim()].ApplyApiCall(
            content
          );
          return resolve(ackMsg);
        } else {
          ackMsg = "Api Not Ready!!";
          return resolve(ackMsg);
        }
      } catch (e) {
        debug(e);
        return resolve(false);
      }
    } else {
      //return false;
      reject(false);
    }
  });
}

this.callApi();
