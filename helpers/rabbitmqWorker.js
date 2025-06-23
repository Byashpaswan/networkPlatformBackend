const amqp =require('amqplib');
const Promise = require('promise');
const createConnection = ()=> {
  return new Promise((resolve, reject) => {
    amqp.connect(process.env.AMQP_HOST + "?heartbeat=60")
      .then(conn => {
        resolve(conn);
      })
      .catch(err => {
        console.log("error while create connection===>", err);
        reject(err);
      })
  })
}

const createChannel=(amqpConn) =>{
  return new Promise((resolve, reject) => {
    amqpConn
      .createChannel()
      .then(ch => {
        resolve(ch);
      })
      .catch(err => {
        console.log("change could not created ====>", err);
        reject(err);
      })
  })
}

function setConnectionListener(con, consumerCallback) {
  con.on('err', (err) => {
    console.log("rabbitmq: connection err event trigger", err);
    setTimeout(() => {
      reconnect(consumerCallback)
    }, 10000);
  })
  con.on('close', () => {
    console.log("rabbitmq: connection close event trigger", err);
    setTimeout(() => {
      reconnect(consumerCallback)
    }, 10000);

  })
}

function setChannelListener(con, channel, consumerCallback, callChannel) {
  channel.on('err', (err) => {
    console.log("rabbitmq: channel err :event trigger", err);
    callChannel(con, consumerCallback);
  })
  channel.on('close', () => {
    console.log("rabbitmq: channel close event trigger", err);
    callChannel(con, consumerCallback);
  })
}

function getChannel(con, consumerCallback) {
  createChannel(con)
    .then(channel => {
      setChannelListener(con, channel, consumerCallback, getChannel);
      consumerCallback(channel);
      //consume(ch, consumer_queue, { persistent: true, durable: true });
    })
    .catch(err => {
      console.log("Error while creating rabbitmq channel", err);
      setTimeout(() => {
        reconnect(consumerCallback)
      }, 10000);
    })
}
function reconnect(consumerCallback) {
  createConnection()
  .then(con => {
    setConnectionListener(con, consumerCallback);
    getChannel(con, function (channel) {
      //consume(channel, queue, option);
      consumerCallback(channel);
    });
  })
    .catch(err => {
      setTimeout(() => {
        reconnect(consumerCallback)
      }, 10000);
    });
}


const createWorker=(consumerCallback) => {
  createConnection()
    .then(con => {
      if (!con) {
        console.log("rabbitmq: no connection");
      }
      console.log("=============rabbitmq: connection");
      setConnectionListener(con, consumerCallback);
      getChannel(con, consumerCallback );
    }).catch(err => {
      console.log("Error while creating rabbitmq channel", err);
    })
}

// module.exports.getPublisherChannel =( con)=>{

// }
const publish =  (channel,queue, content, options) => {
  return new Promise((resolve, reject) => {
    channel.assertQueue(queue, options)
    .then(res => {
      channel.sendToQueue(queue, Buffer.from(JSON.stringify(content)));
      resolve(true);
    })
      .catch(err => {
        debug("[AMQP] publish", err);
        reject(err);
      });
  })
}


module.exports={
  createWorker: createWorker,
  createConnection: createConnection,
  createChannel: createChannel,
  publish: publish,
}
