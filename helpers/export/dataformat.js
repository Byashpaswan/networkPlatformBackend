const Mongoose = require('mongoose');
const mongooseObjectId = Mongoose.Types.ObjectId;
const { getNetworkData } = require('../../helpers/Functions');


exports.offerTransformer = async (doc, transformerData, offerProjection) => {

    let data = {};
    if (doc.offer_name) {
        doc.offer_name = doc.offer_name.replace(/;/g, '');
        doc.offer_name = doc.offer_name.replace(/,/g, '');
        doc.offer_name = doc.offer_name.replace(/\t/g, '');
    }
    if (transformerData.network_setting) {
        network_setting = "&" + transformerData.network_setting;
    }
    else {
        network_setting = ''
    }
    for (i = 0; i < offerProjection.length; i++) {

        let temp = offerProjection[i];
        let offerKey, offerSubKey;
        if (temp.includes(".")) {
            if (temp.includes('geo_targeting')) {
                data = get_geo_targeting(doc, data, temp);
            }
            else {
                offerKey = temp.split('.');
                offerSubKey = offerKey[1];
                offerKey = offerKey[0];
                if (doc[offerKey][offerSubKey]) {
                    data[offerProjection[i]] = doc[offerKey][offerSubKey];
                }
            }
        }
        else {
            if (offerProjection[i] == "offer_name") {
                data['OffersName'] = '';
                if (doc.offer_name) {
                    data['OffersName'] = doc.offer_name;
                }
            }
            else if (offerProjection[i] == "advertiser_name") {
                data['AdvertiserName'] = '';
                if (doc.advertiser_name) {
                    data['AdvertiserName'] = doc.advertiser_name;
                }
            }
            else if (offerProjection[i] == "app_id") {
                data['PackageName'] = '';
                if (doc.app_id) {
                    data['PackageName'] = doc.app_id;
                }
            }
            else if (offerProjection[i] == "platform_name") {
                data['PlatformName'] = '';
                if (doc.platform_name) {
                    data['PlatformName'] = doc.platform_name;
                }
            }
            else if (offerProjection[i] == "device_targeting") {
                data = get_device_targeting(doc, data);
            }
            else if (offerProjection[i] == "payout") {
                if (doc.payout) {
                    data['Payout'] = doc.payout;
                }
            }
            else if (offerProjection[i] == "UserId") {
                data['UserId'] = transformerData.network_unique_id;
            }
            else if (offerProjection[i] == "_id") {
                data['OfferId'] = doc._id;
            }
            else {
                offerKey = offerProjection[i];
                if (doc[offerKey]) {
                    data[offerProjection[i]] = doc[offerKey];
                }
            }

        }
    }
    if (offerProjection.includes('Link')) {
        let networkData = await getNetworkData(req.user.userDetail.network[0])
        let linkDomain = `${transformerData.network_unique_id}.${process.env.TRACKING_DOMAIN}`;
        if (networkData && networkData['domain'] && networkData['domain']['tracker']) {
            linkDomain = networkData['domain']['tracker'];
        }
        if (doc.advertiser_id) {
            let link = "http://" + linkDomain + "/" + process.env.TRACKING_PATH + "?offer_id=" + doc._id + "&aff_id=" + transformerData.publisher_id + network_setting;
            data['link'] = link.replace(/&adv_id=true/g, '')
        }
        else if (!(doc.advertiser_id)) {
            let link = "http://" + linkDomain + "/" + process.env.TRACKING_PATH + "?offer_id=" + doc._id + "&aff_id=" + transformerData.publisher_id + network_setting;
            data['link'] = link.replace(/&adv_id=true/g, '')

        }
    }

    return data;
}

function get_geo_targeting(doc, data, temp) {
    if (doc.geo_targeting.country_allow && temp == 'geo_targeting.country_allow') {

        if (doc.geo_targeting.country_allow.length > 0) {
            data['geo_targeting.country_allow'] = '';
            for (let j = 0; j < (doc.geo_targeting.country_allow).length; j++) {
                if (doc.geo_targeting.country_allow[j]['value']) {
                    data['geo_targeting.country_allow'] += doc.geo_targeting.country_allow[j]['value'] + ',';
                }
            }
            data['geo_targeting.country_allow'] = data['geo_targeting.country_allow'].slice(0, -1);
        }

    } else if (doc.geo_targeting.country_deny && temp == 'geo_targeting.country_deny') {

        if (doc.geo_targeting.country_deny.length > 0) {
            data['geo_targeting.country_deny'] = '';
            for (let j = 0; j < (doc.geo_targeting.country_deny).length; j++) {
                if (doc.geo_targeting.country_deny[j]) {
                    data['geo_targeting.country_deny'] += doc.geo_targeting.country_deny[j] + ',';
                }
            }
            data['geo_targeting.country_deny'] = data['geo_targeting.country_deny'].slice(0, -1);
        }
    }
    else if (doc.geo_targeting.city_allow && temp == 'geo_targeting.city_allow') {

        if (doc.geo_targeting.city_allow.length > 0) {
            data['geo_targeting.city_allow'] = '';
            for (let j = 0; j < (doc.geo_targeting.city_allow).length; j++) {
                if (doc.geo_targeting.city_allow[j]) {
                    data['geo_targeting.city_allow'] += doc.geo_targeting.city_allow[j] + ',';
                }
            }
            data['geo_targeting.city_allow'] = data['geo_targeting.city_allow'].slice(0, -1);
        }

    }
    else if (doc.geo_targeting.city_deny && temp == 'geo_targeting.city_deny') {

        if (doc.geo_targeting.city_deny.length > 0) {
            data['geo_targeting.city_deny'] = '';
            for (let j = 0; j < (doc.geo_targeting.city_deny).length; j++) {
                if (doc.geo_targeting.city_deny[j]) {
                    data['geo_targeting.city_deny'] += doc.geo_targeting.city_deny[j] + ',';
                }
            }
            data['geo_targeting.city_deny'] = data['geo_targeting.city_deny'].slice(0, -1);
        }
    }
    return data;
}

function get_device_targeting(doc, data) {
    if (doc.device_targeting) {
        for (let i in doc.device_targeting) {
            if (`${i}` == 'os_version') {
                data['device_targeting.' + `${i}`] = '';
                for (let j = 0; j < (doc.device_targeting.os_version).length; j++) {
                    if (doc.device_targeting[i][j]['version']) {
                        data['device_targeting.' + `${i}`] += doc.device_targeting[i][j]['version'] + ',';
                    }
                }
                data['device_targeting.' + `${i}`] = data['device_targeting.' + `${i}`].slice(0, -1);
            }
            else if (`${i}` == "device" || `${i}` == "os") {
                data['device_targeting.' + `${i}`] = '';
                for (let j = 0; j < (doc.device_targeting[i]).length; j++) {
                    if (doc.device_targeting[i][j]) {
                        data['device_targeting.' + `${i}`] += doc.device_targeting[i][j] + ',';
                    }
                }
                data['device_targeting.' + `${i}`] = data['device_targeting.' + `${i}`].slice(0, -1);
            }
        }
    }
    return data;
}


