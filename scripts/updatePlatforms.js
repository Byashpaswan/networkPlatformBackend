require('dotenv').config({ path: '.env' });
require('../db/connection')

const networkModel = require('../db/network/Network');
const advertiserModel = require('../db/advertiser/Advertiser');
const { PlatformModel, PlatformTypeModel } = require('../db/platform/Platform');

const getNetworks = async () => {
    try {
        let netObj = {};
        let networkList = await networkModel.findAllNetwork({}, { nid: 1 })
        for (const data of networkList) {
            netObj[data._id.toString()] = data.nid;
        }
        return netObj;
    } catch (error) {
        console.log(error);
    }
}
const getAdvertisers = async () => {
    try {
        let advObj = {};
        let advertiserList = await advertiserModel.getAdvertiser({}, { aid: 1 })
        for (const data of advertiserList) {
            advObj[data._id.toString()] = data.aid;
        }
        return advObj;
    } catch (error) {
        console.log(error);
    }
}

const getPlatformTypes = async () => {
    try {
        let plTyObj = {};
        let platformTypeList = await PlatformTypeModel.getPlatformTypes({}, { plty: 1 });
        for (const data of platformTypeList) {
            plTyObj[data._id.toString()] = data.plty;
        }
        return plTyObj;
    } catch (error) {
        console.log(error);
    }
}

exports.updatePlatforms = async () => {
    try {
        let networkObj = await getNetworks();
        let platformTypesObj = await getPlatformTypes();
        let advertiserObj = await getAdvertisers();

        let platformsList = await PlatformModel.getPlatform({}, { network_id: 1, advertiser_id: 1, platform_id: 1, plid: 1 });
        for (const data of platformsList) {
            let plty = platformTypesObj[data.platform_id.toString()];
            let aid = advertiserObj[data.advertiser_id.toString()];
            let nid = networkObj[data.network_id.toString()];

            console.log(`======> _id = ${data._id.toString()}, plid = ${data.plid}, nid = ${nid}, aid = ${aid}, plty = ${plty} <======`);

            let result = await PlatformModel.updatePlatform({ _id: data._id }, { $set: { "nid": nid, "aid": aid, "plty": plty } }, { new: true });
            // console.log(result);
        }
    } catch (err) {
        console.log(err)
    }
}

this.updatePlatforms();