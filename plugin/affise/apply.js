// const { makeRequest, ImportantFields, applyOfferStatusUpdate } = require('../plugin');
// const { singleOfferUpdate } = require('./offers');
const debug = require("debug")("darwin:apply:affise");
const plugin = require('../plugin');
const Redis  =  require('../../helpers/Redis');
exports.ApplyApiCall = async (content) => {
    // console.log("file: apply.js ~ line 5 ~ exports.ApplyApiCall= ~ content", content)
    let network_id = content.credentials['network_id'];
    let api_key = content.credentials['api_key'];
    let offer_data = content['offer_data'];
    let date = new Date();
    let hours = parseInt(date.getHours());
    let redisKey = `FAIL:D:${date.getDate()}:${ Math.floor( hours / 4)}:${network_id}`;
    let appliedOffersKey = `APPLIED:${date.getDate()}:${hours}:${ network_id }`;
    let apiBaseurl = "http://" + network_id + "/3.0/partner/activation/offer";
    let comment = "In-App Traffic";
    let response = '';
    let OfferStatus = '';
    return new Promise(async (resolve, reject) => {
        for (let i = 0; i < offer_data.length; i++) {
            try {
                // console.log(" redisKey -> ", redisKey);
                let redisData = await Redis.getRedisData(redisKey);
                // console.log(" redisData -> ", redisData);
                if(redisData && redisData['data'] > 2 ){
                    continue;
                }
                let result = await plugin.makeRequest({
                    method: 'post',
                    url: apiBaseurl,
                    headers: { 'API-Key': api_key },
                    params: {
                        comment: comment,
                        offer_id: offer_data[i].v,
                    },
                    timeout: 10000
                });
                if( result == 'ECONNABORTED'){
                    await Redis.incrbyRedisData(redisKey,1, 3600*24*3);
                    continue;
                }
                await Redis.incrbyRedisData(appliedOffersKey, 1, 3600*24*3);
                // console.log(" result -> " , result );
                if (result) {
                    response = result.data;
                    console.log(" offer_id ",offer_data[i].k, " response Affise -> ", response);
                    OfferStatus = '';
                    if (response) {
                        let final_message = response.message || response.error || ''
                        if (final_message == "Request is successfully" || final_message == "Already requested") {
                            await plugin.updateStatusApplyApiRes(offer_data[i].k);                  
                        } 
                        else if (final_message == "Wrong offer") {  
                            await plugin.sendToSyncOffer(offer_data[i].k, offer_data[i].plty);          
                        }else{
                            await plugin.updateMessageInRedis(content['platform_name'], offer_data[i].k,final_message);
                        }
                    }
                }
            }
            catch (e) {
               console.log(' err ', e);
               debug('Affise apply');
            }
        }
        return resolve(true);
    });
}





