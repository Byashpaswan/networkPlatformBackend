// const { makeRequest, ImportantFields, applyOfferStatusUpdate } = require('../plugin');
const { singleOfferUpdate } = require('./offers');
const debug = require("debug")("darwin:apply:orangear");
const plugin = require('../plugin')
exports.ApplyApiCall = async (content) => {
    let network_id = content.credentials['network_id'];
    let api_key = content.credentials['api_key'];
    let offer_data = content['offer_data'];

    let apiBaseurl = "https://" + network_id + "/affiliate/offer/approve/?token=" + api_key + "&offer_id=";

    return new Promise(async (resolve, reject) => {
        let advertiser_offer_ids = "";
        for (let offObj of offer_data) {
            advertiser_offer_ids = advertiser_offer_ids + offObj.v + ","
        }
        try {
            let result = await plugin.makeRequest({
                method: 'post',
                url: apiBaseurl + advertiser_offer_ids,
            });
            if (result) {
                // console.log("file: apply.js ~ line 21 ~ returnnewPromise ~ result", result.data)
                let response = result.data;
                if (response) {
                    if (response.success && response.approvals && Object.keys(response.approvals).length) {
                        for (let offObj of offer_data) {
                            let OfferStatus = '';
                            if (response.approvals[offObj.v] && response.approvals[offObj.v]['Status'] == 'approved') {
                                let result = await singleOfferUpdate(content, offObj.v)
                                // if (!result) OfferStatus = 'waitingForApproval';
                            }
                            else {
                                OfferStatus = 'rejected';
                            }
                            if (OfferStatus) {
                                // console.log("file: apply.js ~ line 36 ~ returnnewPromise ~ OfferStatus", OfferStatus)
                                let res = await plugin.applyOfferStatusUpdate(offObj.v, offObj.k, OfferStatus, content.network_id, content.advertiser_id, content.advertiser_platform_id, plugin.ImportantFields);
                            }
                        }
                    }
                    else if (response.success === false && response.error_messages && response.error_messages.includes('Approvals not found')) {
                        for (let offObj of offer_data) {
                            let res = await plugin.applyOfferStatusUpdate(offObj.v, offObj.k, 'rejected', content.network_id, content.advertiser_id, content.advertiser_platform_id, plugin.ImportantFields);
                        }
                    }
                }
            }
        }
        catch (e) {
            console.log("file: apply.js ~ line 49 ~ returnnewPromise ~ e", e)
        }
        return resolve(true);
    });
}





