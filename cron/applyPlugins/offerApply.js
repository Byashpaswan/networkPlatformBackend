require('dotenv').config({ path: '.env' });
require('../../db/connection');
const Mongoose = require('mongoose');
const mongooseObjectId = Mongoose.Types.ObjectId;
const debug = require("debug")("darwin:cron:apply");
const { PlatformTypeModel, PlatformModel } = require('../../db/platform/Platform');
const rabbitMq = require('../../helpers/rabbitMQ');
const OfferModel = require('../../db/offer/Offer');
const Promise = require('promise');
const moment = require('moment');
var publish_queue = 'Apply_Offers_Api_queue';
const { applyPlugin } = require("../../plugin");
const WishlistModel = require('../../db/wishlist')
const { sendJobToGenericWorker } = require("../../helpers/Functions")
const Redis = require('../../helpers/Redis')
const helperFunction = require('../../helpers/Functions');
const generalFunction = require("../../helpers/generalFunction")


var pubChannel = null;
var amqpConn = null;

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
        console.log(" 1 ");
        amqpConn = await rabbitMq.start();
        let res = await startPublisher();
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
                let platforms = await PlatformModel.getPlatform({ platform_id: mongooseObjectId(result._id), status: "1" }, {});
                if (platforms) {
                    // debug(platforms.length, 'plt')
                    for (let j = 0; j < platforms.length; j++) {
                        let obj = platforms[j];
                        let advertiserData = await generalFunction.getAdvertiser(obj.advertiser_id); 
                        if( ( advertiserData && Object.keys(advertiserData).length > 0  && advertiserData['status'] != 'Active' ) || advertiserData ==  {} ){
                            continue;
                        }
                        if (obj['autoApply']) {
                            let credentials = {};
                            obj.credentials.map(apiCredentials => {
                                credentials[apiCredentials.key] = apiCredentials.val;
                            })
                            let wishlist = await  helperFunction.getWishlistList(obj.network_id);
                            for(let k = 0; k < wishlist.length; k++){
                                let my_app_id  = wishlist[k];
                                if (obj.credentials.length > 0) {
                                    let dateTo = moment().toDate();
                                    let dateFrom = moment().subtract(7, 'd').startOf('d').toDate();
                                    let offerList = await OfferModel.getSearchOffer({ updatedAt: { $gte: dateFrom, $lte: dateTo }, advertiser_platform_id: obj._id, network_id: obj.network_id, advertiser_id: obj.advertiser_id, status: { $in : [0,3]}, app_id : my_app_id }, { advertiser_offer_id: 1, _id: 1, app_id: 1, plty : 1 }, {});
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
                                        let redisKey = `APPLY_PLT_ID:${obj._id.toString()}`;  
                                        let advertiserData = await Redis.getRedisSetLength(redisKey);
                                        if (!advertiserData.data) {
    
                                            let offerData = []
                                            let index = 1 ;
                                            for (let offer of offerList) {
                                                offerData.push({ 'k': offer._id, 'v': offer.advertiser_offer_id, 'plty' : offer.plty });
                                                if (offerData.length >= 20) {
                                                    content['offer_data'] = offerData;
                                                    content['index'] = index;
                                                    await sendJobToGenericWorker({ workerName: "applyOffers", workerData: content }, priority = 10);
                                                    await Redis.setRedisSetData(redisKey, index, 86400);
                                                    index++

                                                    offerData = [];
                                                    jobs++;
                                                }
                                            }
                                            jobs++;
                                            if (offerData && offerData.length) {
                                                content['offer_data'] = offerData;
                                                content['index'] = index;
                                                await sendJobToGenericWorker({ workerName: "applyOffers", workerData: content }, priority = 10);
                                                await Redis.setRedisSetData(redisKey, index, 86400);
                                                index++
                                            }
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

async function getWishlistAppIds(network_id) {

    try {
        let wishlistAppids = []
        let result = await WishlistModel.searchAppId({ network_id: network_id }, { app_id: 1, _id: 0 })
        if (result && result.length > 0) {
            result.forEach(obj => {
                wishlistAppids.push(obj.app_id)
            });
        }
        return wishlistAppids;
    } catch (error) {
        console.log("error in find wishlist, (offerApply) ", error)
        return [];
    }
}

this.callApplyApi()