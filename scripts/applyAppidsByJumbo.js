
// require('dotenv').config({ path: '.env' });
// require('../../db/connection');
const Mongoose = require('mongoose');
const mongooseObjectId = Mongoose.Types.ObjectId;
const debug = require("debug")("darwin:cron:apply");
const { PlatformTypeModel, PlatformModel } = require('../db/platform/Platform')
const rabbitMq = require("../helpers/rabbitMQ");
const OfferModel = require('../db/offer/Offer');
const Promise = require('promise');
const moment = require('moment');
var publish_queue = 'Apply_Offers_Api_queue';
const { applyPlugin } = require("../plugin");
const WishlistModel = require('../db/wishlist')
const { sendJobToGenericWorker } = require("../helpers/Functions")
const Redis = require('../helpers/Redis')
const Response = require('../helpers/Response')
const { ConversionModel } = require("../db/appIdReport/AppIdReport");
const Function = require('../helpers/Functions');
const WorkerStatusModel = require('../db/WorkerStatus');

var pubChannel = null;
var amqpConn = null;
var app_ids = [];
var network_id = '';
var response = false;

function closeOnErr(err) {
    if (!err) return false;
    console.error("[AMQP] error", err);

    return true;
}


async function startPublisher() {
    return new Promise(async (resolve, reject) => {
        amqpConn.createConfirmChannel().then(async (ch, err) => {
            if (closeOnErr(err)) return;
            ch.on("error", function (err) {
                console.error("[AMQP] channel error", err.message);
            });
            ch.on("close", function () {
                // debug("[AMQP] channel closed");
                // amqpConn = rabbitMq.start();
            });
            pubChannel = ch;
            let asign_result = await assignWork();
            return resolve(asign_result);
        }).catch(err => {
            return resolve(false);
            // debug(err)
        });
    });
}


async function publish(queue, content) {
    return new Promise(async (resolve, reject) => {
        try {
            return pubChannel.assertQueue(queue, { persistent: true, durable: true }).then(async res => {
                pubChannel.sendToQueue(queue, Buffer.from(JSON.stringify(content)));
                return resolve(true);
            })
                .catch(async err => {
                    debug("[AMQP] publish", err);
                    return resolve(true);
                });
        } catch (e) {
            console.error("[AMQP] publish", e.message);
            return resolve(false);
        }
    });

}

exports.callApplyApi = async () => {
    try {
        amqpConn = await rabbitMq.start();
        let res = await startPublisher();
        response = res;
        if (res) { pubChannel.close(); }
    }
    catch (err) {
        // debug(err);
    }

}
async function assignWork() {
    try {
        let platform_array = Object.keys(applyPlugin);
        // debug(platform_array)
        for (let m = 0; m < platform_array.length; m++) {
            let jobs = 0;
            let platformTypeName = platform_array[m];
            let result = await PlatformTypeModel.getPlatformTypesOne({ name: platformTypeName }, {});
            if (result) {
                let platforms = await PlatformModel.getPlatform({ network_id : mongooseObjectId(network_id), platform_id: mongooseObjectId(result._id), status: "1" }, {});
                if (platforms) {
                    // debug(platforms.length, 'plt')
                    for (let j = 0; j < platforms.length; j++) {
                        let obj = platforms[j];
                        if (obj['autoApply']) {
                            let credentials = {};
                            obj.credentials.map(apiCredentials => {
                                credentials[apiCredentials.key] = apiCredentials.val;
                            })
                            if (obj.credentials.length > 0) {
                                let dateTo = moment().toDate();
                                let dateFrom = moment().subtract(7, 'd').startOf('d').toDate();
                                let offerList = await OfferModel.getSearchOffer({ updatedAt: { $gte: dateFrom, $lte: dateTo }, network_id: mongooseObjectId(network_id), tracking_link: '' , app_id: { $in: app_ids } , advertiser_platform_id: obj._id, advertiser_id: obj.advertiser_id } , { advertiser_offer_id: 1, _id: 1, app_id: 1, plty : 1  }, {});
                                if (offerList && offerList.length) {
                                    let content = {};
                                    content['network_id'] = obj.network_id;
                                    content['advertiser_id'] = obj.advertiser_id;
                                    content['advertiser_name'] = obj.advertiser_name;
                                    content['platform_id'] = obj.platform_id;
                                    content['advertiser_platform_id'] = obj._id;
                                    content['platform_name'] = obj.platform_name;
                                    content['credentials'] = credentials;
                                    content['payout_percent'] = obj.payout_percent;
                                    // content['publishers'] = obj.publishers;
                                    content['visibility_status'] = obj.offer_visibility_status;
                                    content['jumbo'] =  'jumbo';
                                    let advertiserData = await Redis.checkMemberInRedisSet(`APPLY_PLT_ID2:${obj.network_id.toString()}`, obj._id.toString()+'jumbo');

                                    if (!advertiserData.data) {
                                        let offerData = []
                                        for (let offer of offerList) {
                                            offerData.push({ 'k': offer._id, 'v': offer.advertiser_offer_id , 'plty' : offer.plty });
                                            if (offerData.length >= 20) {
                                                content['offer_data'] = offerData;
                                                await sendJobToGenericWorker({ workerName: "applyOffers", workerData: content }, priority = 10);
                                                await Redis.setRedisSetData(`APPLY_PLT_ID2:${obj.network_id.toString()}`, obj._id.toString()+'jumbo');

                                                offerData = [];
                                                jobs++;
                                            }
                                        }
                                        jobs++;
                                        if (offerData && offerData.length) {
                                            content['offer_data'] = offerData;
                                            await sendJobToGenericWorker({ workerName: "applyOffers", workerData: content }, priority = 10);
                                            await Redis.setRedisSetData(`APPLY_PLT_ID2:${obj.network_id.toString()}`, obj._id.toString()+'jumbo');

                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            debug(`========= Apply offer ========== Platform type: ${platformTypeName}, Job Inserted: ${jobs}`);
        }
    }
    catch (err) {
        debug("file: offerApply.js ~ line 147 ~ assignWork ~ err", err)
    }

    // debug("i am closed");
    return await Promise.resolve(true);

}


exports.applyAndPushToWebhookFromJumbo = async (req, res) => {

    app_ids  = req.body.search.app_ids ; 
    network_id = req.body.search.assignedNetwork[0];
    if(app_ids.length > 0 && network_id ){
    await this.pushToWebHook(app_ids);
    await this.callApplyApi();
    }

    if (response) {
        let response = Response.success();
        response.payloadType = [];
        response.payload = [];
        response.msg = " Successfully Apply And PushToWebHook All Appids!";
        return res.status(200).send(response);
    } else {
        let response = Response.error();
        response.error = [' unable to Apply or PushToWebHook '] ;
        response.msg = 'no any appids  pushToWebhook or apply . ' ;
        return res.status(200).json(response);
    }

}


exports.pushToWebHook = async (app_ids) => {
    let dateTo = moment().toDate();
    let dateFrom = moment().subtract(30, 'd').startOf('d').toDate();
    let offerList = await OfferModel.getSearchOffer({ updatedAt: { $gte: dateFrom, $lte: dateTo }, network_id: mongooseObjectId(network_id), tracking_link: { $ne: '' }, app_id: { $in: app_ids } }, { _id: 1 }, {});
    let offer_ids = offerList.map(ele => {
        return ele._id
    })

   //  console.log(' offerList in pushtOwEBhOOK -> '  , offerList.length , " offerList in PushToWebHook ");
   if(offer_ids.length > 0 ){
    Function.publishJobForWebhook(network_id, offer_ids, "offer_update", "Push Offer from jumbo ", 18);
   }
}
