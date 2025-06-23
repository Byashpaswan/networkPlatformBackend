require("dotenv").config({ path: ".env" });
require("../db/connection");
const mongoose = require("mongoose");
const mongooseObjectId = mongoose.Types.ObjectId;
const moment = require("moment");

// const OfferModel = require("../db/offer/Offer");
const NetworkModel = require("../db/network/Network");
const { LiveDaily_AdvertiserOfferPublisherSourceSummary }  = require('../db/click/sourceSummary/sourceSummary');
const  { DashboardStatsModel }  = require('../db/dashboard/Dashboard');
const Offers = require("../db/offer/Offer");
const { ClickFailedModel } = require('../db/click/clickfails');
const  { ConversionFailed } = require("../db/conversion/conversionFailed");

async function getAllNetworks() {
    try {
        let networks = await NetworkModel.findAllNetwork({}, { _id: 1, company: 1 });
        if (networks && networks.length) {
            return networks;
        }
    } catch (error) {
        console.log(error);
    }
    return null;
}


exports.runScript = async () => {
    try {
        let filter = {};
        let slot =  moment().startOf('day').toDate();
        // console.log(" slot -> " , slot );
        let groupBy = {
            _id: null,
            conversion: { $sum: "$conv" },
            click: { $sum: "$click" },
            payout: { $sum: "$pay" },
            revenue: { $sum: "$rev" }
        };

        const networkList = await getAllNetworks();
        if (networkList && networkList.length > 0){
            for (let i = 0 ; i < networkList.length ; i++){
                const networkId = networkList[i]._id;
                
                if (!mongoose.Types.ObjectId.isValid(networkId)){
                    // console.log(`Invalid ObjectId: ${networkId}`);
                    continue;
                }
                const networkObjectId = mongoose.Types.ObjectId(networkId);
                filter['N_id'] = networkObjectId;
                filter['slot'] = { '$gte': slot };
                const result = await LiveDaily_AdvertiserOfferPublisherSourceSummary.countStats(filter, groupBy);
                let totalOffers = await Offers.countOffers({ network_id: networkObjectId, updatedAt: { $gte : slot } });
                let newOffers = await Offers.countOffers({ network_id: networkObjectId, createdAt: { $gte : slot } });
                let failedClick = await ClickFailedModel.getAllCount({ network_id: networkObjectId, createdAt: { '$gte' : slot } });
                let failedConversion = await ConversionFailed.countConversionFailed({ network_id: networkObjectId ,  createdAt: { '$gte' : slot } });

                if ((result && result.length > 0) || totalOffers || newOffers || failedClick || failedConversion ) {
                    const timeSlotFilter = { timeSlot: { $gte: slot }, network_id: networkObjectId };
                    const dash_data = await DashboardStatsModel.getDataByTimeSlot( timeSlotFilter , { _id: 1 } ); 
                     
                    let conversion = ( result && result.length > 0 ) ? result[0]['conversion'] : 0 ;
                    let click = ( result && result.length > 0 ) ? result[0]['click'] : 0 ;
                    let payout = ( result && result.length > 0 ) ? result[0]['payout'] : 0 ;
                    let revenue = ( result && result.length > 0 ) ? result[0]['revenue'] : 0 ;

                    if ( dash_data && dash_data.length > 0 ) {
                        const updateFilter = { _id: mongoose.Types.ObjectId(dash_data[0]['_id']) };
                        const updateData = {
                            conversion:  conversion || 0,
                            click:  click || 0,
                            payout:  payout || 0,
                            revenue:  revenue || 0,
                            offers : totalOffers || 0, 
                            newOffers : newOffers || 0,
                            clickFailed : failedClick ,
                            conversionFailed : failedConversion , 
                            timeSlot : moment().toDate() 
                        };
                        // console.log(" to be  updateData -> " , updateData );
                      await DashboardStatsModel.updateOneDoc(updateFilter,  updateData , { upsert: true } );

                    } else {
                        // create new dashboard data . 
                        const insertData  = await DashboardStatsModel({
                        network_id : networkObjectId , 
                        conversion: conversion || 0,
                        click: click || 0,
                        payout: payout || 0,
                        revenue: revenue || 0,
                        timeSlot : slot ,
                        offers : totalOffers || 0, 
                        newOffers : newOffers || 0,
                        clickFailed : failedClick ,
                        conversionFailed : failedConversion , 
                        timeSlot : moment().toDate()
                    });
                    // console.log(" to be save data -> " , insertData );
                    await  insertData.save(); 
                    // const Data_data =  await DashboardStatsModel.insertData(insertData); 
                    }
                } else {
                    // console.log(`No stats result for filter: ${JSON.stringify(filter)}`);
                }
            }
        }
    } catch (error) {
        console.log(error);
    }
};


(async () => {
    await exports.runScript();
})();
