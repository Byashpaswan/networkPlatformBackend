// const { singleOfferUpdate } = require('./offers');
const debug = require("debug")("darwin:apply:orangear");
const plugin = require('../plugin')

exports.ApplyApiCall = async (content) => {
    // let network_id = content.credentials['network_id'];
    let api_key = content.credentials['api_key'];
    let offer_data = content['offer_data'];

    console.log(' api_key -> ', content.credentials['api_key']);
    return new Promise(async (resolve, reject) => {
        let advertiser_offer_id = "";
        for (let offObj of offer_data) {
            advertiser_offer_id = offObj.v;
            let apiBaseurl = `https://api.trackier.com/v2/publishers/campaign/${advertiser_offer_id}/access`;
        try {
            let result = await plugin.makeRequest({
                method: 'post',
                url: apiBaseurl,
                headers: { 'X-API-Key': api_key}
            });
            result = result.data;
            if (result) {
                if(result && result.success && result['message'] == "Campaign Access has been requested!!!" ){
                    // waiting for approval.
                    await plugin.updateStatusApplyApiRes(offObj.k);                                              
                }else if(result && !result.success && result.errors && result.errors[0]['message'].includes("Request Already Sent for campaign ID")){
                    // waiting for approval   
                    await plugin.updateStatusApplyApiRes(offObj.k);                                              
                }else{
                    // update redis 
                    await plugin.updateMessageInRedis(content.platform_name, offObj.k, JSON.stringify(result));
                }
            }
        }
        catch (e) {
            console.log("file: apply.js ~ line 49 ~ returnnewPromise ~ e", e)
        }
    }
    return resolve(true);
})
}

