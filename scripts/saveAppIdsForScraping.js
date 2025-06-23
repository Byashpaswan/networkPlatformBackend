const Mongoose = require("mongoose");
const mongooseObjectId = Mongoose.Types.ObjectId;
var moment = require("moment");
require("dotenv").config({ path: ".env" });
require('../db/connection');

const debug = require("debug")("darwin:Script:ApplicationDetails");
const OfferModel = require('../db/offer/Offer');
const ApplicationDetailsModel = require('../db/applicationDetails/ApplicationDetails');
const rabbitMq = require('../helpers/rabbitMQ');
const { sendJobToGenericWorker } = require('../helpers/Functions');
const { config } = require('../constants/Global')

// const publish_queue = 'scrap_app_ids_queue';
const batchSize = parseInt(process.env.SCRAPING_BATCH_SIZE) || 25;

async function saveAppIds(app_ids) {
    try {
        await ApplicationDetailsModel.saveApplicationDetailsByBatch(app_ids, { ordered: false });
        try {
            let app_idsArray = [];
            for (let item of app_ids) {
                app_idsArray.push(item.app_id);
            }
            await OfferModel.updateManyOffer(
                { app_id: { $in: app_idsArray } },
                { $set: { "isScraped": true } },
                {}
            );
        } catch (error) {
            // debug("Error while updating offers isScraped flag", error);
        }
    } catch (error) {
        // debug("Error while inserting into applicationdetails", error);
    }
}

// async function updateAppIds(app_ids) {
//     let finalArray = app_ids.map(obj => mongooseObjectId(obj._id));
//     try {
//         let result = await ApplicationDetailsModel.updateApplicationDetailsByBatch(
//             { _id: { $in: finalArray } },
//             { $set: { "is_published": true } }
//         );
//     } catch (error) {
//         // debug("Error while updating applicationdetails", error);
//     }
// }

async function insertAppIds() {
    return new Promise(async (resolve, reject) => {
        try {
            let cursor = await OfferModel.getOffersByBatch(
                {
                    app_id: { $nin: ["", null] },
                    createdAt: {
                        $gte: moment().subtract(1, 'days').startOf('day').format(),
                        $lt: moment().subtract(1, 'days').endOf('day').format()
                    },
                    isScraped: { $in: [null, false] }
                },
                { _id: 0, app_id: 1, geo_targeting: 1 }
            );

            let app_ids = [];
            for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
                if (app_ids.some(ele => ele.app_id === doc.app_id)) continue;
                else {
                    let country = ""
                    if (doc.geo_targeting && doc.geo_targeting.country_allow && doc.geo_targeting.country_allow.length) {
                        let tempObjCountry = config.country.filter(ele => ele.value.toLowerCase() == doc.geo_targeting.country_allow[0]['value'].toLowerCase());
                        country = tempObjCountry['key'] ? tempObjCountry['key'].toLowerCase() : 'us';
                    }
                    app_ids.push({ "app_id": doc.app_id, "country": country })
                };
                if (app_ids.length >= batchSize) {
                    await saveAppIds(app_ids);
                    app_ids = [];
                }
            }
            if (app_ids.length) {
                await saveAppIds(app_ids);
                app_ids = [];
            }
            resolve(true);
        } catch (error) {
            debug(error);
            reject(false);
        }
    });
}

async function publishAppIds() {
    return new Promise(async (resolve, reject) => {
        try {
            let dateFrom = moment().subtract(3, 'd').startOf('d').toDate();
            const query = {
                $or: [
                  { is_published: false , not_found_count: { $lte: 30 } } , 
                   { last_update: { $lte  : dateFrom } }
                ]
              };

            const projection = {
                _id: 1,
                app_id: 1,
                country: 1
              };
              
            const options = {
                sort: { updatedAt: 1 }
              };
              
            const cursor = await ApplicationDetailsModel.getApplicationDetailsByBatch(query, projection, options);
            let app_ids = [];
            for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
                app_ids.push(doc);
                if (app_ids.length >= batchSize) {
                    await sendJobToGenericWorker(content = { workerName: "scrapping", workerData: app_ids }, priority = 12);
                    // await updateAppIds(app_ids);
                    app_ids = [];
                }
            }
            if (app_ids.length) {
                await sendJobToGenericWorker(content = { workerName: "scrapping", workerData: app_ids }, priority = 12);
                // await updateAppIds(app_ids);
                app_ids = [];
            }
            resolve(true);
        } catch (error) {
            debug(error);
            reject(false);
        }
    });
}

exports.startSaveAppIdsScriptForScraping = async () => {
    try {
        //await insertAppIds();
        await publishAppIds();
    } catch (error) {
        console.log(error);
    }
    return await Promise.resolve(true);
};

// this.startSaveAppIdsScriptForScraping();