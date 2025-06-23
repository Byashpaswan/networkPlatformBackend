require("dotenv").config({
  path: ".env"
});
const debug = require("debug")("darwin:worker:ScrapingWorker");
require("../../db/connection");
const Mongoose = require("mongoose");
const RabbitMqWorker = require("../../helpers/rabbitmqWorker");
const Promise = require("promise");
const consumer_queue = "scrap_app_ids_queue";
const mongooseObjectId = Mongoose.Types.ObjectId;
const ApplicationDetailsModel = require('../../db/applicationDetails/ApplicationDetails');
const storeData = require('../../helpers/StoreData');

const maxNotFoundCount = 5;

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
      let ok = await fetchApps(msg);
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
    channel.ack(msg);
  }
}

async function fetchApps(msg) {
  return new Promise(async (resolve, reject) => {
    let content = JSON.parse(msg.content.toString());
    let data = {};
    if (content) {
      try {
        if (storeData.isNumeric(content.app_id)) {
          data = await storeData.iosStoreData(content.app_id);
        } else {
          data = await storeData.androidStoreData(content.app_id);
        }
      } catch (error) {
        console.log(error);
        return resolve(true);
      }
      let filter = { _id: mongooseObjectId(content._id) };
      if (data.message && (data.message == "getaddrinfo EAI_AGAIN itunes.apple.com" || data.message == "Error: getaddrinfo EAI_AGAIN play.google.com")) {
        console.log("Please check your internet connection...", data.message);
        return reject(true);
      } else if ((data.message && data.message == "App not found (404)") || (data.statusCode && data.statusCode == 404)) {
        try {
          let projection = { not_found_count: 1 };
          let options = {};
          let result = await ApplicationDetailsModel.getApplicationDetails(filter, projection, options);
          if (result && result[0] && result[0]['not_found_count'] < maxNotFoundCount) {
            await ApplicationDetailsModel.updateApplicationDetails(filter, { $inc: { not_found_count: 1 } });
          } else {
            await ApplicationDetailsModel.updateApplicationDetails(filter, { not_found: true });
          }
          // console.log(content.app_id, "not found !!");
          return resolve(true);
        } catch (error) {
          debug(error);
          return reject(false);
        }
      } else if (!data.app_id) {
        try {
          await ApplicationDetailsModel.updateApplicationDetails(filter, { not_found: true, is_incorrect_app_id: true });
        } catch (error) {
          debug(error);
          return reject(false);
        }
        console.log("Something went wrong while processing", content.app_id, "app_id...");
        // console.log("Error", data);
        return resolve(true);
      }
      try {
        data['not_found_count'] = 0;
        data['not_found'] = false;
        let result = await ApplicationDetailsModel.updateApplicationDetails(filter, data);
        if (result) {
          // console.log(data.app_id, "Scraping updated !!");
          return resolve(true);
        } else {
          // console.log(filter._id, "not found in your database !!");
          return resolve(true);
        }
      } catch (error) {
        debug(error);
        return reject(false);
      }
    } else {
      return reject(false);
    }
  });
}

this.callApi();