require("dotenv").config({ path: ".env" });
require("../../db/connection");

const Promise = require("promise");
const moment = require("moment");
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;


const debug = require("debug")("darwin:Worker:mainWorker");
const RabbitMqWorker = require("../../helpers/rabbitmqWorker");
const redis = require("../../helpers/Redis");
const WorkerFunctionsStore = require('./WorkerFunctions')

const consumer_queue = "Generic_Worker_Queue";

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

exports.startMainWorker = async () => {
    try {
        let dynamic_queue = process.argv[2] || consumer_queue;
        RabbitMqWorker.createWorker(function (channel) {
            consume(channel, dynamic_queue, { persistent: true, durable: true, maxPriority: 20 });
        });
    } catch (err) {
        debug("callApi error while worker start", err);
    }
}

async function ProcessWork(msg, channel) {
    try {
        if (msg !== null && msg.content) {
            let ok = await callWorker(msg);
            debug("shiftWorkLoad Response :- ", ok);
            if (ok) {
                channel.ack(msg);
            } else {
                channel.ack(msg, true);
            }
        } else {
            channel.ack(true);
        }
    } catch (err) {
        console.log("error while processing main worker", err);
    }
}

async function callWorker(msg) {
    return new Promise(async (resolve, reject) => {
        await redis.setHashData("WRQUEUESTATUS", consumer_queue, moment().toISOString());

        try {

            let content = JSON.parse(msg.content.toString());
            let ackStatus = null;

            // console.log("file: genericWorker/worker.js ~ line 75 ~ callWorker ~ content", content)
            await redis.incrementRedisKey(`GNWRLST`);

            if (content.workerName && content.workerData) {
                await redis.incrementRedisKey(`GNWRPNAME:${content.workerName}`);

                console.log(   moment().format('HH:mm:ss')   ,"callWorker -> content.workerName ======================", content.workerName);
                switch (content.workerName) {
                    case "scrapping":
                        ackStatus = await WorkerFunctionsStore.runScrapAppidData(content.workerData);
                        break;

                    case "applyOffers":
                        ackStatus = await WorkerFunctionsStore.runApplyOfferWorker(content.workerData);
                        break;

                    case "newPlatformApi":
                        ackStatus = await WorkerFunctionsStore.runNewPlatformApi(content.workerData);
                        break;

                    case "downloadCenter":
                        ackStatus = await WorkerFunctionsStore.runDownloadCenterWorker(content.workerData);
                        break;

                    case "wishlistWorker":
                        ackStatus = await WorkerFunctionsStore.runWishlistWorker(content.workerData);
                        break;

                    case "processUploadedWishList":
                        ackStatus = await WorkerFunctionsStore.runUploadWishlistWorker(content.workerData);
                        break;

                    case "processReUploadedWishList":
                        ackStatus = await WorkerFunctionsStore.runReUploadWishlistWorker(content.workerData);
                        break;

                    case "processReUploadedWishListScheduler":
                        ackStatus = await WorkerFunctionsStore.processReUploadedWishListScheduler(content.workerData);
                        break;

                    case "pushBulkOffer":
                        // debug(content);
                        await redis.setRedisData(`GNWRCNT:${content.workerName}:${new Date().toJSON()}`, JSON.stringify(content))
                        if (content.workerId) {
                            ackStatus = await WorkerFunctionsStore.pushBulkOffer(content.workerData, content.workerId);
                        }
                        break;

                    case "syncOffer":
                        // debug(content);
                        ackStatus = await WorkerFunctionsStore.syncOffer(content.workerData, content.redisIndex, content.redisKey, content.network_id, content.platform_id);
                        break;

                    case "autoSyncOffer":
                        // debug(content);
                        ackStatus = await WorkerFunctionsStore.autoSyncOffer(content.workerData);
                        break;

                    case "WAutoSyncOffer":
                        // debug(content);
                        ackStatus = await WorkerFunctionsStore.wAutoSyncOffer(content.workerData);
                        break;

                    case "UnblockOfferAdvOfferHash":
                        // debug(content);
                        ackStatus = await WorkerFunctionsStore.unblockOfferFromAdvOfferHash(content.workerData);
                        break;
                    case "syncOfferFilter":
                        ackStatus = await WorkerFunctionsStore.syncOfferFromCron(content.workerData);
                        break;
                    case "applyOfferFromUi":
                        ackStatus = await WorkerFunctionsStore.applyOfferFromUi(content.workerData);
                        break;
                    default:
                        break;
                }

            }
            else {
                await redis.incrementRedisKey("GNWRPNAME:UNDEFINED");
            }
            resolve(ackStatus);
        } catch (error) {
            debug(error);
            await redis.incrementRedisKey("GNWRPNAME:FAILED");
            resolve(false);
        }
    });
}

this.startMainWorker();
