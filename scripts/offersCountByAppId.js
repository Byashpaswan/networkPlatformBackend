require('dotenv').config({ path: '.env' });
require('../db/connection');
const mongoose = require('mongoose');
// const Promise = require('promise');
const OfferModel = require('../db/offer/Offer');
const ApplicationDetailsModel = require('../db/applicationDetails/ApplicationDetails');


exports.updateApplicationDetailsByAppIds = async () => {


    try {
        let cursor = await ApplicationDetailsModel.getApplicationDetail({}, { _id :1  ,  app_id : 1 } , {} );
        for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
            try {
                let count  = await OfferModel.findOfferCountByAppId( { app_id : doc.app_id });
                let filter  = { _id : mongoose.Types.ObjectId( doc._id ) };
                
               await ApplicationDetailsModel.updateCount( filter  , { $set : { count : count }} ) ; 
            } catch (error) {
                console.log("==================== error offer id =======> ", doc._id);
            }
        }
    } catch (error) {
        console.log(error);
    }
}

// (async () => {
//     await this.updateApplicationDetailsByAppIds();
       
// })();