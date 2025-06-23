const { InsertUpdateOffer, makeRequest, getOffersFields, addExtraFields, ImportantFields, defaultLog, mergeOfferLog, lockOfferApiStats } = require('../plugin');
const { ActiveApi, InactiveApi } = require('../../helpers/Functions');

const debug = require("debug")("darwin:Plugin:Appxigo");
const ENV_OFFERS_LIMIT = process.env.ENV_OFFERS_LIMIT;
const moment = require('moment');
const limit = 1000;
exports.countApiPages = (response) => {
    let page = 0;
    try {
        if (response.status == "1" && response.data.total_count) {
            page = Math.ceil(response.data.total_count / limit);
        }
        return page;
    }
    catch (err) {
        return 0;
    }
}

exports.getPid = (url) =>{
    if(!url){
        return null;
    }
    let urlData = new URL(url);
    // return urlData.searchParams.get('pub_id');
    let path_value = urlData.pathname.split('/').filter(segment => segment);
    return path_value[2];
}
exports.getPidLocation = ()=>{
    return {
        lop : 'path', // lop means locations of pid
        location : 2
    }
}

exports.apiCall = async (credentials, page, apilimit) => {
    if (credentials.network_id && credentials.api_key && credentials.pid) {
        let network_id = credentials['network_id'];
        let api_key = credentials['api_key'];
        let pid = credentials['pid'];
        let apiBaseurl = `https://${network_id}/v1/offer/fetchAll?pid=${pid}&api_key=${api_key}&limit=${apilimit}&page=`;
        return await makeRequest({
            method: 'get',
            url: apiBaseurl + page,
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
    let totalPages = 0;
    return new Promise(async (resolve, reject) => {
        try {
            let result;
            do {
                result = await this.apiCall(content.credentials, page, limit);
                if (result) {
                    valid = this.checkValid(result.data);
                    if (valid === true) {
                        let data = this.fetchResponse(result.data);
                        content['domain'] = content.credentials['network_id'];
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
    if (result.status == "1" && result.data && result.data.offers) {
        //valid credentials appxigo  
        return true;
    }
    else {
        return false;
    }
}

exports.fetchResponse = (result) => {
    return result.data.offers;
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
    if (data.id) {
        offer_id = data.id;
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
    if (data.description) {
        description = data.description;
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
    if (data.redirect_url) {
        tracking_link = data.redirect_url;
    }
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
        revenue = data.payout;
    }
    return revenue;
}

function getRevenueType(field, data) {
    let revenue_type = { enum_type: '', offer_type: '' };
    if (data.offer_type) {
        revenue_type.offer_type = data.offer_type.toLowerCase();
    }
    return revenue_type;
}

function getPayout(field, data) {
    let payout = 0;
    if (data.payout)
        payout = data.payout;
    return payout;
}

function getPayoutType(field, data) {
    let payout_type = { enum_type: '', offer_type: '' };
    if (data.offer_type) {
        payout_type.offer_type = data.offer_type.toLowerCase();
    }
    return payout_type;
}

function getApprovalRequired(field, data) {
    let approval_required = false;
    if (!data.redirect_url || data.approval == "required")
        approval_required = true;
    return approval_required;
}

function getIsCapEnabled(field, data) {
    let cap_enable = false;
    if (data.daily_conversion_cap) {
        cap_enable = true;
    }
    return cap_enable;
}

function getOfferCapping(field, data) {
    let cap = defaultCap();
    if (data.daily_conversion_cap) {
        cap.daily_conv = data.daily_conversion_cap;
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
    if ((data.target_countries && data.target_countries.length) || (data.target_os && data.target_os.length)) {
        targeting_enable = true;
    }
    return targeting_enable;
}

function getGeoTargeting(field, data) {
    let geo_targeting = defaultGeoTargeting();
    if (data.target_countries && data.target_countries.length) {
        data.target_countries.map(obj => {
            if (obj) { geo_targeting.country_allow.push({ key: obj.toUpperCase(), value: obj.toUpperCase() }); }
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
    let os = '';
    if (data.target_os && data.target_os.length) {
        data.target_os.map(obj => {
            if (obj == "Android") { device_targeting.os.push("android"); }
            else if (obj == "iOS") { device_targeting.os.push("ios"); }
        })
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
    if (data.creative_url) {
        let temp = defaultCreative();
        temp.creative_file = data.creative_url;
        creative.push(temp);
    }
    return creative;

}

function getOfferVisible(field, data) {
    let offer_visible = 'public';
    return offer_visible;
}

function getStatusLabel(field, data) {
    let status_label = 'unmanaged';
    if (data.status == "paused") {
        status_label = "paused";
    }
    else if (data.status == "active") {
        if (data.approval == "approved") {
            status_label = "active";
        }
        else if (data.approval == "pending") {
            status_label = "waitingForApproval";
        }
        else if (data.approval == "required") {
            status_label = "no_link";
        }
    } else if (!data.redirect_url) {
        status_label = "no_link";
    }
    return status_label;
}


const appxigo = {
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
            let data = appxigo[action](field, offer);
            formatedOffer[field] = data;
        }
        catch (err) {
            debug(err);

        }
    })
    return formatedOffer;
}

