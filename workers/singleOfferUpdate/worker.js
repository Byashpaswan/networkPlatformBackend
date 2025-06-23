require("dotenv").config({ path: ".env" });
require("../../db/connection");

const Mongoose = require('mongoose');
const mongooseObjectId = Mongoose.Types.ObjectId;
const moment = require('moment');

const { singleOfferApiPlugins } = require("../../plugin");
const { PlatformTypeModel, PlatformModel } = require('../../db/platform/Platform');
const OfferModel = require('../../db/offer/Offer');
const redis = require('../../helpers/Redis');


const fetchAndUpdateSingleOffer = async () => {

    try {

        for (let platformTypeName in singleOfferApiPlugins) {
            try {
                // console.log("<===== Line:18 ~ fetchAndUpdateSingleOffer ~ platformTypeName =====> ", platformTypeName)
                let result = await PlatformTypeModel.getPlatformTypesOne({ name: platformTypeName }, {});
                if (result) {
                    let platforms = await PlatformModel.getPlatform({ platform_id: mongooseObjectId(result._id), status: "1" }, {});
                    if (platforms && platforms.length) {
                        for (let j = 0; j < platforms.length; j++) {
                            let obj = platforms[j];
                            if (obj.credentials.length) {

                                let content = {
                                    'network_id': obj.network_id,
                                    'nid': obj.nid,
                                    'advertiser_id': obj.advertiser_id,
                                    'aid': obj.aid,
                                    'advertiser_name': obj.advertiser_name,
                                    'platform_id': obj.platform_id,
                                    'plty': obj.plty,
                                    'platform_name': obj.platform_name,
                                    'advertiser_platform_id': obj._id,
                                    'plid': obj.plid,
                                    'credentials': obj.credentials.reduce((credentials, curr) => {
                                        credentials[curr.key] = curr.val;
                                        return credentials;
                                    }, {})
                                }
                                // console.log("<===== Line:39 ~ fetchAndUpdateSingleOffer ~ content", content)

                                // let dateTo = moment().format();
                                // let dateFrom = moment().subtract(1, 'd').format();
                                // updatedAt: { $gte: dateFrom, $lte: dateTo },

                                let cursor = await OfferModel.getOffersByBatch({ network_id: obj.network_id, advertiser_platform_id: obj._id, advertiser_id: obj.advertiser_id, status: 2 }, { advertiser_offer_id: 1, _id: 1 });
                                for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
                                    // console.log("<===== Line:59 ~ fetchAndUpdateSingleOffer worker ~ cursor ~ doc =====>", doc);
                                    if (doc['advertiser_offer_id']) {
                                        let ackMsg = await singleOfferApiPlugins[platformTypeName.trim()].singleOfferUpdate(content, doc['advertiser_offer_id'])
                                        if (ackMsg) {
                                            await redis.incrementRedisKey(`SINGLEOFFERWORKER:${obj._id}`)
                                        }
                                    }
                                }
                            }
                        }
                    }
                    // else {
                    //     console.log("<===== Line:55 ~ fetchAndUpdateSingleOffer worker ~ Advertiser Platform not found =====>");
                    // }
                }
                // else {
                //     console.log("<===== Line:59 ~ fetchAndUpdateSingleOffer worker ~ Platform type not found =====>");
                // }
            } catch (error) {
                console.log(`<===== Line:62 ~ fetchAndUpdateSingleOffer worker ~ error =====> ${error}`);
            }
        }
    } catch (error) {
        console.log(`<===== Line:66 ~ fetchAndUpdateSingleOffer worker ~ error =====> ${error}`);
    }
}

fetchAndUpdateSingleOffer();