const Mongoose = require('mongoose');
const debug = require("debug")("darwin:Plugin:MocaTech");
const mongooseObjectId = Mongoose.Types.ObjectId;
const { PlatformTypeModel, PlatformModel } = require('../../db/platform/Platform');
const rabbitMq = require('../../helpers/rabbitMQ');
var publish_queue = 'Offers_Api_queue';

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

async function publish(queue, content, priority = 8) {
    return new Promise(async (resolve, reject) => {
        try {
            return pubChannel.assertQueue(queue, { persistent: true, durable: true, maxPriority: 20 }).then(async res => {
                pubChannel.sendToQueue(queue, Buffer.from(JSON.stringify(content)), { priority: priority });
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

exports.callMocaTechApi = async () => {
    try {
        amqpConn = await rabbitMq.start();
        let res = await startPublisher();
        if (res) { pubChannel.close(); }
    }
    catch (err) {
        // debug(err);
    }

}
async function assignWork() {
    let jobs = 0;
    try {
        let result = await PlatformTypeModel.getPlatformTypesOne({ name: 'MocaTech' }, {});
        if (result) {
            let platforms = await PlatformModel.getPlatform({ platform_id: mongooseObjectId(result._id), status: "1" }, {});
            if (platforms) {

                for (let m = 0; m < platforms.length; m++) {
                    let obj = platforms[m];
                    let credentials = {};
                    let content = {};
                    obj.credentials.map(apiCredentials => {
                        credentials[apiCredentials.key] = apiCredentials.val;
                    })
                    content['network_id'] = obj.network_id;
                    content['advertiser_id'] = obj.advertiser_id;
                    content['advertiser_name'] = obj.advertiser_name;
                    content['platform_id'] = obj.platform_id;
                    content['platform_name'] = obj.platform_name;
                    content['credentials'] = credentials;
                    content['offer_live_type'] = obj.offer_live_type;
                    content['visibility_status'] = obj.offer_visibility_status;
                    content['publishers'] = obj.publishers;
                    content['payout_percent'] = obj.payout_percent;
                    content['advertiser_platform_id'] = obj._id;
                    if (obj.credentials.length > 0) {
                        jobs++;
                        let publish_result = await publish(publish_queue, content);
                        if (!publish_result) {
                            return await Promise.resolve(false);
                        }
                    }

                };

            }
        }
        console.log("MocaTech Job Inserted ", jobs);

    }
    catch (err) {
        console.log("error occured during assigning jobs MocaTech");

    }
    return await Promise.resolve(true);
}