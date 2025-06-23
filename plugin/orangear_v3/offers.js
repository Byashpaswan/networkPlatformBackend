const { InsertUpdateOffer, makeRequest, getOffersFields, addExtraFields, ImportantFields, defaultLog, mergeOfferLog, lockOfferApiStats } = require('../plugin');
const moment = require('moment');
const debug = require("debug")("darwin:Plugin:Orangear_v3");
const ENV_OFFERS_LIMIT = process.env.ENV_OFFERS_LIMIT;

const limit = 500;
const { ActiveApi, InactiveApi } = require('../../helpers/Functions');
exports.countApiPages = (response) => {
    let page = 0;
    try {
        if (response.total_pages) {
            page = response.total_pages;
        }
        return page;
    }
    catch (err) {
        return 0;
    }
}

exports.getPid = (url) =>{
    console.log(" url -> ", url );
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

exports.apiCall = async (credentials, page, apilimit) => {
    if (credentials.network_id && credentials.api_key) {
        let network_id = credentials['network_id'];
        let api_key = credentials['api_key'];
        let apiBaseurl = "https://" + network_id + "/api/public/v3/offers?api_key=" + api_key + "&approved=1&limit=" + apilimit + "&page=";
        // debug(apiBaseurl)
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
    let page = 1;
    let totalPages = 1;
    let valid = false;
    let offerLog = defaultLog();
    let start_time = moment();
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
                    }
                    else {
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
            await this.orangear_v3OffersApiCall(content, offerLog, start_time);
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

exports.orangear_v3OffersApiCall = async (content, offerLog, start_time) => {
    // debug('v3 orangear');
    let network_id = content.credentials['network_id'];
    let api_key = content.credentials['api_key'];
    let apiBaseurl = "https://" + network_id + "/api/public/v3/offers?api_key=" + api_key + "&approved=0&limit=" + limit + "&page=";
    let page = 1;
    let totalPages = 1;
    let valid = false;
    return new Promise(async (resolve, reject) => {
        try {
            let result;
            do {
                result = await makeRequest({
                    method: 'get',
                    url: apiBaseurl + page,

                });
                if (result) {
                    valid = this.checkValid(result.data);
                    if (valid === true) {
                        let data = this.fetchResponse(result.data);
                        content['domain'] = network_id;
                        let offer = this.traverseOffer(data, content);
                        let tempLog = await InsertUpdateOffer(ImportantFields, offer, content);
                        totalPages = this.countApiPages(result.data);
                        page++;
                        offerLog = mergeOfferLog(offerLog, tempLog);
                    }
                    else {
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
    try {
        if (result.error == undefined && (result.items || result.length == 0)) {
            //valid credentials hasoffer  
            return true;
        }
        else {
            return false;
        }
    }
    catch {
        return false;
    }
}

exports.fetchResponse = (result) => {
    return result.items;
}
exports.traverseOffer = (result, content) => {
    let offers = {};
    result.map((data) => {
        try {
            if (data) {

                let temp = formateOffers(data);
                if (temp.advertiser_offer_id) {
                    temp = addExtraFields(temp, content);
                    offers[temp.advertiser_offer_id] = temp;
                }
            }
        }
        catch (err) {
            debug(err);
            // console.log('error', err); //skip offer
        }

    });
    return offers;
}

//api wise methods
function getCategory(field, data) {
    let category = [];
    if (data.tags && Array.isArray(data.tags)) {
        data.tags.map((obj) => {
            category.push(obj.name);
        })
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
    if (data.goals && data.goals.length && data.goals[0].enabled)
        goal_enable = true;
    return goal_enable;
}

function getGoals(field, data) {
    let goal = [];
    let tempGoals;
    if (data.goals && data.goals.length) {
        data.goals.map(obj => {
            tempGoals = defaultGoal();
            if (obj.enabled == true) {
                if (obj.type) {
                    if (obj.type == 1) {
                        tempGoals.type = 'main goal';
                    }
                    else if (obj.type == 2) {
                        tempGoals.type = 'additional';
                    }
                }
                if (obj.name) {
                    tempGoals.name = obj.name;
                }

                if (obj.publisher_payout['amount']) {
                    tempGoals.payout = obj.publisher_payout['amount'];
                }
                if (obj.id) {
                    tempGoals.goal_id = obj.id;
                }
                goal.push(tempGoals);
            }
        })
    }
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
function getCreative(field, data) {
    let creatives = [];
    if (data.creatives && (data.creatives['name'] || data.creatives['width'] || data.creatives['height'] || data.creatives['url'])) {
        let tempcreative = defaultCreative();
        if (data.creatives.length != 0) {
            if (data.creatives['name']) {
                tempcreative.name = data.creatives['name'];
            }
            if (data.creatives['width']) {
                tempcreative.width = data.creatives['width'];
            }
            if (data.creatives['height']) {
                tempcreative.height = data.creatives['height'];
            }
            if (data.creatives['url']) {
                tempcreative.tracking_link = data.creatives['url'];
            }
            creatives.push(tempcreative);
        }
    }
    return creatives;
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

function getRedirectionMethod(field, data) {
    let method = 'javascript_redirect';
    return method;
}

function getCurrency(field, data) {
    let currency = 'USD';
    if (data.goals && data.goals.length && data.goals[0].publisher_payout && data.goals[0].publisher_payout['currency'])
        currency = data.goals[0].publisher_payout['currency'].toUpperCase();
    return currency;
}

function getThumbnail(field, data) {
    let thumbnail = '';
    if (data.thumb_url)
        thumbnail = data.thumb_url;
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
    // if (data.Offer['kpi'] )
    //     kpi = data.Offer['kpi'];
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
    // if (data.Offer['expired_url'] )
    //     expired_url = data.Offer['expired_url'];
    return expired_url;
}

function getStartDate(field, data) {
    let start_date = moment();
    return start_date;
}

function getEndDate(field, data) {
    let end_date = moment().add(1, 'Y');

    // if (data.Offer['expiration_date'] )
    //     end_date = moment(data.Offer['expiration_date']);
    return end_date;
}

function getRevenue(field, data) {
    let revenue = 0.0;
    if (data.goals && data.goals[0] && data.goals[0].publisher_payout && data.goals[0].publisher_payout['amount']) {
        revenue = data.goals[0].publisher_payout['amount'];
    }
    return revenue;
}

function getRevenueType(field, data) {
    let revenue_type = { enum_type: '', offer_type: '' };
    // if (data.Offer['revenue_type'] )
    //     revenue_type.offer_type = data.Offer['revenue_type'];
    return revenue_type;
}

function getPayout(field, data) {
    let payout = 0.0;
    if (data.goals && data.goals[0] && data.goals[0].publisher_payout && data.goals[0].publisher_payout['amount']) {
        revenue = data.goals[0].publisher_payout['amount'];
    }
    return payout;
}

function getPayoutType(field, data) {
    let payout_type = { enum_type: '', offer_type: '' };
    // if (data.Offer['payout_type'] )
    //     payout_type.offer_type = data.Offer['payout_type'];
    return payout_type;
}

function getApprovalRequired(field, data) {
    let approval_required = true;
    if (data.tracking_url) {
        approval_required = false;
    }
    return approval_required;
}

function getIsCapEnabled(field, data) {
    let cap_enable = false;
    if ((data.goals && data.goals.length && data.goals[0].cap && data.goals[0].cap_click) && (data.goals[0].cap['daily'] != 0 || data.goals[0].cap['monthly'] != 0 || data.goals[0].cap['total'] != 0 || data.goals[0].cap_click['daily'] != 0 || data.goals[0].cap_click['monthly'] || data.goals[0].cap_click['total'] != 0)) {
        cap_enable = true;
    }
    return cap_enable;
}

function getOfferCapping(field, data) {
    let cap = defaultCap();
    if (data.goals && data.goals.length) {
        if (data.goals[0].cap['daily']) {
            cap.daily_conv = +data.goals[0].cap['daily'];
        }
        if (data.goals[0].cap['monthly']) {
            cap.monthly_conv = +data.goals[0].cap['monthly'];
        }
        if (data.goals[0].cap['total']) {
            cap.overall_conv = +data.goals[0].cap['total'];
        }
        if (data.goals[0].cap_click['daily']) {
            cap.daily_clicks = +data.goals[0].cap_click['daily'];
        }
        if (data.goals[0].cap_click['monthly']) {
            cap.monthly_clicks = +data.goals[0].cap_click['monthly'];
        }
        if (data.goals[0].cap_click['total']) {
            cap.overall_click = +data.goals[0].cap_click['total'];
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
    if (data.goals && data.goals.length && data.goals[0].platforms) {
        targeting_enable = true;
    }
    return targeting_enable;
}

function getGeoTargeting(field, data) {
    let geo_targeting = defaultGeoTargeting();
    if (data.goals && data.goals.length && data.goals[0].countries && Array.isArray(data.goals[0].countries)) {
        data.goals[0].countries.map(obj => {
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

    let isIos = false;
    let isMobile = false;

    if (data.goals && data.goals.length && data.goals[0].platforms) {
        data.goals[0].platforms.map(tempPlt => {
            if (isIos != true && (tempPlt.platform == "iPhone" || tempPlt.platform == "iPad")) {
                device_targeting.os.push('ios');
                isIos = true;
                if (tempPlt.version) {
                    device_targeting.os_version.push({ os: 'ios', version: tempPlt.version, version_condition: 'eq' });
                }
                if (!isMobile) {
                    device_targeting.device.push('mobile');
                }
                isMobile = true;
            }
            else if (tempPlt.platform == "Android") {
                device_targeting.os.push('android');
                if (!isMobile) {
                    device_targeting.device.push('mobile');
                }
                isMobile = true;
                if (tempPlt.version) {
                    device_targeting.os_version.push({ os: 'android', version: tempPlt.version, version_condition: 'eq' });
                }
            }
            else if ((tempPlt.platform == 'Desktop')) {
                device_targeting.device.push('desktop');
            }
            else if (tempPlt.platform == "Blackberry") {
                if (!isMobile) {
                    device_targeting.device.push('mobile');
                }
                isMobile = true;
            }
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

const orangear_v3 = {
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
            let data = orangear_v3[action](field, offer);
            formatedOffer[field] = data;
        }
        catch (err) {
            debug(err);

        }
    })
    return formatedOffer;
}
