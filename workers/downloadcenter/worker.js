require("dotenv").config({
  path: ".env"
});
const debug = require("debug")("darwin:worker:offer_downloadcenter");
require("../../db/connection");
const Mongoose = require("mongoose");
const RabbitMqWorker = require("../../helpers/rabbitmqWorker");
const Promise = require("promise");
const ObjectId = Mongoose.Types.ObjectId;
const DownloadCenterModel = require('../../db/DownloadCenterModel');
const Download = require('../../helpers/export/download');
const { setHashData } = require('../../helpers/Redis');

const consumer_queue = "download_center_offer_queue";

function consume(channel, queue, option) {
  channel
    .assertQueue(queue, option)
    .then(res => {
      channel.prefetch(1);
      channel.consume(
        queue,
        msg => {
          // console.log("========================Call Process Work");
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
    // console.log("==================Worker Created");
    RabbitMqWorker.createWorker(function (channel) {
      consume(channel, consumer_queue, { persistent: true, durable: true });
    });
  } catch (err) {
    debug("callApi error , while worker start", err);
  }
};

async function ProcessWork(msg, channel) {
  try {
    if (msg !== null && msg.content) {
      // console.log("======================CallDownload Api Function call");
      let ok = await callDownloadApi(msg);
      // debug(ok, "&&&&&&&&&&&&&&&&&&&&&");
      if (ok) {
        channel.ack(msg);
        // console.log("===================Acknowledgement Received");
      }
    } else {
      channel.ack(msg);
    }
  } catch (err) {
    console.log("error while processing worker", err);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms)); // 10000
}

async function callDownloadApi(msg) {

  return new Promise(async (resolve, reject) => {
    try {
      await setHashData("WRQUEUESTATUS", consumer_queue, moment().toISOString());

      let content = JSON.parse(msg.content.toString());
      let filter = { _id: ObjectId(content) };
      let projection = { networkId: 1, userDetails: 1, query: 1, report: 1, downloadId: 1 };
      let result = {};
      let notFoundCount = 1;
      while (notFoundCount <= 3) {
        result = await DownloadCenterModel.findOneDoc(filter, projection, {});
        if (result && result['_id']) {
          notFoundCount = 4;
        } else {
          console.log("===>> Download id " + content + " not found count " + notFoundCount);
          if (notFoundCount < 3) {
            await sleep(10000);
          }
          notFoundCount++;
        }
      }
      if (result && result['_id']) {
        await Download.downloadReport(result);
        return resolve(true);
      } else {
        console.log("===>> Invalid download id " + content);
        return resolve(true);
      }
    } catch (error) {
      debug(error);
      return resolve(false);
    }
  });
}

this.callApi();
