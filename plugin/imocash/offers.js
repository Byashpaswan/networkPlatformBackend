const { InsertUpdateOffer, makeRequest, getOffersFields, addExtraFields, ImportantFields, defaultLog, mergeOfferLog, lockOfferApiStats } = require('../plugin');

const { ActiveApi, InactiveApi } = require('../../helpers/Functions');
const debug = require("debug")("darwin:Plugin:imocash");
const ENV_OFFERS_LIMIT = process.env.ENV_OFFERS_LIMIT;
const moment = require('moment');
const limit = 500;
exports.countApiPages = (response) => {
    let page = 0;
    try {
        return page;
    }
    catch (err) {
        return 0;
    }
}

// update after find pid
exports.getPid = (url) =>{
    if(!url){
        return null;
    }
    let urlData = new URL(url);
    return urlData.searchParams.get('aff');
}
exports.getPidLocation = ()=>{
    return {
        lop : 'query', // lop means locations of pid
        location : 'aff'
    }
}
exports.apiCall = async (credentials, page, apilimit) => {
    if (credentials.api_key) {
        let api_key = credentials['api_key'];
        let apiBaseurl = "https://backend.imocash.com//v1affiliate/service/rest-affiliate/offer/findAll";
        // debug(apiBaseurl )
        return await makeRequest({
            method: 'get',
            url: apiBaseurl,
            headers: { 'Authorization': 'ApiKey ' + api_key + ":simpleMode" }
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
    let page = 1;
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
                        content['domain'] = "backend.imocash.com";
                        offer = this.traverseOffer(data, content);
                        let tempLog = await InsertUpdateOffer(ImportantFields, offer, content);
                        page++;
                        offerLog = mergeOfferLog(offerLog, tempLog);
                        totalPages = this.countApiPages(result.data);
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
    if (result && Array.isArray(result)) {
        //valid credentials imocash  
        return true;
    }
    else {
        return false;
    }
}

exports.fetchResponse = (result) => {
    return result;
}
exports.traverseOffer = (result, content) => {

    let offers = {};
    for (let i = 0; i < result.length; i++) {
        try {
            if (result[i]) {

                let temp = formateOffers(result[i], content.credentials);
                if (temp.advertiser_offer_id && temp.advertiser_offer_id !== '') {
                    temp = addExtraFields(temp, content);
                    offers[temp.advertiser_offer_id] = temp;
                }
            }
        }
        catch (err) {
            debug(err);
            // debug('error', err); //skip this offer
        }
    }
    return offers;
}

//api wise methods
function getCategory(field, data, content) {
    let category = [];
    if (data.categoryList && data.categoryList.length) {
        category = data.categoryList;
    }
    return category;
}

function getOfferId(field, data, content) {
    let offer_id = '';
    if (data.id) {
        offer_id = data.id;
    }
    return offer_id;
}

function getOfferName(field, data, content) {
    let offer_name = '';
    if (data.name)
        offer_name = data.name;
    return offer_name;
}

function getIsGoalEnabled(field, data, content) {
    let goal_enable = false;
    return goal_enable;
}

function getGoals(field, data, content) {
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

function getCurrency(field, data, content) {
    let currency = 'USD';
    if (data.currency)
        currency = data.currency.toUpperCase();
    return currency;
}

function getRedirectionMethod(field, data, content) {
    let method = 'javascript_redirect';
    return method;
}

function getThumbnail(field, data, content) {
    let thumbnail = '';
    return thumbnail;
}

function getDescription(field, data, content) {
    let description = '';
    if (data.description)
        description = data.description;
    return description;
}

function getKpi(field, data, content) {
    let kpi = '';
    if (data.terms)
        kpi = data.terms;
    return kpi;
}

function getPreviewUrl(field, data, content) {
    let preview_url = '';
    if (data.previewUrl)
        preview_url = data.previewUrl;
    return preview_url;
}

async function getTrackingLinkData(id, api_key) {
    try {
        let apiBaseurl = "https://backend.imocash.com/v1affiliate/service/rest-affiliate/offer/generateTrackingLink";
        let result = await makeRequest({
            method: 'post',
            url: apiBaseurl,
            headers: { 'Authorization': 'ApiKey ' + api_key + ":simpleMode", 'Content-Type': 'application/json' },
            data: {
                offerIds: [id],
            },
        });
        if (result && result.data) {
            return result.data;
        }
    }
    catch (err) {
        return false;
    }

}


async function getTrackingLink(field, data, credentials) {
    let tracking_link = '';
    if (data.id) {
        try {
            let tracking_data = await getTrackingLinkData(data.id, credentials.api_key)
            if (tracking_data && Array.isArray(tracking_data)) {
                tracking_link = tracking_data[0];
            } else {
                tracking_link = '';
            }
        } catch (err) {
            tracking_link = '';
        }
        return tracking_link;
    }
    else {
        return tracking_link;
    }
}

function getExpiredUrl(field, data, content) {
    let expired_url = '';

    return expired_url;
}

function getStartDate(field, data, content) {
    let start_date = moment();
    return start_date;
}

function getEndDate(field, data, content) {
    let end_date = moment().add(1, 'Y');
    try {
        if (data.expirationDate) {
            end_date = moment(data.expirationDate, 'YYYY/MM/DD h:i:s');
            end_date = end_date.toISOString();
        }
    } catch (e) {
        end_date = moment().add(1, 'Y');
    }

    return end_date;
}

function getRevenue(field, data, content) {
    let revenue = 0.0;
    if (data.payoutCost && data.payoutCost.length && data.payoutCost[0])
        revenue = data.payoutCost[0];
    return revenue;
}

function getRevenueType(field, data, content) {
    let revenue_type = { enum_type: '', offer_type: '' };
    if (data.payoutType) {
        if (data.payoutType == 'PER_ACTION') {
            revenue_type.offer_type = 'cpa';
        }
        else if (data.payoutType == 'PER_SALE' || data.payoutType == 'PER_ACTION_AND_PER_SALE') {
            revenue_type.offer_type = 'cps';
        }
        else {
            revenue_type.offer_type = data.payoutType;
        }
    }
    return revenue_type;
}

function getPayout(field, data, content) {
    let payout = 0;
    if (data.payoutCost && data.payoutCost.length && data.payoutCost[0])
        payout = data.payoutCost[0];
    return payout;
}

function getPayoutType(field, data, content) {
    let payout_type = { enum_type: '', offer_type: '' };
    if (data.payoutType) {
        if (data.payoutType == 'PER_ACTION') {
            payout_type.offer_type = 'cpa';
        }
        else if (data.payoutType == 'PER_SALE' || data.payoutType == 'PER_ACTION_AND_PER_SALE') {
            payout_type.offer_type = 'cps';
        }
        else {
            payout_type.offer_type = data.payoutType;
        }
    }
    return payout_type;
}

function getApprovalRequired(field, data, content) {
    let approval_required = false;
    if (data.requireApproval)
        approval_required = true;
    return approval_required;
}

function getIsCapEnabled(field, data, content) {
    let cap_enable = false;
    return cap_enable;
}

function getOfferCapping(field, data, content) {
    let cap = defaultCap();
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

function getIsTargeting(field, data, content) {
    let targeting_enable = false;
    return targeting_enable;
}

function getGeoTargeting(field, data, content) {
    let geo_targeting = defaultGeoTargeting();
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

function getDeviceTargeting(field, data, content) {
    let device_targeting = defaultDeviceTargeting();
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

function getCreative(field, data, content) {
    let creative = [];
    return creative;
}

function getOfferVisible(field, data, content) {
    let offer_visible = 'public';
    return offer_visible;
}

function getStatusLabel(field, data, content) {
    let status_label = 'unmanaged';
    if (data.requireApproval) {
        status_label = 'no_link';
    }
    else if (data.requireApproval === false) {
        status_label = 'active';
    }
    return status_label;
}

const imocash = {
    getOfferId: (field, data, content) => {
        return getOfferId(field, data, content);
    },
    getOfferName: (field, data, content) => {
        return getOfferName(field, data, content);
    },
    getCategory: (field, data, content) => {
        return getCategory(field, data, content);
    },
    getIsGoalEnabled: (field, data, content) => {
        return getIsGoalEnabled(field, data, content);
    },
    getGoals: (field, data, content) => {
        return getGoals(field, data, content);
    },
    getCurrency: (field, data, content) => {
        return getCurrency(field, data, content);
    },
    getThumbnail: (field, data, content) => {
        return getThumbnail(field, data, content);
    },
    getDescription: (field, data, content) => {
        return getDescription(field, data, content);
    },
    getKpi: (field, data, content) => {
        return getKpi(field, data, content);
    },
    getPreviewUrl: (field, data, content) => {
        return getPreviewUrl(field, data, content);
    },
    getTrackingLink: async (field, data, content) => {
        return await getTrackingLink(field, data, content);
    },
    getExpiredUrl: (field, data, content) => {
        return getExpiredUrl(field, data, content);
    },
    getStartDate: (field, data, content) => {
        return getStartDate(field, data, content);
    },
    getEndDate: (field, data, content) => {
        return getEndDate(field, data, content);
    },
    getRevenue: (field, data, content) => {
        return getRevenue(field, data, content);
    },
    getRevenueType: (field, data, content) => {
        return getRevenueType(field, data, content);
    },
    getPayout: (field, data, content) => {
        return getPayout(field, data, content);
    },
    getPayoutType: (field, data, content) => {
        return getPayoutType(field, data, content);
    },
    getApprovalRequired: (field, data, content) => {
        return getApprovalRequired(field, data, content);
    },
    getIsCapEnabled: (field, data, content) => {
        return getIsCapEnabled(field, data, content);
    },
    getOfferCapping: (field, data, content) => {
        return getOfferCapping(field, data, content);
    },
    getIsTargeting: (field, data, content) => {
        return getIsTargeting(field, data, content);
    },
    getGeoTargeting: (field, data, content) => {
        return getGeoTargeting(field, data, content);
    },
    getDeviceTargeting: (field, data, content) => {
        return getDeviceTargeting(field, data, content);
    },
    getCreative: (field, data, content) => {
        return getCreative(field, data, content);
    },
    getOfferVisible: (field, data, content) => {
        return getOfferVisible(field, data, content);
    },
    getStatusLabel: (field, data, content) => {
        return getStatusLabel(field, data, content);
    },
    getRedirectionMethod: (field, data, content) => {
        return getRedirectionMethod(field, data, content);
    }
}

function formateOffers(offer, content) {
    let formatedOffer = {};
    array = getOffersFields('', '');
    for (let i = 0; i < array.length; i++) {
        try {
            field = array[i].field;
            action = array[i].action;
            let data = imocash[action](field, offer, content);
            formatedOffer[field] = data;
        }
        catch (err) {
            debug(err);

        }
    }
    return formatedOffer;
}

