require("dotenv").config({ path: ".env" });

const Promise = require("promise");
const debug = require("debug")("darwin:Worker:mainWorker");
const RabbitMqWorker = require("../../helpers/rabbitmqWorker");
const { appendFile } = require("fs");

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

        try {
            let content = msg.content.toString()
            appendFile("../../public/genericWorkerData.txt", `${content},\n`, (err) => {
                if (err) {
                    console.error(err);
                    resolve(false);
                }
            })
            resolve(true);
        } catch (error) {
            debug(error);
            resolve(false);
        }
    });
}

this.startMainWorker();
