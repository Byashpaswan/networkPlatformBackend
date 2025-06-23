const Promise = require('promise');
const Mongoose = require('mongoose');
const mongooseObjectId = Mongoose.Types.ObjectId;
// const { singleOfferApiPlugins } = require("./index");
const index = require('./index');
const plugin = require('./plugin')
// const { getWishlistList, generateHash, saveUpdatedOffer } = require('../helpers/Functions');
const helperFunctions = require('../helpers/Functions')
const moment = require('moment');
const Redis = require("../helpers/Redis");


exports.fetchSingleOfferFromApi = async (content, platform_name, advertiser_offer_id) => {
    return new Promise(async (resolve, reject) => {

        if (index.singleOfferApiPlugins[platform_name.trim()]) {
            let offer = await index.singleOfferApiPlugins[platform_name.trim()].getSingleOfferInfo(content, advertiser_offer_id);
            if (offer && content.network && offer.app_id) {
                let wishlist = await helperFunctions.getWishlistList(content.network_id);
                offer['isMyOffer'] = wishlist.includes(offer['app_id'])
            }
            if (offer && content.advertiser_platform_id) {
                let offer_visible = await plugin.getOfferVisiblity(content.advertiser_platform_id);
                offer['offer_visible'] = offer_visible.split(":")[0]
            }
            resolve(offer)
        }
        else {
            resolve(false)
        }
    })
}

exports.syncAndUpdateOfferFromAPi = async (content, platform_name, advertiser_offer_id, oldOfferData = []) => {
    let myOffer = oldOfferData
    return new Promise(async (resolve, reject) => {
        try {
            if (index.singleOfferApiPlugins[platform_name.trim()]) {
                let date = new Date();
                let hours = parseInt(date.getHours());
                let redisKey = `FAIL:SYNC:D${Math.floor(hours/4)}:${content['advertiser_platform_id']}`;
                let failedDomainRedisData = await Redis.getRedisData(redisKey);
                if(failedDomainRedisData && failedDomainRedisData['data'] > 2 ){
                    return resolve(true);
                }          
                let newOffer = await index.singleOfferApiPlugins[platform_name.trim()].getSingleOfferInfo(content, advertiser_offer_id);
                if(newOffer == 1){
                    return resolve(true);
                }
                if (!newOffer){
                    if(myOffer.length == 1 ){
                        if (myOffer[0].appliedTime){
                            const appliedTime = moment(myOffer[0].appliedTime, 'ddd MMM DD YYYY HH:mm:ss [GMT]ZZ (z)');
                            const twentyFourHoursAgo = moment().subtract(24, 'hours');
                            if (appliedTime.isBefore(twentyFourHoursAgo)) {
                                await plugin.updateStatusDelete(content);
                            }
                        }else{
                            await plugin.updateStatusDelete(content);
                        }
                    }                    
                    return resolve(false);
                }
                await plugin.InsertUpdateOffer(plugin.ImportantFields,{ advertiser_offer_id : newOffer }, content, true, myOffer);                
                return resolve(true)
            }
            else {
                return resolve(false)
            }
        } catch (error) {
            console.log("<========== error =============> ", error)
            return resolve(false)
        }
    })
}