require("dotenv").config({
    path: ".env"
});
require("../../db/connection");
const Mongoose = require('mongoose');
const mongooseObjectId = Mongoose.Types.ObjectId;
const debug = require("debug")("darwin:cron:apply");
const rabbitMq = require('../../helpers/rabbitMQ');
const OfferModel = require('../../db/offer/Offer');
const Promise = require('promise');
const moment = require('moment');
var publish_queue = 'Apply_Offer_From_Nitro';
const Function = require('../../helpers/Functions')
const generalFunction = require('../../helpers/generalFunction');
const helperFunctions = require('../../helpers/Functions');
const RabbitMqWorker = require("../../helpers/rabbitmqWorker");



var pubChannel = null;
var amqpConn = null;

function closeOnErr(err) {
    if (!err) return false;
    console.error("[AMQP] error", err);

    return true;
}

async function startPublisher(msg) {
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
            let asign_result = await assignWork(msg);
            return resolve(asign_result);
        }).catch(err => {
            return resolve(false);
            // debug(err)
        });
    });
}


async function assignWork(msg) {

    try{
        let offerData = await OfferModel.getSearchOffer({ adv_off_hash : msg.adv_off_hash }, {  advertiser_offer_id : 1, _id : 1, plty : 1, advertiser_platform_id : 1, status : 1, network_id : 1, platform_id : 1}, {});
        for(let i = 0 ; i < offerData.length; i++){
            if(offerData[i]['status'] == 1 ){
                await Function.publishJobForWebhook(msg.network_id, [mongooseObjectId(offerData[i]._id)], "offer_update", " Push Offer from nitro ", 18);

            }else if( offerData[i]['status'] == -1 ||  offerData[i]['status'] == 2){
                let platformData = await generalFunction.getPlatform(offerData[i]['advertiser_platform_id']);
                if(platformData && Object.keys(platformData).length > 0 &&  platformData['status'] == '1'){
                    let offerArray = [];
                    offerArray.push(offerData[i]._id);
                    let content  = {
                        workerName: "syncOffer",
                        workerData: offerArray,
                        network_id : offerData[i]['network_id'],
                        platform_id : offerData[i]['platform_id']
                    }
                    await helperFunctions.sendJobToGenericWorker(content, 33);
                }
            }else if(offerData[i]['status'] == 0){
                let platformData = await generalFunction.getPlatform(offerData[i]['advertiser_platform_id']);
                if(platformData && Object.keys(platformData).length > 0 && platformData['status'] == '1'){
                    let offerArray = [];
                    offerArray.push({'k' : offerData[i]._id, 'v' : offerData[i].advertiser_offer_id, 'plty' : offerData[i].plty })
                    let content = {}
                    content['network_id'] = platformData.network_id;
                    content['advertiser_id'] = platformData.advertiser_id;
                    content['advertiser_name'] = platformData.advertiser_name;
                    content['platform_id'] = platformData.platform_id;
                    content['advertiser_platform_id'] = platformData._id;
                    content['platform_name'] = platformData.platform_name;
                    content['credentials'] = platformData.credentials;
                    content['visibility_status'] = platformData.offer_visibility_status;
                    content['offer_data'] = offerArray;
                    await helperFunctions.sendJobToGenericWorker({ workerName: "applyOffers", workerData: content }, 15); 
                }
            }
        }

        await OfferModel.updateManyOffer({ adv_off_hash : msg.adv_off_hash, isBlacklist  : 1 }, { $set : { isBlacklist : 0 }}, { timestamps  : true});
        return resolve(true)

    }catch(error){
        console.log(" error while apply and push to webhook from nitro when offer is blocked ");
        return resolve(true);
    }
}
///.............................................................................



// fetched data from nitro's queue ,  
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


exports.ApplyOfferFromNitro = async () => {
    try {
        let dynamic_queue = publish_queue;
        RabbitMqWorker.createWorker(function (channel) {
            consume(channel, dynamic_queue, { persistent: true, durable: true });
        });
    } catch (err) {
        debug(" Apply offer from nitro error while worker start ", err);
    }
};

async function ApplyOffer(msg) {
    try {
        amqpConn = await rabbitMq.start();
        let res = await startPublisher(msg);
        if (res) { pubChannel.close(); }
        return true;
    }
    catch (err) {
        // debug(err);
    }

}

async function ProcessWork(msg, channel) {
    try {
        if (msg !== null && msg) {
            // let ok = await FetchOffers(msg);
            let content = JSON.parse(msg.content.toString())  ;            

            let ok =  await ApplyOffer(content);
            
            // debug(ok, "&&&");
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

this.ApplyOfferFromNitro();
