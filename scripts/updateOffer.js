require("dotenv").config({ path: ".env" });
require('../db/connection');

const rabbitMq = require('../helpers/rabbitMQ');
const publish_queue = 'autoUpdateOffer';
const moment = require('moment');

const OfferModel = require("../db/offer/Offer");
const NetworkModel = require("../db/network/Network");

var pubChannel = null;
var amqpConn = null;

function closeOnErr(err) {
    if (!err) return false;
    console.error("[AMQP] error", err);
    return true;
}

async function startPublisher() {
    return new Promise(async (resolve, reject) => {
        amqpConn.createConfirmChannel()
            .then(async (ch, err) => {
                if (closeOnErr(err)) return;
                ch.on("error", function (err) {
                    console.error("[AMQP] channel error", err.message);
                });
                ch.on("close", function () {
                    console.error("[AMQP] channel closed");
                });
                pubChannel = ch;
                let asign_result = await assignWork();
                return resolve(asign_result);
            }).catch(err => {
                console.error(err)
                return resolve(false);
            });
    });
}

async function publish(queue, content) {
    return new Promise(async (resolve, reject) => {
        try {
            return pubChannel.assertQueue(queue, { persistent: true, durable: true, maxPriority: 20 })
                .then(async res => {
                    pubChannel.sendToQueue(queue, Buffer.from(JSON.stringify(content)));
                    return resolve(true);
                })
                .catch(async err => {
                    console.error("[AMQP] publish", err);
                    return resolve(true);
                });
        } catch (e) {
            console.error("[AMQP] publish", e.message);
            return resolve(false);
        }
    });

}

exports.callAutoUpdateOffer = async () => {
    try {
        amqpConn = await rabbitMq.start();
        let res = await startPublisher();
        if (res) { pubChannel.close(); }
    }
    catch (err) {
        console.error(err);
    }
}

async function processOffers(networkId) {
    try {
        let cursor = await OfferModel.getAllOfferByCursor(
            { network_id: networkId, createdAt: { $gte: moment().subtract(2, "month").startOf('d').toDate() } },
            { status: 1, tracking_link: 1 },
            {}
        );
        let offerIdList = []
        for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
            if (doc.status == 2 && doc.tracking_link != '') offerIdList.push(doc._id);
            if (offerIdList.length >= 100) {
                console.log("file: updateOffer ~ offerIdList.length ~ ", offerIdList.length)
                await publish(publish_queue, offerIdList);
                offerIdList = []
            }
        }
        if (offerIdList.length) {
            await publish(publish_queue, offerIdList);
            offerIdList = []
        }
    } catch (error) {
        console.log(error);
    }
    return;
}

async function assignWork() {
    try {
        let networks = await NetworkModel.findAllNetwork({ status: "pending" }, { _id: 1, company_name: 1 });
        if (networks && networks.length) {
            for (let network of networks) {
                await processOffers(network['_id']);
                console.log("file: updateOffer ~ network ~ Completed ~ ", network.company_name)
            }
        }
    }
    catch (err) {
        console.error("file: offerApply.js ~ line 147 ~ assignWork ~ err", err)
    }
    return await Promise.resolve(true);
}

this.callAutoUpdateOffer()