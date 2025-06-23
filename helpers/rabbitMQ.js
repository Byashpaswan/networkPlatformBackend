var amqp = require('amqplib');
var promise = require('promise');
const axios = require('axios');
const debug = require("debug")("darwin:Helpers:rabbitmq");

var pubChannel = null;
var amqpConn = null;
var connection = null;
exports.start = async ()=> {
    return new promise((resolve, reject) => {
        if (connection)
        {
             console.log('I am connecting');
            resolve(connection);
        }
        else {
            //  console.log('=====================I am set');
            amqpConn = amqp.connect(process.env.AMQP_HOST + "?heartbeat=60");
            amqpConn.then((conn) => {
                if (!conn) {
                    reject("rabbitmq.start: Connection could not established ======conn");
                }
                conn.on("error", function (err) {
                    console.log("rabbitmq.start: create connection err =====", err);
                    reject(err);
                });
                conn.on("close", function () {
                    console.log("rabbitmq.close: create connection err =====",);
                    resolve(null);
                });

                // debug("[AMQP] connected");
                connection = conn;
                resolve(connection);
            }).catch(err => {
                // debug(err);
                console.log("rabbitmq.start: error while establishing connection ====", err);
                reject(" error while establishing connection ====");
            });
        }
    })

}

exports.createPublisherChannel = async () => {
    
    return new promise((resolve, reject) => {
        amqpConn.createConfirmChannel().then((ch, err) => {
            // console.log("=====================createPublisherChannel");
            if (this.closeOnErr(err))
            {
                console.log(err,"============================Error in createPublisherChannel");
                resolve(false)
            }
            ch.on("error",  (err) => {
                console.error("[AMQP] channel error", err.message);
                resolve(false);
            });
            ch.on("close", async  ()=> {
                // debug("[AMQP] channel closed");
                amqpConn = await this.start();
                resolve(false);
            });
            resolve(ch);
        }).catch(err => {
            // debug(err)
            console.log("=====================error in  createPublisherChannel catch");
            resolve(false);
        });
    });
}

exports.publish_Content = async (isMultipleContent=false, queue_name, content, persistent, durable, requeque=false, ttl=0) =>
{
    // console.log("======================Queue Name", queue_name);
    if (!pubChannel)
    {
        amqpConn = await this.start();
        pubChannel = await this.createPublisherChannel();
    }
    if (pubChannel) {
        if (isMultipleContent && Array.isArray(content))
        {
            for (let i = 0; i < content.length; i++)
            {
                await this.publish(queue_name, content[i], persistent, durable);
            }
        }
        else {
            return await this.publish(queue_name, content, persistent, durable);
        }
    }
    return await Promise.resolve(true);
}

exports.publish = async (queue, content, persistentValue, durableValue) => {
    // console.log("==================Worker Job Publish Function Start");
    return new promise((resolve, reject) => {
        pubChannel.assertQueue(queue, { persistent: persistentValue, durable: durableValue }).then(res => {
            pubChannel.sendToQueue(queue, Buffer.from(JSON.stringify(content)));
            // console.log("===========================Job SendTOQueue");
            resolve(true);
        })
        .catch(err => {
            // debug("[AMQP] publish", err);
            pubChannel.connection.close();
            pubChannel = null;
            connection = null
            console.log("====================error",err);
            resolve(false);
        });
    })
}


exports.publish_Persistent_Content = async (isMultipleContent=false, queue_name, content, persistent, durable, requeque=false, ttl=0) =>
{
    // console.log("======================Queue Name", queue_name);
    if (!pubChannel)
    {
        amqpConn = await this.start();
        pubChannel = await this.createPublisherChannel();
    }
    if (pubChannel) {
        if (isMultipleContent && Array.isArray(content))
        {
            for (let i = 0; i < content.length; i++)
            {
                await this.publish_Persistent_Message(queue_name, content[i], persistent, durable);
            }
        }
        else {
            return await this.publish_Persistent_Message(queue_name, content, persistent, durable);
        }
    }
    return await Promise.resolve(true);
}

exports.publish_Persistent_Message = async (queue, content, persistentValue, durableValue) => {
    // console.log("==================Worker Job Publish Function Start");
    return new promise((resolve, reject) => {
        pubChannel.assertQueue(queue, { persistent: persistentValue, durable: durableValue }).then(res => {
            pubChannel.sendToQueue(queue, Buffer.from(JSON.stringify(content)),{persistent:true});
            // console.log("===========================Job SendTOQueue");
            resolve(true);
        })
        .catch(err => {
            // debug("[AMQP] publish", err);
            pubChannel.connection.close();
            console.log("====================error",err);
            resolve(false);
        });
    })
}


exports.closeOnErr = (err) =>{
    if (!err) return false;
    // console.error("[AMQP] error", err);
    amqpConn.close();
    return true;
}

exports.makeRequest = async function (newConfig) {

    let config = newConfig;
    // var ax = axios.create();
    // debug(ax);
    return await axios(config)

}
