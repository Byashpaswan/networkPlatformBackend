const Mongoose = require("mongoose");
const debug = require("debug")("darwin:Script:SourceSummary");
require("dotenv").config({ path: ".env" });
const mongooseObjectId = Mongoose.Types.ObjectId;
var { ClickLogModel, ConversionModel } = require("../db/click/clickLog");
var { OffersSourceAdvAffSummaryModel, SourceSummaryModel, SourceAdvertiserAffiliateSummaryModel, SourceAdvertiserSummaryModel, SourceAffiliateSummaryModel, SummaryLogModel, AdvertiserSummaryModel, PublisherSummaryModel, DailySummaryModel, AppSummaryModel, DailyAdvertiserOfferPublisherSummaryModel, MonthlyAdvertiserOfferPublisherSummaryModel, DailySourceOfferAdvertiserPublisherSummaryModel, MonthlySourceOfferAdvertiserPublisherSummaryModel, DailySourceAdvertiserSummaryModel, MonthlySourceAdvertiserSummaryModel, DailySourcePublisherSummaryModel, MonthlySourcePublisherSummaryModel, SourceOfferPublisherSummaryModel } = require("../db/click/sourceSummary/sourceSummary");
var { AppidPublisherSummaryModel } = require("../db/appidPublisherSummary");
var NetworkModel = require("../db/network/Network");
const AdvertiserModel = require("../db/advertiser/Advertiser");
var moment = require("moment-timezone");
const Promise = require("promise");
const SOURCE_SUMMARY_INTERVAL = process.env.SOURCE_SUMMARY_INTERVAL || 15;
require("../db/connection");
const defaultTimezone = 'Asia/Kolkata';

/**
 * Main scripts for start genrating report
 */
exports.startCronScript = async () => {
    try {
        let networks = await fetchAllNetworks();
        if (!networks) {
            return false;
        }
        for (let i = 0; i < networks.length; i++) {
            try {
                // console.log("processing data", networks[i].company_name);
                // if (networks[i]._id.toString() == "5e4d056eeb383b291949a3df") {
                //     await buildSummary(networks[i]._id, defaultTimezone);
                // } // for testing use...
                if (networks[i].current_timezone) {
                    await buildSummary(networks[i]._id, networks[i].nid, networks[i].current_timezone);
                } else {
                    await buildSummary(networks[i]._id, networks[i].nid, defaultTimezone);
                }
                // console.log("processing done", networks[i].company_name);
            } catch (e) {
                console.log(e);
            }
        }
        process.exit();
    } catch (e) {
        console.log(e);
    }
    return await Promise.resolve(true);
};
function buildSummary(network_id, nid, timezone) {
    return new Promise(async (resolve, reject) => {
        try {
            //await processSourceSummary(network_id);
            try {
                await processSourceAdvSummary(network_id, nid);
            } catch (err) {
                console.log("~ buildSummary ~ processSourceAdvSummary ~ err:", err)
            }
            try {
                await processSourceAffSummary(network_id, nid);
            } catch (err) {
                console.log("~ buildSummary ~ processSourceAffSummary ~ err:", err)
            }
            try {
                await processSourceAdvAffSummary(network_id, nid);
            } catch (err) {
                console.log("~ buildSummary ~ processSourceAdvAffSummary ~ err:", err)
            }
            try {
                await processOffersSourceAdvAff(network_id, nid);
            } catch (err) {
                console.log("~ buildSummary ~ processOffersSourceAdvAff ~ err:", err)
            }
            try {
                await processAdvertiserSummary(network_id, nid);
            } catch (err) {
                console.log("~ buildSummary ~ processAdvertiserSummary ~ err:", err)
            }
            try {
                await processDailySummary(network_id, nid);
            } catch (err) {
                console.log("~ buildSummary ~ processDailySummary ~ err:", err)
            }
            try {
                await processPublisherSummary(network_id, nid);
            } catch (err) {
                console.log("~ buildSummary ~ processPublisherSummary ~ err:", err)
            }
            try {
                await processSourceOfferPublisherSummary(network_id, nid);
            } catch (err) {
                console.log("~ buildSummary ~ processSourceOfferPublisherSummary ~ err:", err)
            }
            try {
                await processAppSummary(network_id, nid);
            } catch (err) {
                console.log("~ buildSummary ~ processAppSummary ~ err:", err)
            }
            try {
                await processAppidPublisherSummary(network_id, nid);
            } catch (err) {
                console.log("~ buildSummary ~ processAppidPublisherSummary ~ err:", err)
            }
            // await processDailyOffersSourceAdvertiserPublisherByTimeZone(network_id, timezone);
            // await processMonthlyOffersSourceAdvertiserPublisherByTimeZone(network_id, timezone);
            // await processDailySourceAdvertiserByTimeZone(network_id, timezone);
            // await processMonthlySourceAdvertiserByTimeZone(network_id, timezone);
            // await processDailySourcePublisherByTimeZone(network_id, timezone);
            // await processMonthlySourcePublisherByTimeZone(network_id, timezone);
            // try {
            //     // await processDailyAdvertiserOfferPublisherSummaryByTimeZone(network_id, nid, timezone);
            // } catch (err) {
            //     console.log(" ~ buildSummary ~ processDailyAdvertiserOfferPublisherSummaryByTimeZone ~ err:", err)
            // }
            // try {
            //     // await processMonthlyAdvertiserOfferPublisherSummaryByTimeZone(network_id, nid, timezone);
            // } catch (err) {
            //     console.log(" ~ buildSummary ~ processMonthlyAdvertiserOfferPublisherSummaryByTimeZone ~ err:", err)
            // }
            return resolve();
        } catch (err) {
            // console.log("err while processing all data ", err);
            return reject();
        }
    });
}
async function fetchAllNetworks() {
    try {
        let result = await NetworkModel.findAllNetwork({ status: "pending" }, { _id: 1, nid: 1, status: 1, company_name: 1, current_timezone: 1 });
        if (result && result.length) {
            return result;
        }
        return null;
    } catch (e) {
        console.log(e);
        return null;
    }
}

/**
 * Start processing all the reports by these scripts
 */
// function processSourceSummary(network_id) {
//     return new Promise(async (resolve, reject) => {
//         let lastdlogValue_OffersSourceAdvAff = await SummaryLogModel.getLastLogTimeSlot(network_id, "source");
//         let slotTime;
//         if (lastdlogValue_OffersSourceAdvAff.length == 0) {
//             // return resolve(true);
//             slotTime = process.env.SUMMARY_DATE_START;
//         }
//         else {
//             slotTime = lastdlogValue_OffersSourceAdvAff[0].timeSlot;
//         }
//         let currentTime = moment();
//         let timeInterval = getDateInterval(moment(slotTime));
//         if (timeInterval) {
//             // console.log(timeInterval, currentTime.toDate());

//             let timeDiff = moment.duration(currentTime.diff(moment(timeInterval.startTime))).asMinutes();
//             while (timeDiff > SOURCE_SUMMARY_INTERVAL) {

//                 await InsertSourceSummary(timeInterval, network_id);
//                 await buildConversionSourceSummary(timeInterval, network_id);

//                 timeInterval = getDateInterval(timeInterval.startTime);
//                 timeDiff = moment.duration(currentTime.diff(moment(timeInterval.startTime))).asMinutes();
//             }
//         }
//         return resolve(true);
//     });
// }
function processSourceAdvSummary(network_id, nid) {
    return new Promise(async (resolve, reject) => {
        let lastdlogValue_OffersSourceAdvAff = await SummaryLogModel.getLastLogTimeSlot(network_id, "SourceAdv");

        let slotTime;
        if (lastdlogValue_OffersSourceAdvAff.length == 0) {
            // return resolve(true);
            slotTime = process.env.SUMMARY_DATE_START;
        }
        else {
            slotTime = lastdlogValue_OffersSourceAdvAff[0].timeSlot;
        }
        let currentTime = moment();
        let timeInterval = getDateInterval(moment(slotTime));
        if (timeInterval) {
            // console.log(timeInterval, currentTime.toDate());

            let timeDiff = moment.duration(currentTime.diff(moment(timeInterval.startTime))).asMinutes();
            while (timeDiff > SOURCE_SUMMARY_INTERVAL) {
                await InsertSourceAdvertiserSummary(timeInterval, network_id, nid);
                await buildConversionSourceAdvertiserSummary(timeInterval, network_id, nid);

                timeInterval = getDateInterval(timeInterval.startTime);
                timeDiff = moment.duration(currentTime.diff(moment(timeInterval.startTime))).asMinutes();
            }
        }
        return resolve(true);
    });
}
function processSourceAffSummary(network_id, nid) {
    return new Promise(async (resolve, reject) => {
        let lastdlogValue_OffersSourceAdvAff = await SummaryLogModel.getLastLogTimeSlot(network_id, "SourceAff");

        let slotTime;
        if (lastdlogValue_OffersSourceAdvAff.length == 0) {
            // return resolve(true);
            slotTime = process.env.SUMMARY_DATE_START;
        }
        else {
            slotTime = lastdlogValue_OffersSourceAdvAff[0].timeSlot;
        }
        let currentTime = moment();
        let timeInterval = getDateInterval(moment(slotTime));
        if (timeInterval) {
            // console.log(timeInterval, currentTime.toDate());

            let timeDiff = moment.duration(currentTime.diff(moment(timeInterval.startTime))).asMinutes();
            while (timeDiff > SOURCE_SUMMARY_INTERVAL) {
                await InsertSourceAffiliateSummary(timeInterval, network_id, nid);
                await buildConversionSourceAffiliateSummary(timeInterval, network_id, nid);

                timeInterval = getDateInterval(timeInterval.startTime);
                timeDiff = moment.duration(currentTime.diff(moment(timeInterval.startTime))).asMinutes();
            }
        }
        return resolve(true);
    });
}
function processSourceAdvAffSummary(network_id, nid) {
    return new Promise(async (resolve, reject) => {
        let lastdlogValue_OffersSourceAdvAff = await SummaryLogModel.getLastLogTimeSlot(network_id, "SourceAdvAff");

        let slotTime;
        if (lastdlogValue_OffersSourceAdvAff.length == 0) {
            // return resolve(true);
            slotTime = process.env.SUMMARY_DATE_START;
        }
        else {
            slotTime = lastdlogValue_OffersSourceAdvAff[0].timeSlot;
        }
        let currentTime = moment();
        let timeInterval = getDateInterval(moment(slotTime));
        if (timeInterval) {
            // console.log(timeInterval, currentTime.toDate());

            let timeDiff = moment.duration(currentTime.diff(moment(timeInterval.startTime))).asMinutes();
            while (timeDiff > SOURCE_SUMMARY_INTERVAL) {
                await InsertSourceAdvertiserAffiliateSummary(timeInterval, network_id, nid);
                await buildConversionSourceAdvertiserAffiliateSummary(timeInterval, network_id, nid);

                timeInterval = getDateInterval(timeInterval.startTime);
                timeDiff = moment.duration(currentTime.diff(moment(timeInterval.startTime))).asMinutes();
            }
        }
        return resolve(true);
    });
}
function processOffersSourceAdvAff(network_id, nid) {
    return new Promise(async (resolve, reject) => {
        let lastdlogValue_OffersSourceAdvAff = await SummaryLogModel.getLastLogTimeSlot(network_id, "OffersSourceAdvAff");

        let slotTime;
        if (lastdlogValue_OffersSourceAdvAff.length == 0) {
            // return resolve(true);
            slotTime = process.env.SUMMARY_DATE_START;
        }
        else {
            slotTime = lastdlogValue_OffersSourceAdvAff[0].timeSlot;
        }
        let currentTime = moment();
        let timeInterval = getDateInterval(moment(slotTime));
        if (timeInterval) {
            // console.log(timeInterval, currentTime.toDate());

            let timeDiff = moment.duration(currentTime.diff(moment(timeInterval.startTime))).asMinutes();
            while (timeDiff > SOURCE_SUMMARY_INTERVAL) {
                await InsertOffersSourceAdvAffSummary(timeInterval, network_id, nid);
                await buildConversionOffersSourceAdvAffSummary(timeInterval, network_id, nid);

                timeInterval = getDateInterval(timeInterval.startTime);
                timeDiff = moment.duration(currentTime.diff(moment(timeInterval.startTime))).asMinutes();
            }
        }
        return resolve(true);
    });
}
function processAdvertiserSummary(network_id, nid) {
    return new Promise(async (resolve, reject) => {
        let lastdlogValue_adv = await SummaryLogModel.getLastLogTimeSlot(network_id, "advertiser");
        let slotTime;
        // console.log("lastdlogValue ========", lastdlogValue_adv);
        if (lastdlogValue_adv.length == 0) {
            // return resolve(true);
            slotTime = process.env.SUMMARY_DATE_START;
        }
        else {
            slotTime = lastdlogValue_adv[0].timeSlot;
        }
        let currentTime = moment();
        let timeInterval = getDateInterval(moment(slotTime));
        if (timeInterval) {
            // console.log(timeInterval, currentTime.toDate());

            let timeDiff = moment.duration(currentTime.diff(moment(timeInterval.startTime))).asMinutes();
            while (timeDiff > SOURCE_SUMMARY_INTERVAL) {
                await InsertAdvertiserSummary(timeInterval, network_id, nid);
                await buildConversionAdvSummary(timeInterval, network_id, nid);

                timeInterval = getDateInterval(timeInterval.startTime);
                timeDiff = moment.duration(currentTime.diff(moment(timeInterval.startTime))).asMinutes();
            }
        }
        return resolve(true);
    });
}
function processDailySummary(network_id, nid) {
    return new Promise(async (resolve, reject) => {
        let lastdlogValue_day = await SummaryLogModel.getLastLogTimeSlot(network_id, "day");
        let slotTime;
        // console.log("lastdlogValue ========", lastdlogValue_day);
        if (lastdlogValue_day.length == 0) {
            // return resolve(true);
            slotTime = process.env.SUMMARY_DATE_START;
        }
        else {
            slotTime = lastdlogValue_day[0].timeSlot;
        }
        let currentTime = moment();
        let timeInterval = getDateInterval(moment(slotTime));
        if (timeInterval) {
            // console.log(timeInterval, currentTime.toDate());

            let timeDiff = moment.duration(currentTime.diff(moment(timeInterval.startTime))).asMinutes();
            while (timeDiff > SOURCE_SUMMARY_INTERVAL) {
                await InsertDailySummary(timeInterval, network_id, nid);
                await buildConversionDailySummary(timeInterval, network_id, nid);

                timeInterval = getDateInterval(timeInterval.startTime);
                timeDiff = moment.duration(currentTime.diff(moment(timeInterval.startTime))).asMinutes();
            }
        }
        return resolve(true);
    });
}
function processPublisherSummary(network_id, nid) {
    return new Promise(async (resolve, reject) => {
        let lastdlogValue_adv = await SummaryLogModel.getLastLogTimeSlot(network_id, "publisher");
        let slotTime;
        // console.log("lastdlogValue ========", lastdlogValue_adv);
        if (lastdlogValue_adv.length == 0) {
            // return resolve(true);
            slotTime = process.env.SUMMARY_DATE_START;
        }
        else {
            slotTime = lastdlogValue_adv[0].timeSlot;
        }
        let currentTime = moment();
        let timeInterval = getDateInterval(moment(slotTime));
        if (timeInterval) {
            // console.log(timeInterval, currentTime.toDate());

            let timeDiff = moment.duration(currentTime.diff(moment(timeInterval.startTime))).asMinutes();
            while (timeDiff > SOURCE_SUMMARY_INTERVAL) {
                await InsertPublisherSummary(timeInterval, network_id, nid);
                await buildConversionPubSummary(timeInterval, network_id, nid);

                timeInterval = getDateInterval(timeInterval.startTime);
                timeDiff = moment.duration(currentTime.diff(moment(timeInterval.startTime))).asMinutes();
            }
        }
        return resolve(true);
    });
}
function processSourceOfferPublisherSummary(network_id, nid) {
    return new Promise(async (resolve, reject) => {
        let lastdlogValue_adv = await SummaryLogModel.getLastLogTimeSlot(network_id, "SourceOfferPublisherSummary");
        let slotTime;
        // console.log("lastdlogValue ========", lastdlogValue_adv);
        if (lastdlogValue_adv.length == 0) {
            // return resolve(true);
            slotTime = process.env.SUMMARY_DATE_START;
        }
        else {
            slotTime = lastdlogValue_adv[0].timeSlot;
        }
        let currentTime = moment();
        let timeInterval = getDateInterval(moment(slotTime));
        if (timeInterval) {
            // console.log(timeInterval, currentTime.toDate());
            let timeDiff = moment.duration(currentTime.diff(moment(timeInterval.startTime))).asMinutes();
            while (timeDiff > SOURCE_SUMMARY_INTERVAL) {
                await insertSourceOfferPublisherSummary(timeInterval, network_id, nid);
                await buildConversionSourceOfferPublisherSummary(timeInterval, network_id, nid);
                timeInterval = getDateInterval(timeInterval.startTime);
                timeDiff = moment.duration(currentTime.diff(moment(timeInterval.startTime))).asMinutes();
            }
        }
        return resolve(true);
    });
}
function processAppSummary(network_id, nid) {
    return new Promise(async (resolve, reject) => {
        let lastdlogValue_app = await SummaryLogModel.getLastLogTimeSlot(network_id, "Summary App_id Report");
        let slotTime;
        // console.log("lastdlogValue ========", lastdlogValue_app);
        if (lastdlogValue_app.length == 0) {
            // return resolve(true);
            slotTime = process.env.SUMMARY_DATE_START;
        }
        else {
            slotTime = lastdlogValue_app[0].timeSlot;
        }
        let currentTime = moment();
        let timeInterval = getDateInterval(moment(slotTime));
        if (timeInterval) {
            // console.log(timeInterval, currentTime.toDate());

            let timeDiff = moment.duration(currentTime.diff(moment(timeInterval.startTime))).asMinutes();
            while (timeDiff > SOURCE_SUMMARY_INTERVAL) {
                await InsertAppSummary(timeInterval, network_id, nid);
                await buildConversionAppSummary(timeInterval, network_id, nid);

                timeInterval = getDateInterval(timeInterval.startTime);
                timeDiff = moment.duration(currentTime.diff(moment(timeInterval.startTime))).asMinutes();
            }
        }
        return resolve(true);
    });
}
function processAppidPublisherSummary(network_id, nid) {
    return new Promise(async (resolve, reject) => {
        let lastdlogValue_app = await SummaryLogModel.getLastLogTimeSlot(network_id, "AppidPublisherSummary");
        let slotTime;
        // console.log("lastdlogValue ========", lastdlogValue_app);
        if (lastdlogValue_app.length == 0) {
            // return resolve(true);
            slotTime = process.env.SUMMARY_DATE_START;
        }
        else {
            slotTime = lastdlogValue_app[0].timeSlot;
        }
        let currentTime = moment();
        let timeInterval = getDateInterval(moment(slotTime));
        if (timeInterval) {
            // console.log(timeInterval, currentTime.toDate());

            let timeDiff = moment.duration(currentTime.diff(moment(timeInterval.startTime))).asMinutes();
            while (timeDiff > SOURCE_SUMMARY_INTERVAL) {
                await InsertAppidPublisherSummary(timeInterval, network_id, nid);
                await buildConversionAppidPublisherSummary(timeInterval, network_id, nid);

                timeInterval = getDateInterval(timeInterval.startTime);
                timeDiff = moment.duration(currentTime.diff(moment(timeInterval.startTime))).asMinutes();
            }
        }
        return resolve(true);
    });
}
function processDailyAdvertiserOfferPublisherSummaryByTimeZone(network_id, nid, timezone) {
    return new Promise(async (resolve, reject) => {
        let lastdlogValue_day = await SummaryLogModel.getLastLogTimeSlot(network_id, "DailyAdvertiserOfferPublisherSummaryByTimeZone");
        let slotTime;
        if (lastdlogValue_day.length == 0) {
            slotTime = process.env.SUMMARY_DATE_START;
        } else {
            slotTime = lastdlogValue_day[0].timeSlot;
        }
        let currentTime = moment().tz(timezone);
        let timeInterval = getDateIntervalDaily(moment(slotTime).tz(timezone));
        if (timeInterval) {
            let timeDiff = moment.duration(currentTime.diff(timeInterval.startTime)).asDays();
            while (timeDiff > process.env.DAILY_TIMEZONE_SUMMARY_INTERVAL) {
                await insertAdvertiserOfferPublisherSummaryByTimeZone(timeInterval, network_id, nid, timezone, "days");
                timeInterval = getDateIntervalDaily(timeInterval.startTime);
                timeDiff = moment.duration(currentTime.diff(timeInterval.startTime)).asDays();
            }
            if (timeDiff > 0) {
                await insertOrUpdateAdvertiserOfferPublisherSummaryByTimeZone(timeInterval, network_id, nid, timezone, "days");
            }
        }
        return resolve(true);
    });
}
function processMonthlyAdvertiserOfferPublisherSummaryByTimeZone(network_id, nid, timezone) {
    return new Promise(async (resolve, reject) => {
        let lastdlogValue_day = await SummaryLogModel.getLastLogTimeSlot(network_id, "MonthlyAdvertiserOfferPublisherSummaryByTimeZone");
        let slotTime;
        if (lastdlogValue_day.length == 0) {
            slotTime = process.env.SUMMARY_DATE_START;
        } else {
            slotTime = lastdlogValue_day[0].timeSlot;
        }
        let currentTime = moment().tz(timezone);
        let timeInterval = getDateIntervalMonthly(moment(slotTime).tz(timezone));
        if (timeInterval) {
            let timeDiff = currentTime.diff(timeInterval.startTime, 'months', true);
            while (timeDiff > process.env.MONTHLY_TIMEZONE_SUMMARY_INTERVAL) {
                await insertAdvertiserOfferPublisherSummaryByTimeZone(timeInterval, network_id, nid, timezone, "months");
                timeInterval = getDateIntervalMonthly(timeInterval.startTime);
                timeDiff = currentTime.diff(timeInterval.startTime, 'months', true);
            }
        }
        return resolve(true);
    });
}
// function processDailyOffersSourceAdvertiserPublisherByTimeZone(network_id, timezone) {
//     return new Promise(async (resolve, reject) => {
//         let lastdlogValue_day = await SummaryLogModel.getLastLogTimeSlot(network_id, "DailyOffersSourceAdvertiserPublisherTimeZone");
//         let slotTime;
//         if (lastdlogValue_day.length == 0) {
//             slotTime = process.env.SUMMARY_DATE_START;
//         }
//         else {
//             slotTime = lastdlogValue_day[0].timeSlot;
//         }
//         let currentTime = moment().tz(timezone);
//         let timeInterval = getDateIntervalDaily(moment(slotTime).tz(timezone));
//         if (timeInterval) {
//             let timeDiff = moment.duration(currentTime.diff(timeInterval.startTime)).asDays();
//             while (timeDiff > process.env.DAILY_TIMEZONE_SUMMARY_INTERVAL) {
//                 await insertOffersSourceAdvertiserPublisherByTimeZone(timeInterval, network_id, timezone, "days");
//                 timeInterval = getDateIntervalDaily(timeInterval.startTime);
//                 timeDiff = moment.duration(currentTime.diff(timeInterval.startTime)).asDays();
//             }
//             if (timeDiff > 0) {
//                 await insertOrUpdateOffersSourceAdvertiserPublisherByTimeZone(timeInterval, network_id, timezone, "days");
//             }
//         }
//         return resolve(true);
//     });
// }
// function processMonthlyOffersSourceAdvertiserPublisherByTimeZone(network_id, timezone) {
//     return new Promise(async (resolve, reject) => {
//         let lastdlogValue_day = await SummaryLogModel.getLastLogTimeSlot(network_id, "MonthlyOffersSourceAdvertiserPublisherTimeZone");
//         let slotTime;
//         if (lastdlogValue_day.length == 0) {
//             slotTime = process.env.SUMMARY_DATE_START;
//         }
//         else {
//             slotTime = lastdlogValue_day[0].timeSlot;
//         }
//         let currentTime = moment().tz(timezone);
//         let timeInterval = getDateIntervalMonthly(moment(slotTime).tz(timezone));
//         if (timeInterval) {
//             let timeDiff = currentTime.diff(timeInterval.startTime, 'months', true);
//             while (timeDiff > process.env.MONTHLY_TIMEZONE_SUMMARY_INTERVAL) {
//                 await insertOffersSourceAdvertiserPublisherByTimeZone(timeInterval, network_id, timezone, "months");
//                 timeInterval = getDateIntervalMonthly(timeInterval.startTime);
//                 timeDiff = currentTime.diff(timeInterval.startTime, 'months', true);
//             }
//             if (timeDiff > 0) {
//                 await insertOrUpdateOffersSourceAdvertiserPublisherByTimeZone(timeInterval, network_id, timezone, "months");
//             }
//         }
//         return resolve(true);
//     });
// }
// function processDailySourceAdvertiserByTimeZone(network_id, timezone) {
//     return new Promise(async (resolve, reject) => {
//         let lastdlogValue_day = await SummaryLogModel.getLastLogTimeSlot(network_id, "DailySourceAdvertiserTimeZone");
//         let slotTime;
//         if (lastdlogValue_day.length == 0) {
//             slotTime = process.env.SUMMARY_DATE_START;
//         }
//         else {
//             slotTime = lastdlogValue_day[0].timeSlot;
//         }
//         let currentTime = moment().tz(timezone);
//         let timeInterval = getDateIntervalDaily(moment(slotTime).tz(timezone));
//         if (timeInterval) {
//             let timeDiff = moment.duration(currentTime.diff(timeInterval.startTime)).asDays();
//             while (timeDiff > process.env.DAILY_TIMEZONE_SUMMARY_INTERVAL) {
//                 await insertSourceAdvertiserByTimeZone(timeInterval, network_id, timezone, "days");
//                 timeInterval = getDateIntervalDaily(timeInterval.startTime);
//                 timeDiff = moment.duration(currentTime.diff(timeInterval.startTime)).asDays();
//             }
//             if (timeDiff > 0) {
//                 await insertOrUpdateSourceAdvertiserByTimeZone(timeInterval, network_id, timezone, "days");
//             }
//         }
//         return resolve(true);
//     });
// }
// function processMonthlySourceAdvertiserByTimeZone(network_id, timezone) {
//     return new Promise(async (resolve, reject) => {
//         let lastdlogValue_day = await SummaryLogModel.getLastLogTimeSlot(network_id, "MonthlySourceAdvertiserTimeZone");
//         let slotTime;
//         if (lastdlogValue_day.length == 0) {
//             slotTime = process.env.SUMMARY_DATE_START;
//         }
//         else {
//             slotTime = lastdlogValue_day[0].timeSlot;
//         }
//         let currentTime = moment().tz(timezone);
//         let timeInterval = getDateIntervalMonthly(moment(slotTime).tz(timezone));
//         if (timeInterval) {
//             let timeDiff = currentTime.diff(timeInterval.startTime, 'months', true);
//             while (timeDiff > process.env.MONTHLY_TIMEZONE_SUMMARY_INTERVAL) {
//                 await insertSourceAdvertiserByTimeZone(timeInterval, network_id, timezone, "months");
//                 timeInterval = getDateIntervalMonthly(timeInterval.startTime);
//                 timeDiff = currentTime.diff(timeInterval.startTime, 'months', true);
//             }
//             if (timeDiff > 0) {
//                 await insertOrUpdateSourceAdvertiserByTimeZone(timeInterval, network_id, timezone, "months");
//             }
//         }
//         return resolve(true);
//     });
// }
// function processDailySourcePublisherByTimeZone(network_id, timezone) {
//     return new Promise(async (resolve, reject) => {
//         let lastdlogValue_day = await SummaryLogModel.getLastLogTimeSlot(network_id, "DailySourcePublisherTimeZone");
//         let slotTime;
//         if (lastdlogValue_day.length == 0) {
//             slotTime = process.env.SUMMARY_DATE_START;
//         }
//         else {
//             slotTime = lastdlogValue_day[0].timeSlot;
//         }
//         let currentTime = moment().tz(timezone);
//         let timeInterval = getDateIntervalDaily(moment(slotTime).tz(timezone));
//         if (timeInterval) {
//             let timeDiff = moment.duration(currentTime.diff(timeInterval.startTime)).asDays();
//             while (timeDiff > process.env.DAILY_TIMEZONE_SUMMARY_INTERVAL) {
//                 await insertSourcePublisherByTimeZone(timeInterval, network_id, timezone, "days");
//                 timeInterval = getDateIntervalDaily(timeInterval.startTime);
//                 timeDiff = moment.duration(currentTime.diff(timeInterval.startTime)).asDays();
//             }
//             if (timeDiff > 0) {
//                 await insertOrUpdateSourcePublisherByTimeZone(timeInterval, network_id, timezone, "days");
//             }
//         }
//         return resolve(true);
//     });
// }
// function processMonthlySourcePublisherByTimeZone(network_id, timezone) {
//     return new Promise(async (resolve, reject) => {
//         let lastdlogValue_day = await SummaryLogModel.getLastLogTimeSlot(network_id, "MonthlySourcePublisherTimeZone");
//         let slotTime;
//         if (lastdlogValue_day.length == 0) {
//             slotTime = process.env.SUMMARY_DATE_START;
//         }
//         else {
//             slotTime = lastdlogValue_day[0].timeSlot;
//         }
//         let currentTime = moment().tz(timezone);
//         let timeInterval = getDateIntervalMonthly(moment(slotTime).tz(timezone));
//         if (timeInterval) {
//             let timeDiff = currentTime.diff(timeInterval.startTime, 'months', true);
//             while (timeDiff > process.env.MONTHLY_TIMEZONE_SUMMARY_INTERVAL) {
//                 await insertSourcePublisherByTimeZone(timeInterval, network_id, timezone, "months");
//                 timeInterval = getDateIntervalMonthly(timeInterval.startTime);
//                 timeDiff = currentTime.diff(timeInterval.startTime, 'months', true);
//             }
//             if (timeDiff > 0) {
//                 await insertOrUpdateSourcePublisherByTimeZone(timeInterval, network_id, timezone, "months");
//             }
//         }
//         return resolve(true);
//     });
// }

/**
 * Genrating documents in the Database by these functions
 */
// async function InsertSourceSummary(timeInterval, network_id) {
//     //let isDataExists = false;
//     // console.log("InsertSourceSummary");
//     return new Promise(async (resolve, reject) => {
//         try {
//             if (timeInterval.startTime && timeInterval.endTime && network_id) {
//                 let cursor = await ClickLogModel.fetchDailySummaryUsingStream({ network_id: network_id, createdAt: { $gte: timeInterval.startTime, $lt: timeInterval.endTime } }, { source: "$source" });

//                 let records_count = 0;
//                 let result_buffer = [];
//                 //console.log("=======",result.length);
//                 cursor.on("data", async function (doc) {
//                     //console.log("=======+++++", doc.length  );
//                     records_count++;
//                     let summary = formatSourceDocument(doc, network_id, timeInterval);
//                     result_buffer.push(summary);
//                     if (result_buffer.length >= 1000) {
//                         let insert_docs = result_buffer;
//                         result_buffer = [];
//                         try {
//                             await SourceSummaryModel.insertManyDocs(insert_docs);
//                         } catch (err) {
//                             console.log("Err while inserting in SourceSummary", err.message);
//                         }
//                         //result_buffer = [];
//                     }
//                 });

//                 cursor.on("end", async () => {
//                     try {
//                         await SourceSummaryModel.insertManyDocs(result_buffer);
//                     } catch (err) {
//                         console.log("Err while inserting in SourceSummary", err.message);
//                     }
//                     result_buffer = [];
//                     //isDataExists = true;
//                     try {
//                         await logSummaryResult(network_id, records_count, timeInterval, "source");
//                         resolve(true);
//                     } catch (err) {
//                         console.log("Err while saving logs in source ", err.message);
//                         resolve(true);
//                     }
//                 });

//                 cursor.on("error", async () => {
//                     try {
//                         await SourceSummaryModel.insertManyDocs(result_buffer);
//                     } catch (err) {
//                         console.log("Err while inserting in SourceSummary", err.message);
//                     }
//                     result_buffer = [];
//                     //isDataExists = true;
//                     try {
//                         await logSummaryResult(network_id, records_count, timeInterval, "source");
//                         resolve(true);
//                     } catch (err) {
//                         console.log("Err while saving logs in source ", err.message);
//                         resolve(true);
//                     }
//                 });
//             }
//         } catch (err) {
//             console.log("error in InsertSourceSummary", err);
//             reject(false);
//         }
//     });

//     //return await Promise.resolve(isDataExists);
// }
async function InsertSourceAdvertiserSummary(timeInterval, network_id, nid) {
    // console.log("InsertSourceAdvertiserSummary");
    return new Promise(async (resolve, reject) => {
        try {
            if (timeInterval.startTime && timeInterval.endTime && network_id) {
                let cursor = await ClickLogModel.fetchDailySummaryUsingStream({ network_id: network_id, createdAt: { $gte: timeInterval.startTime, $lt: timeInterval.endTime } }, { source: "$source", advertiser_id: "$advertiser_id" });

                let records_count = 0;
                let result_buffer = [];
                //console.log("=======",result.length);
                cursor.on("data", async function (doc) {
                    //console.log("=======+++++", doc.length  );
                    records_count++;
                    let summary = formatSourceAdvDocument(doc, network_id, timeInterval, nid);
                    result_buffer.push(summary);
                    if (result_buffer.length >= 1000) {
                        let insert_docs = result_buffer;
                        result_buffer = [];
                        try {
                            await SourceAdvertiserSummaryModel.insertManyDocs(insert_docs);
                        } catch (err) {
                            console.log("Err while inserting SourceAdvertiserSummary", err.message);
                        }

                        //result_buffer = [];
                    }
                });

                cursor.on("end", async () => {
                    try {
                        await SourceAdvertiserSummaryModel.insertManyDocs(result_buffer);
                    } catch (err) {
                        console.log("Err while inserting SourceAdvertiserSummary", err.message);
                    }

                    result_buffer = [];
                    try {
                        await logSummaryResult(network_id, records_count, timeInterval, "SourceAdv", nid);
                        resolve(true);
                    } catch (err) {
                        console.log("Err while saving logs in SourceAdv", err.message);
                        resolve(true);
                    }
                });

                cursor.on("error", async () => {
                    try {
                        await SourceAdvertiserSummaryModel.insertManyDocs(result_buffer);
                    } catch (err) {
                        console.log("Err while inserting SourceAdvertiserSummary", err.message);
                    }

                    result_buffer = [];
                    try {
                        await logSummaryResult(network_id, records_count, timeInterval, "SourceAdv", nid);
                        resolve(true);
                    } catch (err) {
                        console.log("Err while saving logs in SourceAdv", err.message);
                        resolve(true);
                    }
                });
            }
        } catch (err) {
            console.log("error in InsertSourceAdvertiserSummary", err);
            reject(false);
        }
    });
}
async function InsertSourceAffiliateSummary(timeInterval, network_id, nid) {
    // console.log("InsertSourceAffiliateSummary");
    return new Promise(async (resolve, reject) => {
        try {
            if (timeInterval.startTime && timeInterval.endTime && network_id) {
                let cursor = await ClickLogModel.fetchDailySummaryUsingStream({ network_id: network_id, createdAt: { $gte: timeInterval.startTime, $lt: timeInterval.endTime } }, { source: "$source", publisher_id: "$publisher_id" });

                let records_count = 0;
                let result_buffer = [];
                //console.log("=======",result.length);
                cursor.on("data", async function (doc) {
                    //console.log("=======+++++", doc.length  );
                    records_count++;
                    let summary = formatAffiliateDocument(doc, network_id, timeInterval, nid);
                    result_buffer.push(summary);
                    if (result_buffer.length >= 1000) {
                        let insert_docs = result_buffer;
                        result_buffer = [];
                        try {
                            await SourceAffiliateSummaryModel.insertManyDocs(insert_docs);
                        } catch (err) {
                            console.log("Error while inserting SourceAffiliateSummary", err.message);
                        }
                    }
                });

                cursor.on("end", async () => {
                    try {
                        await SourceAffiliateSummaryModel.insertManyDocs(result_buffer);
                    } catch (err) {
                        console.log("Error while inserting SourceAffiliateSummary", err.message);
                    }
                    result_buffer = [];
                    try {
                        await logSummaryResult(network_id, records_count, timeInterval, "SourceAff", nid);
                        resolve(true);
                    } catch (err) {
                        console.log("Error while saving log in SourceAff", err.message);
                        resolve(true);
                    }
                });

                cursor.on("error", async () => {
                    try {
                        await SourceAffiliateSummaryModel.insertManyDocs(result_buffer);
                    } catch (err) {
                        console.log("Error while inserting SourceAffiliateSummary", err.message);
                    }

                    result_buffer = [];
                    try {
                        await logSummaryResult(network_id, records_count, timeInterval, "SourceAff", nid);
                        resolve(true);
                    } catch (err) {
                        console.log("Error while saving log in SourceAff", err.message);
                        resolve(true);
                    }
                });
            }
        } catch (err) {
            console.log("error in InsertSourceAffiliateSummary", err);
            reject(false);
        }
    });
}
async function InsertSourceAdvertiserAffiliateSummary(timeInterval, network_id, nid) {
    return new Promise(async (resolve, reject) => {
        try {
            // console.log("InsertSourceAdvertiserAffiliateSummary");
            if (timeInterval.startTime && timeInterval.endTime && network_id) {
                let cursor = await ClickLogModel.fetchDailySummaryUsingStream({ network_id: network_id, createdAt: { $gte: timeInterval.startTime, $lt: timeInterval.endTime } }, { source: "$source", advertiser_id: "$advertiser_id", publisher_id: "$publisher_id" });
                //console.log(result.length)

                let records_count = 0;
                let result_buffer = [];
                //console.log("=======",result.length);
                cursor.on("data", async function (doc) {
                    //console.log("=======+++++", doc.length  );
                    records_count++;
                    let summary = formatSourceAdvAffDocument(doc, network_id, timeInterval, nid);
                    result_buffer.push(summary);
                    if (result_buffer.length >= 1000) {
                        let insert_docs = result_buffer;
                        result_buffer = [];
                        try {
                            await SourceAdvertiserAffiliateSummaryModel.insertManyDocs(insert_docs);
                        } catch (err) {
                            console.log("Err while inserting  SourceAdvertiserAffiliateSummary", err.message);
                        }
                        //result_buffer = [];
                    }
                });

                cursor.on("end", async () => {
                    try {
                        await SourceAdvertiserAffiliateSummaryModel.insertManyDocs(result_buffer);
                    } catch (err) {
                        console.log("Err while inserting  SourceAdvertiserAffiliateSummary", err.message);
                    }
                    result_buffer = [];
                    try {
                        await logSummaryResult(network_id, records_count, timeInterval, "SourceAdvAff", nid);
                        resolve(true);
                    } catch (err) {
                        console.log("Error while saving logs in SourceAdvAff", err.message);
                        resolve(true);
                    }
                });

                cursor.on("error", async () => {
                    try {
                        await SourceAdvertiserAffiliateSummaryModel.insertManyDocs(
                            result_buffer
                        );
                    } catch (err) {
                        console.log("Err while inserting  SourceAdvertiserAffiliateSummary", err.message);
                    }
                    result_buffer = [];
                    try {
                        await logSummaryResult(network_id, records_count, timeInterval, "SourceAdvAff", nid);
                        resolve(true);
                    } catch (err) {
                        console.log("Error while saving logs in SourceAdvAff", err.message);
                        resolve(true);
                    }
                });

            }
        } catch (err) {
            console.log("error in InsertSourceAdvertiserAffiliateSummary", err);
            reject(false);
        }
    });
}
async function InsertOffersSourceAdvAffSummary(timeInterval, network_id, nid) {
    return new Promise(async (resolve, reject) => {
        try {
            // console.log("InsertOffersSourceAdvAffSummary");
            if (timeInterval.startTime && timeInterval.endTime && network_id) {
                // console.log("============InsertOffersSourceAdvAffSummary");
                let cursor = await ClickLogModel.fetchDailySummaryUsingStream({ network_id: network_id, createdAt: { $gte: timeInterval.startTime, $lt: timeInterval.endTime } }, { offer_id: "$offer_id", source: "$source", advertiser_id: "$advertiser_id", publisher_id: "$publisher_id" });

                let records_count = 0;
                let result_buffer = [];
                //console.log("=======",result.length);
                cursor.on("data", async function (doc) {
                    //console.log("=======+++++", records_count);
                    records_count++;
                    let summary = formatOffersSourceAdvAffDocument(doc, network_id, timeInterval, nid);
                    result_buffer.push(summary);
                    if (result_buffer.length >= 1000) {
                        let insert_docs = result_buffer;

                        result_buffer = [];
                        try {
                            await OffersSourceAdvAffSummaryModel.insertManyDocs(insert_docs);
                        } catch (err) {
                            console.log("error while inserting doc in OffersSourceAdvAffSummary", err.message);
                        }
                    }
                });

                cursor.on("end", async () => {
                    try {
                        await OffersSourceAdvAffSummaryModel.insertManyDocs(result_buffer);
                    } catch (err) {
                        console.log("error while inserting doc in OffersSourceAdvAffSummary", err.message);
                    }
                    result_buffer = [];
                    try {
                        await logSummaryResult(network_id, records_count, timeInterval, "OffersSourceAdvAff", nid);
                        resolve(true);
                    } catch (err) {
                        console.log("error while inserting logs of  OffersSourceAdvAff", err.message);
                        resolve(true);
                    }
                });

                cursor.on("error", async () => {
                    try {
                        await OffersSourceAdvAffSummaryModel.insertManyDocs(result_buffer);
                    } catch (err) {
                        console.log("error while inserting doc in OffersSourceAdvAffSummary", err.message);
                    }
                    result_buffer = [];
                    try {
                        await logSummaryResult(network_id, records_count, timeInterval, "OffersSourceAdvAff", nid);
                        resolve(true);
                    } catch (err) {
                        console.log("error while inserting logs of  OffersSourceAdvAff", err.message);
                        resolve(true);
                    }
                });
            }
        } catch (err) {
            console.log("error in InsertOffersSourceAdvAffSummary", err);
            reject(false);
        }
    });
}
async function InsertAdvertiserSummary(timeInterval, network_id, nid) {
    //let isDataExists = false;
    // console.log("InsertAdvertiserSummary");
    return new Promise(async (resolve, reject) => {
        try {
            if (timeInterval.startTime && timeInterval.endTime && network_id) {
                let cursor = await ClickLogModel.fetchDailySummaryUsingStream({ network_id: network_id, createdAt: { $gte: timeInterval.startTime, $lt: timeInterval.endTime } }, { advertiser_id: "$advertiser_id" });

                let records_count = 0;
                let result_buffer = [];
                cursor.on("data", async function (doc) {
                    records_count++;
                    let summary = formatAdvDocument(doc, network_id, timeInterval, nid);
                    result_buffer.push(summary);
                    if (result_buffer.length >= 1000) {
                        let insert_docs = result_buffer;
                        result_buffer = [];
                        try {
                            await AdvertiserSummaryModel.insertManyDocs(insert_docs);
                        } catch (err) {
                            console.log("Err while inserting in AdvertiserSummary", err.message);
                        }
                        //result_buffer = [];
                    }
                });

                cursor.on("end", async () => {
                    try {
                        await AdvertiserSummaryModel.insertManyDocs(result_buffer);
                    } catch (err) {
                        console.log("Err while inserting in AdvertiserSummaryModel", err.message);
                    }
                    result_buffer = [];
                    //isDataExists = true;
                    try {
                        await logSummaryResult(network_id, records_count, timeInterval, "advertiser", nid);
                        resolve(true);
                    } catch (err) {
                        console.log("Err while saving logs in AdvertiserSummary ", err.message);
                        resolve(true);
                    }
                });

                cursor.on("error", async () => {
                    try {
                        await AdvertiserSummaryModel.insertManyDocs(result_buffer);
                    } catch (err) {
                        console.log("Err while inserting in AdvertiserSummary", err.message);
                    }
                    result_buffer = [];
                    //isDataExists = true;
                    try {
                        await logSummaryResult(network_id, records_count, timeInterval, "advertiser", nid);
                        resolve(true);
                    } catch (err) {
                        console.log("Err while saving logs in advertiser ", err.message);
                        resolve(true);
                    }
                });
            }
        } catch (err) {
            console.log("error in InsertAdvertiserSummary", err);
            reject(false);
        }
    });

    //return await Promise.resolve(isDataExists);
}
async function InsertDailySummary(timeInterval, network_id, nid) {
    //let isDataExists = false;
    // console.log("InsertDailySummary");
    return new Promise(async (resolve, reject) => {
        try {
            if (timeInterval.startTime && timeInterval.endTime && network_id) {
                let cursor = await ClickLogModel.fetchDailySummaryUsingStream({ network_id: network_id, createdAt: { $gte: timeInterval.startTime, $lt: timeInterval.endTime } }, {});

                let records_count = 0;
                let result_buffer = [];
                cursor.on("data", async function (doc) {
                    records_count++;
                    let summary = formatDailyDocument(doc, network_id, timeInterval, nid);
                    result_buffer.push(summary);
                    if (result_buffer.length >= 1000) {
                        let insert_docs = result_buffer;
                        result_buffer = [];
                        try {
                            await DailySummaryModel.insertManyDocs(insert_docs);
                        } catch (err) {
                            console.log("Err while inserting in DailySummary", err.message);
                        }
                        //result_buffer = [];
                    }
                });

                cursor.on("end", async () => {
                    try {
                        await DailySummaryModel.insertManyDocs(result_buffer);
                    } catch (err) {
                        console.log("Err while inserting in DailySummary", err.message);
                    }
                    result_buffer = [];
                    //isDataExists = true;
                    try {
                        await logSummaryResult(network_id, records_count, timeInterval, "day", nid);
                        resolve(true);
                    } catch (err) {
                        console.log("Err while saving logs in day ", err.message);
                        resolve(true);
                    }
                });

                cursor.on("error", async () => {
                    try {
                        await DailySummaryModel.insertManyDocs(result_buffer);
                    } catch (err) {
                        console.log("Err while inserting in DailySummary", err.message);
                    }
                    result_buffer = [];
                    //isDataExists = true;
                    try {
                        await logSummaryResult(network_id, records_count, timeInterval, "day", nid);
                        resolve(true);
                    } catch (err) {
                        console.log("Err while saving logs in day ", err.message);
                        resolve(true);
                    }
                });
            }
        } catch (err) {
            console.log("error in InsertDailySummary", err);
            reject(false);
        }
    });

    //return await Promise.resolve(isDataExists);
}
async function InsertPublisherSummary(timeInterval, network_id, nid) {
    //let isDataExists = false;
    return new Promise(async (resolve, reject) => {
        try {
            if (timeInterval.startTime && timeInterval.endTime && network_id) {
                let cursor = await ClickLogModel.fetchDailySummaryUsingStream({ network_id: network_id, createdAt: { $gte: timeInterval.startTime, $lt: timeInterval.endTime } }, { publisher_id: "$publisher_id" }
                );

                let records_count = 0;
                let result_buffer = [];
                cursor.on("data", async function (doc) {
                    records_count++;
                    let summary = formatPubDocument(doc, network_id, timeInterval, nid);
                    result_buffer.push(summary);
                    if (result_buffer.length >= 1000) {
                        let insert_docs = result_buffer;
                        result_buffer = [];
                        try {
                            await PublisherSummaryModel.insertManyDocs(insert_docs);
                        } catch (err) {
                            console.log("Err while inserting in PublisherSummary", err.message);
                        }
                        //result_buffer = [];
                    }
                });

                cursor.on("end", async () => {
                    try {
                        await PublisherSummaryModel.insertManyDocs(result_buffer);
                    } catch (err) {
                        console.log("Err while inserting in PublisherSummaryModel", err.message);
                    }
                    result_buffer = [];
                    //isDataExists = true;
                    try {
                        await logSummaryResult(network_id, records_count, timeInterval, "publisher", nid);
                        resolve(true);
                    } catch (err) {
                        console.log("Err while saving logs in PublisherSummary ", err.message);
                        resolve(true);
                    }
                });

                cursor.on("error", async () => {
                    try {
                        await PublisherSummaryModel.insertManyDocs(result_buffer);
                    } catch (err) {
                        console.log("Err while inserting in PublisherSummary", err.message);
                    }
                    result_buffer = [];
                    //isDataExists = true;
                    try {
                        await logSummaryResult(network_id, records_count, timeInterval, "publisher", nid);
                        resolve(true);
                    } catch (err) {
                        console.log("Err while saving logs in publisher ", err.message);
                        resolve(true);
                    }
                });
            }
        } catch (err) {
            console.log("error in InsertPublisherSummary", err);
            reject(false);
        }
    });

    //return await Promise.resolve(isDataExists);
}
async function insertSourceOfferPublisherSummary(timeInterval, network_id, nid) {
    return new Promise(async (resolve, reject) => {
        try {
            if (timeInterval.startTime && timeInterval.endTime && network_id) {
                let cursor = await ClickLogModel.fetchDailySummaryUsingStream({ network_id: network_id, createdAt: { $gte: timeInterval.startTime, $lt: timeInterval.endTime } }, { offer_id: "$offer_id", source: "$source", publisher_id: "$publisher_id" }
                );
                let records_count = 0;
                let result_buffer = [];
                cursor.on("data", async function (doc) {
                    records_count++;
                    let summary = formatSourceOfferPublisherDocument(doc, network_id, timeInterval, nid);
                    result_buffer.push(summary);
                    if (result_buffer.length >= 1000) {
                        let insert_docs = result_buffer;
                        result_buffer = [];
                        try {
                            await SourceOfferPublisherSummaryModel.insertManyDocs(insert_docs);
                        } catch (err) {
                            console.log("Err while inserting in SourceOfferPublisherSummary", err.message);
                        }
                        //result_buffer = [];
                    }
                });

                cursor.on("end", async () => {
                    try {
                        await SourceOfferPublisherSummaryModel.insertManyDocs(result_buffer);
                    } catch (err) {
                        console.log("Err while inserting in SourceOfferPublisherSummary", err.message);
                    }
                    result_buffer = [];
                    //isDataExists = true;
                    try {
                        await logSummaryResult(network_id, records_count, timeInterval, "SourceOfferPublisherSummary", nid);
                        resolve(true);
                    } catch (err) {
                        console.log("Err while saving logs of SourceOfferPublisherSummary", err.message);
                        resolve(true);
                    }
                });

                cursor.on("error", async () => {
                    try {
                        await SourceOfferPublisherSummaryModel.insertManyDocs(result_buffer);
                    } catch (err) {
                        console.log("Err while inserting in SourceOfferPublisherSummary", err.message);
                    }
                    result_buffer = [];
                    //isDataExists = true;
                    try {
                        await logSummaryResult(network_id, records_count, timeInterval, "SourceOfferPublisherSummary", nid);
                        resolve(true);
                    } catch (err) {
                        console.log("Err while saving logs of SourceOfferPublisherSummary", err.message);
                        resolve(true);
                    }
                });
            }
        } catch (err) {
            console.log("error in insertSourceOfferPublisherSummary", err);
            reject(false);
        }
    });
    //return await Promise.resolve(isDataExists);
}
async function InsertAppSummary(timeInterval, network_id, nid) {
    //let isDataExists = false;
    return new Promise(async (resolve, reject) => {
        try {
            if (timeInterval.startTime && timeInterval.endTime && network_id) {
                let cursor = await ClickLogModel.fetchDailySummaryUsingStream({ network_id: network_id, createdAt: { $gte: timeInterval.startTime, $lt: timeInterval.endTime } }, { app_id: "$app_id" });

                let records_count = 0;
                let result_buffer = [];
                cursor.on("data", async function (doc) {
                    records_count++;
                    let summary = formatAppDocument(doc, network_id, timeInterval, nid);
                    result_buffer.push(summary);
                    if (result_buffer.length >= 1000) {
                        let insert_docs = result_buffer;
                        result_buffer = [];
                        try {
                            await AppSummaryModel.insertManyDocs(insert_docs);
                        } catch (err) {
                            console.log("Err while inserting in AppSummary", err.message);
                        }
                        //result_buffer = [];
                    }
                });

                cursor.on("end", async () => {
                    try {
                        await AppSummaryModel.insertManyDocs(result_buffer);
                    } catch (err) {
                        console.log("Err while inserting in AppSummaryModel", err.message);
                    }
                    result_buffer = [];
                    //isDataExists = true;
                    try {
                        await logSummaryResult(network_id, records_count, timeInterval, "Summary App_id Report", nid);
                        resolve(true);
                    } catch (err) {
                        console.log("Err while saving logs in AppSummary ", err.message);
                        resolve(true);
                    }
                });

                cursor.on("error", async () => {
                    try {
                        await AppSummaryModel.insertManyDocs(result_buffer);
                    } catch (err) {
                        console.log("Err while inserting in AppSummary", err.message);
                    }
                    result_buffer = [];
                    //isDataExists = true;
                    try {
                        await logSummaryResult(network_id, records_count, timeInterval, "Summary App_id Report", nid);
                        resolve(true);
                    } catch (err) {
                        console.log("Err while saving logs in app_id ", err.message);
                        resolve(true);
                    }
                });
            }
        } catch (err) {
            console.log("error in InsertAppSummary", err);
            reject(false);
        }
    });
    //return await Promise.resolve(isDataExists);
}
async function InsertAppidPublisherSummary(timeInterval, network_id, nid) {
    //let isDataExists = false;
    return new Promise(async (resolve, reject) => {
        try {
            if (timeInterval.startTime && timeInterval.endTime && network_id) {
                let cursor = await ClickLogModel.fetchDailySummaryUsingStream({ network_id: network_id, createdAt: { $gte: timeInterval.startTime, $lt: timeInterval.endTime } }, { app_id: "$app_id", publisher_id: "$publisher_id" });

                let records_count = 0;
                let result_buffer = [];
                cursor.on("data", async function (doc) {
                    records_count++;
                    let summary = formatAppidPublisherDocument(doc, network_id, timeInterval, nid);
                    result_buffer.push(summary);
                    if (result_buffer.length >= 1) {
                        let insert_docs = result_buffer;
                        result_buffer = [];
                        try {
                            let result = await AppidPublisherSummaryModel.insertManyDocs(insert_docs);
                        } catch (err) {
                            console.log("Err while inserting in AppidPublisherSummary", err.message);
                        }
                        //result_buffer = [];
                    }
                });

                cursor.on("end", async () => {
                    if (result_buffer.length >= 1) {
                        try {
                            let result = await AppidPublisherSummaryModel.insertManyDocs(result_buffer);
                        } catch (err) {
                            console.log("Err while inserting in AppidPublisherSummary", err.message);
                        }
                        result_buffer = [];
                    }

                    //isDataExists = true;
                    try {
                        await logSummaryResult(network_id, records_count, timeInterval, "AppidPublisherSummary", nid);
                        resolve(true);
                    } catch (err) {
                        console.log("Err while saving logs in AppidPublisherSummary ", err.message);
                        resolve(true);
                    }
                });

                cursor.on("error", async () => {
                    if (result_buffer.length >= 1) {
                        try {
                            let result = await AppidPublisherSummaryModel.insertManyDocs(result_buffer);
                        } catch (err) {
                            console.log("Err while inserting in AppidPublisherSummary", err.message);
                        }
                        result_buffer = [];
                    }
                    //isDataExists = true;
                    try {
                        await logSummaryResult(network_id, records_count, timeInterval, "AppidPublisherSummary", nid);
                        resolve(true);
                    } catch (err) {
                        console.log("Err while saving logs in AppidPublisherSummary ", err.message);
                        resolve(true);
                    }
                });
            }
        } catch (err) {
            console.log("error in InsertAppidPublisherSummary", err);
            reject(false);
        }
    });
    //return await Promise.resolve(isDataExists);
}
async function insertAdvertiserOfferPublisherSummaryByTimeZone(timeInterval, network_id, nid, timezone, time) {
    return new Promise(async (resolve, reject) => {
        try {
            let fetchFromModel;
            let insertIntoModel;
            let insertModelName = "";
            let reportName = "";
            let startTime;
            let endTime;
            if (time === "days") {
                fetchFromModel = OffersSourceAdvAffSummaryModel;
                insertIntoModel = DailyAdvertiserOfferPublisherSummaryModel;
                insertModelName = "DailyAdvertiserOfferPublisherSummary";
                reportName = "DailyAdvertiserOfferPublisherSummaryByTimeZone";
                startTime = timeInterval.startTime.toDate();
                endTime = timeInterval.endTime.toDate();
            } else if (time === "months") {
                fetchFromModel = DailyAdvertiserOfferPublisherSummaryModel;
                insertIntoModel = MonthlyAdvertiserOfferPublisherSummaryModel;
                insertModelName = "MonthlyAdvertiserOfferPublisherSummary";
                reportName = "MonthlyAdvertiserOfferPublisherSummaryByTimeZone";
                startTime = timeInterval.startTime._d;
                endTime = timeInterval.endTime._d;
            }
            if (startTime && endTime && network_id) {
                if (time === "days") {
                    await insertIntoModel.deleteManyDocs({
                        network_id: network_id,
                        timeSlot: {
                            $gte: timeInterval.startTime._d,
                        }
                    });
                }
                let cursor = await fetchFromModel.fetchDailySummaryUsingStream(
                    {
                        network_id: network_id,
                        timeSlot: {
                            $gte: startTime,
                            $lt: endTime
                        }
                    },
                    {
                        advertiser_id: "$advertiser_id",
                        offer_id: "$offer_id",
                        publisher_id: "$publisher_id",
                    }
                );

                let records_count = 0;
                let result_buffer = [];
                cursor.on("data", async function (doc) {
                    records_count++;
                    let summary = formatOffersSourceAdvAffByTimezoneDocument(doc, network_id, nid, timeInterval, timezone);
                    result_buffer.push(summary);
                    if (result_buffer.length >= 1000) {
                        let insert_docs = result_buffer;
                        result_buffer = [];
                        try {
                            await insertIntoModel.insertManyDocs(insert_docs);
                        } catch (err) {
                            console.log(
                                "Err while inserting in " + insertModelName,
                                err.message
                            );
                        }
                    }
                });

                cursor.on("end", async () => {
                    try {
                        await insertIntoModel.insertManyDocs(result_buffer);
                        try {
                            await logSummaryResult(
                                network_id,
                                records_count,
                                timeInterval,
                                reportName, nid
                            );
                            resolve(true);
                        } catch (err) {
                            console.log("Err while saving logs in " + reportName, err.message);
                            resolve(true);
                        }
                    } catch (err) {
                        console.log(
                            "Err while inserting in " + insertModelName,
                            err.message
                        );
                    }
                    result_buffer = [];
                    // try {
                    //     await logSummaryResult(
                    //         network_id,
                    //         records_count,
                    //         timeInterval,
                    //         reportName
                    //     );
                    //     resolve(true);
                    // } catch (err) {
                    //     console.log("Err while saving logs in " + reportName, err.message);
                    //     resolve(true);
                    // }
                });

                cursor.on("error", async () => {
                    try {
                        await insertIntoModel.insertManyDocs(result_buffer);
                    } catch (err) {
                        console.log(
                            "Err while inserting in " + insertModelName,
                            err.message
                        );
                    }
                    result_buffer = [];
                    // try {
                    //     await logSummaryResult(
                    //         network_id,
                    //         records_count,
                    //         timeInterval,
                    //         reportName
                    //     );
                    //     resolve(true);
                    // } catch (err) {
                    //     console.log("Err while saving logs in " + reportName, err.message);
                    //     resolve(true);
                    // }
                });
            }
        } catch (err) {
            console.log("error in insertAdvertiserOfferPublisherSummaryByTimeZone", err);
            reject(false);
        }
    });
}
async function insertOrUpdateAdvertiserOfferPublisherSummaryByTimeZone(timeInterval, network_id, nid, timezone, time) {
    return new Promise(async (resolve, reject) => {
        try {
            let fetchFromModel;
            let insertIntoModel;
            let insertModelName = "";
            let reportName = "";
            let startTime;
            let endTime;
            // if (time === "days") {
            fetchFromModel = OffersSourceAdvAffSummaryModel;
            insertIntoModel = DailyAdvertiserOfferPublisherSummaryModel;
            insertModelName = "DailyAdvertiserOfferPublisherSummary";
            reportName = "DailyAdvertiserOfferPublisherSummaryByTimeZone";
            startTime = timeInterval.startTime.toDate();
            endTime = timeInterval.endTime.toDate();
            // } else if (time === "months") {
            //     fetchFromModel = DailySourceOfferAdvertiserPublisherSummaryModel;
            //     insertIntoModel = MonthlySourceOfferAdvertiserPublisherSummaryModel;
            //     insertModelName = "MonthlySourceOfferAdvertiserPublisherSummary";
            //     reportName = "MonthlyOffersSourceAdvertiserPublisherTimeZone";
            //     startTime = timeInterval.startTime._d;
            //     endTime = timeInterval.endTime._d;
            // }
            if (startTime && endTime && network_id) {
                let cursor = await fetchFromModel.fetchDailySummaryUsingStream(
                    {
                        network_id: network_id,
                        timeSlot: {
                            $gte: startTime,
                            $lt: endTime
                        }
                    },
                    {
                        advertiser_id: "$advertiser_id",
                        offer_id: "$offer_id",
                        publisher_id: "$publisher_id",
                    }
                );

                cursor.on("data", async function (doc) {
                    let filter = {
                        network_id: network_id,
                        timeSlot: moment(timeInterval.startTime._d).toDate(),
                        publisher_id: doc['publisher_id'],
                        advertiser_id: doc['advertiser_id'],
                        offer_id: doc['offer_id'],
                        timezone: timezone
                    };
                    let reflect = {
                        click: doc['click'],
                        unique_click: doc['unique_click'],
                        conversion: doc['conversion'],
                        publisher_conversion: doc['publisher_conversion'],
                        pre_conversion: doc['pre_conversion'],
                        unique_conversion: doc['unique_conversion'],
                        revenue: doc['revenue'],
                        hold_revenue: doc['hold_revenue'],
                        payout: doc['payout'],
                        publisher_payout: doc['publisher_payout'],
                        publisher_name: doc['publisher_name'],
                        advertiser_name: doc['advertiser_name'],
                        advertiser_offer_id: doc['advertiser_offer_id'],
                        offer_name: doc['offer_name'],
                        month: moment(timeInterval.startTime._d).format("MM"),
                        year: moment(timeInterval.startTime._d).format("YYYY"),
                    };

                    try {
                        await insertIntoModel.updateSlotDoc(filter, reflect);
                    } catch (err) {
                        console.log(
                            "Err while updating in " + insertModelName,
                            err.message
                        );
                    }
                });

                cursor.on("end", async () => {
                    resolve(true);
                });

                cursor.on("error", async () => { });
            }
        } catch (err) {
            console.log("error in insertOrUpdateAdvertiserOfferPublisherSummaryByTimeZone", err);
            reject(false);
        }
    });
}
// async function insertOffersSourceAdvertiserPublisherByTimeZone(timeInterval, network_id, timezone, time) {
//     return new Promise(async (resolve, reject) => {
//         try {
//             let fetchFromModel;
//             let insertIntoModel;
//             let insertModelName = "";
//             let reportName = "";
//             let startTime;
//             let endTime;
//             if (time === "days") {
//                 fetchFromModel = OffersSourceAdvAffSummaryModel;
//                 insertIntoModel = DailySourceOfferAdvertiserPublisherSummaryModel;
//                 insertModelName = "DailySourceOfferAdvertiserPublisherSummary";
//                 reportName = "DailyOffersSourceAdvertiserPublisherTimeZone";
//                 startTime = timeInterval.startTime.toDate();
//                 endTime = timeInterval.endTime.toDate();
//             } else if (time === "months") {
//                 fetchFromModel = DailySourceOfferAdvertiserPublisherSummaryModel;
//                 insertIntoModel = MonthlySourceOfferAdvertiserPublisherSummaryModel;
//                 insertModelName = "MonthlySourceOfferAdvertiserPublisherSummary";
//                 reportName = "MonthlyOffersSourceAdvertiserPublisherTimeZone";
//                 startTime = timeInterval.startTime._d;
//                 endTime = timeInterval.endTime._d;
//             }
//             if (startTime && endTime && network_id) {
//                 let cursor = await fetchFromModel.fetchDailySummaryUsingStream(
//                     {
//                         network_id: network_id,
//                         timeSlot: {
//                             $gte: startTime,
//                             $lt: endTime
//                         }
//                     },
//                     {
//                         source: "$source",
//                         publisher_id: "$publisher_id",
//                         advertiser_id: "$advertiser_id",
//                         offer_id: "$offer_id",
//                     }
//                 );

//                 let records_count = 0;
//                 let result_buffer = [];
//                 cursor.on("data", async function (doc) {
//                     records_count++;
//                     let summary = formatOffersSourceAdvAffByTimezoneDocument(doc, network_id, timeInterval, timezone);
//                     result_buffer.push(summary);
//                     if (result_buffer.length >= 1000) {
//                         let insert_docs = result_buffer;
//                         result_buffer = [];
//                         try {
//                             await insertIntoModel.insertManyDocs(insert_docs);
//                         } catch (err) {
//                             console.log(
//                                 "Err while inserting in " + insertModelName,
//                                 err.message
//                             );
//                         }
//                     }
//                 });

//                 cursor.on("end", async () => {
//                     try {
//                         await insertIntoModel.insertManyDocs(result_buffer);
//                         try {
//                             await logSummaryResult(
//                                 network_id,
//                                 records_count,
//                                 timeInterval,
//                                 reportName
//                             );
//                             resolve(true);
//                         } catch (err) {
//                             console.log("Err while saving logs in " + reportName, err.message);
//                             resolve(true);
//                         }
//                     } catch (err) {
//                         console.log(
//                             "Err while inserting in " + insertModelName,
//                             err.message
//                         );
//                     }
//                     result_buffer = [];
//                     // try {
//                     //     await logSummaryResult(
//                     //         network_id,
//                     //         records_count,
//                     //         timeInterval,
//                     //         reportName
//                     //     );
//                     //     resolve(true);
//                     // } catch (err) {
//                     //     console.log("Err while saving logs in " + reportName, err.message);
//                     //     resolve(true);
//                     // }
//                 });

//                 cursor.on("error", async () => {
//                     try {
//                         await insertIntoModel.insertManyDocs(result_buffer);
//                     } catch (err) {
//                         console.log(
//                             "Err while inserting in " + insertModelName,
//                             err.message
//                         );
//                     }
//                     result_buffer = [];
//                     // try {
//                     //     await logSummaryResult(
//                     //         network_id,
//                     //         records_count,
//                     //         timeInterval,
//                     //         reportName
//                     //     );
//                     //     resolve(true);
//                     // } catch (err) {
//                     //     console.log("Err while saving logs in " + reportName, err.message);
//                     //     resolve(true);
//                     // }
//                 });
//             }
//         } catch (err) {
//             console.log("error in insertOffersSourceAdvertiserPublisherByTimeZone", err);
//             reject(false);
//         }
//     });
// }
// async function insertOrUpdateOffersSourceAdvertiserPublisherByTimeZone(timeInterval, network_id, timezone, time) {
//     return new Promise(async (resolve, reject) => {
//         try {
//             let fetchFromModel;
//             let insertIntoModel;
//             let insertModelName = "";
//             let reportName = "";
//             let startTime;
//             let endTime;
//             if (time === "days") {
//                 fetchFromModel = OffersSourceAdvAffSummaryModel;
//                 insertIntoModel = DailySourceOfferAdvertiserPublisherSummaryModel;
//                 insertModelName = "DailySourceOfferAdvertiserPublisherSummary";
//                 reportName = "DailyOffersSourceAdvertiserPublisherTimeZone";
//                 startTime = timeInterval.startTime.toDate();
//                 endTime = timeInterval.endTime.toDate();
//             } else if (time === "months") {
//                 fetchFromModel = DailySourceOfferAdvertiserPublisherSummaryModel;
//                 insertIntoModel = MonthlySourceOfferAdvertiserPublisherSummaryModel;
//                 insertModelName = "MonthlySourceOfferAdvertiserPublisherSummary";
//                 reportName = "MonthlyOffersSourceAdvertiserPublisherTimeZone";
//                 startTime = timeInterval.startTime._d;
//                 endTime = timeInterval.endTime._d;
//             }
//             if (startTime && endTime && network_id) {
//                 let cursor = await fetchFromModel.fetchDailySummaryUsingStream(
//                     {
//                         network_id: network_id,
//                         timeSlot: {
//                             $gte: startTime,
//                             $lt: endTime
//                         }
//                     },
//                     {
//                         source: "$source",
//                         publisher_id: "$publisher_id",
//                         advertiser_id: "$advertiser_id",
//                         offer_id: "$offer_id",
//                     }
//                 );

//                 cursor.on("data", async function (doc) {
//                     let filter = {
//                         network_id: network_id,
//                         timeSlot: moment(timeInterval.startTime._d).toDate(),
//                         source: doc['source'],
//                         publisher_id: doc['publisher_id'],
//                         advertiser_id: doc['advertiser_id'],
//                         offer_id: doc['offer_id'],
//                         timezone: timezone
//                     };
//                     let reflect = {
//                         click: doc['click'],
//                         unique_click: doc['unique_click'],
//                         conversion: doc['conversion'],
//                         pre_conversion: doc['pre_conversion'],
//                         unique_conversion: doc['unique_conversion'],
//                         revenue: doc['revenue'],
//                         payout: doc['payout'],
//                         publisher_name: doc['publisher_name'],
//                         advertiser_name: doc['advertiser_name'],
//                         offer_name: doc['offer_name'],
//                     };

//                     try {
//                         await insertIntoModel.updateSlotDoc(filter, reflect);
//                     } catch (err) {
//                         console.log(
//                             "Err while updating in " + insertModelName,
//                             err.message
//                         );
//                     }
//                 });

//                 cursor.on("end", async () => {
//                     resolve(true);
//                 });

//                 cursor.on("error", async () => { });
//             }
//         } catch (err) {
//             console.log("error in insertOffersSourceAdvertiserPublisherByTimeZone", err);
//             reject(false);
//         }
//     });
// }
// async function insertSourceAdvertiserByTimeZone(timeInterval, network_id, timezone, time) {
//     return new Promise(async (resolve, reject) => {
//         try {
//             let fetchFromModel;
//             let insertIntoModel;
//             let insertModelName = "";
//             let reportName = "";
//             let startTime;
//             let endTime;
//             if (time === "days") {
//                 fetchFromModel = SourceAdvertiserSummaryModel;
//                 insertIntoModel = DailySourceAdvertiserSummaryModel;
//                 insertModelName = "DailySourceAdvertiserSummary";
//                 reportName = "DailySourceAdvertiserTimeZone";
//                 startTime = timeInterval.startTime.toDate();
//                 endTime = timeInterval.endTime.toDate();
//             } else if (time === "months") {
//                 fetchFromModel = DailySourceAdvertiserSummaryModel;
//                 insertIntoModel = MonthlySourceAdvertiserSummaryModel;
//                 insertModelName = "MonthlySourceAdvertiserSummary";
//                 reportName = "MonthlySourceAdvertiserTimeZone";
//                 startTime = timeInterval.startTime._d;
//                 endTime = timeInterval.endTime._d;
//             }
//             if (startTime && endTime && network_id) {
//                 let cursor = await fetchFromModel.fetchDailySummaryUsingStream(
//                     {
//                         network_id: network_id,
//                         timeSlot: {
//                             $gte: startTime,
//                             $lt: endTime
//                         }
//                     },
//                     {
//                         source: "$source",
//                         advertiser_id: "$advertiser_id"
//                     }
//                 );

//                 let records_count = 0;
//                 let result_buffer = [];
//                 cursor.on("data", async function (doc) {
//                     records_count++;
//                     let summary = formatSourceAdvByTimezoneDocument(doc, network_id, timeInterval, timezone);
//                     result_buffer.push(summary);
//                     if (result_buffer.length >= 1000) {
//                         let insert_docs = result_buffer;
//                         result_buffer = [];
//                         try {
//                             await insertIntoModel.insertManyDocs(insert_docs);
//                         } catch (err) {
//                             console.log(
//                                 "Err while inserting in " + insertModelName,
//                                 err.message
//                             );
//                         }
//                     }
//                 });

//                 cursor.on("end", async () => {
//                     try {
//                         await insertIntoModel.insertManyDocs(result_buffer);
//                         try {
//                             await logSummaryResult(
//                                 network_id,
//                                 records_count,
//                                 timeInterval,
//                                 reportName
//                             );
//                             resolve(true);
//                         } catch (err) {
//                             console.log("Err while saving logs in " + reportName, err.message);
//                             resolve(true);
//                         }
//                     } catch (err) {
//                         console.log(
//                             "Err while inserting in " + insertModelName,
//                             err.message
//                         );
//                     }
//                     result_buffer = [];
//                     // try {
//                     //     await logSummaryResult(
//                     //         network_id,
//                     //         records_count,
//                     //         timeInterval,
//                     //         reportName
//                     //     );
//                     //     resolve(true);
//                     // } catch (err) {
//                     //     console.log("Err while saving logs in " + reportName, err.message);
//                     //     resolve(true);
//                     // }
//                 });

//                 cursor.on("error", async () => {
//                     try {
//                         await insertIntoModel.insertManyDocs(result_buffer);
//                     } catch (err) {
//                         console.log(
//                             "Err while inserting in " + insertModelName,
//                             err.message
//                         );
//                     }
//                     result_buffer = [];
//                     // try {
//                     //     await logSummaryResult(
//                     //         network_id,
//                     //         records_count,
//                     //         timeInterval,
//                     //         reportName
//                     //     );
//                     //     resolve(true);
//                     // } catch (err) {
//                     //     console.log("Err while saving logs in " + reportName, err.message);
//                     //     resolve(true);
//                     // }
//                 });
//             }
//         } catch (err) {
//             console.log("error in insertSourceAdvertiserByTimeZone", err);
//             reject(false);
//         }
//     });
// }
// async function insertOrUpdateSourceAdvertiserByTimeZone(timeInterval, network_id, timezone, time) {
//     return new Promise(async (resolve, reject) => {
//         try {
//             let fetchFromModel;
//             let insertIntoModel;
//             let insertModelName = "";
//             let reportName = "";
//             let startTime;
//             let endTime;
//             if (time === "days") {
//                 fetchFromModel = SourceAdvertiserSummaryModel;
//                 insertIntoModel = DailySourceAdvertiserSummaryModel;
//                 insertModelName = "DailySourceAdvertiserSummary";
//                 reportName = "DailySourceAdvertiserTimeZone";
//                 startTime = timeInterval.startTime.toDate();
//                 endTime = timeInterval.endTime.toDate();
//             } else if (time === "months") {
//                 fetchFromModel = DailySourceAdvertiserSummaryModel;
//                 insertIntoModel = MonthlySourceAdvertiserSummaryModel;
//                 insertModelName = "MonthlySourceAdvertiserSummary";
//                 reportName = "MonthlySourceAdvertiserTimeZone";
//                 startTime = timeInterval.startTime._d;
//                 endTime = timeInterval.endTime._d;
//             }
//             if (startTime && endTime && network_id) {
//                 let cursor = await fetchFromModel.fetchDailySummaryUsingStream(
//                     {
//                         network_id: network_id,
//                         timeSlot: {
//                             $gte: startTime,
//                             $lt: endTime
//                         }
//                     },
//                     {
//                         source: "$source",
//                         advertiser_id: "$advertiser_id"
//                     }
//                 );

//                 cursor.on("data", async function (doc) {
//                     let filter = {
//                         network_id: network_id,
//                         timeSlot: moment(timeInterval.startTime._d).toDate(),
//                         source: doc['source'],
//                         advertiser_id: doc['advertiser_id'],
//                         timezone: timezone
//                     };
//                     let reflect = {
//                         click: doc['click'],
//                         unique_click: doc['unique_click'],
//                         conversion: doc['conversion'],
//                         pre_conversion: doc['pre_conversion'],
//                         unique_conversion: doc['unique_conversion'],
//                         revenue: doc['revenue'],
//                         payout: doc['payout'],
//                         advertiser_name: doc['advertiser_name'],
//                     };

//                     try {
//                         await insertIntoModel.updateSlotDoc(filter, reflect);
//                     } catch (err) {
//                         console.log(
//                             "Err while updating in " + insertModelName,
//                             err.message
//                         );
//                     }
//                 });

//                 cursor.on("end", async () => {
//                     resolve(true);
//                 });

//                 cursor.on("error", async () => { });
//             }
//         } catch (err) {
//             console.log("error in insertSourceAdvertiserByTimeZone", err);
//             reject(false);
//         }
//     });
// }
// async function insertSourcePublisherByTimeZone(timeInterval, network_id, timezone, time) {
//     return new Promise(async (resolve, reject) => {
//         try {
//             let fetchFromModel;
//             let insertIntoModel;
//             let insertModelName = "";
//             let reportName = "";
//             let startTime;
//             let endTime;
//             if (time === "days") {
//                 fetchFromModel = SourceAffiliateSummaryModel;
//                 insertIntoModel = DailySourcePublisherSummaryModel;
//                 insertModelName = "DailySourcePublisherSummary";
//                 reportName = "DailySourcePublisherTimeZone";
//                 startTime = timeInterval.startTime.toDate();
//                 endTime = timeInterval.endTime.toDate();
//             } else if (time === "months") {
//                 fetchFromModel = DailySourcePublisherSummaryModel;
//                 insertIntoModel = MonthlySourcePublisherSummaryModel;
//                 insertModelName = "MonthlySourcePublisherSummary";
//                 reportName = "MonthlySourcePublisherTimeZone";
//                 startTime = timeInterval.startTime._d;
//                 endTime = timeInterval.endTime._d;
//             }
//             if (startTime && endTime && network_id) {
//                 let cursor = await fetchFromModel.fetchDailySummaryUsingStream(
//                     {
//                         network_id: network_id,
//                         timeSlot: {
//                             $gte: startTime,
//                             $lt: endTime
//                         }
//                     },
//                     {
//                         source: "$source",
//                         publisher_id: "$publisher_id"
//                     }
//                 );

//                 let records_count = 0;
//                 let result_buffer = [];
//                 cursor.on("data", async function (doc) {
//                     records_count++;
//                     let summary = formatSourceAffByTimezoneDocument(doc, network_id, timeInterval, timezone);
//                     result_buffer.push(summary);
//                     if (result_buffer.length >= 1000) {
//                         let insert_docs = result_buffer;
//                         result_buffer = [];
//                         try {
//                             await insertIntoModel.insertManyDocs(insert_docs);
//                         } catch (err) {
//                             console.log(
//                                 "Err while inserting in " + insertModelName,
//                                 err.message
//                             );
//                         }
//                     }
//                 });

//                 cursor.on("end", async () => {
//                     try {
//                         await insertIntoModel.insertManyDocs(result_buffer);
//                         try {
//                             await logSummaryResult(
//                                 network_id,
//                                 records_count,
//                                 timeInterval,
//                                 reportName
//                             );
//                             resolve(true);
//                         } catch (err) {
//                             console.log("Err while saving logs in " + reportName, err.message);
//                             resolve(true);
//                         }
//                     } catch (err) {
//                         console.log(
//                             "Err while inserting in " + insertModelName,
//                             err.message
//                         );
//                     }
//                     result_buffer = [];
//                     // try {
//                     //     await logSummaryResult(
//                     //         network_id,
//                     //         records_count,
//                     //         timeInterval,
//                     //         reportName
//                     //     );
//                     //     resolve(true);
//                     // } catch (err) {
//                     //     console.log("Err while saving logs in " + reportName, err.message);
//                     //     resolve(true);
//                     // }
//                 });

//                 cursor.on("error", async () => {
//                     try {
//                         await insertIntoModel.insertManyDocs(result_buffer);
//                     } catch (err) {
//                         console.log(
//                             "Err while inserting in " + insertModelName,
//                             err.message
//                         );
//                     }
//                     result_buffer = [];
//                     // try {
//                     //     await logSummaryResult(
//                     //         network_id,
//                     //         records_count,
//                     //         timeInterval,
//                     //         reportName
//                     //     );
//                     //     resolve(true);
//                     // } catch (err) {
//                     //     console.log("Err while saving logs in " + reportName, err.message);
//                     //     resolve(true);
//                     // }
//                 });
//             }
//         } catch (err) {
//             console.log("error in insertSourcePublisherByTimeZone", err);
//             reject(false);
//         }
//     });
// }
// async function insertOrUpdateSourcePublisherByTimeZone(timeInterval, network_id, timezone, time) {
//     return new Promise(async (resolve, reject) => {
//         try {
//             let fetchFromModel;
//             let insertIntoModel;
//             let insertModelName = "";
//             let reportName = "";
//             let startTime;
//             let endTime;
//             if (time === "days") {
//                 fetchFromModel = SourceAffiliateSummaryModel;
//                 insertIntoModel = DailySourcePublisherSummaryModel;
//                 insertModelName = "DailySourcePublisherSummary";
//                 reportName = "DailySourcePublisherTimeZone";
//                 startTime = timeInterval.startTime.toDate();
//                 endTime = timeInterval.endTime.toDate();
//             } else if (time === "months") {
//                 fetchFromModel = DailySourcePublisherSummaryModel;
//                 insertIntoModel = MonthlySourcePublisherSummaryModel;
//                 insertModelName = "MonthlySourcePublisherSummary";
//                 reportName = "MonthlySourcePublisherTimeZone";
//                 startTime = timeInterval.startTime._d;
//                 endTime = timeInterval.endTime._d;
//             }
//             if (startTime && endTime && network_id) {
//                 let cursor = await fetchFromModel.fetchDailySummaryUsingStream(
//                     {
//                         network_id: network_id,
//                         timeSlot: {
//                             $gte: startTime,
//                             $lt: endTime
//                         }
//                     },
//                     {
//                         source: "$source",
//                         publisher_id: "$publisher_id"
//                     }
//                 );

//                 cursor.on("data", async function (doc) {
//                     let filter = {
//                         network_id: network_id,
//                         timeSlot: moment(timeInterval.startTime._d).toDate(),
//                         source: doc['source'],
//                         publisher_id: doc['publisher_id'],
//                         timezone: timezone
//                     };
//                     let reflect = {
//                         click: doc['click'],
//                         unique_click: doc['unique_click'],
//                         conversion: doc['conversion'],
//                         pre_conversion: doc['pre_conversion'],
//                         unique_conversion: doc['unique_conversion'],
//                         revenue: doc['revenue'],
//                         payout: doc['payout'],
//                         publisher_name: doc['publisher_name'],
//                     };

//                     try {
//                         await insertIntoModel.updateSlotDoc(filter, reflect);
//                     } catch (err) {
//                         console.log(
//                             "Err while updating in " + insertModelName,
//                             err.message
//                         );
//                     }
//                 });

//                 cursor.on("end", async () => {
//                     resolve(true);
//                 });

//                 cursor.on("error", async () => { });
//             }
//         } catch (err) {
//             console.log("error in insertSourcePublisherByTimeZone", err);
//             reject(false);
//         }
//     });
// }

/**
 * Conversion building functions
 */
// async function buildConversionSourceSummary(timeInterval, network_id) {
//     let conversionBuffer = [];
//     let insertCount = 0;
//     let actualInsert = 0;
//     let updateCount = 0;
//     try {
//         let convResult = await ConversionModel.fetchDailySummaryUsingStream({ network_id: network_id, createdAt: { $gte: timeInterval.startTime, $lt: timeInterval.endTime } }, { source: "$aff_source" });
//         for (let i = 0; i < convResult.length; i++) {
//             let doc = convResult[i];
//             // console.log(doc);
//             let aff_source = doc._id['source'] || 'unknown';
//             let click_data = await SourceSummaryModel.findSlotDoc({ network_id: network_id, timeSlot: timeInterval.startTime, source: aff_source });
//             if (click_data) {
//                 let reflect = {
//                     conversion: doc.conversion,
//                     unique_conversion: doc.conversion,
//                     revenue: doc.total_revenue,
//                     payout: doc.total_payout
//                 };
//                 try {
//                     await SourceSummaryModel.updateSlotDoc({ network_id: network_id, timeSlot: timeInterval.startTime, source: aff_source }, reflect);
//                     updateCount++;
//                 }
//                 catch (err) {
//                     console.log("error while updating doc in SourceSummary", err.message);
//                 }
//             }
//             else {
//                 let summary = formatConvDocument(doc, network_id, timeInterval);
//                 conversionBuffer.push(summary);
//                 insertCount++;
//                 if (conversionBuffer.length >= 1000) {
//                     let insert_docs = conversionBuffer;
//                     try {
//                         let res = await SourceSummaryModel.insertManyDocs(insert_docs);
//                         actualInsert = actualInsert + res.length;
//                     } catch (err) {
//                         console.log("error while inserting doc in SourceSummary", err.message);
//                     }
//                     conversionBuffer = [];
//                 }
//             }
//         }
//         try {
//             if (conversionBuffer.length) {
//                 let insert_docs = conversionBuffer;
//                 let res = await SourceSummaryModel.insertManyDocs(insert_docs);
//                 actualInsert = actualInsert + res.length;
//             }
//         } catch (err) {
//             console.log("error while inserting doc in SourceSummary", err.message);
//         }
//         // console.log("conversion doc inserted count : ", insertCount, "actual insert: ", actualInsert, "updated count: ", updateCount, timeInterval.startTime);
//     }
//     catch (e) {
//         console.log(e);
//         // return 0;
//     }
// }
async function buildConversionSourceAdvertiserSummary(timeInterval, network_id, nid) {
    let conversionBuffer = [];
    let insertCount = 0;
    let actualInsert = 0;
    let updateCount = 0;
    try {
        let convResult = await ConversionModel.fetchDailySummaryUsingStream({ network_id: network_id, createdAt: { $gte: timeInterval.startTime, $lt: timeInterval.endTime } }, { source: "$aff_source", advertiser_id: "$advertiser_id" });
        for (let i = 0; i < convResult.length; i++) {
            let doc = convResult[i];
            // console.log(doc);
            let aff_source = doc._id['source'] || 'unknown';
            let click_data = await SourceAdvertiserSummaryModel.findSlotDoc({ network_id: network_id, timeSlot: timeInterval.startTime, source: aff_source, advertiser_id: doc._id['advertiser_id'] });
            if (click_data) {
                let reflect = {
                    conversion: doc.conversion,
                    unique_conversion: doc.conversion,
                    publisher_conversion: doc.publisher_conversion,
                    publisher_payout: doc.publisher_payout,
                    revenue: doc.total_revenue,
                    hold_revenue: doc.total_hold_revenue,
                    payout: doc.total_payout
                };
                try {
                    await SourceAdvertiserSummaryModel.updateSlotDoc({ network_id: network_id, timeSlot: timeInterval.startTime, source: aff_source, advertiser_id: doc._id['advertiser_id'] }, reflect);
                    updateCount++;
                }
                catch (err) {
                    console.log("error while updating doc in SourceAdvertiserSummary", err.message);
                }
            }
            else {
                let summary = formatConvDocument(doc, network_id, timeInterval, nid);
                conversionBuffer.push(summary);
                insertCount++;
                if (conversionBuffer.length >= 1000) {
                    let insert_docs = conversionBuffer;
                    try {
                        let res = await SourceAdvertiserSummaryModel.insertManyDocs(insert_docs);
                        actualInsert = actualInsert + res.length;
                    } catch (err) {
                        console.log("error while inserting doc in SourceAdvertiserSummary", err.message);
                    }
                    conversionBuffer = [];
                }
            }
        }
        try {
            if (conversionBuffer.length) {
                let insert_docs = conversionBuffer;
                let res = await SourceAdvertiserSummaryModel.insertManyDocs(insert_docs);
                actualInsert = actualInsert + res.length;
            }
        } catch (err) {
            console.log("error while inserting doc in SourceAdvertiserSummary", err.message);
        }
        // console.log("conversion doc inserted count : ", insertCount, "actual insert: ", actualInsert, "updated count: ", updateCount, timeInterval.startTime);
    }
    catch (e) {
        console.log(e);
        // return 0;
    }
}
async function buildConversionSourceAffiliateSummary(timeInterval, network_id, nid) {
    let conversionBuffer = [];
    let insertCount = 0;
    let actualInsert = 0;
    let updateCount = 0;
    try {
        let convResult = await ConversionModel.fetchDailySummaryUsingStream({ network_id: network_id, createdAt: { $gte: timeInterval.startTime, $lt: timeInterval.endTime } }, { source: "$aff_source", publisher_id: "$publisher_id" });
        for (let i = 0; i < convResult.length; i++) {
            let doc = convResult[i];
            // console.log(doc);
            let aff_source = doc._id['source'] || 'unknown';
            let click_data = await SourceAffiliateSummaryModel.findSlotDoc({ network_id: network_id, timeSlot: timeInterval.startTime, source: aff_source, publisher_id: doc._id['publisher_id'] });
            if (click_data) {
                let reflect = {
                    conversion: doc.conversion,
                    unique_conversion: doc.conversion,
                    publisher_conversion: doc.publisher_conversion,
                    publisher_payout: doc.publisher_payout,
                    revenue: doc.total_revenue,
                    hold_revenue: doc.total_hold_revenue,
                    payout: doc.total_payout
                };
                try {
                    await SourceAffiliateSummaryModel.updateSlotDoc({ network_id: network_id, timeSlot: timeInterval.startTime, source: aff_source, publisher_id: doc._id['publisher_id'] }, reflect);
                    updateCount++;
                }
                catch (err) {
                    console.log("error while updating doc in SourceAffiliateSummary", err.message);
                }
            }
            else {
                let summary = formatConvDocument(doc, network_id, timeInterval, nid);
                conversionBuffer.push(summary);
                insertCount++;
                if (conversionBuffer.length >= 1000) {
                    let insert_docs = conversionBuffer;
                    try {
                        let res = await SourceAffiliateSummaryModel.insertManyDocs(insert_docs);
                        actualInsert = actualInsert + res.length;
                    } catch (err) {
                        console.log("error while inserting doc in SourceAffiliateSummary", err.message);
                    }
                    conversionBuffer = [];
                }
            }
        }
        try {
            if (conversionBuffer.length) {
                let insert_docs = conversionBuffer;
                let res = await SourceAffiliateSummaryModel.insertManyDocs(insert_docs);
                actualInsert = actualInsert + res.length;
            }
        } catch (err) {
            console.log("error while inserting doc in SourceAffiliateSummary", err.message);
        }
        // console.log("conversion doc inserted count : ", insertCount, "actual insert: ", actualInsert, "updated count: ", updateCount, timeInterval.startTime);
    }
    catch (e) {
        console.log(e);
        // return 0;
    }
}
async function buildConversionSourceAdvertiserAffiliateSummary(timeInterval, network_id, nid) {
    let conversionBuffer = [];
    let insertCount = 0;
    let actualInsert = 0;
    let updateCount = 0;
    try {
        let convResult = await ConversionModel.fetchDailySummaryUsingStream({ network_id: network_id, createdAt: { $gte: timeInterval.startTime, $lt: timeInterval.endTime } }, { source: "$aff_source", advertiser_id: "$advertiser_id", publisher_id: "$publisher_id" });
        for (let i = 0; i < convResult.length; i++) {
            let doc = convResult[i];
            // console.log(doc);
            let aff_source = doc._id['source'] || 'unknown';
            let click_data = await SourceAdvertiserAffiliateSummaryModel.findSlotDoc({ network_id: network_id, timeSlot: timeInterval.startTime, source: aff_source, advertiser_id: doc._id['advertiser_id'], publisher_id: doc._id['publisher_id'] });
            if (click_data) {
                let reflect = {
                    conversion: doc.conversion,
                    unique_conversion: doc.conversion,
                    publisher_conversion: doc.publisher_conversion,
                    publisher_payout: doc.publisher_payout,
                    revenue: doc.total_revenue,
                    hold_revenue: doc.total_hold_revenue,
                    payout: doc.total_payout
                };
                try {
                    await SourceAdvertiserAffiliateSummaryModel.updateSlotDoc({ network_id: network_id, timeSlot: timeInterval.startTime, source: aff_source, advertiser_id: doc._id['advertiser_id'], publisher_id: doc._id['publisher_id'] }, reflect);
                    updateCount++;
                }
                catch (err) {
                    console.log("error while updating doc in SourceAdvertiserAffiliateSummary", err.message);
                }
            }
            else {
                let summary = formatConvDocument(doc, network_id, timeInterval, nid);
                conversionBuffer.push(summary);
                insertCount++;
                if (conversionBuffer.length >= 1000) {
                    let insert_docs = conversionBuffer;
                    try {
                        let res = await SourceAdvertiserAffiliateSummaryModel.insertManyDocs(insert_docs);
                        actualInsert = actualInsert + res.length;
                    } catch (err) {
                        console.log("error while inserting doc in SourceAdvertiserAffiliateSummary", err.message);
                    }
                    conversionBuffer = [];
                }
            }
        }
        try {
            if (conversionBuffer.length) {
                let insert_docs = conversionBuffer;
                let res = await SourceAdvertiserAffiliateSummaryModel.insertManyDocs(insert_docs);
                actualInsert = actualInsert + res.length;
            }
        } catch (err) {
            console.log("error while inserting doc in SourceAdvertiserAffiliateSummary", err.message);
        }
        // console.log("conversion doc inserted count : ", insertCount, "actual insert: ", actualInsert, "updated count: ", updateCount, timeInterval.startTime);
    }
    catch (e) {
        console.log(e);
        // return 0;
    }
}
async function buildConversionOffersSourceAdvAffSummary(timeInterval, network_id, nid) {
    let conversionBuffer = [];
    let insertCount = 0;
    let actualInsert = 0;
    let updateCount = 0;
    try {
        let convResult = await ConversionModel.fetchDailySummaryUsingStream({ network_id: network_id, createdAt: { $gte: timeInterval.startTime, $lt: timeInterval.endTime } }, { offer_id: "$offer_id", source: "$aff_source", advertiser_id: "$advertiser_id", publisher_id: "$publisher_id" });
        for (let i = 0; i < convResult.length; i++) {
            let doc = convResult[i];
            // console.log(doc);
            let aff_source = doc._id['source'] || 'unknown';
            let click_data = await OffersSourceAdvAffSummaryModel.findSlotDoc({ network_id: network_id, timeSlot: timeInterval.startTime, offer_id: doc._id['offer_id'], advertiser_id: doc._id['advertiser_id'], publisher_id: doc._id['publisher_id'], source: aff_source });
            if (click_data) {
                let reflect = {
                    conversion: doc.conversion,
                    publisher_conversion: doc.publisher_conversion,
                    unique_conversion: doc.conversion,
                    revenue: doc.total_revenue,
                    hold_revenue: doc.total_hold_revenue,
                    payout: doc.total_payout,
                    publisher_payout: doc.publisher_payout,
                    advertiser_offer_id: doc.advertiser_offer_id
                };
                try {
                    await OffersSourceAdvAffSummaryModel.updateSlotDoc({ network_id: network_id, timeSlot: timeInterval.startTime, offer_id: doc._id['offer_id'], advertiser_id: doc._id['advertiser_id'], publisher_id: doc._id['publisher_id'], source: aff_source }, reflect);
                    updateCount++;
                }
                catch (err) {
                    console.log("error while updating Conversion in OffersSourceAdvAffSummary", err.message);
                }
            }
            else {
                let summary = formatConvDocument(doc, network_id, timeInterval, nid);

                try {
                    await OffersSourceAdvAffSummaryModel.updateSlotDoc({ network_id: network_id, timeSlot: timeInterval.startTime, offer_id: doc._id['offer_id'], advertiser_id: doc._id['advertiser_id'], publisher_id: doc._id['publisher_id'], source: aff_source }, summary);
                } catch (err) {
                    console.log("error while updating Conversionelsecatch in OffersSourceAdvAffSummary", err.message);
                }
                // conversionBuffer.push(summary);
                insertCount++;
                // if (conversionBuffer.length >= 1000) {
                //     let insert_docs = conversionBuffer;
                //     try {
                //         let res = await OffersSourceAdvAffSummaryModel.insertManyDocs(insert_docs);
                //         actualInsert = actualInsert + res.length;
                //     } catch (err) {
                //         console.log("error while inserting Conversionelse in OffersSourceAdvAffSummary",err.message);
                //     }
                //     conversionBuffer = [];
                // }
            }
        }
        // try {
        //     if (conversionBuffer.length) {
        //         let insert_docs = conversionBuffer;
        //         let res = await OffersSourceAdvAffSummaryModel.insertManyDocs(insert_docs);
        //         actualInsert = actualInsert + res.length;
        //     }

        // } catch (err) {
        //     console.log("error while inserting Conversioncatch in OffersSourceAdvAffSummary",err.message);
        // }
        // console.log("conversion doc inserted count : ", insertCount, "actual insert: ", actualInsert, "updated count: ", updateCount, timeInterval.startTime);
    }
    catch (e) {
        console.log(e);
        // return 0;
    }
}
async function buildConversionAdvSummary(timeInterval, network_id, nid) {
    let conversionBuffer = [];
    let insertCount = 0;
    let actualInsert = 0;
    let updateCount = 0;
    try {
        let convResult = await ConversionModel.fetchDailySummaryUsingStream({ network_id: network_id, createdAt: { $gte: timeInterval.startTime, $lt: timeInterval.endTime } }, { advertiser_id: "$advertiser_id" });
        for (let i = 0; i < convResult.length; i++) {
            let doc = convResult[i];
            // console.log(doc);
            let click_data = await AdvertiserSummaryModel.findSlotDoc({ network_id: network_id, timeSlot: timeInterval.startTime, advertiser_id: doc._id['advertiser_id'] });
            if (click_data) {
                let reflect = {
                    conversion: doc.conversion,
                    unique_conversion: doc.conversion,
                    publisher_conversion: doc.publisher_conversion,
                    publisher_payout: doc.publisher_payout,
                    revenue: doc.total_revenue,
                    hold_revenue: doc.total_hold_revenue,
                    payout: doc.total_payout
                };
                try {
                    await AdvertiserSummaryModel.updateSlotDoc({ network_id: network_id, timeSlot: timeInterval.startTime, advertiser_id: doc._id['advertiser_id'] }, reflect);
                    updateCount++;
                }
                catch (err) {
                    console.log("error while updating doc in AdvertiserSummary", err.message);
                }
            }
            else {
                let summary = formatAdvConvDocument(doc, network_id, timeInterval, nid);
                conversionBuffer.push(summary);
                insertCount++;
                if (conversionBuffer.length >= 1000) {
                    let insert_docs = conversionBuffer;
                    try {
                        let res = await AdvertiserSummaryModel.insertManyDocs(insert_docs);
                        actualInsert = actualInsert + res.length;
                    } catch (err) {
                        console.log("error while inserting doc in AdvertiserSummary", err.message);
                    }
                    conversionBuffer = [];
                }
            }
        }
        try {
            if (conversionBuffer.length) {
                let insert_docs = conversionBuffer;
                let res = await AdvertiserSummaryModel.insertManyDocs(insert_docs);
                actualInsert = actualInsert + res.length;
            }
        } catch (err) {
            console.log("error while inserting doc in AdvertiserSummary", err.message);
        }
        // console.log("conversion doc inserted count : ", insertCount, "actual insert: ", actualInsert, "updated count: ", updateCount, timeInterval.startTime);
    }
    catch (e) {
        console.log(e);
        // return 0;
    }
}
async function buildConversionDailySummary(timeInterval, network_id, nid) {
    let conversionBuffer = [];
    let insertCount = 0;
    let actualInsert = 0;
    let updateCount = 0;
    try {
        let convResult = await ConversionModel.fetchDailySummaryUsingStream({ network_id: network_id, createdAt: { $gte: timeInterval.startTime, $lt: timeInterval.endTime } }, {});
        for (let i = 0; i < convResult.length; i++) {
            let doc = convResult[i];
            // console.log(doc);
            let click_data = await DailySummaryModel.findSlotDoc({ network_id: network_id, timeSlot: timeInterval.startTime });
            if (click_data) {
                let reflect = {
                    conversion: doc.conversion,
                    publisher_conversion: doc.publisher_conversion,
                    publisher_payout: doc.publisher_payout,
                    unique_conversion: doc.conversion,
                    revenue: doc.total_revenue,
                    hold_revenue: doc.total_hold_revenue,
                    payout: doc.total_payout
                };
                try {
                    await DailySummaryModel.updateSlotDoc({ network_id: network_id, timeSlot: timeInterval.startTime }, reflect);
                    updateCount++;
                }
                catch (err) {
                    console.log("error while updating doc in DailySummary", err.message);
                }
            }
            else {
                let summary = formatDailyConvDocument(doc, network_id, timeInterval, nid);
                conversionBuffer.push(summary);
                insertCount++;
                if (conversionBuffer.length >= 1000) {
                    let insert_docs = conversionBuffer;
                    try {
                        let res = await DailySummaryModel.insertManyDocs(insert_docs);
                        actualInsert = actualInsert + res.length;
                    } catch (err) {
                        console.log("error while inserting doc in DailySummary", err.message);
                    }
                    conversionBuffer = [];
                }
            }
        }
        try {
            if (conversionBuffer.length) {
                let insert_docs = conversionBuffer;
                let res = await DailySummaryModel.insertManyDocs(insert_docs);
                actualInsert = actualInsert + res.length;
            }
        } catch (err) {
            console.log("error while inserting doc in DailySummary", err.message);
        }
        // console.log("conversion doc inserted count : ", insertCount, "actual insert: ", actualInsert, "updated count: ", updateCount, timeInterval.startTime);
    }
    catch (e) {
        console.log(e);
        // return 0;
    }
}
async function buildConversionPubSummary(timeInterval, network_id, nid) {
    let conversionBuffer = [];
    let insertCount = 0;
    let actualInsert = 0;
    let updateCount = 0;
    try {
        let convResult = await ConversionModel.fetchDailySummaryUsingStream({ network_id: network_id, createdAt: { $gte: timeInterval.startTime, $lt: timeInterval.endTime } }, { publisher_id: "$publisher_id" });
        for (let i = 0; i < convResult.length; i++) {
            let doc = convResult[i];
            // console.log(doc);
            let click_data = await PublisherSummaryModel.findSlotDoc({ network_id: network_id, timeSlot: timeInterval.startTime, publisher_id: doc._id['publisher_id'] });
            if (click_data) {
                let reflect = {
                    conversion: doc.conversion,
                    publisher_conversion: doc.publisher_conversion,
                    publisher_payout: doc.publisher_payout,
                    unique_conversion: doc.conversion,
                    revenue: doc.total_revenue,
                    hold_revenue: doc.total_hold_revenue,
                    payout: doc.total_payout
                };
                try {
                    await PublisherSummaryModel.updateSlotDoc({ network_id: network_id, timeSlot: timeInterval.startTime, publisher_id: doc._id['publisher_id'] }, reflect);
                    updateCount++;
                }
                catch (err) {
                    console.log("error while updating doc in PublisherSummary", err.message);
                }
            }
            else {
                let summary = formatPubConvDocument(doc, network_id, timeInterval, nid);
                conversionBuffer.push(summary);
                insertCount++;
                if (conversionBuffer.length >= 1000) {
                    let insert_docs = conversionBuffer;
                    try {
                        let res = await PublisherSummaryModel.insertManyDocs(insert_docs);
                        actualInsert = actualInsert + res.length;
                    } catch (err) {
                        console.log("error while inserting doc in PublisherSummary", err.message);
                    }
                    conversionBuffer = [];
                }
            }
        }
        try {
            if (conversionBuffer.length) {
                let insert_docs = conversionBuffer;
                let res = await PublisherSummaryModel.insertManyDocs(insert_docs);
                actualInsert = actualInsert + res.length;
            }
        } catch (err) {
            console.log("error while inserting doc in PublisherSummary", err.message);
        }
        // console.log("conversion doc inserted count : ", insertCount, "actual insert: ", actualInsert, "updated count: ", updateCount, timeInterval.startTime);
    }
    catch (e) {
        console.log(e);
        // return 0;
    }
}
async function buildConversionSourceOfferPublisherSummary(timeInterval, network_id, nid) {
    let conversionBuffer = [];
    let insertCount = 0;
    let actualInsert = 0;
    let updateCount = 0;
    try {
        let convResult = await ConversionModel.fetchDailySummaryUsingStream({ network_id: network_id, createdAt: { $gte: timeInterval.startTime, $lt: timeInterval.endTime }, publisher_conversion: 1 }, { offer_id: "$offer_id", source: "$aff_source", publisher_id: "$publisher_id" });
        for (let i = 0; i < convResult.length; i++) {
            let doc = convResult[i];
            // console.log(doc);
            let aff_source = doc._id['source'] || 'unknown';
            let click_data = await SourceOfferPublisherSummaryModel.findSlotDoc({ network_id: network_id, timeSlot: timeInterval.startTime, source: aff_source, offer_id: doc._id['offer_id'], publisher_id: doc._id['publisher_id'] });
            if (click_data) {
                let reflect = {
                    conversion: doc.conversion,
                    publisher_conversion: doc.publisher_conversion,
                    publisher_payout: doc.publisher_payout,
                    unique_conversion: doc.conversion,
                    revenue: doc.total_revenue,
                    hold_revenue: doc.total_hold_revenue,
                    payout: doc.total_payout,
                    advertiser_offer_id: doc.advertiser_offer_id
                };
                try {
                    await SourceOfferPublisherSummaryModel.updateSlotDoc({ network_id: network_id, timeSlot: timeInterval.startTime, source: aff_source, offer_id: doc._id['offer_id'], publisher_id: doc._id['publisher_id'] }, reflect);
                    updateCount++;
                }
                catch (err) {
                    console.log("error while updating doc in SourceOfferPublisherSummary", err.message);
                }
            }
            else {
                let summary = formatSourceOfferPublisherConversionDocument(doc, network_id, timeInterval, nid);
                conversionBuffer.push(summary);
                insertCount++;
                if (conversionBuffer.length >= 1000) {
                    let insert_docs = conversionBuffer;
                    try {
                        let res = await SourceOfferPublisherSummaryModel.insertManyDocs(insert_docs);
                        actualInsert = actualInsert + res.length;
                    } catch (err) {
                        console.log("error while inserting doc in SourceOfferPublisherSummary", err.message);
                    }
                    conversionBuffer = [];
                }
            }
        }
        try {
            if (conversionBuffer.length) {
                let insert_docs = conversionBuffer;
                let res = await SourceOfferPublisherSummaryModel.insertManyDocs(insert_docs);
                actualInsert = actualInsert + res.length;
            }
        } catch (err) {
            console.log("error while inserting doc in SourceOfferPublisherSummaryModel", err.message);
        }
        // console.log("conversion doc inserted count : ", insertCount, "actual insert: ", actualInsert, "updated count: ", updateCount, timeInterval.startTime);
    }
    catch (e) {
        console.log(e);
        // return 0;
    }
}
async function buildConversionAppSummary(timeInterval, network_id, nid) {
    let conversionBuffer = [];
    let insertCount = 0;
    let actualInsert = 0;
    let updateCount = 0;
    try {
        let convResult = await ConversionModel.fetchDailySummaryUsingStream({ network_id: network_id, createdAt: { $gte: timeInterval.startTime, $lt: timeInterval.endTime } }, { app_id: "$app_id" });
        for (let i = 0; i < convResult.length; i++) {
            let doc = convResult[i];
            // console.log(doc);
            let click_data = await AppSummaryModel.findSlotDoc({ network_id: network_id, timeSlot: timeInterval.startTime, app_id: doc._id['app_id'] });
            if (click_data) {
                let reflect = {
                    conversion: doc.conversion,
                    publisher_conversion: doc.publisher_conversion,
                    publisher_payout: doc.publisher_payout,
                    unique_conversion: doc.conversion,
                    revenue: doc.total_revenue,
                    hold_revenue: doc.total_hold_revenue,
                    payout: doc.total_payout
                };
                try {
                    await AppSummaryModel.updateSlotDoc({ network_id: network_id, timeSlot: timeInterval.startTime, app_id: doc._id['app_id'] }, reflect);
                    updateCount++;
                }
                catch (err) {
                    console.log("error while updating doc in AppSummary", err.message);
                }
            }
            else {
                let summary = formatAppConvDocument(doc, network_id, timeInterval, nid);
                conversionBuffer.push(summary);
                insertCount++;
                if (conversionBuffer.length >= 1000) {
                    let insert_docs = conversionBuffer;
                    try {
                        let res = await AppSummaryModel.insertManyDocs(insert_docs);
                        actualInsert = actualInsert + res.length;
                    } catch (err) {
                        console.log("error while inserting doc in AppSummary", err.message);
                    }
                    conversionBuffer = [];
                }
            }
        }
        try {
            if (conversionBuffer.length) {
                let insert_docs = conversionBuffer;
                let res = await AppSummaryModel.insertManyDocs(insert_docs);
                actualInsert = actualInsert + res.length;
            }
        } catch (err) {
            console.log("error while inserting doc in AppSummary", err.message);
        }
        // console.log("conversion doc inserted count : ", insertCount, "actual insert: ", actualInsert, "updated count: ", updateCount, timeInterval.startTime);
    }
    catch (e) {
        console.log(e);
        // return 0;
    }
}
async function buildConversionAppidPublisherSummary(timeInterval, network_id, nid) {
    let conversionBuffer = [];
    let insertCount = 0;
    let actualInsert = 0;
    let updateCount = 0;
    try {
        let convResult = await ConversionModel.fetchDailySummaryUsingStream({ network_id: network_id, createdAt: { $gte: timeInterval.startTime, $lt: timeInterval.endTime } }, { app_id: "$app_id", publisher_id: "$publisher_id" });
        for (let i = 0; i < convResult.length; i++) {
            let doc = convResult[i];
            // console.log(doc);
            let click_data = await AppidPublisherSummaryModel.findSlotDoc({ network_id: network_id, timeSlot: timeInterval.startTime, app_id: doc._id['app_id'], publisher_id: doc._id['publisher_id'] });
            if (click_data) {
                let reflect = {
                    conversion: doc.conversion,
                    unique_conversion: doc.conversion,
                    publisher_conversion: doc.publisher_conversion,
                    publisher_payout: doc.publisher_payout,
                    revenue: doc.total_revenue,
                    hold_revenue: doc.total_hold_revenue,
                    payout: doc.total_payout
                };
                try {
                    await AppidPublisherSummaryModel.updateSlotDoc({ network_id: network_id, timeSlot: timeInterval.startTime, app_id: doc._id['app_id'], publisher_id: doc._id['publisher_id'] }, reflect);
                    updateCount++;
                }
                catch (err) {
                    console.log("error while updating doc in AppidPublisherSummary", err.message);
                }
            }
            else {
                let summary = formatAppidPublisherConvDocument(doc, network_id, timeInterval, nid);
                conversionBuffer.push(summary);
                insertCount++;
                if (conversionBuffer.length >= 1000) {
                    let insert_docs = conversionBuffer;
                    try {
                        let res = await AppidPublisherSummaryModel.insertManyDocs(insert_docs);
                        actualInsert = actualInsert + res.length;
                    } catch (err) {
                        console.log("error while inserting doc in AppidPublisherSummary", err.message);
                    }
                    conversionBuffer = [];
                }
            }
        }
        try {
            if (conversionBuffer.length) {
                let insert_docs = conversionBuffer;
                let res = await AppidPublisherSummaryModel.insertManyDocs(insert_docs);
                actualInsert = actualInsert + res.length;
            }
        } catch (err) {
            console.log("error while inserting doc in AppidPublisherSummary", err.message);
        }
        // console.log("conversion doc inserted count : ", insertCount, "actual insert: ", actualInsert, "updated count: ", updateCount, timeInterval.startTime);
    }
    catch (e) {
        console.log(e);
        // return 0;
    }
}

/**
 * Fomatter for functions
 */
// function formatSourceDocument(obj, network_id, timeInterval) {
//     let timeSlot = moment(timeInterval.startTime).toDate();

//     let temp = {
//         network_id: network_id,
//         source: obj._id["source"] || 'unknown',
//         click: obj.count,
//         unique_click: obj.count,
//         conversion: 0,
//         unique_conversion: 0,
//         revenue: 0,
//         payout: 0,
//         timeSlot: timeSlot,
//         pre_conversion: obj.pre_conversion,
//     };
//     return temp;
// }
function formatSourceAdvDocument(obj, network_id, timeInterval, nid) {
    let timeSlot = moment(timeInterval.startTime).toDate();

    let temp = {
        network_id: network_id,
        network_id: nid || obj.nid,
        source: obj._id["source"] || 'unknown',
        click: obj.count,
        unique_click: obj.count,
        conversion: 0,
        publisher_conversion: 0,
        publisher_payout: 0,
        unique_conversion: 0,
        revenue: 0,
        hold_revenue: 0,
        payout: 0,
        timeSlot: timeSlot,
        advertiser_name: obj.advertiser_name,
        advertiser_id: obj._id["advertiser_id"],
        aid: obj._id["aid"] || obj.aid,
        pre_conversion: obj.pre_conversion,
    };
    return temp;
}
function formatSourceAdvAffDocument(obj, network_id, timeInterval, nid) {
    let timeSlot = moment(timeInterval.startTime).toDate();

    let temp = {
        network_id: network_id,
        nid: obj.nid || nid,
        source: obj._id["source"] || 'unknown',
        click: obj.count,
        unique_click: obj.count,
        conversion: 0,
        publisher_conversion: 0,
        publisher_payout: 0,
        unique_conversion: 0,
        revenue: 0,
        hold_revenue: 0,
        payout: 0,
        timeSlot: timeSlot,
        publisher_id: obj._id["publisher_id"],
        pid: obj._id["pid"] || obj.pid || obj._id["publisher_id"],
        publisher_name: obj.publisher_name,
        advertiser_name: obj.advertiser_name,
        advertiser_id: obj._id["advertiser_id"],
        aid: obj._id["aid"] || obj.aid,
        pre_conversion: obj.pre_conversion,
    };

    return temp;
}
function formatAffiliateDocument(obj, network_id, timeInterval, nid) {
    let timeSlot = moment(timeInterval.startTime).toDate();

    let temp = {
        network_id: network_id,
        nid: nid || doc.nid,
        source: obj._id["source"] || 'unknown',
        click: obj.count,
        unique_click: obj.count,
        conversion: 0,
        publisher_conversion: 0,
        publisher_payout: 0,
        unique_conversion: 0,
        revenue: 0,
        hold_revenue: 0,
        payout: 0,
        timeSlot: timeSlot,
        publisher_id: obj._id["publisher_id"],
        pid: obj._id["pid"] || obj.pid || obj._id["publisher_id"],
        publisher_name: obj.publisher_name,
        pre_conversion: obj.pre_conversion,
    };

    return temp;
}
function formatOffersSourceAdvAffDocument(obj, network_id, timeInterval, nid) {
    let timeSlot = moment(timeInterval.startTime).toDate();

    let temp = {
        network_id: network_id,
        nid: obj.nid || nid,
        source: obj._id["source"] || 'unknown',
        click: obj.count,
        unique_click: obj.count,
        conversion: 0,
        publisher_conversion: 0,
        publisher_payout: 0,
        unique_conversion: 0,
        revenue: 0,
        hold_revenue: 0,
        payout: 0,
        timeSlot: timeSlot,
        publisher_id: obj._id["publisher_id"],
        pid: obj._id["pid"] || obj.pid || obj._id["publisher_id"],
        publisher_name: obj.publisher_name,
        advertiser_name: obj.advertiser_name,
        advertiser_offer_id: obj.advertiser_offer_id,
        advertiser_id: obj._id["advertiser_id"],
        aid: obj._id["aid"] || obj.aid,
        offer_name: obj.offer_name,
        offer_id: obj._id["offer_id"],
        pre_conversion: obj.pre_conversion,
        currency: obj.currency
    };

    return temp;
}
function formatConvDocument(obj, network_id, timeInterval, nid) {
    let timeSlot = moment(timeInterval.startTime).toDate();
    let temp = {
        network_id: network_id,
        nid: nid,
        source: obj._id["source"] || 'unknown',
        click: 0,
        unique_click: 0,
        conversion: obj.conversion,
        unique_conversion: obj.conversion,
        revenue: parseFloat(obj.total_revenue),
        payout: parseFloat(obj.total_payout),
        timeSlot: timeSlot,
    };

    if (obj.publisher_conversion) {
        temp['publisher_conversion'] = obj.publisher_conversion;
    }

    if (obj.total_hold_revenue) {
        temp['hold_revenue'] = parseFloat(obj.total_hold_revenue);
    }

    if (obj.publisher_payout) {
        temp['publisher_payout'] = obj.publisher_payout;
    }

    if (obj.offer_name || obj.offer_name == '') {
        temp["offer_name"] = obj.offer_name;
    }

    if (obj.advertiser_name || obj.advertiser_name == '') {
        temp["advertiser_name"] = obj.advertiser_name;
    }

    if (obj.publisher_name || obj.publisher_name == '') {
        temp["publisher_name"] = obj.publisher_name;
    }

    if (obj._id["publisher_id"]) {
        temp["publisher_id"] = obj._id["publisher_id"];
    }

    if (obj.pid || obj._id["pid"]) {
        temp["pid"] = obj.pid || obj._id['pid'];
    }

    if (obj._id["advertiser_id"]) {
        temp["advertiser_id"] = obj._id["advertiser_id"];
    }

    if (obj.aid || obj._id["aid"]) {
        temp["aid"] = obj.aid || obj._id['aid'];
    }

    if (obj.advertiser_offer_id) {
        temp["advertiser_offer_id"] = obj.advertiser_offer_id;
    }
    if (obj._id["offer_id"]) {
        temp["offer_id"] = obj._id["offer_id"];
    }
    return temp;
}
function formatAdvDocument(obj, network_id, timeInterval, nid) {
    let timeSlot = moment(timeInterval.startTime).toDate();

    let temp = {
        network_id: network_id,
        nid: obj.nid || nid,
        click: obj.count,
        unique_click: obj.count,
        conversion: 0,
        publisher_conversion: 0,
        publisher_payout: 0,
        unique_conversion: 0,
        revenue: 0,
        hold_revenue: 0,
        payout: 0,
        advertiser_name: obj.advertiser_name,
        advertiser_id: obj._id["advertiser_id"],
        aid: obj._id["aid"] || obj.aid,
        timeSlot: timeSlot,
        pre_conversion: obj.pre_conversion,
    };
    return temp;
}
function formatPubDocument(obj, network_id, timeInterval, nid) {
    let timeSlot = moment(timeInterval.startTime).toDate();

    let temp = {
        network_id: network_id,
        nid: obj.nid || nid,
        click: obj.count,
        unique_click: obj.count,
        conversion: 0,
        publisher_conversion: 0,
        publisher_payout: 0,
        unique_conversion: 0,
        revenue: 0,
        hold_revenue: 0,
        payout: 0,
        publisher_name: obj.publisher_name,
        publisher_id: obj._id["publisher_id"],
        pid: obj._id["pid"] || obj.pid || obj._id["publisher_id"],
        timeSlot: timeSlot,
        pre_conversion: obj.pre_conversion,
    };
    return temp;
}
function formatSourceOfferPublisherDocument(obj, network_id, timeInterval, nid) {
    let timeSlot = moment(timeInterval.startTime).toDate();
    let temp = {
        network_id: network_id,
        nid: obj.nid || nid,
        source: obj._id["source"] || 'unknown',
        click: obj.count,
        unique_click: obj.count,
        conversion: 0,
        publisher_conversion: 0,
        publisher_payout: 0,
        unique_conversion: 0,
        revenue: 0,
        hold_revenue: 0,
        payout: 0,
        timeSlot: timeSlot,
        publisher_id: obj._id["publisher_id"],
        pid: obj._id["pid"] || obj.pid || obj._id["publisher_id"],
        publisher_name: obj.publisher_name,
        offer_name: obj.offer_name,
        advertiser_offer_id: obj.advertiser_offer_id,
        offer_id: obj._id["offer_id"],
        pre_conversion: obj.pre_conversion,
        currency: obj.currency,
    };
    return temp;
}
function formatAppDocument(obj, network_id, timeInterval, nid) {
    let timeSlot = moment(timeInterval.startTime).toDate();

    let temp = {
        network_id: network_id,
        nid: obj.nid || nid,
        click: obj.count,
        unique_click: obj.count,
        conversion: 0,
        publisher_conversion: 0,
        publisher_payout: 0,
        unique_conversion: 0,
        revenue: 0,
        hold_revenue: 0,
        payout: 0,
        app_id: obj._id["app_id"],
        timeSlot: timeSlot,
        pre_conversion: obj.pre_conversion,
    };
    return temp;
}
function formatAppidPublisherDocument(obj, network_id, timeInterval, nid) {
    let timeSlot = moment(timeInterval.startTime).toDate();

    let temp = {
        network_id: network_id,
        nid: obj.nid || nid,
        click: obj.count,
        unique_click: obj.count,
        conversion: 0,
        publisher_conversion: 0,
        publisher_payout: 0,
        unique_conversion: 0,
        revenue: 0,
        hold_revenue: 0,
        payout: 0,
        app_id: obj._id["app_id"],
        publisher_id: obj._id["publisher_id"],
        pid: obj._id["pid"] || obj.pid || obj._id["publisher_id"],
        timeSlot: timeSlot,
        pre_conversion: obj.pre_conversion,
    };
    return temp;
}
function formatAdvConvDocument(obj, network_id, timeInterval, nid) {
    let timeSlot = moment(timeInterval.startTime).toDate();
    let temp = {
        network_id: network_id,
        nid: obj.nid || nid,
        click: 0,
        unique_click: 0,
        conversion: obj.conversion,
        unique_conversion: obj.conversion,
        publisher_conversion: obj.publisher_conversion,
        publisher_payout: obj.publisher_payout,
        revenue: parseFloat(obj.total_revenue),
        hold_revenue: parseFloat(obj.total_hold_revenue),
        payout: parseFloat(obj.total_payout),
        timeSlot: timeSlot,
        advertiser_name: obj.advertiser_name,
        advertiser_id: obj._id["advertiser_id"],
        aid: obj._id["aid"] || obj.aid,
    };
    return temp;
}
function formatAppidPublisherConvDocument(obj, network_id, timeInterval, nid) {
    let timeSlot = moment(timeInterval.startTime).toDate();
    let temp = {
        network_id: network_id,
        nid: obj.nid || nid,
        click: 0,
        unique_click: 0,
        conversion: obj.conversion,
        publisher_conversion: obj.publisher_conversion,
        publisher_payout: obj.publisher_payout,
        unique_conversion: obj.conversion,
        revenue: parseFloat(obj.total_revenue),
        hold_revenue: parseFloat(obj.total_hold_revenue),
        payout: parseFloat(obj.total_payout),
        timeSlot: timeSlot,
        app_id: obj._id["app_id"],
        publisher_id: obj._id["publisher_id"],
        pid: obj._id["pid"] || obj.pid || obj._id["publisher_id"],
    };
    return temp;
}
function formatAppConvDocument(obj, network_id, timeInterval, nid) {
    let timeSlot = moment(timeInterval.startTime).toDate();
    let temp = {
        network_id: network_id,
        nid: obj.nid || nid,
        click: 0,
        unique_click: 0,
        conversion: obj.conversion,
        publisher_conversion: obj.publisher_conversion,
        publisher_payout: obj.publisher_payout,
        unique_conversion: obj.conversion,
        revenue: parseFloat(obj.total_revenue),
        hold_revenue: parseFloat(obj.total_hold_revenue),
        payout: parseFloat(obj.total_payout),
        timeSlot: timeSlot,
        app_id: obj._id["app_id"],
    };
    return temp;
}
function formatPubConvDocument(obj, network_id, timeInterval, nid) {
    let timeSlot = moment(timeInterval.startTime).toDate();
    let temp = {
        network_id: network_id,
        nid: obj.nid || nid,
        click: 0,
        unique_click: 0,
        conversion: obj.conversion,
        publisher_conversion: obj.publisher_conversion,
        publisher_payout: obj.publisher_payout,
        unique_conversion: obj.conversion,
        revenue: parseFloat(obj.total_revenue),
        hold_revenue: parseFloat(obj.total_hold_revenue),
        payout: parseFloat(obj.total_payout),
        timeSlot: timeSlot,
        publisher_name: obj.publisher_name,
        publisher_id: obj._id["publisher_id"],
        pid: obj._id["pid"] || obj.pid,
    };
    return temp;
}
function formatSourceOfferPublisherConversionDocument(obj, network_id, timeInterval, nid) {
    let timeSlot = moment(timeInterval.startTime).toDate();
    let temp = {
        network_id: network_id,
        nid: obj.nid || nid,
        source: obj._id["source"] || 'unknown',
        click: 0,
        unique_click: 0,
        conversion: obj.conversion,
        publisher_conversion: obj.publisher_conversion,
        publisher_payout: obj.publisher_payout,
        unique_conversion: obj.conversion,
        revenue: parseFloat(obj.total_revenue),
        hold_revenue: parseFloat(obj.total_hold_revenue),
        payout: parseFloat(obj.total_payout),
        timeSlot: timeSlot,
        offer_name: obj.offer_name,
        publisher_name: obj.publisher_name,
        publisher_id: obj._id["publisher_id"],
        pid: obj._id["pid"] || obj.pid || obj._id["publisher_id"],
        offer_id: obj._id["offer_id"],
        advertiser_offer_id: obj.advertiser_offer_id
    };
    return temp;
}
function formatDailyDocument(obj, network_id, timeInterval, nid) {
    let timeSlot = moment(timeInterval.startTime).toDate();

    let temp = {
        network_id: network_id,
        nid: obj.nid || nid,
        click: obj.count,
        unique_click: obj.count,
        conversion: 0,
        publisher_conversion: 0,
        publisher_payout: 0,
        unique_conversion: 0,
        revenue: 0,
        hold_revenue: 0,
        payout: 0,
        timeSlot: timeSlot,
        pre_conversion: obj.pre_conversion,
    };
    return temp;
}
function formatDailyConvDocument(obj, network_id, timeInterval, nid) {
    let timeSlot = moment(timeInterval.startTime).toDate();
    let temp = {
        network_id: network_id,
        nid: obj.nid || nid,
        click: 0,
        unique_click: 0,
        conversion: obj.conversion,
        publisher_conversion: obj.publisher_conversion,
        publisher_payout: obj.publisher_payout,
        unique_conversion: obj.conversion,
        revenue: parseFloat(obj.total_revenue),
        hold_revenue: parseFloat(obj.total_hold_revenue),
        payout: parseFloat(obj.total_payout),
        timeSlot: timeSlot,
    };
    return temp;
}
function formatOffersSourceAdvAffByTimezoneDocument(obj, network_id, nid, timeInterval, timezone) {
    let timeSlot = moment(timeInterval.startTime._d).toDate();
    let temp = {
        network_id: network_id,
        nid: obj.nid || nid,
        click: obj.click,
        unique_click: obj.unique_click,
        conversion: obj.conversion,
        publisher_conversion: obj.publisher_conversion,
        pre_conversion: obj.pre_conversion,
        unique_conversion: obj.unique_conversion,
        revenue: obj.revenue,
        hold_revenue: obj.hold_revenue,
        payout: obj.payout,
        currency: obj.currency,
        publisher_payout: obj.publisher_payout,
        publisher_id: obj.publisher_id,
        pid: obj.pid || obj.publisher_id,
        publisher_name: obj.publisher_name,
        advertiser_name: obj.advertiser_name,
        advertiser_id: obj.advertiser_id,
        aid: obj.aid,
        offer_name: obj.offer_name,
        offer_id: obj.offer_id,
        advertiser_offer_id: obj.advertiser_offer_id,
        timeSlot: timeSlot,
        timezone: timezone,
        month: moment(timeInterval.startTime._d).format("MM"),
        year: moment(timeInterval.startTime._d).format("YYYY"),
    };
    return temp;
}
// function formatSourceAdvByTimezoneDocument(obj, network_id, timeInterval, timezone) {
//     let timeSlot = moment(timeInterval.startTime._d).toDate();
//     let temp = {
//         network_id: network_id,
//         click: obj.click,
//         unique_click: obj.unique_click,
//         conversion: obj.conversion,
//         pre_conversion: obj.pre_conversion,
//         unique_conversion: obj.unique_conversion,
//         revenue: obj.revenue,
//         payout: obj.payout,
//         source: obj.source,
//         advertiser_name: obj.advertiser_name,
//         advertiser_id: obj.advertiser_id,
//         timeSlot: timeSlot,
//         timezone: timezone,
//     };
//     return temp;
// }
// function formatSourceAffByTimezoneDocument(obj, network_id, timeInterval, timezone) {
//     let timeSlot = moment(timeInterval.startTime._d).toDate();
//     let temp = {
//         network_id: network_id,
//         click: obj.click,
//         unique_click: obj.unique_click,
//         conversion: obj.conversion,
//         pre_conversion: obj.pre_conversion,
//         unique_conversion: obj.unique_conversion,
//         revenue: obj.revenue,
//         payout: obj.payout,
//         source: obj.source,
//         publisher_id: obj.publisher_id,
//         publisher_name: obj.publisher_name,
//         timeSlot: timeSlot,
//         timezone: timezone,
//     };
//     return temp;
// }

/**
 * Support Functions for genrating report
 */
function getDateInterval(lastSlotTime) {
    // console.log(moment(lastSlotTime).toDate(), moment(lastSlotTime).startOf("hour").toDate());
    try {
        let dateStart = moment(lastSlotTime).add(SOURCE_SUMMARY_INTERVAL, "minutes").toDate();
        let endDate = moment(dateStart).add(SOURCE_SUMMARY_INTERVAL, "minutes").toDate();
        return { startTime: dateStart, endTime: endDate };
    } catch (err) {
        console.log(err.message);
        return null;
    }

}
function logSummaryResult(network_id, records_count, timeInterval, report_name, nid) {
    return new Promise(async (resolve, reject) => {
        try {
            //console.log("logSummaryResult" , records_count);
            let timeSlot = moment(timeInterval.startTime);
            let newLog = new SummaryLogModel({
                network_id: network_id,
                nid: nid,
                summary_count: records_count,
                report_name: report_name,
                timeSlot: timeSlot.toDate(),
            });
            await newLog.save();
            console.log("end event called", network_id, nid, records_count, timeSlot.toDate(), report_name);
            resolve();
        } catch (e) {
            console.log("error : while saving SourceSummary log");
            console.log(e);
            reject(e);
        }
    });
}
function getDateIntervalDaily(lastSlotTime) {
    try {
        let dateStart = moment(lastSlotTime).add(process.env.DAILY_TIMEZONE_SUMMARY_INTERVAL, "days");
        let endDate = moment(dateStart).add(process.env.DAILY_TIMEZONE_SUMMARY_INTERVAL, "days");
        return { startTime: dateStart, endTime: endDate };
    } catch (err) {
        console.log(err.message);
        return null;
    }
}
function getDateIntervalMonthly(lastSlotTime) {
    try {
        let dateStart = moment(lastSlotTime).startOf("month").add(process.env.MONTHLY_TIMEZONE_SUMMARY_INTERVAL, "months");
        let endDate = moment(dateStart).add(process.env.MONTHLY_TIMEZONE_SUMMARY_INTERVAL, "months");
        return { startTime: dateStart, endTime: endDate };
    } catch (err) {
        console.log(err.message);
        return null;
    }
}

/**
 * Uncomment below code for run this script
 */
// this.startCronScript()