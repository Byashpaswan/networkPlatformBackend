require("dotenv").config({ path: ".env" });
require("../../db/connection");

const RabbitMqWorker = require("../../helpers/rabbitmqWorker");
const Promise = require("promise");
const consumer_queue = "autoUpdateOffer";

const OfferModel = require("../../db/offer/Offer");

function consume(channel, queue, option) {
  channel
    .assertQueue(queue, option)
    .then(res => {
      channel.prefetch(1);
      channel.consume(queue,
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

exports.startAutoUpdateOfferWorker = async () => {
  try {
    RabbitMqWorker.createWorker(function (channel) {
      consume(channel, consumer_queue, { persistent: true, durable: true, maxPriority: 20 });
    });
  } catch (err) {
    console.log("callApi error while worker start", err);
  }
};

async function ProcessWork(msg, channel) {
  try {
    if (msg !== null && msg.content) {
      let ok = await FetchOffers(msg);
      if (ok) channel.ack(msg);
      else channel.ack(msg, true);
    } else {
      channel.ack(msg);
    }
  } catch (err) {
    console.log("error while processing worker", err);
  }
}

async function FetchOffers(msg) {
  return new Promise(async (resolve, reject) => {
    try {
      let offerIdList = JSON.parse(msg.content);
      if (Array.isArray(offerIdList) && offerIdList.length) {
        await OfferModel.updateManyOffer(
          { _id: { $in: offerIdList } },
          { $set: { status: 1, status_label: "active" } },
          {}
        )
        return resolve(true);
      }
      return resolve(false);
    } catch (error) {
      console.log(error);
      return resolve(false);
    }
  });
}

this.startAutoUpdateOfferWorker();
