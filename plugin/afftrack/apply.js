// const { makeRequest, ImportantFields, applyOfferStatusUpdate } = require('../plugin');
const debug = require("debug")("darwin:apply:afftrack");
const plugin = require('../plugin')

// curl -X POST "${apiBaseurl}${offObj.v}&answer=Offer%20Applying"

exports.ApplyApiCall = async (content) => {
    let network_id = content.credentials['network_id'];
    let api_key = content.credentials['api_key'];
    let offer_data = content['offer_data'];

    let apiBaseurl = "http://" + network_id + "/apiv2/?key=" + api_key + "&action=offer_request&format=json&id=";
    let answer = "&answer=Offer%20Applying";

    return new Promise(async (resolve, reject) => {
        for (let offObj of offer_data) {
            try {
                let result = await plugin.makeRequest({
                    method: 'post',
                    url: apiBaseurl + offObj.v + answer,
                });
                if (result) {
                    // console.log("file: apply.js ~ line 20 ~ returnnewPromise ~ result", result.data)
                    let response = result.data;
                    let OfferStatus = '';
                    if (response) {
                        if (response.id && response.status == 'APPROVED') {
                            // debug("api response: ", response.status)
                            OfferStatus = 'waitingForApproval';
                        }
                        else if (response.id && response.status == 'PENDING') {
                            // debug("api response: ", response.status)
                            OfferStatus = 'waitingForApproval';
                        }
                        else if (response['Offer ' + offObj.v + ' '] == 'APPROVED') {
                            // debug("api response: ", response['Offer ' + advertiser_offer_id + ' '])
                            OfferStatus = 'waitingForApproval';
                        }
                        else if (response.includes("OFFER NO LONGER AVAILABLE")) {
                            // debug("api response: ", response)
                            OfferStatus = 'deleted';
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
                // if (e.response)
                //     console.log(e.response.data, 'console-----------------', advertiser_offer_id)
                // else
                //     console.log(e, 'console*******************', advertiser_offer_id)

            }
        }
        return resolve(true);
    });
}





