// const { makeRequest, ImportantFields, applyOfferStatusUpdate } = require('../plugin');
// const { singleOfferUpdate } = require('./offers');
const debug = require("debug")("darwin:apply:offer18");
const moment = require('moment')
const plugin = require('../plugin');

exports.ApplyApiCall = async (content) => {
    return new Promise(async (resolve, reject) => {
        // let network_id = content.credentials['network_id'];
        let api_key = content.credentials['api_key'];
        let affiliate_id = content.credentials['affiliate_id'];
        let mid = content.credentials['mid'];
        let offer_data = content['offer_data'];
        // let singlePlatformTypeData = await platformController.getSingleSyncPlatformType();

        let apiBaseurl = "https://api.offer18.com/api/af/offer_request?aid=" + affiliate_id + "&mid=" + mid + "&key=" + api_key + "&offer_id=";

        if (offer_data && offer_data.length) {
            try {
                let advertiser_offer_ids = "";
                for (let offObj of offer_data) {
                    advertiser_offer_ids = advertiser_offer_ids + offObj.v + ","
                }
                let result = await plugin.makeRequest({
                    method: 'post',
                    url: apiBaseurl + advertiser_offer_ids.slice(0, -1),
                    timeout: 30
                });

                if (result) {
                    let responseData = result;
                    let final_message = ''
                    
                    for (let offObj of offer_data) {
                        final_message = responseData[offObj.v];

                        if(final_message == 'Approved' || final_message == 'Already Approved' ) {
                            await plugin.sendToSyncOffer(offObj.k, offObj.plty);

                        }else if (final_message == "Pending For Approval" || final_message == "Request Already Exists") {
                            // for Sync Offer 
                            await plugin.updateStatusApplyApiRes(offObj.k);

                        }
                        else{
                            await plugin.updateMessageInRedis(content['platform_name'], offObj.k, final_message);
                        }                    
                    }
                }
            }
            catch (error) {
                console.log("file: apply.js ~ line 50 ~ returnnewPromise ~ error", error)
            }
        }
        return resolve(true);
    });
}





