const {
    InsertUpdateOffer,
    makeRequest,
    getOffersFields,
    addExtraFields,
    ImportantFields,
    defaultLog,
    mergeOfferLog,
    lockOfferApiStats
} = require('../plugin');
const { InactiveApi, ActiveApi } = require('../../helpers/Functions');

const debug = require("debug")("darwin:Plugin:trakneo");
const ENV_OFFERS_LIMIT = process.env.ENV_OFFERS_LIMIT;
const moment = require('moment');
const limit = 500;
exports.countApiPages = (response) => {
    let page = 0;
    try {
        return page;
    } catch (err) {
        return 0;
    }
}


// update aff_id after find right pid
exports.getPid = (url) =>{
    if(!url){
        return null;
    }
    let urlData = new URL(url);
    return urlData.searchParams.get('aff_id');
}

exports.getPidLocation = ()=>{
    return {
        lop : 'query', // lop means locations of pid
        location : 'aff_id'
    }
}

exports.apiCall = async (credentials, apilimit) => {
    if (credentials.token && credentials.client_domain) {
        let token = credentials['token'];
        let client_domain = credentials['client_domain'];
        let apiBaseurl = "https://api-server-gcp.trakneo.com/api/campaigns/";
        return await makeRequest({
            method: 'get',
            url: apiBaseurl,
            headers: {
                'Authorization': token,
                'Origin': "https://" + client_domain + ".trakneo.com"
            }
        });
    } else {
        return null;
    }
}

exports.offersApiCall = async (content) => {
    let valid = false;
    let offerLog = defaultLog();
    let start_time = moment();
    let page = 1;
    let totalPages = 1;
    return new Promise(async (resolve, reject) => {
        try {
            let result = await this.apiCall(content.credentials, limit);
            if (result) {
                valid = this.checkValid(result.data);
                if (valid === true) {
                    let data = this.fetchResponse(result.data);
                    content['domain'] = "api-server-gcp.trakneo.com";
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
            await lockOfferApiStats(offerLog, content, start_time, remarks = `Success, Api Response Status Code : ${result.status}, Page = ${page}`);
            return resolve(true);
        } catch (err) {
            debug(err);
            await InactiveApi(content);
            await lockOfferApiStats(offerLog, content, start_time, remarks = `Fail, Api Response Error Msg : ${err}, Catch block, Page = ${page}`);
            return resolve(false);
        }
    });

}


exports.checkValid = (result) => {
    if (result && result.success) {
        return true;
    } else {
        return false;
    }
}

exports.fetchResponse = (result) => {
    return result.data;
}
exports.traverseOffer = (result, content) => {
    let offers = {};
    for (let data of result)
        try {
            if (data) {
                let temp = formateOffers(data);
                if (temp.advertiser_offer_id && temp.advertiser_offer_id !== '') {
                    temp = addExtraFields(temp, content);
                }
                offers[temp.advertiser_offer_id] = temp;
            }
        }
        catch (err) {
            debug(err);
        }
    return offers;
}

//api wise methods
function getCategory(field, data) {
    let category = [];
    return category;
}

function getOfferId(field, data) {
    let offer_id = '';
    if (data._id) {
        offer_id = data._id;
    }
    return offer_id;
}

function getOfferName(field, data) {
    let offer_name = '';
    if (data.name) {
        offer_name = data.name;
    }
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

function getRedirectionMethod(field, data) {
    let method = 'javascript_redirect';
    return method;
}

function getCurrency(field, data) {
    let currency = 'USD';
    return currency;
}

function getThumbnail(field, data) {
    let thumbnail = '';
    return thumbnail;
}

function getDescription(field, data) {
    let description = '';
    if (data.desc) {
        description = data.desc;
    }
    return description;
}

function getKpi(field, data) {
    let kpi = '';
    return kpi;
}

function getPreviewUrl(field, data) {
    let preview_url = '';
    if (data.preview_url) {
        preview_url = data.preview_url;
    }
    return preview_url;
}

function getTrackingLink(field, data) {
    let tracking_link = '';
    if (data.landing_pages && data.landing_pages[0] && data.landing_pages[0]['url']) {
        tracking_link = data.landing_pages[0]['url'];
    }
    return tracking_link;
}

function getExpiredUrl(field, data) {
    let expired_url = '';
    return expired_url;
}

function getStartDate(field, data) {
    let start_date = moment();
    if (data.start_date) {
        start_date = moment(data.start_date);
    }
    return start_date;
}

function getEndDate(field, data) {
    let end_date = moment().add(1, 'Y');
    if (data.end_date) {
        end_date = moment(data.end_date);
    }
    return end_date;
}

function getRevenue(field, data) {
    let revenue = 0.0;
    if (data.revenue_per_conversion) {
        revenue = data.revenue_per_conversion;
    }
    return revenue;
}

function getRevenueType(field, data) {
    let revenue_type = {
        enum_type: 'unknown',
        offer_type: ''
    };
    if (data.payout_model) {
        revenue_type.offer_type = data.payout_model;
    }
    return revenue_type;
}

function getPayout(field, data) {
    let payout = 0.0;
    if (data.payout_per_conversion) {
        payout = data.payout_per_conversion;
    }
    return payout;
}

function getPayoutType(field, data) {
    let payout_type = {
        enum_type: 'unknown',
        offer_type: ''
    };
    if (data.payout_model) {
        payout_type.offer_type = data.payout_model;
    }
    return payout_type;
}

function getApprovalRequired(field, data) {
    let approval_required = false;
    if (!(data.landing_pages && data.landing_pages[0] && data.landing_pages[0]['url'])) {
        approval_required = true;
    }
    return approval_required;
}

function getIsCapEnabled(field, data) {
    let cap_enable = false;
    if (data.total_cap || data.daily_cap) {
        cap_enable = true;
    }
    return cap_enable;
}

function getOfferCapping(field, data) {
    let cap = defaultCap();
    if (data.total_cap) {
        cap['monthly_conv'] = data.total_cap;
    }
    if (data.daily_cap) {
        cap['daily_conv'] = data.daily_cap;
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
    if (data.advanced_targeting) {
        targeting_enable = true;
    }
    return targeting_enable;
}

function getGeoTargeting(field, data) {
    let geo_targeting = defaultGeoTargeting();
    for (let i in data.advanced_targeting) {
        for (let item of data.advanced_targeting[i]['country']) {
            if (i === "allowed") {
                geo_targeting.country_allow.push({ key: item, value: item });
            } else if (i === "disallowed") {
                geo_targeting.country_deny.push({ key: item, value: item });
            }

        }
        for (let item of data.advanced_targeting[i]['city']) {
            if (i === "allowed") {
                geo_targeting.city_allow.push(item);
            } else if (i === "disallowed") {
                geo_targeting.city_deny.push(item);
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
    for (let i in data.advanced_targeting) {
        if (i === "allowed") {
            for (let item of data.advanced_targeting[i]['os']) {
                let os = item.toLowerCase();
                if (os === "android" || os === "ios" || os === "windows" || os === "amazon" || os === "blackberry") {
                    device_targeting.os.push(os);
                }
            }
            for (let item of data.advanced_targeting[i]['device']) {
                let device = item.toLowerCase();
                if (device === "mobile" || device === "desktop") {
                    device_targeting.device.push(device);
                }
            }
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
        creative = data.creatives;
    }
    return creative;
}

function getOfferVisible(field, data) {
    let offer_visible = 'public';
    return offer_visible;
}

function getStatusLabel(field, data) {
    let status_label = 'unmanaged';
    if (data.landing_pages && data.landing_pages[0] && data.landing_pages[0]['url']) {
        status_label = "active";
    } else {
        status_label = "no_link";
    }
    return status_label;
}

const trakneo = {
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
            let data = trakneo[action](field, offer);
            formatedOffer[field] = data;
        } catch (err) {
            debug(err);

        }
    })
    return formatedOffer;
}  