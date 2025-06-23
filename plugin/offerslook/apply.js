// const { makeRequest, ImportantFields, applyOfferStatusUpdate } = require('../plugin');
const { singleOfferUpdate } = require('./offers');
const plugin = require('../plugin')
const debug = require("debug")("darwin:apply:Offerslook");
const moment = require('moment')
// curl -X POST "apiBaseurl" \
//      -H "Authorization: Basic basicHeader" \
//      --max-time 40


exports.getPid = (url, sample_pid_name) =>{
    if(!url){
        return null;
    }
    let urlData = new URL(url);
    return urlData.searchParams.get('affiliate_id');
}


exports.ApplyApiCall = async (content) => {
    let network_id = content.credentials['network_id'];
    let api_key = content.credentials['api_key'];
    let login_email = content.credentials['login_email'];
    let offer_data = content['offer_data'];

    let key = login_email + ':' + api_key;
    let basicHeader = Buffer.from(key).toString('base64');
    let response = '';

    return new Promise(async (resolve, reject) => {

        if (offer_data && offer_data.length) {
            offer_data = chunkArrayInGroups(offer_data, 50);
            for (let i = 0; i < offer_data.length; i++) {                
                let advertiser_offer_ids = "";
                for (let tempOffObj of offer_data[i]) {
                    advertiser_offer_ids = advertiser_offer_ids + tempOffObj.v + ",";
                }
                try {
                    let apiBaseurl = "https://" + network_id + "/aff/v1/batches/offers/applys/" + advertiser_offer_ids;
                    let result = await plugin.makeRequest({
                        method: 'post',
                        url: apiBaseurl,
                        headers: { 'Authorization': 'Basic ' + basicHeader },
                        timeout: 40000
                    });
                    if (result) {
                        response = result.data;
                        if (response && response.code == '0' && response.message == "Success" && response.data && response.data.offer_application && response.data.offer_application.length) {
                            let offer_application = response.data.offer_application;
                            for (let offObj of offer_data[i]) {                                
                                let index = offer_application.findIndex(x => x.offer_id == +offObj.v);
                                if (index >= 0) {
                                    if (offer_application[index].status == "approved") {                                    
                                        await plugin.sendToSyncOffer(offObj.k, offObj.plty);
                                    }
                                    else if (offer_application[index].status == "pending") {                                        
                                        await plugin.updateStatusApplyApiRes(offObj.k);
                                    }
                                    else if (offer_application[index].status == null) {
                                        await plugin.updateStatusApplyApiRes(offObj.k);
                                    }else{
                                        await plugin.updateMessageInRedis(content['platform_name'], offObj.k, final_message);
                                    }
                                }
                                
                            }
                        }
                    }
                }
                catch (e) {
                    debug("file: apply.js ~ line 74 ~ returnnewPromise ~ e", e)
                }
            }
        }
        return resolve(true);
    });
}

const chunkArrayInGroups = (arr, size) => {
    var result = [];
    var pos = 0;
    while (pos < arr.length) {
        result.push(arr.slice(pos, pos + size));
        pos += size;
    }
    if (pos >= arr.length) {
        return result
    }
}