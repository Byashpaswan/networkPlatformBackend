require("dotenv").config({ path: ".env" });
const debug = require("debug")("darwin:workers:liveReport:conversionReport");
require("../../db/connection");
const Mongoose = require("mongoose");
const RabbitMqWorker = require("../../helpers/rabbitmqWorker");
const Promise = require("promise");
const moment = require("moment-timezone");
const objectId = Mongoose.Types.ObjectId;
const consumer_queue = 'live_report_conversions_queue';
const { LiveAdvOffPubSouSummaryModel } = require('../../db/click/sourceSummary/sourceSummary');
const { LiveDaily_AdvertiserOfferPublisherSourceSummary } = require('../../db/click/sourceSummary/sourceSummary');

const Redis = require('../../helpers/Redis');
const { ConversionModel } = require("../../db/click/clickLog");
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
            }
            else {
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

            let content2 = {
                id: content['_id'] || content['id'],
                network_id: content['network_id'] || content['N_id'],
                offer_id: content['offer_id'] || content['oId'],
                offer_name: content['offer_name'] || content['oName'],
                advertiser_id: content['advertiser_id'] || content['A_id'],
                publisher_id: content['publisher_id'] || content['pid'],
                source: content['source'],
                createdAt: content['createdAt'],
                payout: parseFloat(content['payout']),
                revenue: parseFloat(content['revenue']),
                hold_revenue: parseFloat(content['hold_revenue']),
                advertiser_offer_id: content['advertiser_offer_id'] || content['adOId'],
                publisher_conversion: content['publisher_conversion'],
                publisher_payout: content['publisher_payout'],
                nid: content['nid'],
                aid: content['aid'],
                plid: content['plid'],
                aPlId: content['aPlId'],
                app_id: content['app_id'] || content['app'],
                currency: content['currency'] || content['coin'],
            }

            let timeSlot = getTimeSlot(content2['createdAt']);
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
                slot: timeSlotByDay
            };
            let update = {
                $set: {
                    offer_name: content2['offer_name'],
                    advertiser_id: objectId(content2['advertiser_id']),
                    advertiser_offer_id: content2['advertiser_offer_id']
                },
                $inc: {
                    click: 0,
                    pre_conversion: 0,
                    conversion: 1,
                    payout: content2['payout'],
                    revenue: content2['revenue'],
                    hold_revenue: content2['hold_revenue']
                }
            };
            let update2 = {
                $set: {
                    oName: content2['offer_name'],
                    A_id: objectId(content2['advertiser_id']),
                    AdOId: content2['advertiser_offer_id']
                },

                $inc: {
                    click: 0,
                    pre_conversion: 0,  // lead 
                    lead : 1 ,
                    // conversion: 1,  // conv
                    conv : 1 , 
                    pay: content2['payout'],  // pay 
                    rev: content2['revenue'],  // rev
                    hRev: content2['hold_revenue']  // hRev
                }
            };

            if (content2['aPlId'] !== undefined && content2['aPlId'] !== null) {
                update.$set['aPlId'] = content2['aPlId'];
                update.$set['aPlId'] = content2['aPlId'];
            }

            if (content2['publisher_conversion'] && content2['publisher_conversion']>0) {
                update['$inc']['publisher_conversion'] = parseInt(content2['publisher_conversion']);
                // update2['$inc']['publisher_conversion'] = parseInt(content2['publisher_conversion']);
                update2['$inc']['pConv'] = parseInt(content2['publisher_conversion']);

            }
            if (content2['publisher_payout'] && content2['publisher_payout']>0) {
                update['$inc']['publisher_payout'] = parseFloat(content2['publisher_payout']);
                // update2['$inc']['publisher_payout'] = parseFloat(content2['publisher_payout']);
                update2['$inc']['pPay'] = parseFloat(content2['publisher_payout']);

            }

            // to do // CONSUMEDCONVERSION used only for testing
            let date = moment(content2['createdAt']).format('MM/DD/YY:HH');
            let key = "CONSUMEDCONVERSION:" + content2['network_id'] + ":" + date;
            await Redis.incrementRedisKey(key, 2 * 24 * 3600);

            let options = { upsert: true };
            await LiveAdvOffPubSouSummaryModel.updateOneDoc(filter, update, options);
            await ConversionModel.updateOneConversion({ _id: objectId(content2['id']) }, { $set: { report: true } }, {});
            await LiveDaily_AdvertiserOfferPublisherSourceSummary.updateOneDoc(filter2, update2, options)
            return resolve(true);
        } catch (error) {
            debug(error);
            return resolve(false);
        }
    });
}

// this.callApi();
