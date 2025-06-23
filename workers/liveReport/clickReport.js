require("dotenv").config({ path: ".env" });
const debug = require("debug")("darwin:workers:liveReport:clickReport");
require("../../db/connection");
const Mongoose = require("mongoose");
const RabbitMqWorker = require("../../helpers/rabbitmqWorker");
const Promise = require("promise");
const moment = require("moment-timezone");
const objectId = Mongoose.Types.ObjectId;
const consumer_queue = 'live_report_clicks_queue';
const { LiveAdvOffPubSouSummaryModel } = require('../../db/click/sourceSummary/sourceSummary');
const { LiveDaily_AdvertiserOfferPublisherSourceSummary } = require('../../db/click/sourceSummary/sourceSummary');

const Redis = require('../../helpers/Redis');
const { ClickLogModel } = require("../../db/click/clickLog");
const NetworkModel = require('../../db/network/Network')

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
            }else{
                channel.nack(msg);
            }
        } else {
            channel.ack(msg);
        }
    } catch (err) {
        console.log("error while processing worker", err);
    }
}

async function getTimeSlotByDay(time, network_id) {
    let redishSlot = await Redis.getRedisData("DAYWISESLOT:" + network_id.toString());
    if (!redishSlot.data) {
        let timeZone = await NetworkModel.getOneNetwork({ _id: objectId(network_id) }, { current_timezone: 1, _id: 0 });

        let timeSlot = moment.tz(time, timeZone.current_timezone).format('YYYY-MM-DD');
        let date = new Date(timeSlot)
        let setInRedis = await Redis.setRedisData("DAYWISESLOT:" + network_id.toString(), timeZone.current_timezone);
        
        return date;
    } else {
        let timeSlot = moment.tz(time, redishSlot.data).format('YYYY-MM-DD');
        let date = new Date(timeSlot)
        return date;
    }
}

function getTimeSlot(timeString) {
    let timeSlot = moment(timeString).startOf('minute');
    let minutes = timeSlot.minutes();
    if (minutes >= 30) {
        timeSlot.subtract((minutes - 30), 'minutes');
    } else {
        timeSlot.subtract(minutes, 'minutes');
    }
    return timeSlot;
}

async function callDownloadApi(msg) {
    return new Promise(async (resolve, reject) => {
        await Redis.setHashData("WRQUEUESTATUS", consumer_queue, moment().toISOString());
        try {
            let content = JSON.parse(msg.content.toString());


            if(content['id']){
                let clickData = await ClickLogModel.findOne({ _id : objectId(content['id'])});
                if(clickData.report){
                    return resolve(true);
                }
            }

            let content2 = {
                id: content['_id'] || content['id'],
                network_id: content['network_id'] || content['N_id'],
                offer_id: content['offer_id'] || content['oId'],
                publisher_id: content['publisher_id'] || content['pid'],
                offer_name: content['offer_name'] || content['oName'],
                source: content['source'],
                advertiser_id: content['advertiser_id'] || content['A_id'],
                aid: content['aid'],
                advertiser_offer_id: content['advertiser_offer_id'] || content['adOId'],
                currency: content['currency'] || content['coin'],
                app_id: content['app_id'] || content['app'],
                plid: content['plid'],
                plty : content['plty'],
                nid: content['nid'],
                createdAt: content['createdAt'],
                pre_conversion: content['pre_conversion'] || content['lead'] || null,
                lead : content['pre_conversion'] || content['lead'] || 0 , 
                aPlId: content['aPlId']
            }

            let timeSlot = getTimeSlot(content2['createdAt'])
            let timeSlotByDay = await getTimeSlotByDay(content2['createdAt'], content2['network_id']);

            let filter = {
                network_id: objectId(content2['network_id']),
                offer_id: objectId(content2['offer_id']),
                publisher_id: content2['publisher_id'],
                source: content2['source'],
                timeSlot: timeSlot.toDate()
            };
            let filter2 = {
                N_id: objectId(content2['network_id']),
                oId: objectId(content2['offer_id']),
                pid: content2['publisher_id'],
                source: content2['source'],
                slot: timeSlot.toDate()
            };

            // if (content2['publisher_id'] !== undefined && content2['publisher_id'] !== null) {
            //     update.pid = content2['pid']
            // }

            const update2 = {
                $set: {
                    oName: content2['offer_name'],
                    A_id: objectId(content2['advertiser_id']),
                    AdOId: content2['advertiser_offer_id'],
                    coin: content2['currency'],
                    // app: content2['app_id'],
                },
                $inc: {
                    conv: 0,
                    pay: 0,
                    reve: 0,
                    hRev: 0,
                }
            };

            let update = {
                $set: {
                    offer_name: content2['offer_name'],
                    advertiser_id: objectId(content2['advertiser_id']),
                    advertiser_offer_id: content2['advertiser_offer_id'],
                    currency: content2['currency'],
                    // app_id: content2['app_id'],
                },
                $inc: {
                    conversion: 0,
                    payout: 0,
                    revenue: 0,
                    hold_revenue: 0,
                }
            };

            if(content['app'] || content['app'] == '' ){
                update2.$set['app'] = content['app'] || `${content['app']}`;
                update.$set['app_id'] = content['app'] || `${content['app']}`;
            }
            if (content2['aid'] !== undefined && content2['aid'] !== null) {
                update2.$set['aid'] = content2['aid'];
                update.$set['aid'] = content2['aid'];
            }

            if (content2['nid'] !== undefined && content2['nid'] !== null) {
                update2.$set['nid'] = content2['nid'];
                update.$set['nid'] = content2['nid'];
            }

            if (content2['aplId'] !== undefined && content2['aplId'] !== null) {
                update2.$set['aplId'] = objectId(content2['aplId']);
                update.$set['aplId'] = objectId(content2['aplId']);
            }

            if (content2['plid'] !== undefined && content2['plid'] !== null) {
                update2.$set['plid'] = content2['plid'];
                update.$set['plid'] = content2['plid'];
            }
            if (content2['plty'] != undefined && content2['plty'] != null) {
                update2.$set['plty'] = content2['plty'];
                update.$set['plty'] = content2['plty'];
            }

            if (content2['pre_conversion'] && content2['pre_conversion'] > 0) {
                update['$inc']['pre_conversion'] = 1;
                update['$inc']['click'] = 0;
                // update2['$inc']['pre_conversion'] = 1;
                update2['$inc']['lead'] = 1;
                update2['$inc']['click'] = 0;

                // to do // CONSUMEDLEAD used only for testing
                let date = moment(content2['createdAt']).format('MM/DD/YY:HH');
                let key = "CONSUMEDLEAD:" + content2['network_id'] + ":" + date;
                await Redis.incrementRedisKey(key, 2 * 24 * 3600);
            } else {
                update['$inc']['pre_conversion'] = 0;
                update['$inc']['click'] = 1;
                // update2['$inc']['pre_conversion'] = 0;
                update2['$inc']['lead'] = 0;
                update2['$inc']['click'] = 1;

                // to do // CONSUMEDCLICK used only for testing
                // let date = moment(content2['createdAt']).format('MM/DD/YY:HH');
                // let key = "CONSUMEDCLICK:" + content2['network_id'] + ":" + date;
                // await Redis.incrementRedisKey(key, 2 * 24 * 3600);
            }
            if(!update2['$set']['app'] && !content2['pre_conversion'] ){
                let key  = `falsyApp2:${content2['offer_id']}`
                let key2 = `falsyAppGet:${content2['offer_id']}`;
                await Redis.setRedisData(key, `${update2['$set']['app']}`, 21600);
                
                await Redis.setRedisData(key2, content['app'], 21600);
            }
            if(!update['$set']['app_id'] && !content2['pre_conversion']){
                let key  = `falsyApp:${content2['offer_id']}`
                await Redis.setRedisData(key, `${update['$set']['app_id']}`, 21600);
            }
            let options = { upsert: true };
            await LiveAdvOffPubSouSummaryModel.updateOneDoc(filter, update, options);
            await ClickLogModel.updateOneClick({ _id: objectId(content2['id']) }, { $set: { report: true } }, {});
            await LiveDaily_AdvertiserOfferPublisherSourceSummary.updateOneDoc(filter2, update2, options);

            return resolve(true);
        } catch (error) {
            debug(error);
            return resolve(false);
        }
    });
}

this.callApi();
