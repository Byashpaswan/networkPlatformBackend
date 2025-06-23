require('dotenv').config({ path: '.env' });
require('../db/connection')

const moment = require('moment');
const mongoose = require('mongoose');
const mongooseObjectId = mongoose.Types.ObjectId;

const offerModel = require('../db/offer/Offer')
const { PlatformModel } = require('../db/platform/Platform');
const { sendJobToGenericWorker } = require("../helpers/Functions");
const NetworkModel = require("../db/network/Network");

const netUniqueIdList = JSON.parse(process.env.MY_NETWORK_LIST) || [];

const sendOfferForSync = async (startDate, endDate, networkIdList) => {
    try {
        let count = 0;
        let credentials = {};
        let payoutPercent = {};
        for (const netId of networkIdList) {
            let cursor = await offerModel.getOffersByBatch(
                { network_id: netId, status: { $gte: 2, $lte: 3 }, updatedAt: { $gte: startDate, $lte: endDate } },
                { "_id": 0, "network_id": 1, "advertiser_id": 1, "advertiser_name": 1, "platform_id": 1, "advertiser_platform_id": 1, "platform_name": 1, "advertiser_offer_id": 1 }
            );
            for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
                if (!credentials[doc.advertiser_platform_id]) {
                    let advPlatRes = await PlatformModel.getOnePlatform(
                        { _id: doc.advertiser_platform_id },
                        { credentials: 1, payout_percent: 1 }
                    );
                    credentials[doc.advertiser_platform_id] = advPlatRes['credentials'].reduce((obj, curr) => {
                        obj[curr.key] = curr.val;
                        return obj;
                    }, {});
                    payoutPercent[doc.advertiser_platform_id] = advPlatRes['payout_percent']
                }

                if (doc.network_id && doc.advertiser_id && doc.advertiser_name && doc.platform_id && doc.platform_name && doc.advertiser_platform_id && credentials[doc.advertiser_platform_id]) {
                    let content = {
                        'network_id': doc.network_id,
                        'advertiser_id': doc.advertiser_id,
                        'advertiser_name': doc.advertiser_name,
                        'platform_id': doc.platform_id,
                        'platform_name': doc.platform_name,
                        'advertiser_platform_id': doc.advertiser_platform_id,
                        'advertiser_offer_id': doc.advertiser_offer_id,
                        'payout_percent': payoutPercent[doc.advertiser_platform_id],
                        'credentials': credentials[doc.advertiser_platform_id],
                    };
                    let pubRes = await sendJobToGenericWorker({ workerName: "autoSyncOffer", workerData: content }, priority = 14);
                    if (pubRes) count += 1;
                }
            };
        }
        console.log(`======= ${count} offers auto synced =======`)
    } catch (err) {
        console.log("Auto Sync Offers ~ err ==> ", err)
    }
}

const getNetworkIdList = async () => {
    try {
        let networks = await NetworkModel.findAllNetwork(
            { network_unique_id: netUniqueIdList },
            { _id: 1 }
        );
        return networks
    }
    catch (error) {
        console.log("auto sync offer ~ error ====> ", error)
        return null;
    }
}

exports.startSyncOffer = async () => {
    try {
        let networkIdList = await getNetworkIdList();
        if (!networkIdList || !networkIdList.length) {
            console.log("auto sync offer ~ error ====> Network not found!");
            process.exit(1);
        }

        networkIdList = networkIdList.map(obj => mongooseObjectId(obj._id))

        let startDate = moment().subtract(7, 'days').startOf('day').toDate();
        if (process.argv[2]) startDate = moment(process.argv[2]).startOf('day').toDate();

        let endDate = moment().endOf('day').toDate();
        if (process.argv[3]) endDate = moment(process.argv[3]).endOf('day').toDate();

        await sendOfferForSync(startDate, endDate, networkIdList);
    } catch (error) {
        console.log("Auto sync offer ~ error ====> ", error)
    }
    process.exit(1)
}

this.startSyncOffer();