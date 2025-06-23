const { InsertUpdateOffer, makeRequest, getOffersFields, addExtraFields, ImportantFields, defaultLog, mergeOfferLog, lockOfferApiStats } = require('../plugin');

const { ActiveApi, InactiveApi } = require('../../helpers/Functions');
const debug = require("debug")("darwin:Plugin:mobrain");
const ENV_OFFERS_LIMIT = process.env.ENV_OFFERS_LIMIT;
const moment = require('moment');
const limit = 350;
exports.countApiPages = (response) => {
    let page = 0;
    try {
        if (response.total && response.data) {
            page = Math.ceil(response.total / limit);
        }
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
    return urlData.searchParams.get('pid');
}
exports.getPidLocation = ()=>{
    return {
        lop : 'query', // lop means locations of pid
        location : 'pubid'
    }
}
exports.apiCall = async (credentials, page, apilimit) => {
    try {
        if (credentials.user_id && credentials.password) {
            let res = await this.apiCookieCall(credentials);
            if (res && res.headers && res.headers['set-cookie'] && res.headers['set-cookie'].length && res.headers['set-cookie'][0]) {
                let cookie = res.headers['set-cookie'][0];
                // debug(cookie)
                let user_id = credentials['user_id'];
                let password = credentials['password'];
                let apiBaseurl = "http://api.mobra.in/v1/campaign/feed?limit=100";
                // debug(apiBaseurl )
                return await makeRequest({
                    method: 'get',
                    url: apiBaseurl,
                    headers: { Cookie: cookie },
                });
            }
            else {
                return null;
            }
        }
        else {
            return null;
        }
    }
    catch (e) {
        debug(e)
        return null;
    }
}

exports.apiCookieCall = async (credentials) => {
    if (credentials.user_id && credentials.password) {
        let user_id = credentials['user_id'];
        let password = credentials['password'];
        let apiBaseurl = "http://api.mobra.in/v1/auth/login";
        // debug(apiBaseurl )
        return await makeRequest({
            method: 'post',
            url: apiBaseurl,
            headers: {},
            data: {
                user: user_id,
                password: password
            }
        });
    }
    else {
        return null;
    }
}

exports.apiCall = async (credentials, page, apilimit) => {
    try {
        if (credentials.user_id && credentials.password) {
            let res = await this.apiCookieCall(credentials);
            if (res && res.headers && res.headers['set-cookie'] && res.headers['set-cookie'].length && res.headers['set-cookie'][0]) {
                let cookie = res.headers['set-cookie'][0];
                // debug(cookie)
                let apiBaseurl = "http://api.mobra.in/v1/campaign/feed?limit=100";
                // debug(apiBaseurl )
                return await makeRequest({
                    method: 'get',
                    url: apiBaseurl,
                    headers: { Cookie: cookie },
                });
            }
            else {
                return null;
            }
        }
        else {
            return null;
        }
    }
    catch (e) {
        debug(e)
        return null;
    }
}

exports.apiMobrainCall = async (cookie, page, apilimit) => {
    try {
        if (cookie) {
            let apiBaseurl = "http://api.mobra.in/v1/campaign/feed?limit=" + apilimit + "&skip=";
            // debug(apiBaseurl)
            return await makeRequest({
                method: 'get',
                url: apiBaseurl + page,
                headers: { Cookie: cookie },
            });
        }
        else {
            return null;
        }
    }
    catch (e) {
        debug(e)
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
            let res = await this.apiCookieCall(content.credentials);
            if (res && res.headers && res.headers['set-cookie'] && res.headers['set-cookie'].length && res.headers['set-cookie'][0]) {
                let cookie = res.headers['set-cookie'][0];
                do {
                    let result = await this.apiMobrainCall(cookie, page * limit, limit);
                    if (result) {
                        valid = this.checkValid(result.data);
                        if (valid === true) {
                            let data = this.fetchResponse(result.data);
                            content['domain'] = "api.mobra.in";
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
                        await lockOfferApiStats(offerLog, content, start_time, remarks = `Fail, Not Get Api Response, Reponse = null , Page = ${page}`);
                        return resolve(false);
                    }
                } while (page <= totalPages)
                await lockOfferApiStats(offerLog, content, start_time, remarks = `Success, Api Response Status Code : ${result.status}, Page = ${page}`);
            }
            else {
                return resolve(true);
            }
            return resolve(true);

        }
        catch (err) {
            debug(err)
            await InactiveApi(content);
            await lockOfferApiStats(offerLog, content, start_time, remarks = `Fail, Api Response Error Msg : ${err}, Catch block, Page = ${page}`);
            return resolve(false);
        }
    });
}


exports.checkValid = (result) => {
    if (result.total && result.data) {
        //valid credentials affiliate
        return true;
    }
    else {
        return false;
    }

}

exports.fetchResponse = (result) => {
    return result.data;
}

exports.traverseOffer = (result, content) => {

    let offers = {};
    result.map((data) => {
        try {
            if (data) {
                let temp = formateOffers(data);
                if (temp.advertiser_offer_id && temp.advertiser_offer_id !== '') {
                    temp = addExtraFields(temp, content);
                    offers[temp.advertiser_offer_id] = temp;
                }
            }
        }
        catch (err) {
            debug(err)

        }
    });
    return offers;
}

//api wise methods
function getCategory(field, data) {
    let category = [];
    if (data.categories && data.categories.length) {
        category = data.categories;
    }
    return category;
}

function getOfferId(field, data) {
    let offer_id = '';
    if (data.offer_id) {
        offer_id = data.offer_id;
    }
    return offer_id;
}

function getOfferName(field, data) {
    let offer_name = '';
    if (data.name)
        offer_name = data.name;
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
        width: '',
        height: '',
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
    if (data.payout_currency)
        currency = data.payout_currency;
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
    if (data.restrictions)
        description = data.restrictions;
    return description;
}

function getKpi(field, data) {
    let kpi = '';
    if (data.kpis) {
        kpi = data.kpis;
    }
    return kpi;
}

function getPreviewUrl(field, data) {
    let preview_url = '';
    if (data.app_id)
        preview_url = data.app_id;
    return preview_url;
}

function getTrackingLink(field, data) {
    let tracking_link = '';
    if (data.click_url)
        tracking_link = data.click_url;
    return tracking_link;
}

function getExpiredUrl(field, data) {
    let expired_url = '';
    return expired_url;
}

function getStartDate(field, data) {
    let start_date = moment();
    return start_date;
}

function getEndDate(field, data) {
    let end_date = moment().add(1, 'Y');
    return end_date;
}

function getRevenue(field, data) {
    let revenue = 0.0;
    if (data.payout) {
        revenue = +data.payout;
    }
    return revenue;
}

function getRevenueType(field, data) {
    let revenue_type = { enum_type: '', offer_type: '' };
    if (data.payout_type) {
        revenue_type.offer_type = data.payout_type;
    }
    return revenue_type;
}

function getPayout(field, data) {
    let payout = 0;
    if (data.payout) {
        payout = +data.payout;
    }
    return payout;
}

function getPayoutType(field, data) {
    let payout_type = { enum_type: '', offer_type: '' };
    if (data.payout_type) {
        payout_type.offer_type = data.payout_type;
    }
    return payout_type;
}

function getApprovalRequired(field, data) {
    let approval_required = false;
    if (!data.click_url) {
        approval_required = true;
    }
    return approval_required;
}

function getIsCapEnabled(field, data) {
    let cap_enable = false;
    if (data.leads_budget_remaining)
        cap_enable = true;
    return cap_enable;
}

function getOfferCapping(field, data) {
    let cap = defaultCap();
    if (data.leads_budget_remaining) {
        cap.payout_daily = data.leads_budget_remaining;
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
    if (data.countries || data.platform) {
        targeting_enable = true;
    }
    return targeting_enable;
}

function getGeoTargeting(field, data) {
    let geo_targeting = defaultGeoTargeting();
    if (data.countries && data.countries.length) {
        data.countries.map(obj => {
            if (obj)
                geo_targeting.country_allow.push({ key: obj, value: obj });
        })
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
        let os = "";
        if (data.platform.includes('iOS')) {
            device_targeting.os.push('ios');
            os = 'ios';
        }
        if (data.platform.includes('Android')) {
            device_targeting.os.push('android');
            os = 'android';
        }
        if (os && data.min_os_version && data.min_os_version.length) {
            data.min_os_version.map(ver_array => {
                if (ver_array && !isNaN(ver_array)) {
                    device_targeting.os_version.push({ os: os, version: ver_array, version_condition: 'gte' })
                }
            })
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
    if (data.banners && data.banners.length) {
        data.banners.map(obj => {
            let temp = defaultCreative();
            let crt_status = false;
            if (obj.path) {
                crt_status = true;
                temp.creative_file = obj.path;
            }
            if (obj.type) {
                crt_status = true;
                temp.creative_type = obj.type;
            }
            if (crt_status) {
                creative.push(temp);
            }
        })
    }
    return creative;
}

function getOfferVisible(field, data) {
    let offer_visible = 'public';
    return offer_visible;
}

function getStatusLabel(field, data) {
    let status_label = 'unmanaged';
    if (data.click_url) {
        status_label = "active";
    }
    else {
        status_label = 'no_link';
    }
    if (data.status && data.status == "paused") {
        status_label = "paused";
    }
    return status_label;
}

const mobrain = {
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
            let data = mobrain[action](field, offer);
            formatedOffer[field] = data;
        }
        catch (err) {
            debug(err)

        }
    });
    return formatedOffer;
}