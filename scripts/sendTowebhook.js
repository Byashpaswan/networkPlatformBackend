require('dotenv').config({ path: '.env' });
require('../db/connection')

const mongoose = require('mongoose');
const mongooseObjectId = mongoose.Types.ObjectId;
const OfferModel = require('../db/offer/Offer');
const Function = require('../helpers/Functions');

exports.sendOfferToWebhook = async (offer_list) => {
    try {
        let networkObj = {};
        for (let offer_id of offer_list) {
            let data = await OfferModel.getOneOffer({ _id: mongooseObjectId(offer_id) }, { network_id: 1 });
            if (networkObj[data.network_id]) {
                networkObj[data.network_id].push(data._id);
            } else {
                networkObj[data.network_id] = [data._id]
            }
        }

        for (const key in networkObj) {
            await Function.publishJobForWebhook(key, networkObj[key], 'offer_update', "Unblock Offer");
        }
    }
    catch {
        console.log('Error in Fetching offer_lists');
    }
}

let offer_list = ['6386c04cd96a926fa33c4b88'];

this.sendOfferToWebhook(offer_list);