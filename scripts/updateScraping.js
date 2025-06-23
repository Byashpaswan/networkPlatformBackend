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

// const publish_queue = 'scrap_app_ids_queue';
const batchSize = parseInt(process.env.SCRAPING_BATCH_SIZE) || 25;
const days = parseInt(process.env.SCRAPING_BEFORE_DAYS) || 5;

async function updateAppIds(app_ids) {
    let finalArray = app_ids.map(obj => mongooseObjectId(obj._id));
    try {
        let result = await ApplicationDetailsModel.updateApplicationDetailsByBatch(
            { _id: { $in: finalArray } },
            { $set: { "is_published": true } });
    } catch (error) {
        // debug("Error while updating applicationdetails", error);
    }
}

async function publishAppIds() {
    return new Promise(async (resolve, reject) => {
        try {
            let cursor = await ApplicationDetailsModel.getApplicationDetailsByBatch(
                { updatedAt: { $lt: moment().subtract(days, 'days').endOf('day').format() }, not_found: false },
                { _id: 1, app_id: 1, country: 1 },
                { sort: { updatedAt: 1 } }
            );

            let app_ids = [];
            for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
                app_ids.push(doc);
                if (app_ids.length >= batchSize) {
                    await sendJobToGenericWorker(content = { workerName: "scrapping", workerData: app_ids }, priority = 5);
                    await updateAppIds(app_ids);
                    app_ids = [];
                }
            }
            if (app_ids.length) {
                await sendJobToGenericWorker(content = { workerName: "scrapping", workerData: app_ids }, priority = 5);
                await updateAppIds(app_ids);
                app_ids = [];
            }
            resolve(true);
        } catch (error) {
            debug(error);
            reject(false);
        }
    });
}

exports.startUpdateScraping = async () => {
    try {
        await publishAppIds();
    } catch (error) {
        console.log(error);
    }
    return await Promise.resolve(true);
};

// this.startUpdateScraping();