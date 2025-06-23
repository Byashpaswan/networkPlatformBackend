const { InsertUpdateOffer, makeRequest, getOffersFields, addExtraFields, ImportantFields, defaultLog, mergeOfferLog, lockOfferApiStats } = require('../plugin');
const { ActiveApi, InactiveApi } = require('../../helpers/Functions');

const debug = require("debug")("darwin:Plugin:Algambo");
const ENV_OFFERS_LIMIT = process.env.ENV_OFFERS_LIMIT;
const moment = require('moment');
const limit = 100;
exports.countApiPages = (response) => {
    let page = 0;
    try {
        if (response.page) {
            page = Math.ceil(response.page / limit);
        }
        // debug(page)
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
        location : 'pid'
    }
}

exports.apiCall = async (credentials, page, apilimit) => {
    if (credentials.api_key && credentials.network_id) {
        let api_key = credentials['api_key'];
        let network_id = credentials['network_id'];
        let apiBaseurl = "https://" + network_id + "/api/feed/offers?limit=" + apilimit + "&page=";
        // debug(apiBaseurl)
        return await makeRequest({
            method: 'get',
            url: apiBaseurl + page,
            headers: { 'Authorization': 'Bearer ' + api_key }
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
                    valid = this.checkValid(result.data)
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
                // debug(page , totalPages , limit );
            } while (page < totalPages);
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
    if (result.items && result.page) {
        return true;
    }
    else {
        return false;
    }
}

exports.fetchResponse = (result) => {
    return result.items;
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
    if (data.categories && data.categories.length) {
        category = data.categories;
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
    if (data.currency) {
        currency = data.currency.toUpperCase();
    }
    return currency;
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
    if (data.urls && data.urls.length) {
        preview_url = data.urls[0]['preview_url'];
    }
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
    // if (data.Offer['expired_url'] !== undefined)
    //     expired_url = data.Offer['expired_url'];
    return expired_url;
}

function getStartDate(field, data) {
    let start_date = moment();
    try {
        if (data.start_time) {
            start_date = moment(data.start_time, 'YYYY/MM/DD');
            start_date = start_date.toISOString();
        }
    } catch (e) {
        start_date = moment();
    }
    return start_date;
}

function getEndDate(field, data) {
    let end_date = moment().add(1, 'Y');
    try {
        if (data.end_time) {
            end_date = moment(data.end_time, 'YYYY/MM/DD');
            end_date = end_date.toISOString();
        }
    } catch (e) {
        end_date = moment().add(1, 'Y');
    }
    return end_date;
}

function getRevenue(field, data) {
    let revenue = 0.0;
    if (data.events && data.events.length) {
        if (data.events[0].payout) {
            revenue = data.events[0].payout;
        }
    }

    return revenue;
}

function getRevenueType(field, data) {
    let revenue_type = { enum_type: 'unknown', offer_type: '' };
    if (data.events && data.events.length) {
        if (data.events[0].payout_type) {
            revenue_type.offer_type = data.events[0].payout_type;
        }
    }
    return revenue_type;
}

function getPayout(field, data) {
    let payout = 0.0;
    if (data.events && data.events.length) {
        if (data.events[0].payout) {
            payout = data.events[0].payout;
        }
    }
    return payout;
}

function getPayoutType(field, data) {
    let payout_type = { enum_type: 'unknown', offer_type: '' };
    if (data.events && data.events.length) {
        if (data.events[0].payout_type) {
            payout_type.offer_type = data.events[0].payout_type;
        }
    }
    return payout_type;
}

function getApprovalRequired(field, data) {
    let approval_required = false;
    if (!data.tracking_url)
        approval_required = true;
    return approval_required;
}

function getIsCapEnabled(field, data) {
    let cap_enable = false;
    if (data.events && data.events.length) {
        if (data.events[0]['daily_cap'] || data.events[0]['global_daily_cap']) {
            cap_enable = true;
        }
    }
    return cap_enable;
}

function getOfferCapping(field, data) {
    let cap = defaultCap();
    if (data.events && data.events.length) {
        if (data.events[0]['daily_cap']) {
            cap.daily_conv = data.events[0]['daily_cap'];
        } else if (data.events[0]['global_daily_cap']) {
            cap.daily_conv = data.events[0]['global_daily_cap'];
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
    if (data.is_targeting) {
        targeting_enable = true;
    }
    return targeting_enable;
}

function getGeoTargeting(field, data) {
    let geo_targeting = defaultGeoTargeting();
    if (data.targeting && data.targeting.country) {
        if (data.targeting.country.include && data.targeting.country.include.length) {
            data.targeting.country.include.map(obj => {
                if (obj)
                    geo_targeting.country_allow.push({ key: obj, value: obj });
            })
        }
        if (data.targeting.country.exclude && data.targeting.country.exclude.length) {
            data.targeting.country.exclude.map(obj => {
                if (obj)
                    geo_targeting.country_deny.push({ key: obj, value: obj });
            })
        }
    }

    if (data.targeting && data.targeting.city) {
        if (data.targeting.city.include && data.targeting.city.include.length) {
            data.targeting.city.include.map(obj => {
                if (obj)
                    geo_targeting.city_allow.push({ key: obj, value: obj });
            })
        }
        if (data.targeting.city.exclude && data.targeting.city.exclude.length) {
            data.targeting.city.exclude.map(obj => {
                if (obj)
                    geo_targeting.city_deny.push({ key: obj, value: obj });
            })
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
    if (data.targeting && data.targeting.os) {
        if (data.targeting.os.include && data.targeting.os.include.length) {
            data.targeting.os.include.map(obj => {
                if (obj)
                    device_targeting.os.push(obj.toLowerCase());
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
    return creative;
}

function getOfferVisible(field, data) {
    let offer_visible = 'public';
    return offer_visible;
}

function getStatusLabel(field, data) {
    let status_label = 'unmanaged';
    if (data.tracking_url) {
        status_label = "active";
    }
    else {
        status_label = "no_link";
    }
    return status_label;
}

const Algambo = {
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
            let data = Algambo[action](field, offer);
            formatedOffer[field] = data;
        }
        catch (err) {
            debug(err);

        }
    })
    return formatedOffer;
}
