require("dotenv").config({ path: ".env" });
require("../../db/connection");

const Promise = require("promise");
const mongoose = require("mongoose");
const mongooseObjectId = mongoose.Types.ObjectId;
const moment = require("moment");

// import files for push bulk offer worker
const OfferModel = require('../../db/offer/Offer');
const WorkerStatusModel = require('../../db/WorkerStatus');
const { publishJobForWebhook } = require('../../helpers/Functions');

// import files for wishlist worker
const rejectedAppIdModal = require("../../db/rejectedAppId");
const WishlistParseController = require("../../controllers/wishlist/wishlistParse");
const WishlistParseControllerNew = require("../../controllers/wishlist/wishlistParser");


const redisQueueName = "GENWORKERQUEUE"
const redis = require('../../helpers/Redis');


const pushBulkOffer = async (workerData, workerId) => {
    let content = workerData;
    return new Promise(async (resolve, reject) => {
        try {
            if (content && content.networkId && workerId) {
                // console.log("file: WorkerFunctions.js ~ line 398 ~ content", content, workerId)
                await WorkerStatusModel.updateStatus({ _id: mongooseObjectId(workerId) }, { $set: { status: 'Processing', 'sDetails.Processing': moment().toDate() } });
                await redis.setRedisData(`GWR:${workerId}`, JSON.stringify(workerData), 21600);  // 6 Hour expire time
                let filter = {};
                if (content.offerId) {
                    filter['_id'] = { $in: content.offerId };
                }
                else if (content.search) {
                    filter = content.search;
                }
                // console.log("file: WorkerFunctions.js ~ line 415 ~ returnnewPromise ~ filter", filter)

                if (Object.keys(filter).length) {
                    let totalProcessedOfferCount = 0;
                    let totalOffer = [];
                    let cursor = await OfferModel.getOffersByBatch(filter, { '_id': 1 });
                    for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
                        totalOffer.push(doc['_id']);
                        if (totalOffer.length >= 50) {
                            let res = await publishJobForWebhook(mongooseObjectId(content.networkId), totalOffer, "offer_update", "Push Offer", 10);
                            totalProcessedOfferCount += res
                            totalOffer = [];
                            if (totalProcessedOfferCount >= 1000) {
                                await WorkerStatusModel.updateStatus({ _id: mongooseObjectId(workerId) }, { $inc: { count: totalProcessedOfferCount } });
                                totalProcessedOfferCount = 0;
                            }
                        }
                    }
                    if (totalOffer.length) {
                        let res = await publishJobForWebhook(mongooseObjectId(content.networkId), totalOffer, "offer_update", "Push Offer", 10);
                        totalProcessedOfferCount += res
                        totalOffer = [];
                    }
                    await WorkerStatusModel.updateStatus({ _id: mongooseObjectId(workerId) }, { $set: { status: 'Completed', 'sDetails.Completed': moment().toDate() }, $inc: { count: totalProcessedOfferCount } });
                    totalProcessedOfferCount = 0;
                    await redis.removeDataFromRedisSortedSet("GENWORKERQUEUEPRO", workerId)
                }
            }
            return resolve(true);
        } catch (error) {
            console.log("file: genericWorker/WorkerFunctions.js ~ line 467 ~ pushBulkOffer ~ catch ~ error ~ ", error)
            return resolve(false);
        }
    });
};

const runUploadWishlistWorker = async (workerData, workerId) => {
    return new Promise(async (resolve, reject) => {
        try {
            const daysBeforeNow = 3;
            let content = workerData;

            if (content && content.network_id) {

                await WorkerStatusModel.updateStatus({ _id: mongooseObjectId(workerId) }, { $set: { status: 'Processing', "sDetails.Processing": moment().toDate() } });
                await redis.setRedisData(`GWR:${workerId}`, JSON.stringify(workerData), 21600);  // 6 Hour expire time

                let network_id = content.network_id;
                let uploadedAppId = content.uploadedAppId;
                let removeWishlistIds = content.removeWishlistIds;
                let webhookPushStatus = content.webhookPushStatus;

                // send all offer to webhook according to new wishlist by appid
                await WorkerStatusModel.updateStatus({ _id: mongooseObjectId(workerId) }, { $set: { status: 'SendToWebhook', "sDetails.SendToWebhook": moment().toDate() } });
                // for new offer only and all offers to push
                if (webhookPushStatus === "2" || webhookPushStatus === "3") {
                    let date_range = moment().subtract(daysBeforeNow, "d").toDate(); // 3 days
                    await WishlistParseController.addOffersToWebhook(network_id, uploadedAppId, date_range, "Upload Wishlist", workerId);
                }

                // Apply all offer previous 7 days according to new wish list by appid
                await WorkerStatusModel.updateStatus({ _id: mongooseObjectId(workerId) }, { $set: { status: 'Apply', "sDetails.Apply": moment().toDate() } });
                let applyDateRange = process.env.MY_OFFER_DATE_RANGE || 7;
                await WishlistParseController.applyWishlistOffersV2({
                    network_id: network_id,
                    newAppIds: uploadedAppId,
                    updatedAt: { $gte: moment().subtract(applyDateRange, "d").toDate() }
                });

                // start marking all offer according to new wish list by appid
                await WorkerStatusModel.updateStatus({ _id: mongooseObjectId(workerId) }, { $set: { status: 'Marking', "sDetails.Marking": moment().toDate() } });
                if (removeWishlistIds.length > 0) {
                    await WishlistParseController.processWishlistOffersV2(removeWishlistIds, network_id, setIsMyOfferFlagTo = false);
                }
                rejectedAppIdModal.deleteManyAppId({ app_id: { $in: uploadedAppId } });
                await WishlistParseController.processWishlistOffersV2(uploadedAppId, network_id, setIsMyOfferFlagTo = true);

                // process complete
                await WorkerStatusModel.updateStatus({ _id: mongooseObjectId(workerId) }, { $set: { status: 'Completed', 'sDetails.Completed': moment().toDate() } });
                await redis.removeDataFromRedisSortedSet("GENWORKERQUEUEPRO", workerId)

                return resolve(true);
            }
        } catch (error) {
            console.log("file: WorkerFunctions.js ~ line 291 ~ returnnewPromise ~ error", error)
            return reject(false);
        }
    });
};

const runUploadWishlistFromJumboWorker = async (workerData, workerId) => {
    return new Promise(async (resolve, reject) => {
        let content = workerData;
        if (content) {
            try {
                const daysBeforeNow = 3;


                let uploadedAppId = content.uploadedAppId;
                let removeWishlistIds = content.removeWishlistIds;
                let webhookPushStatus = content.webhookPushStatus;

                await WorkerStatusModel.updateManyStatus({ _id: { $in: content.workerIdList } }, { $set: { status: 'Processing', "sDetails.Processing": `${moment().toISOString()}CT${uploadedAppId.length}` } });

                let totalCount = 0;
                let tempCount = 0;


                // send all offer to webhook according to new wishlist by appid
                // for new offer only and all offers to push
                if (webhookPushStatus === "2" || webhookPushStatus === "3") {
                    let date_range = moment().subtract(daysBeforeNow, "d").toDate(); // 3 days
                    for (const appId of uploadedAppId) {
                        console.log(`Webhook Push offer, current app id => ${appId}`)
                        try {
                            await WishlistParseControllerNew.addOffersToWebhook(appId, date_range, "Upload Wishlist");
                        } catch (error) { console.log("Webhook Push offer, ", { error }); }
                        tempCount += 1;
                        totalCount += 1
                        if (tempCount >= 50) {
                            await WorkerStatusModel.updateManyStatus({ _id: { $in: content.workerIdList } }, { $set: { status: 'SendToWebhook', count:  `${totalCount}`, "sDetails.SendToWebhook": `${moment().toISOString()}CT${totalCount}` } });
                            tempCount = 0
                        }
                    }
                    await WorkerStatusModel.updateManyStatus({ _id: { $in: content.workerIdList } }, { $set: { status: 'SendToWebhook', count: `${totalCount}`, "sDetails.SendToWebhook": `${moment().toISOString()}CT${totalCount}` } });
                    totalCount = 0;
                    tempCount = 0;
                }

                // Apply all offer previous 7 days according to new wish list by appid
                let applyDateRange = process.env.MY_OFFER_DATE_RANGE || 7;
                let appIds = [];
                for (const appId of uploadedAppId) {
                    console.log(`Apply offer, current app id => ${appId}`)
                    try {
                        appIds.push(appId);
                        // await WishlistParseControllerNew.applyWishlistOffers(appId, applyDateRange);
                    } catch (error) { console.log("Apply offer, ", { error }); }
                    tempCount += 1;
                    totalCount += 1
                    if (tempCount >= 50) {
                        await WorkerStatusModel.updateManyStatus({ _id: { $in: content.workerIdList } }, { $set: { status: 'Apply', "sDetails.Apply": `${moment().toISOString()}CT${totalCount}` } });
                        tempCount = 0;
                    }
                }
                await WishlistParseControllerNew.applyWishlistOffers(appIds, applyDateRange);
                await WorkerStatusModel.updateManyStatus({ _id: { $in: content.workerIdList } }, { $set: { status: 'Apply', "sDetails.Apply": `${moment().toISOString()}CT${totalCount}` } });
                totalCount = 0;
                tempCount = 0;

                // start marking all offer according to new wish list by appid
                for (const appId of uploadedAppId) {
                    console.log(`Marking offer True, current app id => ${appId}`)
                    totalCount += 1
                    await WorkerStatusModel.updateManyStatus({ _id: { $in: content.workerIdList } }, { $set: { status: 'Marking True', "sDetails.MarkingTrue": `${moment().toISOString()}CT${totalCount}` } });
                    try {
                        await WishlistParseControllerNew.processWishlistOffers(appId, setIsMyOfferFlagTo = true);
                    } catch (error) { console.log("Marking offer True, ", { error }); }
                }
                totalCount = 0;
                if (removeWishlistIds.length > 0) {
                    for (const appId of removeWishlistIds) {
                        console.log(`Marking offer False, current app id => ${appId}`)
                        // await WorkerStatusModel.updateManyStatus({ _id: { $in: content.workerIdList } }, { $set: { status: 'Marking False', "sDetails.MarkingFalse": `${moment().toISOString()}CT${totalCount}` } });
                        try {
                            await WishlistParseControllerNew.processWishlistOffers(removeWishlistIds, setIsMyOfferFlagTo = false);
                        } catch (error) { console.log("Marking offer False, ", { error }); }
                         totalCount += 1
                    }

                }

                await WorkerStatusModel.updateManyStatus({ _id: { $in: content.workerIdList } }, { $set: { status: 'Marking False', "sDetails.MarkingFalse": `${moment().toISOString()}CT${totalCount}` } });

                // process complete
                await WorkerStatusModel.updateManyStatus({ _id: { $in: content.workerIdList } }, { $set: { status: 'Completed', 'sDetails.Completed': `${moment().toISOString()}CT${uploadedAppId.length}` } });

                rejectedAppIdModal.deleteManyAppId({ app_id: { $in: uploadedAppId } });

                return resolve(true);

            } catch (error) {
                console.log("file: WorkerFunctions.js ~ line 291 ~ returnnewPromise ~ error", error)
                await WorkerStatusModel.updateManyStatus({ _id: { $in: content.workerIdList } }, { $set: { status: 'Failed', "sDetails.Failed": `${moment().toISOString()}CT$0` } });
                return reject(false);
            }
        }
        return resolve(false);
    });
};

const checkQueue = async () => {
    try {
        let data = await redis.getRedisQueueData(redisQueueName);
        // console.log("file: worker.js ~ line 83 ~ checkQueue ~ data", data);
        return data;
    } catch (error) {
        console.log("Redis Failed ========> ", error)
        return null;
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms)); // 10000
}

// const startRedisWorker = async () => {
//     while (true) {
//         try {
//             let content = JSON.parse(await checkQueue());
//             // console.log("file: worker.js ~ line 93 ~ startRedisWorker ~ checkQueue ~ content", content)
//             if (content && content.workerName && content.workerData && content.workerId) {

//                 let count = 0;
//                 const myInterval = setInterval(async () => {
//                     count += 1;
//                     await redis.setDataInRedisSortedSet(["GENWORKERQUEUEPRO", new Date().getTime(), content.workerId]);
//                     if (count >= 1200) {
//                         await redis.setExpire(`GWR:${content.workerId}`, 21600)
//                     }
//                 }, 3000);

//                 switch (content.workerName) {
//                     case "UploadWishList":
//                         await runUploadWishlistWorker(content.workerData, content.workerId);
//                         clearInterval(myInterval);
//                         break;

//                     case "UploadWishListFromJumbo":
//                         await runUploadWishlistWorker(content.workerData, content.workerId);
//                         clearInterval(myInterval);
//                         break;

//                     case "PushBulkOffer":
//                         await pushBulkOffer(content.workerData, content.workerId);
//                         clearInterval(myInterval);
//                         break;

//                     default:
//                         break;
//                 }
//             }
//             else {
//                 await sleep(10000)
//             }
//         } catch (error) {
//             console.log("file: worker.js ~ line 104 ~ startRedisWorker ~ error", error)
//             process.exit()
//         }
//     }
// }

const startRedisWorker = async () => {
    while (true) {
        try {
            let content = JSON.parse(await checkQueue());
            console.log("file: worker.js ~ line 93 ~ startRedisWorker ~ checkQueue ~ content", { content })
            if (content && content.workerName && content.workerData) {

                switch (content.workerName) {
                    case "UploadWishList":
                        if (content.workerId) {
                            let count = 0;
                            const myInterval = setInterval(async () => {
                                count += 1;
                                await redis.setDataInRedisSortedSet(["GENWORKERQUEUEPRO", new Date().getTime(), content.workerId]);
                                if (count >= 1200) {
                                    await redis.setExpire(`GWR:${content.workerId}`, 21600)
                                }
                            }, 3000);
                            await runUploadWishlistWorker(content.workerData, content.workerId);
                            clearInterval(myInterval);
                        }
                        break;

                    case "UploadWishListFromJumbo":
                        await runUploadWishlistFromJumboWorker(content.workerData);
                        break;

                    case "PushBulkOffer":

                        if (content.workerId) {
                            let count = 0;
                            const myInterval = setInterval(async () => {
                                count += 1;
                                await redis.setDataInRedisSortedSet(["GENWORKERQUEUEPRO", new Date().getTime(), content.workerId]);
                                if (count >= 1200) {
                                    await redis.setExpire(`GWR:${content.workerId}`, 21600)
                                }
                            }, 3000);
                            await pushBulkOffer(content.workerData, content.workerId);
                            clearInterval(myInterval);
                        }
                        break;

                    default:
                        break;
                }
            }
            else {
                await sleep(10000)
            }
        } catch (error) {
            console.log("file: worker.js ~ line 104 ~ startRedisWorker ~ error", error)
            process.exit()
        }
    }
}

startRedisWorker();