require("dotenv").config({
  path: ".env"
});
const debug = require("debug")("darwin:worker:liveWorking");
require("../../db/connection");
const Mongoose = require("mongoose");
const rabbitMq = require("../../helpers/rabbitMQ");
const RabbitMqWorker = require('../../helpers/rabbitmqWorker');
const OfferModel = require("../../db/offer/Offer");
const WorkingOfferLogModel = require("../../db/workingOfferLog");
const Promise = require("promise");
const consumer_queue = "live_working_offer";
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
  } catch (err) { }
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
  // debug(content);
  return new Promise(async (resolve, reject) => {
    try {
      await Redis.setHashData("WRQUEUESTATUS", consumer_queue, moment().toISOString());

      let content = JSON.parse(msg.content.toString());
      if (content.tracking_link && content.country && content.preview_url) {
        let log = {
          network_id: null,
          offer_id: content._id,
          tracking_link: content.tracking_link,
          preview_url: content.preview_url,
          country: content.country,
          total_redirection: 0,
          last_redirection: "",
          second_last_redirection: "",
          all_redirections: "",
          message: "",
          apiStatus: 1,
          workingStatus: false
        };
        let result = await rabbitMq.makeRequest({
          method: "post",
          url: "http://stage.c2a.in/working_api.php",
          headers: {
            "User-Agent": "Console app",
            token: "tempToken",
            "api-method": "working_offers"
          },
          params: {
            token: "tempToken",
            link: content.tracking_link,
            country: content.country,
            preview_url: content.preview_url
            // preview_url: "https://play.google.com/store/apps/details?id=de.mcoins.applike",
          }
        });
        result = result.data;
        // debug(result);
        if (result && result.success) {
          if (result.result) {
            let red_result = result.result;
            log.total_redirection = red_result.total_redirection;
            log.last_redirection = red_result.last_redirection;
            log.second_last_redirection = red_result.second_last_redirection;
            log.all_redirections = red_result.all_redirections;
            log.apiStatus = red_result.status;
          }
          log.message = result.message;
          if (result.message == "link working") {
            log.workingStatus = true;
            //  && result.message == "link working"
            let offer = await OfferModel.getOneOffer({
              _id: mongooseObjectId(content._id)
            });
            if (offer && offer._id) {
              log.network_id = offer.network_id;
            }
            let workingLog = new WorkingOfferLogModel(log);
            workingLog
              .save()
              .then(result => { })
              .catch(err => { });
            return resolve(true);
          } else {
            log.workingStatus = false;
            let workingLog = new WorkingOfferLogModel(log);
            workingLog
              .save()
              .then(result => { })
              .catch(err => { });
            return resolve(false);
          }
        } else {
          log.workingStatus = false;
          log.apiStatus = 0;
          if (result && result.message) {
            log.message = result.message;
          }
          let workingLog = new WorkingOfferLogModel(log);
          workingLog
            .save()
            .then(result => { })
            .catch(err => { });
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
