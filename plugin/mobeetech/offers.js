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

const debug = require("debug")("darwin:Plugin:mobeetech");
const ENV_OFFERS_LIMIT = process.env.ENV_OFFERS_LIMIT;
const moment = require('moment');
const limit = 100;
exports.countApiPages = (response) => {
    let page = 0;
    // try {
    //     if (response.data && response.data.totalPages) {
    //         page = response.data.totalPages;
    //     }
    //     return page;
    // }
    // catch (err) {
    //     return 0;
    // }
}

// update valid pid from sample tracking link.
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
        location : 'pid'
    }
}

exports.apiCall = async (credentials, apilimit) => {
    if (credentials.api_key) {
        let api_key = credentials['api_key'];
        let apiBaseurl = "http://affiliate.mobeetech.com:80/v1affiliate/service/rest-affiliate/offer/findAll";
        return await makeRequest({
            method: 'get',
            url: apiBaseurl,
            headers: { 'Authorization': "ApiKey " + api_key + ":simpleMode" }
        });
    } else {
        return null;
    }
}

async function getTrackurl(credentials, id) {
    let api_key = credentials['api_key'];
    let apiURL = "http://affiliate.mobeetech.com:80/v1affiliate/service/rest-affiliate/offer/generateTrackingLink";
    let result = await makeRequest({
        method: 'post',
        url: apiURL,
        headers: { 'Authorization': "ApiKey " + api_key + ":simpleMode" },
        data: { "offerIds": [id] }
    });
    return result.data[0];
}

exports.offersApiCall = async (content) => {
    let valid = false;
    let offerLog = defaultLog();
    let start_time = moment();
    let page = 1;
    let totalPages = 1;
    return new Promise(async (resolve, reject) => {
        try {
            let result = await this.apiCall(content.credentials, page, limit);
            if (result) {
                valid = this.checkValid(result.data);
                if (valid === true) {
                    for (let i in result.data) {
                        result.data[i].trackurl = await getTrackurl(content.credentials, result.data[i].id);
                    }
                    let data = this.fetchResponse(result.data);
                    content['domain'] = "affiliate.mobeetech.com:80";
                    let offer = this.traverseOffer(data, content);
                    let tempLog = await InsertUpdateOffer(ImportantFields, offer, content);
                    totalPages = this.countApiPages(result);
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
            debug(err)
            await InactiveApi(content);
            await lockOfferApiStats(offerLog, content, start_time, remarks = `Fail, Api Response Error Msg : ${err}, Catch block, Page = ${page}`);
            return resolve(false);
        }
    });
}


exports.checkValid = (result) => {
    if (result.length) {
        return true;
    } else {
        return false;
    }
}

exports.fetchResponse = (result) => {
    return result;
}

exports.traverseOffer = (result, content) => {
    let offers = {};
    for (let data of result) {
        try {
            if (data) {
                let temp = formateOffers(data);
                if (temp.advertiser_offer_id && temp.advertiser_offer_id !== '') {
                    temp = addExtraFields(temp, content);
                    offers[temp.advertiser_offer_id] = temp;
                }
            }
        } catch (err) {
            debug(err)

        }
    }
    return offers;
}

//api wise methods
function getCategory(field, data) {
    let category = [];
    if (data.categoryList && data.categoryList.length) {
        for (let item of data.categoryList) {
            category.push(item);
        }
    }
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
    if (data.currency)
        currency = data.currency;
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
    if (data.description)
        description = data.description;
    return description;
}

function getKpi(field, data) {
    let kpi = '';
    return kpi;
}

function getPreviewUrl(field, data) {
    let preview_url = '';
    if (data.previewUrl)
        preview_url = data.previewUrl;
    return preview_url;
}

function getTrackingLink(field, data) {
    let tracking_link = '';
    if (data.trackurl)
        tracking_link = data.trackurl;
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
    if (data.payoutCost) {
        revenue = +data.payoutCost;
    }
    return revenue;
}

function getRevenueType(field, data) {
    let revenue_type = {
        enum_type: '',
        offer_type: ''
    };
    if (data.payoutType) {
        revenue_type.offer_type = data.payoutType;
    }
    return revenue_type;
}

function getPayout(field, data) {
    let payout = 0;
    if (data.payoutCost) {
        payout = +data.payoutCost;
    }
    return payout;
}

function getPayoutType(field, data) {
    let payout_type = {
        enum_type: '',
        offer_type: ''
    };
    if (data.payoutType) {
        payout_type.offer_type = data.payoutType;
    }
    return payout_type;
}

function getApprovalRequired(field, data) {
    let approval_required = false;
    if (!data.trackurl) {
        approval_required = true;
    }
    return approval_required;
}

function getIsCapEnabled(field, data) {
    let cap_enable = false;
    return cap_enable;
}

function getOfferCapping(field, data) {
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

function getIsTargeting(field, data) {
    let targeting_enable = false;
    return targeting_enable;
}

function getGeoTargeting(field, data) {
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

function getDeviceTargeting(field, data) {
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

function getCreative(field, data) {
    let creative = [];
    return creative;
}

function getOfferVisible(field, data) {
    let offer_visible = 'public';
    return offer_visible;
}

function getStatusLabel(field, data) {
    let status_label = 'unmanaged';
    if (data.trackurl) {
        status_label = "active";
    } else {
        status_label = 'no_link';
    }
    return status_label;
}

const mobeetech = {
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
            let data = mobeetech[action](field, offer);
            formatedOffer[field] = data;
        } catch (err) {
            debug(err)

        }
    })
    return formatedOffer;
}
