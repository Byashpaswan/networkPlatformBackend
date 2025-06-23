require("dotenv").config({ path: ".env" });
require("../db/connection");

const mongoose = require("mongoose");
const mongooseObjectId = mongoose.Types.ObjectId;
const moment = require("moment");

// import files for push bulk offer worker
const WorkerStatusModel = require('../db/WorkerStatus');
const { getDataFromRedisSortedSet, removeDataFromRedisSortedSet, getRedisData, setRedisQueueData } = require("../helpers/Redis");

const checkStatus = async () => {

    try {
        let currTime = new Date().getTime();
        let result = (await getDataFromRedisSortedSet(["GENWORKERQUEUEPRO", 0, -1, 'WITHSCORES'])).data
        for (const key in result) {
            if ((currTime - result[key]) >= 120000) {
                await removeDataFromRedisSortedSet("GENWORKERQUEUEPRO", key);
                let requeData = await getRedisData(`GWR:${key}`)
                if (requeData.data) {
                    await setRedisQueueData("GENWORKERQUEUE", requeData.data)
                }
                else {
                    await WorkerStatusModel.updateStatus({ _id: mongooseObjectId(key) }, { $set: { status: 'Failed', 'sDetails.Failed': moment().toDate() } });
                }
            }
        }
        process.exit();
    } catch (error) {
        console.log("File: checkResdisWorkerFailedStatus.js ~ line 12 ~ checkStatus ~ error ~ ", error)
        process.exit();
    }

}

checkStatus();
