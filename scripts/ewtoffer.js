require("dotenv").config({ path: ".env" });
require("../db/connection");
const mongoose = require("mongoose");
const mongooseObjectId = mongoose.Types.ObjectId;
const moment = require("moment");

const OfferModel = require("../db/offer/Offer");
const NetworkModel = require("../db/network/Network");
const { publishJobForWebhook } = require('../helpers/Functions');

const EWT_WEBHOOK_TIME_GAP =  15   //     process.env.EWT_WEBHOOK_TIME_GAP || 5


async function getAllNetworks() {
    // console.log("===== getAllNetworks ======");
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

async function sendOfferToWebhook(netwprkList, timeSlot) {
    // console.log("===== getEwtOffers ======");
    try {
        for (const netObj of netwprkList) {
            let offers = await OfferModel.getSearchOffer({ network_id: mongooseObjectId(netObj._id), ewt: timeSlot }, { '_id': 1   , 'isBlacklist' : 1 });
            if (offers && offers.length) {
                let offerIdList = [];
                let blockedOffer = [] ; 

                offers.map((ele) => { 
                    offerIdList.push(ele._id); 
                    if(ele.isBlacklist == 1){
                    blockedOffer.push(ele._id);
                    }
            });
            if(blockedOffer.length){
                await OfferModel.updateManyOffer({ _id : { $in : blockedOffer }} , { $set : {  isBlacklist : 0 } } , {}) ;
            }
                // console.log(`${netObj.company} offerIdList `, offerIdList.length)
                await publishJobForWebhook(mongooseObjectId(netObj._id), offerIdList, "offer_update", "Ewt Offers", 15);
            }
        }
    } catch (error) {
        console.log(error);
    }
}

function generateTimeSlot() {
    // console.log("===== generateTimeSlot ======");
    let startEwtTime = parseInt(moment().utc().format("hhmm"));
    startEwtTime = startEwtTime - (startEwtTime % EWT_WEBHOOK_TIME_GAP);
    let endEwtTime = startEwtTime + parseInt(EWT_WEBHOOK_TIME_GAP);
    return { $gte: startEwtTime, $lt: endEwtTime };
}

exports.runScript = async () => {
    console.log(`===== EWT OFFER SCRIPT START ${moment().toDate()}=====`)
    try {
        const timeSlot = generateTimeSlot()
        // console.log("timeSlot ", timeSlot)
        const networkList = await getAllNetworks();
        // console.log("networkList ", networkList)
        if (networkList) {
            await sendOfferToWebhook(networkList, timeSlot);
        }
    } catch (error) {
        console.log(error)
    }
    console.log(`===== EWT OFFER SCRIPT END ${moment().toDate()}=====`)
}

// (async () => {
//     // console.log(moment().toDate());
//     await this.runScript()
//     process.exit()
// })();
