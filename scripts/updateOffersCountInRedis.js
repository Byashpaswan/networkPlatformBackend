require("dotenv").config({ path: ".env" });
require("../db/connection");
const moment = require('moment');

const debug = require("debug")("darwin:scripts:updateOffersCountInRedis");
const OfferModel = require('../db/offer/Offer');
const NetworkModel = require('../db/network/Network');
const { setRedisHashMultipleData, getRedisHashMultipleData } = require('../helpers/Redis');


const setAllOffersCount = async (network_id) => {

    try {

        let allOffersCount = 0;
        let redisResult = (await getRedisHashMultipleData("ALLOFFERCOUNT:" + network_id.toString())).data;
        if (redisResult) {
            allOffersCount = await OfferModel.getTotalPagesCount({ "network_id": network_id.toString(), "updatedAt": { $gt: moment(redisResult.last_date) } });
            allOffersCount = +redisResult.count + +allOffersCount
        }
        else {
            allOffersCount = await OfferModel.getTotalPagesCount({ "network_id": network_id.toString() });
        }
        await setRedisHashMultipleData("ALLOFFERCOUNT:" + network_id.toString(), {"count": allOffersCount, "last_date": moment().toISOString()}, -1);
    } catch (error) {
        debug(error);
    }
}


const setAllActiveOffersCount = async (network_id) => {

    try {

        let activeOffersCount = 0;
        let redisResult = (await getRedisHashMultipleData("LIVEOFFERCOUNT:" + network_id.toString())).data;
        if (redisResult) {
            activeOffersCount = await OfferModel.getTotalPagesCount({ "network_id": network_id.toString(), "updatedAt": { $gt: moment(redisResult.last_date) }, "status": 1 });
            activeOffersCount = +redisResult.count + activeOffersCount
        }
        else {
            activeOffersCount = await OfferModel.getTotalPagesCount({ "network_id": network_id.toString(), "status": 1 });
        }

        await setRedisHashMultipleData("LIVEOFFERCOUNT:" + network_id.toString(), {"count": activeOffersCount, "last_date": moment().toISOString()}, -1);
        
    } catch (error) {
        debug(error);
    }
}


exports.saveOffersCountInRedis = async () => {

    try {
        let networkList = await NetworkModel.findAllNetwork({}, { _id: 1 });
        for (const element of networkList) {
            await setAllOffersCount(element._id)
            await setAllActiveOffersCount(element._id)
        }
    } catch (error) {
        debug(error)
    }
    
}

// this.saveOffersCountInRedis()