require("dotenv").config({ path: ".env" });
require("../db/connection");
const Mongoose = require("mongoose");
const debug = require("debug")("darwin:Script:SourceSummary");
const mongooseObjectId = Mongoose.Types.ObjectId;
const moment = require("moment-timezone");
const defaultTimezone = 'Asia/Kolkata';
 
const networkModel = require('../db/network/Network');
const {
    SummaryLogModel,
    LiveDaily_AdvertiserOfferPublisherSourceSummary,
    MonthlySourceOfferAdvertiserPublisherSummaryModel
} = require('../db/click/sourceSummary/sourceSummary');
 
const SOURCE_SUMMARY_INTERVAL = parseInt(process.env.SOURCE_SUMMARY_INTERVAL || 1); // default fallback
 
async function getMonthInterval(lastSlotTime) {
    try {
        const dateStart = moment(lastSlotTime).add(SOURCE_SUMMARY_INTERVAL, "months").startOf("month").toDate();
        const endDate = moment(dateStart).add(SOURCE_SUMMARY_INTERVAL, 'months').startOf("month").toDate();
        return { startTime: dateStart, endTime: endDate };
    } catch (error) {
        console.log("Error in getMonthInterval:", error);
        return null;
    }
}
 
function formateSummary(obj, network_id, timeInterval, nid) {
    console.log(" time Interval.startTime -> ", timeInterval.startTime);
    let slot = moment(timeInterval.startTime).format('YYYY-MM-DD');
    return {
        N_id: network_id,
        nid: obj.nid || nid,
        source : obj.source,
        click: obj.click,
        conv: obj.conv,
        pConv: obj.pConv,
        rev: obj.rev,
        hRev: obj.hRev,
        pay: obj.pay,
        coin: obj.coin,
        pPay: obj.pPay,
        pid: obj._id.pid || obj.pid,
        A_id: obj.A_id,
        aid: obj.aid,
        oName: obj.oName,
        oId: obj._id.oId || obj.oId,
        AdOId: obj.AdOId,
        slot: slot,
    };
}
 
async function logSummaryResult(network_id, records_count, timeInterval, report_name, nid) {
    try {
        const timeSlot = moment(timeInterval.endTime);
        const newLog = new SummaryLogModel({
            network_id,
            nid,
            summary_count: records_count,
            report_name,
            timeSlot: timeSlot.toDate(),
        });
        await newLog.save();
    } catch (error) {
        console.log("Error in create summary log:", error);
    }
}
 
async function InsertReports(timeInterval, network_id, nid) {
    try {
        if (timeInterval.startTime && timeInterval.endTime && network_id) {
            const filter = {
                N_id: mongooseObjectId(network_id),
                slot: {
                    $gte: timeInterval.startTime,
                    $lt: timeInterval.endTime,
                }
            };
 
            const groupBy = {
                pid: "$pid",
                N_id: "$N_id",
                oId: "$oId",
            };
 
            // const data = await LiveDaily_AdvertiserOfferPublisherSourceSummary.find(filter).limit(5);
            // console.log(" data.length -> ", data, " data.length ");
 
 
            // let cursor = await LiveDaily_AdvertiserOfferPublisherSourceSummary.aggregate([{ $match : filter }, { $group : { _id : groupBy}}]).cursor({ batchSize : 1000 }).exec();
            // while (await cursor.hasNext()) {
            //     const doc = await cursor.next();
            //     console.log("DOC in cursor:", doc);
            // }
 
            
            const cursor = await LiveDaily_AdvertiserOfferPublisherSourceSummary.fetchDailySummaryUsingStream(filter, groupBy);
            let records_count = 0;
            let result_buffer = [];
            for await (const doc of cursor) {
                console.log("DOC in stream:", doc);
                records_count++;
                const summary = formateSummary(doc, network_id, timeInterval, nid);
                result_buffer.push(summary);
                if(result_buffer.length >= 1000){
                    try{
                        const bufferCopy = [ ...result_buffer ];
                        await MonthlySourceOfferAdvertiserPublisherSummaryModel.insertManyDocs(bufferCopy);
                        result_buffer = [];
                    }catch(error){
                        console.log(" Error ", error);
                    }
                }
            }
 
            if( result_buffer.length > 0 ){
                try{
                    const bufferCopy = [ ...result_buffer ];
                    await MonthlySourceOfferAdvertiserPublisherSummaryModel.insertManyDocs(bufferCopy);
                    result_buffer = [];
                }catch(error){
                    console.log(" Error ", error);
                }
            }
            await logSummaryResult(network_id, records_count, timeInterval, 'Monthly', nid);
 
            
            // cursor.on("data", async function (doc) {
            //     console.log(" doc -> ", doc)
            //     // cursor.pause(); // pause the stream
            //     records_count++;
            //     const summary = {}// formateSummary(doc, network_id, timeInterval, nid);
            //     result_buffer.push(summary);
            //     if (result_buffer.length >= 1000) {
            //         try {
            //             const bufferCopy = [...result_buffer];
            //             // await MonthlySourceOfferAdvertiserPublisherSummaryModel.insertManyDocs(bufferCopy);
            //             result_buffer = [];
            //         } catch (err) {
            //             console.error("Error inserting bulk docs:", err);
            //         }
            //     }
            //     // cursor.resume(); // resume after insert completes
            // });
 
            // cursor.on("end", async () => {
            //     console.log(" Cursor ended. Remaining buffer size:", result_buffer.length );
            //     if (result_buffer.length > 0) {
            //         try {
            //             // await MonthlySourceOfferAdvertiserPublisherSummaryModel.insertMany(result_buffer);
            //         } catch (err) {
            //             console.error("Error inserting remaining docs:", err);
            //         }
            //     }
 
            //     await logSummaryResult(network_id, records_count, timeInterval, 'Monthly', nid);
            // });
 
            // cursor.on("error", async () => {
            //     if (result_buffer.length > 0) {
            //         try {
            //             // await MonthlySourceOfferAdvertiserPublisherSummaryModel.insertMany(result_buffer);
            //         } catch (error) {
            //             console.log("Error inserting docs in error handler:", error);
            //         }
            //     }
 
            //     await logSummaryResult(network_id, records_count, timeInterval, 'Monthly', nid);
            // });
        }
    } catch (error) {
        console.log("Error in InsertReports:", error);
    }
}
 
async function insertOrUpdateReports(timeInterval, network_id, nid) {
    
    try{
        console.log(" network_id ->>>>>>>> ", network_id);
        console.log(" timeInterval -> ", timeInterval);
        if(timeInterval.startTime && timeInterval.endTime && network_id){
            let filter = {
                N_id : mongooseObjectId(network_id),
                slot : {
                    $gte : moment(timeInterval.startTime).toISOString(),
                    $lt : moment(timeInterval.endTime).toISOString()
                }
            }
            let groupBy = {
                pid : "$pid",
                N_id : "$N_id",
                oId : "$oId"
            }
            console.log(" .... filter -> .................................................. ", filter );
            console.log(" groupBy -> ", groupBy );
 
            try{
                const data = await LiveDaily_AdvertiserOfferPublisherSourceSummary.aggregate([{ $match : filter }, { $group : { _id  : groupBy }}]).allowDiskUse(true).cursor({ batchSize : 1000 }).exec();
 
                for(const doc of data){
                    console.log(" doc -> ", doc );
                }
            }catch(error){
                console.log(" error in cursor -> ", error);
            }
        }
    }catch(error){
        console.log(" error in insertOrUpdate Reports ", error);
    }
}
 
async function createSummary(network_id, nid, timeZone = defaultTimezone) {
    try {
        let slotTime;
        const lastMlogValue = await SummaryLogModel.getLastLogTimeSlot(mongooseObjectId(network_id) , "Monthly");
 
        slotTime = lastMlogValue.length === 0
            ? process.env.SUMMARY_DATE_START
            : lastMlogValue[0].timeSlot;
        console.log(" last time ", lastMlogValue);
        const currentTime = moment();
        let timeInterval = await getMonthInterval(moment(slotTime));
        console.log(" time Interval -> ", timeInterval);
        if (timeInterval) {
            let timeDiff = moment.duration(currentTime.diff(moment(timeInterval.startTime))).asMonths();
            while (timeDiff > SOURCE_SUMMARY_INTERVAL) {
                await InsertReports(timeInterval, network_id, nid);
                timeInterval = await getMonthInterval(timeInterval.startTime);
                timeDiff = moment.duration(currentTime.diff(moment(timeInterval.startTime))).asMonths();
            }
            console.log(" timediff ->>>>>>>>>>>>>>>>> ", timeDiff, "  timediff ");
            if(timeDiff > 0 ){
                console.log(" ...............................................")
                await InsertReports(timeInterval, network_id, nid);
            }
        }
    } catch (error) {
        console.log("Error in createSummary:", error);
    }
}
 
async function startScript() {
    try {
        const allNetworks = await networkModel.find({ _id : mongooseObjectId('5e4d056eeb383b291949a3df') }); // adjust filter as needed
        for (const network of allNetworks) {
            const network_id = network._id;
            const nid = network.nid || null;
            await createSummary(network_id, nid);
        }
        console.log("Monthly summary script completed.");
        process.exit(0);
    } catch (error) {
        console.error("Error in startScript:", error);
        process.exit(1);
    }
}
 
startScript();