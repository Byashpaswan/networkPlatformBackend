require("dotenv").config({ path: ".env" });
const moment = require("moment");
const axios = require("axios");
const { getRedisHashMultipleData } = require("../helpers/Redis");

const TELEGRAM_NOTIFICATION_DOMAIN = process.env.TELEGRAM_NOTIFICATION_DOMAIN;
const NOTIFICATION_TEAM_NAME = process.env.NOTIFICATION_TEAM_NAME || 'development,tl';
const MIN_WORKER_PAUSE_TIME = process.env.MIN_WORKER_PAUSE_TIME || 5;


const maxWaitingTime = {
    "Affise_Api_queue": 15,
    "Generic_Worker_Queue": 10,
    "Offers_Api_queue": 15,
    "Offerslook_Api_queue": 15,
    "download_center_reports_queue": 10,
    "live_report_clicks_queue": 2,
    "live_report_conversions_queue": 2,
    "webhook_queue": 5
}


const sendMessage = async (queueDetails) => {

    try {
        let msg = `<b>Worker Status</b>\nQueue Name: ${queueDetails.name}\nWorker State: ${queueDetails.state}\nConsumer Count: ${queueDetails.consumers}\nReady Message Count: ${queueDetails.messages_ready}\nUnacknowledged Msg Count: ${queueDetails.messages_unacknowledged}`;

        let response = await axios({
            method: 'get',
            url: 'https://' + TELEGRAM_NOTIFICATION_DOMAIN + '/api/telegram_send.php?t=' + NOTIFICATION_TEAM_NAME + '&m=' + msg
            // url: 'https://' + TELEGRAM_NOTIFICATION_DOMAIN + '/api/telegram_send.php?p=<enter your mobile number>&m=' + msg
        });

        if (response.status == 200) {
            return true;
        }
    }
    catch (error) {
        console.log("<===== Line 27 ~ sendMessage ~ error =====> ", error)
    }
    return false;
}

const getRabbitMqDetails = async () => {

    try {
        const options = {
            method: 'GET',
            url: 'http://54.189.50.9:15672/api/queues',
            params: { page: '1', page_size: '100', name: '', use_regex: 'false', pagination: 'true' },
            headers: { authorization: 'Basic Y29kZTpzMG0zcDRzc3cwcmQ=' }
        };

        let response = await axios.request(options);
        if (response.data && response.data.items) {
            return response.data.items;
        }
    } catch (error) {
        console.log("<===== Line 47 ~ getRabbitMqDetails ~ error =====> ", error)
    }
    return []

}

exports.checkRabbitMqLastStatus = async () => {

    try {
        let queueDetails = await getRabbitMqDetails();
        // console.log("<===== Line 57 ~ checkRabbitMqLastStatus ~ queueDetails =====> ", queueDetails)
        let workerQueueStatus = (await getRedisHashMultipleData("WRQUEUESTATUS")).data;
        // console.log("<===== Line 59 ~ checkRabbitMqLastStatus ~ redisQueueLastStatus =====> ", redisQueueLastStatus)
        for (const tempObj of queueDetails) {

            // console.log("<===== Line 62 ~ checkRabbitMqLastStatus ~ Queue Name =====>", tempObj.name)
            // console.log("<===== Line 63 ~ checkRabbitMqLastStatus ~ Ready Message Count =====> ", tempObj.messages_ready)
            // console.log("<===== Line 64 ~ checkRabbitMqLastStatus ~ Last Status Time =====> ", workerQueueStatus[tempObj.name])
            if (tempObj.name && workerQueueStatus[tempObj.name] && maxWaitingTime[tempObj.name]) {

                let timeDiff = moment.duration(moment().diff(workerQueueStatus[tempObj.name])).asMinutes()
                // console.log("<===== Line 68 ~ checkRabbitMqLastStatus ~ timeDiff =====> ", timeDiff)
                if (timeDiff > maxWaitingTime[tempObj.name] && tempObj.messages_ready) {
                    // console.log("<===== Line 70 ~ checkRabbitMqLastStatus ~ Send Notification =====>")
                    await sendMessage(tempObj)
                }
            }
        }
     process.exit();	    
    } catch (error) {
        console.log("<===== Line 76 ~ checkRabbitMqLastStatus ~ error =====> ", error)
    }
    process.exit();

}


this.checkRabbitMqLastStatus();
