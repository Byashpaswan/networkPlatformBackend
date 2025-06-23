const { InsertUpdateOffer, makeRequest, getOffersFields, addExtraFields, ImportantFields, defaultLog, mergeOfferLog, lockOfferApiStats } = require('../plugin');

const { ActiveApi, InactiveApi } = require('../../helpers/Functions');
const debug = require("debug")("darwin:Plugin:gamespipe");
const ENV_OFFERS_LIMIT = process.env.ENV_OFFERS_LIMIT;
const moment = require('moment');
const limit = 1000;
exports.countApiPages = (response) => {
    let page = 0;
    try {
        return response['total'];
    }
    catch (err) {
        return 0;
    }
}

// update pid after check sample tracking link.
exports.getPid = (url) =>{
    if(!url){
        return null;
    }
    let urlData = new URL(url);
    return urlData.searchParams.get('a');
}
exports.getPidLocation = ()=>{
    return {
        lop : 'query', // lop means locations of pid
        location : 'a'
    }
}

exports.apiCall = async (credentials, page, apilimit) => {
    if (credentials.network_id && credentials.api_key) {
        let network_id = credentials['network_id'];
        let api_key = credentials['api_key'];
        let apiBaseurl = "https://" + network_id + ".native.api.upaxis.io/affiliate/getactiveoffers/2?apikey=" + api_key + "&offerid=0";
        return await makeRequest({
            method: 'get',
            url: apiBaseurl,
            header: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        });
    }
    else {
        return null;
    }

}
exports.offersApiCall = async (content) => {
    let valid = false;
    let offerLog = defaultLog();
    let start_time = moment();
    let page = 0;
    let totalPages = 1;
    return new Promise(async (resolve, reject) => {
        try {
            let result;
            do {
                result = await this.apiCall(content.credentials, page, limit);
                if (result) {
                    valid = this.checkValid(result.data);
                    if (valid === true) {
                        let data = this.fetchResponse(result.data);
                        content['domain'] = content.credentials['network_id'] + ".native.api.upaxis.io";
                        let offer = this.traverseOffer(data, content);
                        let tempLog = await InsertUpdateOffer(ImportantFields, offer, content);
                        totalPages = this.countApiPages(result.data);
                        page++;
                        offerLog = mergeOfferLog(offerLog, tempLog);
                        await ActiveApi(content);
                    } else {
                        await InactiveApi(content);
                        await lockOfferApiStats(offerLog, content, start_time, remarks = `Fail, Api Response Status Code : ${result.status}, checkValid = false, Page = ${page}`);
                        return resolve(false);
                    }
                } else {
                    await InactiveApi(content);
                    await lockOfferApiStats(offerLog, content, start_time, remarks = `Fail, Not Get Api Response, Reponse = null, Page = ${page}`);
                    return resolve(false);
                }
            } while (page <= totalPages);
            await lockOfferApiStats(offerLog, content, start_time, remarks = `Success, Api Response Status Code : ${result.status}, Page = ${page}`);
            return resolve(true);
        }
        catch (err) {
            debug(err);
            await InactiveApi(content);
            await lockOfferApiStats(offerLog, content, start_time, remarks = `Fail, Api Response Error Msg : ${err}, Catch block, Page = ${page}`);
            return resolve(false);
        }
    });

}

exports.checkValid = (result) => {
    if (result && result['offers'] && result['offers'].length) {
        return true;
    }
    else {
        return false;
    }
}

exports.fetchResponse = (result) => {
    return result['offers'];
}
exports.traverseOffer = (result, content) => {
    let offers = {};
    result.map(function (data) {
        try {
            if (data) {

                let temp = formateOffers(data);

                if (temp.advertiser_offer_id) {
                    temp = addExtraFields(temp, content);
                    if (offers[temp.advertiser_offer_id]) {
                    }
                    offers[temp.advertiser_offer_id] = temp;
                }
            }
        }
        catch (err) {
            debug(err);
            // console.log('error', err); //skip this offer
        }
    });
    return offers;
}

//api wise methods
function getCategory(field, data) {
    let category = [];
    return category;
}

function getOfferId(field, data) {
    let offer_id = '';
    if (data.offerID) {
        offer_id = data.offerID;
    }
    return offer_id;
}

function getOfferName(field, data) {
    let offer_name = '';
    if (data.offerName)
        offer_name = data.offerName;
    return offer_name;
}

function getIsGoalEnabled(field, data) {
    let goal_enable = false;
    return goal_enable;
}

function getGoals(field, data) {
    let goal = [];
    return goal;
}

function defaultGoal() {
    let goal = {
        goal_id: '',
        name: '',
        type: '',
        tracking_method: '',
        tracking_link: '',
        status: '',
        payout_type: '',
        payout: 0,
        revenue: 0,
        description: ''
    }
    return goal;
}

function defaultCreative() {
    let creative = {
        creative_id: '',
        name: '',
        creative_type: '',
        width: 0,
        height: 0,
        landing_page_url: '',
        tracking_link: '',
        creative_file: '',
        status: '',
        description: ''
    }
    return creative;
}

function getCurrency(field, data) {
    let currency = 'USD';
    return currency;
}

function getRedirectionMethod(field, data) {
    let method = 'javascript_redirect';
    return method;
}

function getThumbnail(field, data) {
    let thumbnail = '';
    return thumbnail;
}

function getDescription(field, data) {
    let description = '';
    if (data['geos'] && data['geos'].length) {
        for (let item of data['geos']) {
            description = " geos:" + item['geos'] + ":" + "payout:" + item['payout'] + ", ";
        }
    }
    return description;
}

function getKpi(field, data) {
    let kpi = '';
    if (data.optimizationKPI) {
        kpi = data.optimizationKPI;
    }
    if (data.paymentKPI) {
        kpi = kpi + " " + data.paymentKPI;
    }
    return kpi;
}

function getPreviewUrl(field, data) {
    let preview_url = '';
    if (data.previewLink) {
        preview_url = data.previewLink;
    }
    return preview_url;
}

function getTrackingLink(field, data) {
    let tracking_link = '';
    if (data.trackingLink) {
        tracking_link = data.trackingLink.split('&sourceid')[0];
    }
    return tracking_link;
}

function getExpiredUrl(field, data) {
    let expired_url = '';
    return expired_url;
}

function getStartDate(field, data) {
    let start_date = moment();
    try {
        if (data.creationTime) {
            start_date = moment(data.creationTime, 'YYYY/MM/DD');
            start_date = start_date.toISOString();
        }
    } catch (error) {
        start_date = moment();
    }
    return start_date;
}

function getEndDate(field, data) {
    let end_date = moment().add(1, 'Y');
    return end_date;
}

function getRevenue(field, data) {
    let revenue = 0.0;
    if (data['geos']) {
        let tempPayout = data['geos'][0]['payout'];
        for (let item of data['geos']) {
            if (item['payout'] < tempPayout) {
                tempPayout = item['payout'];
            }
        }
        revenue = tempPayout;
    }
    return revenue;
}

function getRevenueType(field, data) {
    let revenue_type = { enum_type: '', offer_type: '' };
    if (data.paidAction) {
        switch (data.paidAction) {
            case 1:
                revenue_type.offer_type = 'CPI';
                break;
            case 2:
                revenue_type.offer_type = 'CPA';
                break;
            case 3:
                revenue_type.offer_type = 'CPC';
                break;
            case 4:
                revenue_type.offer_type = 'CPM';
        }
    }
    return revenue_type;
}

function getPayout(field, data) {
    let payout = 0.0;
    if (data['geos']) {
        let tempPayout = data['geos'][0]['payout'];
        for (let item of data['geos']) {
            if (item['payout'] < tempPayout) {
                tempPayout = item['payout'];
            }
        }
        payout = tempPayout;
    }
    return payout;
}

function getPayoutType(field, data) {
    let payout_type = { enum_type: '', offer_type: '' };
    if (data.paidAction) {
        switch (data.paidAction) {
            case 1:
                payout_type.offer_type = 'CPI';
                break;
            case 2:
                payout_type.offer_type = 'CPA';
                break;
            case 3:
                payout_type.offer_type = 'CPC';
                break;
            case 4:
                payout_type.offer_type = 'CPM';
        }
    }
    return payout_type;
}

function getApprovalRequired(field, data) {
    let approval_required = false;
    if (!data.trackingLink)
        approval_required = true;
    return approval_required;
}

function getIsCapEnabled(field, data) {
    let cap_enable = false;
    if (data['geos'] && data['geos'].length) {
        cap_enable = true;
    }
    return cap_enable;
}

function getOfferCapping(field, data) {
    let cap = defaultCap();
    if (data['geos'] && data['geos'].length) {
        for (let item of data['geos']) {
            for (let i in item['caps']) {
                if (item['caps'][i]['capInterval']) {
                    if (item['caps'][i]['capInterval'] == 1) {
                        cap.daily_conv = +item['caps'][i]['cap'];
                    } else if (item['caps'][i]['capInterval'] == 3) {
                        cap.monthly_conv = +item['caps'][i]['cap'];
                    }
                }
            }
        }
    }
    return cap;
}

function defaultCap() {
    let cap = {
        daily_clicks: 0,
        monthly_clicks: 0,
        overall_click: 0,
        daily_conv: 0,
        monthly_conv: 0,
        overall_conv: 0,
        payout_daily: 0,
        monthly_payout: 0,
        overall_payout: 0,
        daily_revenue: 0,
        monthly_revenue: 0,
        overall_revenue: 0
    }
    return cap;
}

function getIsTargeting(field, data) {
    let targeting_enable = false;
    if (data.geos || data.platform) {
        targeting_enable = true;
        for (let item of data['geos']) {
            if (item['geos'].toLowerCase() == 'all' && !data['platform']) {
                targeting_enable = false;
            }
        }
    }
    return targeting_enable;
}

function getGeoTargeting(field, data) {
    let geo_targeting = defaultGeoTargeting();
    if (data.geos && data.geos.length) {
        for (let item of data.geos) {
            if (item['geos'].toLowerCase() != 'all') {
                let tempData = item['geos'].split('/');
                for (let geo of tempData) {
                    geo_targeting.country_allow.push({ key: geo, value: geo });
                }
            }
        }
    }
    return geo_targeting;
}

function defaultGeoTargeting() {
    let geo_targeting = {
        country_allow: [],
        country_deny: [],
        city_allow: [],
        city_deny: []
    }
    return geo_targeting;
}

function getDeviceTargeting(field, data) {
    let device_targeting = defaultDeviceTargeting();
    if (data.platform) {
        switch (data.platform) {
            case 1:
                device_targeting.device.push('desktop');
                break;
            case 2:
                device_targeting.device.push('mobile');
                device_targeting.os.push('ios');
                break;
            case 3:
                device_targeting.device.push('mobile');
                device_targeting.os.push('android');
                break;
            case 4:
                device_targeting.device.push('mobile');
                device_targeting.os.push('android');
                device_targeting.os.push('ios');
                break;
            case 5:
                device_targeting.device.push('mobile');
                device_targeting.os.push('windows');
        }
    }
    return device_targeting;
}

function defaultDeviceTargeting() {
    let device_targeting = {
        device: [],
        os: [],
        os_version: []
    }
    return device_targeting;
}

function getCreative(field, data) {
    let creative = [];
    if (data.creatives) {
        for (let item of data.creatives) {
            let tempCreative = defaultCreative();
            tempCreative['creative_file'] = item;
            creative.push(tempCreative);
        }
    }
    return creative;
}

function getOfferVisible(field, data) {
    let offer_visible = 'public';
    return offer_visible;
}

function getStatusLabel(field, data) {
    let status_label = 'unmanaged';
    if (data.trackingLink) {
        status_label = "active";
    } else {
        status_label = "no_link"
    }
    return status_label;
}


const gamespipe = {
    getOfferId: (field, data) => {
        return getOfferId(field, data);
    },
    getOfferName: (field, data) => {
        return getOfferName(field, data);
    },
    getCategory: (field, data) => {
        return getCategory(field, data);
    },
    getIsGoalEnabled: (field, data) => {
        return getIsGoalEnabled(field, data);
    },
    getGoals: (field, data) => {
        return getGoals(field, data);
    },
    getCurrency: (field, data) => {
        return getCurrency(field, data);
    },
    getThumbnail: (field, data) => {
        return getThumbnail(field, data);
    },
    getDescription: (field, data) => {
        return getDescription(field, data);
    },
    getKpi: (field, data) => {
        return getKpi(field, data);
    },
    getPreviewUrl: (field, data) => {
        return getPreviewUrl(field, data);
    },
    getTrackingLink: (field, data) => {
        return getTrackingLink(field, data);
    },
    getExpiredUrl: (field, data) => {
        return getExpiredUrl(field, data);
    },
    getStartDate: (field, data) => {
        return getStartDate(field, data);
    },
    getEndDate: (field, data) => {
        return getEndDate(field, data);
    },
    getRevenue: (field, data) => {
        return getRevenue(field, data);
    },
    getRevenueType: (field, data) => {
        return getRevenueType(field, data);
    },
    getPayout: (field, data) => {
        return getPayout(field, data);
    },
    getPayoutType: (field, data) => {
        return getPayoutType(field, data);
    },
    getApprovalRequired: (field, data) => {
        return getApprovalRequired(field, data);
    },
    getIsCapEnabled: (field, data) => {
        return getIsCapEnabled(field, data);
    },
    getOfferCapping: (field, data) => {
        return getOfferCapping(field, data);
    },
    getIsTargeting: (field, data) => {
        return getIsTargeting(field, data);
    },
    getGeoTargeting: (field, data) => {
        return getGeoTargeting(field, data);
    },
    getDeviceTargeting: (field, data) => {
        return getDeviceTargeting(field, data);
    },
    getCreative: (field, data) => {
        return getCreative(field, data);
    },
    getOfferVisible: (field, data) => {
        return getOfferVisible(field, data);
    },
    getStatusLabel: (field, data) => {
        return getStatusLabel(field, data);
    },
    getRedirectionMethod: (field, data) => {
        return getRedirectionMethod(field, data);
    }
}

function formateOffers(offer) {
    let formatedOffer = {};
    array = getOffersFields('', '');
    array.map(function (obj) {
        try {
            let field = obj.field;
            let action = obj.action;
            let data = gamespipe[action](field, offer);
            formatedOffer[field] = data;
        }
        catch (err) {
            debug(err);

        }
    })
    return formatedOffer;
}