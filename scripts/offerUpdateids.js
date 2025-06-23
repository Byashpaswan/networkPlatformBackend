require('dotenv').config({ path: '.env' });
require('../db/connection');

const Promise = require('promise');
const OfferModel = require('../db/offer/Offer');
const NetworkModel = require('../db/network/Network');
const AdvertiserModel = require('../db/advertiser/Advertiser');
const { PlatformModel, PlatformTypeModel } = require('../db/platform/Platform')

const getAdvertisers = new Promise(async (resolve, reject) => {
    try {
        let dbResult = await AdvertiserModel.getAdvertiser({}, { _id: 1, aid: 1 });
        let advObj = dbResult.reduce((obj, curr) => {
            obj[curr._id] = curr.aid;
            return obj
        }, {});
        resolve(advObj);
    } catch (error) {
        console.log(error);
        reject()
    }
})
const getPlatforms = new Promise(async (resolve, reject) => {
    try {
        let dbResult = await PlatformModel.getPlatform({}, { _id: 1, plid: 1 });
        let plObj = dbResult.reduce((obj, curr) => {
            obj[curr._id] = curr.plid;
            return obj
        }, {});
        resolve(plObj);
    } catch (error) {
        console.log(error);
        reject()
    }
})
const getPlatformTypes = new Promise(async (resolve, reject) => {
    try {
        let dbResult = await PlatformTypeModel.getPlatformTypes({}, { _id: 1, plty: 1 });
        let pltyObj = dbResult.reduce((obj, curr) => {
            obj[curr._id] = curr.plty;
            return obj
        }, {});
        resolve(pltyObj);
    } catch (error) {
        console.log(error);
        reject()
    }
})
const getNetworks = new Promise(async (resolve, reject) => {
    try {
        let dbResult = await NetworkModel.findAllNetwork({}, { _id: 1, nid: 1 });
        let netObj = dbResult.reduce((obj, curr) => {
            obj[curr._id] = curr.nid;
            return obj
        }, {});
        resolve(netObj)
    } catch (error) {
        console.log(error);
        reject();
    }
})


const updateOfferNidAidPlidPltyid = async (netObj, advObj, plObj, plTyObj) => {
    try {
        let cursor = await OfferModel.getOffersByBatch({}, { _id: 1, network_id: 1, advertiser_id: 1, advertiser_platform_id: 1, platform_id: 1 });
        for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
            try {
                let [nid, aid, plid, plty] = [netObj[doc.network_id.toString()], advObj[doc.advertiser_id.toString()], plObj[doc.advertiser_platform_id.toString()], plTyObj[doc.platform_id.toString()]];
                if (nid && aid && plid && plty) {
                    console.log("Updated offer id =======> ", doc._id);
                    await OfferModel.updateOffer(
                        { _id: doc._id },
                        { $set: { "nid": nid, "aid": aid, "plid": plid, "plty": plty } },
                        {}
                    )
                }
            } catch (error) {
                console.log("==================== error offer id =======> ", doc._id);
            }
        }
    } catch (error) {
        console.log(error);
    }
}

(async () => {
    Promise.all([getNetworks, getAdvertisers, getPlatforms, getPlatformTypes])
        .then(async ([netObj, advObj, plObj, plTyObj]) => {
            await updateOfferNidAidPlidPltyid(netObj, advObj, plObj, plTyObj);
            console.log("<===== Completed =====>")
            process.exit();
        })
})();