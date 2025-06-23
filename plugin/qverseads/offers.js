const { InsertUpdateOffer, makeRequest, getOffersFields, addExtraFields, ImportantFields, defaultLog, mergeOfferLog, lockOfferApiStats } = require('../plugin');

const { ActiveApi, InactiveApi } = require('../../helpers/Functions');
const debug = require("debug")("darwin:Plugin:Qverseads");
const ENV_OFFERS_LIMIT = process.env.ENV_OFFERS_LIMIT;
const moment = require('moment');
const limit = 300;
exports.countApiPages = (response) => {
    let nextPage = false;
    try {
        if (response.data && response.data.campaigns && response.message == 'success') {
            if (response.data.campaigns.length && response.data.campaigns.length < limit) {
                nextPage = true;
            }
        }
        return nextPage;
    }
    catch (err) {
        return false;;
    }
}

exports.getPid = (url) =>{
    console.log(" url -> ", url);
    if(!url){
        return null;
    }
    let urlData = new URL(url);
    return urlData.searchParams.get('tracking_id');
}
exports.getPidLocation = ()=>{
    return {
        lop : 'query', // lop means locations of pid
        location : ''  // pid not found 
    }
}

exports.apiCall = async (credentials, page, apilimit) => {
    if (credentials.api_key && credentials.network_id && credentials.client_id) {
        let network_id = credentials['network_id'].trim();
        let client_id = credentials['client_id'].trim();
        let api_key = credentials['api_key'].trim();
        let apiBaseurl = "https://" + network_id + "/v1/get-campaigns?apiClientId=" + client_id + "&secret=" + api_key + "&filters[status]=Approved&limit=" + apilimit + "&page=";
        // debug(apiBaseurl + page)
        return await makeRequest({
            method: 'get',
            url: apiBaseurl + page,
            headers: {}
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
    let nextPage = false;
    return new Promise(async (resolve, reject) => {
        try {
            let result;
            do {
                nextPage = false;
                result = await this.apiCall(content.credentials, page, limit);
                if (result) {
                    valid = this.checkValid(result.data)
                    if (valid === true) {
                        let data = this.fetchResponse(result.data);
                        content['domain'] = content.credentials['network_id'];
                        let offer = this.traverseOffer(data, content);
                        let tempLog = await InsertUpdateOffer(ImportantFields, offer, content);
                        nextPage = this.countApiPages(result.data);
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
                    await lockOfferApiStats(offerLog, content, start_time);
                    return resolve(false);
                }
            } while (nextPage);
            await this.qverseadsOffersApiCall(content, offerLog, start_time);
            return resolve(true);
        }
        catch (err) {
            debug(err);
            return resolve(false);
        }
    });

}

exports.qverseadsOffersApiCall = async (content, offerLog, start_time) => {
    let network_id = content.credentials['network_id'];
    let api_key = content.credentials['api_key'];
    let client_id = content.credentials['client_id'];
    let apiBaseurl = "https://" + network_id + "/v1/get-campaigns?apiClientId=" + client_id + "&secret=" + api_key + "&limit=" + limit + "&page=";
    let valid = false;
    let page = 1;
    let nextPage = false;
    return new Promise(async (resolve, reject) => {
        try {
            let result;
            do {
                nextPage = false;
                result = await makeRequest({
                    method: 'get',
                    url: apiBaseurl + page,
                    headers: {}
                });
                if (result) {
                    valid = this.checkValid(result.data);
                    if (valid === true) {
                        let data = this.fetchResponse(result.data);
                        content['domain'] = network_id;
                        let offer = this.traverseOffer(data, content);
                        let tempLog = await InsertUpdateOffer(ImportantFields, offer, content);
                        nextPage = this.countApiPages(result.data);
                        page++;
                        offerLog = mergeOfferLog(offerLog, tempLog);
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
            } while (nextPage);
            await lockOfferApiStats(offerLog, content, start_time, remarks = `Success, Api Response Status Code : ${result.status}, Page = ${page}`);
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
    if (result.data && result.responseCode === 0 && result.message == 'Success' && result.data.campaigns) {
        // valid credentials hasoffer  
        // console.log(result.count);
        return true;
    }
    else {
        return false;
    }
}

exports.fetchResponse = (result) => {
    return result.data.campaigns;
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
    if (data.campaignId) {
        offer_id = data.campaignId;
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
    return currency;
}

function getThumbnail(field, data) {
    let thumbnail = '';
    if (data.thumbnail) {
        thumbnail = data.thumbnail;
    }
    return thumbnail;
}

function getDescription(field, data) {
    let description = '\n';
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
    if (data.previewLink)
        preview_url = data.previewLink;
    return preview_url;
}

function getTrackingLink(field, data) {
    let tracking_link = '';
    if (data.trackingLink)
        tracking_link = data.trackingLink;
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
    if (data.dateAdded) {
        start_date = data.dateAdded;
    }
    return start_date;
}

function getEndDate(field, data) {
    let end_date = moment().add(1, 'Y');

    return end_date;
}

function getRevenue(field, data) {
    let revenue = 0.0;
    if (data.payout)
        revenue = data.payout;
    return revenue;
}

function getRevenueType(field, data) {
    let revenue_type = { enum_type: 'unknown', offer_type: '' };
    if (data.payoutType)
        revenue_type.offer_type = data.payoutType;
    return revenue_type;
}

function getPayout(field, data) {
    let payout = 0.0;
    if (data.payout)
        payout = data.payout;
    return payout;
}

function getPayoutType(field, data) {
    let payout_type = { enum_type: 'unknown', offer_type: '' };
    if (data.payoutType)
        payout_type.offer_type = data.payoutType;
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
    if (data.dailyCap || data.totalCap) {
        cap_enable = true;
    }
    return cap_enable;
}

function getOfferCapping(field, data) {
    let cap = defaultCap();
    if (data.dailyCap) {
        cap.daily_conv = data.dailyCap;
    }
    if (data.totalCap) {
        cap.overall_conv = data.totalCap;
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
    if ((data.countries && data.countries.length) || (data.operatingSystems && data.operatingSystems.length)) {
        targeting_enable = true;
    }
    return targeting_enable;
}

function getGeoTargeting(field, data) {
    let geo_targeting = defaultGeoTargeting();
    if (data.countries && data.countries.length) {
        data.countries.map(obj => {
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
    if (data.operatingSystems && data.operatingSystems.length) {
        data.operatingSystems.map(obj => {
            if (obj == 'Android' && !device_targeting.os.includes('android')) {
                device_targeting.os.push('android');
                if (!device_targeting.device.includes('mobile')) {
                    device_targeting.device.push('mobile');
                }
            }
            else if (obj == 'iOS' && !device_targeting.os.includes('ios')) {
                device_targeting.os.push('ios');
                if (!device_targeting.device.includes('mobile')) {
                    device_targeting.device.push('mobile');
                }
            }
            else if (obj == 'Windows Phone' && !device_targeting.os.includes('windows')) {
                device_targeting.os.push('windows');
                if (!device_targeting.device.includes('mobile')) {
                    device_targeting.device.push('mobile');
                }
            }
            else if (obj == 'Blackberry' && !device_targeting.os.includes('blackberry')) {
                device_targeting.os.push('blackberry');
                if (!device_targeting.device.includes('mobile')) {
                    device_targeting.device.push('mobile');
                }
            }
            else if (obj == 'Windows PC' && !device_targeting.os.includes('windows')) {
                device_targeting.os.push('windows');
                if (!device_targeting.device.includes('desktop')) {
                    device_targeting.device.push('desktop');
                }
            }
            else if (obj == 'Mac' && !device_targeting.os.includes('ios')) {
                device_targeting.os.push('ios');
                if (!device_targeting.device.includes('desktop')) {
                    device_targeting.device.push('desktop');
                }
            }
            else if (obj == 'Linux' && !device_targeting.device.includes('desktop')) {
                device_targeting.device.push('desktop');
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
    if (data.creatives && data.creatives.length) {
        data.creatives.map(obj => {
            if (obj) {
                let tempCreative = defaultCreative();
                tempCreative.creative_file = obj;
                creative.push(tempCreative);
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
    if (data.trackingLink && data.trackingLink !== '') {
        status_label = "active";
    }
    else if (data.status == 'Pending') {
        status_label = 'waitingForApproval';
    }
    else if (data.status == 'Denied') {
        status_label = 'rejected';
    }
    else {
        status_label = "no_link";
    }
    return status_label;
}

const Qverseads = {
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
            let data = Qverseads[action](field, offer);
            formatedOffer[field] = data;
        }
        catch (err) {
            debug(err);

        }
    })
    return formatedOffer;
}
