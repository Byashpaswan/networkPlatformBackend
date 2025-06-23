require('dotenv').config({ path: '.env' });
require('../db/connection');
const mongoose = require('mongoose');
const moment = require('moment'); // Import moment for date comparisons

const ApplicationDetailsModel = require('../db/applicationDetails/ApplicationDetails');
const AppIdReport = require("../controllers/allAppIdReport");
const Campaigns = require("../controllers/campaigns/Campaigns");
const { ConversionModel } = require('../db/appIdReport/AppIdReport');
const ApplicationStatusModel = require('../db/applicationStatus/applicationStatus');
const OfferModel = require('../db/offer/Offer');

exports.updateApplicationStatus = async () => {
    try {
        const campaignMap = new Map();

        // Fetching application details and campaigns data
        const applicationDetailsData = await ApplicationDetailsModel.getApplicationDetails({}, { last_update: 1, category: 1, app_id: 1, _id: 0, name: 1 });
        const CampaignsData = await Campaigns.campaigns();

        // Mapping campaigns data to a Map for quick access
        for (const ele of CampaignsData) {
            campaignMap.set(ele.app_id, ele);
        }

        let after_30_days =  moment().startOf("day").subtract( 30 , "days").toDate() ;  
        let after_7_days = moment().startOf("day").subtract( 7 , "days").toDate();
        
        // Iterating over application details data
        for (const ele of applicationDetailsData) {
            let status = '';  // Initialize status as an empty string
            let update = '';
            let updateObject = {};

            // Fetching conversion and offer counts
            // const conversionCount = await ConversionModel.findOfferCountByAppId({ app_id: ele.app_id });
            const offerCount = await OfferModel.findOfferCountByAppId({ app_id: ele.app_id });

            const last_30_days = await OfferModel.findOfferCountByAppId({ app_id : ele.app_id  , updatedAt : { $gte : after_30_days } });
            const  last_7_days = await  OfferModel.findOfferCountByAppId({ app_id : ele.app_id  , updatedAt : { $gte : after_7_days } });
            const campData = campaignMap.get(ele.app_id);

            // Check if campData is defined before accessing its properties
            if (offerCount > 10) {
                if (campData && Object.keys(campData).length > 0) {
                    if (campData.running_file || (!Array.isArray(campData.all_file) && Object.keys(campData.all_file).length) || (Array.isArray(campData.all_file) && campData.all_file.length)) {
                        update = "UpdateNotRequired";
                        if (moment(ele.last_update).isAfter(moment(campData['updatetime']))) {
                            update = "UpdateRequired";
                        }
                    } else {
                        update = 'todo';
                    }
                } else {
                    update = 'new';
                }

                // Ensure that status is defined and has a valid value
                status = (campData && campData.status) || '';

                updateObject = {
                    ...ele,
                    "campaign_status": status,
                    // "conv_count": conversionCount,
                    "count": offerCount,
                    "update": update,
                    "before_7_days" : last_7_days ,
                    "before_30_days" : last_30_days 
                };

                // Check if the app_id already exists in ApplicationStatusModel
                const existingRecord = await ApplicationStatusModel.findOne({ app_id: ele.app_id });
                
                if (existingRecord) {
                    // If it exists, update the document
                    await ApplicationStatusModel.updateOne(
                        { app_id: ele.app_id },
                        { $set: updateObject }
                    );
                } else {
                    // If it doesn't exist, create a new document
                    await ApplicationStatusModel.create(updateObject);
                }
            }
        }
    } catch (error) {
        console.log(error);
    }
};

// this.updateApplicationStatus();

