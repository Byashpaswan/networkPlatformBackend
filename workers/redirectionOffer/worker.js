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
var publish_queue = 'Redirection_Offer';
const RabbitMqWorker = require("../../helpers/rabbitmqWorker");
const crypto = require("crypto");
const axios = require('axios');
const advOfferIdLocationInUrl = require('../../db/advOfferIdLocationInUrl');
const priorityRabbitMQ = require('../../helpers/priorityRabbitMQ');
const Redis = require('../../helpers/Redis');
const webhookModel = require('../../db/webhook');
var pubChannel = null;
var amqpConn = null;
const webhook_queue = "webhook_queue";


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

const getWebHookSetting = async function (network_id) {
    try{

        let webhookSetting = await Redis.getRedisHashData("webhooksetting:", network_id).data || [];
        if (!webhookSetting || !webhookSetting.length) {
            webhookSetting = await webhookModel.findwebhookSetting({ network_id: mongooseObjectId(network_id) })
            Redis.setRedisHashData("webhooksetting:", network_id, webhookSetting, 3600)
        }
        return webhookSetting;
    }catch(error){
        console.log(" error when get WebHookSetting -> ",error );
    }
    
}

async function assignWork(msg) {

    try{
        let offer_id = msg['offer_id'];
        let secret = process.env.secret ||  "152325b7-e078-4497-84e5-069caef7a58c" ;
        let priority = 25;

        let token = crypto.createHmac('sha1', secret ).update(offer_id).digest('hex');
        let baseUrl = `https://fuseclick.c2a.in/api/fetch_offer_redirection?offerId=${offer_id}&token=${token}`;
        
        const redirectionData = await  axios.get(baseUrl);
        if(redirectionData && redirectionData['data']['status'] == false){
            console.log(" offer Data not found", offer_id );
            return true;
        }
        let redirectionArray = redirectionData['data']['offer_data']['redirections'];
        for(let i = 0; i < redirectionArray.length; i++){
            let url = redirectionArray[i];
            url = new URL(url);
            let host = url.hostname;
            let result = await advOfferIdLocationInUrl.getData({ host }, { ofl  : 1, loc : 1, _id : 0 });
            if(result && result.length){
                let advOfferLoc = result[0];            
                if(advOfferLoc && Object.keys(advOfferLoc).length ){
                    // when adv_offer_id  present in query parameter.
                    if(advOfferLoc['ofl'] == 'query'){
                        // Get query parameters
                        let params = new URLSearchParams(url.search);
                        // Access specific query parameter
                        let offerId = params.get(advOfferLoc['loc']);
                        let adv_off_hash = crypto.createHash("md5").update(offerId + host).digest("hex")                        
                        let offerData = await OfferModel.find({ _id : { $ne : mongooseObjectId(offer_id) }, adv_off_hash }, {});
                        for(let j = 0; j < offerData.length; j++){
                            let data = offerData[j];
                            if(data){                               
                                try{                                    
                                    let webhookSetting = await getWebHookSetting(data['network_id']) || [];                                    
                                    let webHookJobData = { offersId: [data['_id']], network_id: data['network_id'], event: webhookSetting[0].event, source: 'redirect Offer', ver : 1 }                                    
                                    await priorityRabbitMQ.publish_Content(false, webhook_queue, webHookJobData, true, true, priority);                                    
                                }catch(error){
                                    console.log(" error while pushToWeb ", error);
                                }
                            }
                        }
                    }else if(advOfferLoc['ofl'] == 'path'){
                        // when adv_offer_id  present in path.
                        const pathSegments = url.pathname.split('/');
                        let offerId = pathSegments[parseInt(advOfferLoc['loc'])];
                        let adv_off_hash = crypto.createHash("md5").update(offerId + host).digest("hex");                     
                        let offerData = await OfferModel.find({ _id : { $ne : mongooseObjectId(offer_id) }, adv_off_hash }, {});
                        for(let j = 0; j < offerData.length; j++){
                            let data = offerData[j];
                            if(data){                                
                                try{                                    
                                    let webhookSetting = await getWebHookSetting(data['network_id']) || [];                
                                    let webHookJobData = { offersId: data['_id'], network_id: data['network_id'], event: webhookSetting[0].event, source: 'redirect Offer', ver : 1 }                                    
                                    await priorityRabbitMQ.publish_Content(false, webhook_queue, webHookJobData, true, true, priority);                                    
                                }catch(error){
                                    console.log(" error while pushToWebHook redirection offers ", error);
                                }
                            }
                        }
                    }
                }
            }
        }
    }catch(error){
        console.log(" error while apply and push to webhook from nitro, redirection Offers ", error);
        return true;
    }
}


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


exports.Redirection_Offers = async () => {
    try {
        let dynamic_queue = publish_queue;
        RabbitMqWorker.createWorker(function (channel) {
            consume(channel, dynamic_queue, { persistent: true, durable: true });
        });
    } catch (err) {
        debug("redirections offer from nitro error while worker start ", err);
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

this.Redirection_Offers();
