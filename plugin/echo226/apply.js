// const { makeRequest, ImportantFields, applyOfferStatusUpdate } = require('../plugin');
const debug = require("debug")("darwin:apply:echo226/leverage");
const plugin = require("../plugin")
exports.ApplyApiCall = async (content) => {
    let network_id = content.credentials['network_id'];
    let api_key = content.credentials['api_key'];
    let affiliate_id = content.credentials['affiliate_id'];
    let offer_data = content['offer_data'];

    let apiBaseurl = "http://" + network_id + "/2015-03-01/bulk/" + affiliate_id + "/apply?auth=" + api_key;
    let answer = "Offer Applying";
    let response = '';
    let OfferStatus = '';

    return new Promise(async (resolve, reject) => {
        for (let offObj of offer_data) {
            try {
                let result = await plugin.makeRequest({
                    method: 'post',
                    url: apiBaseurl,
                    headers: { 'API-Key': api_key },
                    data: {
                        offers: [+offObj.v],
                    },

                });
                if (result) {
                    response = result.data;
                    OfferStatus = '';
                    // debug(response);
                    if (response && response[0]) {
                        response = response[0];
                        if (response.success && response.message) {
                            OfferStatus = 'waitingForApproval';
                        }
                        if (OfferStatus) {
                            // debug("Offer status : ", OfferStatus)
                            let res = await plugin.applyOfferStatusUpdate(offObj.v, offObj.k, OfferStatus, content.network_id, content.advertiser_id, content.advertiser_platform_id, plugin.ImportantFields);
                        }
                        else {
                            // debug(response)
                        }
                    }
                }
            }
            catch (e) {
                console.log("file: apply.js ~ line 47 ~ returnnewPromise ~ e", e)
            }
        }
        return resolve(true);
    });
}





