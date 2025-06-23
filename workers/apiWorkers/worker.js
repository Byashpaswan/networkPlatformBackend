require("dotenv").config({
  path: ".env"
});
require("../../db/connection");
const debug = require("debug")("darwin:Worker:apiworker");

const { apiPlugins } = require("../../plugin");
//const rabbitMq = require("../../helpers/rabbitMQ");
const RabbitMqWorker = require("../../helpers/rabbitmqWorker");
const Promise = require("promise");
const moment = require("moment");
const consumer_queue = "Affise_Api_queue";
const { getRedisHashData, setRedisHashData, removeRedisSetMember, setHashData, getHashData } = require('../../helpers/Redis');
const PackageSummaryModel = require("../../db/packageSummary");


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
    let dynamic_queue = process.argv[2] || consumer_queue;
    RabbitMqWorker.createWorker(function (channel) {
      consume(channel, dynamic_queue, { persistent: true, durable: true, maxPriority: 20 });
    });
  } catch (err) {
    debug("callApi error while worker start", err);
  }
};
async function ProcessWork(msg, channel) {
  try {
    if (msg !== null && msg.content) {
      let ok = await FetchOffers(msg);
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
async function FetchOffers(msg) {

  return new Promise(async (resolve, reject) => {
    let res = await setHashData("WRQUEUESTATUS", process.argv[2] || consumer_queue, moment().toISOString());

    let content = JSON.parse(msg.content.toString());
    // debug(content.platform_name, content);
    if (content.platform_name && content.credentials && Object.keys(content.credentials).length) {
      let ackMsg = null;
      let platform_name = content.platform_name;
      // console.log("<========== Network id : ", content.network_id, " ==========>", "<========== Platform Name : ", platform_name, " ==========>", "<========== Advertiser Name : ", content.advertiser_name, " ==========>")
      try {
        if (apiPlugins[platform_name.trim()]) {

          let nowBeforeAck = moment();

          content['appidCountData'] = {}

          ackMsg = await apiPlugins[platform_name.trim()].offersApiCall(content);
          if (ackMsg) {
            for (const key in content['appidCountData']) {
              let filter = { "network_id": content.network_id, "app_id": key, "advId": content.advertiser_id, "advPlatId": content.advertiser_platform_id };
              let reflect = { $set: { "ofr_summary": content['appidCountData'][key] } };
              let options = { upsert: true };
              let dr = await PackageSummaryModel.updateOneDoc(filter, reflect, options);
              // console.log("file: apiWorker.js ~ line 94 ~ PackageSummaryModel.updateOneDoc  ~ dr", dr)
            }
          }

          let nowAfterAck = moment();

          offerslookAvgTime(nowBeforeAck, nowAfterAck, content);
          // if (!content.fetch_offer_from_ui) {
          await removeRedisSetMember(`APIWRLST:${content.network_id}`, content.advertiser_platform_id)
          // }
          return resolve(ackMsg);
        } else {
          await removeRedisSetMember(`APIWRLST:${content.network_id}`, content.advertiser_platform_id)
          ackMsg = "Api Not Ready!!";
          return resolve(ackMsg);
        }
      } catch (e) {
        debug(e);
        await removeRedisSetMember(`APIWRLST:${content.network_id}`, content.advertiser_platform_id)
        return resolve(false);
      }
    }
    //return false;
    await removeRedisSetMember(`APIWRLST:${content.network_id}`, content.advertiser_platform_id)
    return reject(false);
  });
}

async function offerslookAvgTime(nowBeforeAck, nowAfterAck, content) {
  try {
    if (content && content.platform_name && content.network_id && content.advertiser_platform_id) {
      if (content.platform_name.trim().toLowerCase() == "offerslook") {
        let hash = "offerslookAvgTime";
        let key = content.network_id + ":" + content.advertiser_platform_id + ":" + moment().format("YYYY-MM-DD");
        let timeDiff = moment.duration(nowAfterAck.diff(moment(nowBeforeAck))).asSeconds();
        let redisData = await getRedisHashData(hash, key);
        if (!redisData.error && redisData.data) {
          await setRedisHashData(hash, key, (timeDiff + parseInt(redisData.data)) / 2, 86400);
        } else {
          await setRedisHashData(hash, key, timeDiff, 86400);
        }
      }
    }
  } catch (error) {
    console.log(error);
  }
}

this.callApi();
