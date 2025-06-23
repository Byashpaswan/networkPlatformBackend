const { InsertUpdateOffer, makeRequest, getOffersFields, addExtraFields, ImportantFields, defaultLog, mergeOfferLog, lockOfferApiStats } = require('../plugin');

const { ActiveApi, InactiveApi } = require('../../helpers/Functions');
const debug = require("debug")("darwin:Plugin:EverflowClient");
const ENV_OFFERS_LIMIT = process.env.ENV_OFFERS_LIMIT;
const moment = require('moment');
const limit = 500;
exports.countApiPages = (response) => {
    let page = 0;
    try {
        if (response.paging && response.paging.page_size && response.paging.total_count) {
            page = Math.ceil(response.paging.total_count / response.paging.page_size);
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
    return path_value[0];
}

exports.getPidLocation = () => {
    return {
        lop : 'path', // lop means locations of pid
        location : 0
    }
  }


exports.apiCall = async (credentials, page, apilimit) => {
    if (credentials.api_key) {
        let api_key = credentials['api_key'];
        let apiBaseurl = "https://api.eflow.team/v1/affiliates/offersrunnable?page_size=" + apilimit + "&page=";
        return await makeRequest({
            method: 'get',
            url: apiBaseurl + page,
            headers: { 'X-Eflow-API-Key': api_key, "content-type": "application/json" }
        });
    }
    else {
        return null;
    }

}


exports.offersApiCall = async (content) => {
    // let network_id = content.credentials['network_id'];
    // let api_key = content.credentials['api_key'];
    let valid = false;
    let offerLog = defaultLog();
    let start_time = moment();
    let page = 1;
    let totalPages = 0;
    // let apiBaseurl = "http://" + network_id + "/3.0/partner/offers?limit=" + limit + "&page=" ;
    return new Promise(async (resolve, reject) => {
        try {
            let result;
            do {
                result = await this.apiCall(content.credentials, page, limit);
                if (result) {
                    valid = this.checkValid(result.data);
                    if (valid === true) {
                        let data = this.fetchResponse(result.data);
                        content['domain'] = "api.eflow.team";
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
    if (result && result.offers && result.offers.length) {
        return true;
    } else {
        return false;
    }
}

exports.fetchResponse = (result) => {
    return result.offers;
}
exports.traverseOffer = (result, content) => {

    let offers = {};
    result.map(function (data) {
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
            debug(err);
            // console.log('error', err); //skip this offer
        }
    });
    return offers;
}

//api wise methods
function getCategory(field, data) {
    let category = [];
    if (data.relationship && data.relationship.category && data.relationship.category.name && data.relationship.category.status == 'active') {
        category.push(data.relationship.category.name);
    }
    return category;
}

function getOfferId(field, data) {
    let offer_id = '';
    if (data.network_offer_id) {
        offer_id = data.network_offer_id;
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
    if (data.currency_id) {
        currency = data.currency_id;
    }
    return currency;
}

function getRedirectionMethod(field, data) {
    let method = 'javascript_redirect';
    return method;
}

function getThumbnail(field, data) {
    let thumbnail = '';
    if (data.thumbnail_url) {
        thumbnail = data.thumbnail_url;
    }
    return thumbnail;
}

function getDescription(field, data) {
    let description = '';
    if (data.html_description) {
        description = data.html_description;
    }
    return description;
}

function getKpi(field, data) {
    let kpi = '';
    if (data.terms_and_conditions) {
        kpi = data.terms_and_conditions;
    }
    return kpi;
}

function getPreviewUrl(field, data) {
    let preview_url = '';
    if (data.preview_url)
        preview_url = data.preview_url;
    return preview_url;
}

function getTrackingLink(field, data) {
    let tracking_link = '';
    if (data.tracking_url)
        tracking_link = data.tracking_url;
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
    if (data.relationship && data.relationship.payouts && data.relationship.payouts.entries && data.relationship.payouts.entries.length && data.relationship.payouts.entries[0].payout_amount) {
        revenue = +data.relationship.payouts.entries[0].payout_amount;
    }
    return revenue;
}

function getRevenueType(field, data) {
    let revenue_type = { enum_type: '', offer_type: '' };
    if (data.relationship && data.relationship.payouts && data.relationship.payouts.entries && data.relationship.payouts.entries.length && data.relationship.payouts.entries[0].payout_type) {
        revenue_type.offer_type = data.relationship.payouts.entries[0].payout_type.toLowerCase();
    }
    return revenue_type;
}

function getPayout(field, data) {
    let payout = 0;
    if (data.relationship && data.relationship.payouts && data.relationship.payouts.entries && data.relationship.payouts.entries.length && data.relationship.payouts.entries[0].payout_amount) {
        payout = +data.relationship.payouts.entries[0].payout_amount;
    }
    return payout;
}

function getPayoutType(field, data) {
    let payout_type = { enum_type: '', offer_type: '' };
    if (data.relationship && data.relationship.payouts && data.relationship.payouts.entries && data.relationship.payouts.entries.length && data.relationship.payouts.entries[0].payout_type) {
        payout_type.offer_type = data.relationship.payouts.entries[0].payout_type.toLowerCase();
    }
    return payout_type;
}

function getApprovalRequired(field, data) {
    let approval_required = false;
    if (!data.tracking_url) {
        approval_required = true;
    }
    return approval_required;
}

function getIsCapEnabled(field, data) {
    let cap_enable = false;
    if (data.is_caps_enabled) {
        cap_enable = true;
    }
    return cap_enable;
}

function getOfferCapping(field, data) {
    let cap = defaultCap();
    if (data.daily_conversion_cap) {
        cap.daily_conv = data.daily_conversion_cap;
    } if (data.monthly_conversion_cap) {
        cap.monthly_conv = data.monthly_conversion_cap;
    } if (data.daily_payout_cap) {
        cap.daily_payout_cap = data.daily_payout_cap;
    } if (data.global_conversion_cap) {
        cap.overall_conv = data.global_conversion_cap;
    } if (data.monthly_payout_cap) {
        cap.monthly_payout_cap = data.monthly_payout_cap;
    } if (data.global_payout_cap) {
        cap.overall_payout = data.global_payout_cap;
    } if (data.daily_click_cap) {
        cap.daily_clicks = data.daily_click_cap;
    } if (data.monthly_click_cap) {
        cap.monthly_clicks = data.monthly_click_cap;
    } if (data.global_click_cap) {
        cap.overall_click = data.global_click_cap;
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
    if (data.relationship && data.relationship.ruleset && ((data.relationship.ruleset.countries && data.relationship.ruleset.countries.length) || (data.relationship.ruleset.platforms && data.relationship.ruleset.platforms.length) || (data.relationship.ruleset.device_types && data.relationship.ruleset.device_types.length))) {
        targeting_enable = true;
    }
    return targeting_enable;
}

function getGeoTargeting(field, data) {
    let geo_targeting = defaultGeoTargeting();
    if (data.relationship && data.relationship.ruleset && data.relationship.ruleset.countries && data.relationship.ruleset.countries.length) {
        let countries = data.relationship.ruleset.countries;
        countries.map(obj => {
            if (obj.targeting_type == "exclude") {
                geo_targeting.country_deny.push({ key: obj.country_code, value: obj.country_code });
            }
            else {
                geo_targeting.country_allow.push({ key: obj.country_code, value: obj.country_code });
            }
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
    if (data.relationship && data.relationship.ruleset && data.relationship.ruleset.platforms && data.relationship.ruleset.platforms.length) {
        let platforms = data.relationship.ruleset.platforms;
        platforms.map(obj => {
            if (obj.targeting_type == 'include') {
                if (obj.label.toLowerCase() == "android") {
                    device_targeting.os.push('android');
                    if (!device_targeting.device.includes('mobile')) {
                        device_targeting.device.push('mobile');
                    }
                } else if (obj.label.toLowerCase() == "ios") {
                    device_targeting.os.push('ios');
                    if (!device_targeting.device.includes('mobile')) {
                        device_targeting.device.push('mobile');
                    }
                } else if (obj.label.toLowerCase() == "windows") {
                    device_targeting.os.push('windows');
                    if (!device_targeting.device.includes('desktop')) {
                        device_targeting.device.push('desktop');
                    }
                }
            }
        });
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
    if (data.relationship && data.relationship.creatives && data.relationship.creatives.total) {
        for (let i of data.relationship.creatives.entries) {
            let createObj = defaultCreative();
            createObj.height = i.height;
            createObj.width = i.width
            createObj.creative_id = i.network_offer_creative_id;
            createObj.creative_file = i.resource_url;
            createObj.name = i.name;
            createObj.creative_type = i.creative_type;
            createObj.status = i.creative_status;
            creative.push(createObj);
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
    if (data.relationship && data.relationship.offer_affiliate_status) {
        if (data.relationship.offer_affiliate_status == "public") {
            status_label = "active";
        }
        else if (data.relationship.offer_affiliate_status == "require_approval") {
            status_label = "no_link";
        }
        else if (data.relationship.offer_affiliate_status == "pending") {
            status_label = "waitingForApproval";
        }
        else if (data.relationship.offer_affiliate_status == "approved") {
            status_label = "active";
        }
        else if (data.relationship.offer_affiliate_status == "rejected") {
            status_label = "rejected";
        }
        else {
            status_label = "no_link";
        }
    }
    else {
        if (data.offer_status == 'active' && data.tracking_url) {
            status_label = "active";
        }
        else if (data.offer_status == 'paused') {
            status_label = "paused";
        }
        else if (data.offer_status == 'pending') {
            status_label = "no_link";
        }
        else if (data.offer_status == 'deleted') {
            status_label = "deleted";
        }
        else {
            status_label = "no_link";
        }
    }
    return status_label;
}

const EverflowClient = {
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
            let data = EverflowClient[action](field, offer);
            formatedOffer[field] = data;
        }
        catch (err) {
            debug(err);

        }
    })
    return formatedOffer;
}

