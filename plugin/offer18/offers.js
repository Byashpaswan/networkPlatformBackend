// const { InsertUpdateOffer, makeRequest, addUpdateExtraFields, getOffersFields, addExtraFields, ImportantFields, defaultLog, mergeOfferLog, lockOfferApiStats } = require('../plugin');
const plugin = require('../plugin');
const moment = require('moment');
const Promise = require('promise');
const debug = require("debug")("darwin:Plugin:Offer18");
const ENV_OFFERS_LIMIT = process.env.ENV_OFFERS_LIMIT || 2000;
const limit = 1000;
const { PlatformModel } = require('../../db/platform/Platform')

const { ActiveApi, InactiveApi } = require('../../helpers/Functions');
exports.countApiPages = (response) => {
    try {
        let page = false;
        if (response.response == "200" && response.data && Object.keys(response.data).length == limit) {
            page = true;
        }
        return page;
    }
    catch (err) {
        return false;
    }
}

// update valid pid from sample tracking link.
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
    if (credentials.network_id && credentials.api_key && credentials.affiliate_id && credentials.mid) {
        let network_id = credentials['network_id'];
        let api_key = credentials['api_key'];
        let affiliate_id = credentials['affiliate_id'];
        let mid = credentials['mid'];
        let apiBaseurl = "https://" + network_id + "/api/af/offers?mid=" + mid + "&aid=" + affiliate_id + "&key=" + api_key + "&offer_status=1&authorized=1&limit=" + apilimit + "&page=";
        // let apiBaseurl = "https://" + network_id + "/api/af/offers?mid=" + mid + "&aid=" + affiliate_id + "&key=" + api_key + "&offer_status=1&limit=" + apilimit + "&page=";
        let result = await plugin.makeRequest({
            method: 'get',
            url: apiBaseurl + page,

        });
        if (result && result.status == 403) {
            apiBaseurl = "https://api.offer18.com/api/af/offers?mid=" + mid + "&aid=" + affiliate_id + "&key=" + api_key + "&offer_status=1&authorized=1&limit=" + limit + "&page="
            // apiBaseurl = "https://api.offer18.com/api/af/offers?mid=" + mid + "&aid=" + affiliate_id + "&key=" + api_key + "&offer_status=1&limit=" + limit + "&page="
            result = await plugin.makeRequest({
                method: 'get',
                url: apiBaseurl + page,

            });
        }
        return result;
    }
    else {
        return null;
    }
}

exports.offersApiCall = async (content) => {
    let page = 0;
    let valid = false;
    let offerLog = plugin.defaultLog();
    let start_time = moment();
    let nextPage = false;
    return new Promise(async (resolve, reject) => {
        try {
            let result;
            do {
                result = await this.apiCall(content.credentials, page, limit);
                if (result) {
                    valid = this.checkValid(result.data);
                    if (valid === true) {
                        let data = this.fetchResponse(result.data);
                        content['domain'] = content.credentials['network_id'] || 'api.offer18.com';
                        let offer = this.traverseOffer(data, content, true);
                        let tempLog = await plugin.InsertUpdateOffer(plugin.ImportantFields, offer, content);
                        nextPage = this.countApiPages(result.data);
                        page++;
                        offerLog = plugin.mergeOfferLog(offerLog, tempLog);
                        await ActiveApi(content);
                    }
                    else {
                        nextPage = false
                    }
                }
                else {
                    nextPage = false
                }
            } while (nextPage);
            // await lockOfferApiStats(offerLog, content, start_time, remarks = `Success, Api Response Status Code : ${result.status}, Page = ${page}`);
            await this.offer18OffersApiCall(content, offerLog, start_time);
            return resolve(true);
        }
        catch (err) {
            debug(err);
            await InactiveApi(content);
            await plugin.lockOfferApiStats(offerLog, content, start_time, remarks = `Fail, Api Response Error Msg : ${err}, Catch block`);
            return resolve(false);
        }
    });

}

exports.offer18OffersApiCall = async (content, offerLog, start_time) => {
    if (!(content.credentials['network_id'] && content.credentials['api_key'] && content.credentials['affiliate_id'])) {
        // debug("file: offers.js ~ line 52 ~ exports.offersApiCall= ~ content", content)
        return false;
    }
    let network_id = content.credentials['network_id'];
    let api_key = content.credentials['api_key'];
    let affiliate_id = content.credentials['affiliate_id'];
    let mid = content.credentials['mid'];
    let apiBaseurl = "https://" + network_id + "/api/af/offers?mid=" + mid + "&aid=" + affiliate_id + "&key=" + api_key + "&offer_status=1&limit=" + limit + "&page=";
    let page = 0;
    let valid = false;
    let nextPage = false;
    return new Promise(async (resolve, reject) => {
        try {
            let result;
            do {
                result = await plugin.makeRequest({
                    method: 'get',
                    url: apiBaseurl + page,

                });
                if (result && result.status == 403) {
                    apiBaseurl = "https://api.offer18.com/api/af/offers?mid=" + mid + "&aid=" + affiliate_id + "&key=" + api_key + "&offer_status=1&limit=" + limit + "&page="
                    result = await plugin.makeRequest({
                        method: 'get',
                        url: apiBaseurl + page,
                    });
                    if (!result || result.status !== 200) {
                        result = await plugin.makeRequest({
                            method: 'get',
                            url: apiBaseurl + page,
                        });
                    }
                }
                else if (!result || result.status !== 200) {
                    result = await plugin.makeRequest({
                        method: 'get',
                        url: apiBaseurl + page,
                    });
                }
                if (result) {
                    valid = this.checkValid(result.data);
                    if (valid === true) {
                        let data = this.fetchResponse(result.data);
                        content['domain'] = content.credentials['network_id'] || 'api.offer18.com';
                        let offer = this.traverseOffer(data, content, true);
                        let tempLog = await plugin.InsertUpdateOffer(plugin.ImportantFields, offer, content);
                        nextPage = this.countApiPages(result.data);
                        page++;
                        offerLog = plugin.mergeOfferLog(offerLog, tempLog);
                    } else {
                        await InactiveApi(content);
                        await plugin.lockOfferApiStats(offerLog, content, start_time, remarks = `Fail, Api Response Status Code : ${result.status}, checkValid = false, Page = ${page}`);
                        return resolve(false);
                    }
                } else {
                    await InactiveApi(content);
                    await plugin.lockOfferApiStats(offerLog, content, start_time, remarks = `Fail, Not Get Api Response, Reponse = null, Page = ${page}`);
                    return resolve(false);
                }
            } while (nextPage && page <= 19);
            await plugin.lockOfferApiStats(offerLog, content, start_time, remarks = `Success, Api Response Status Code : ${result.status}, Page = ${page}`);
            return resolve(true);
        }
        catch (err) {
            debug(err);
            await InactiveApi(content);
            await plugin.lockOfferApiStats(offerLog, content, start_time, remarks = `Fail, Api Response Error Msg : ${err}, Catch block, Page = ${page}`);
            return resolve(false);
        }
    });

}



exports.checkValid = (result) => {
    // if (result && ((result.response == "200" && result.data) || (result.response == "400" && result.error))) {
    if (result && result.response == "200" && result.data && Object.keys(result.data).length) {
        return true;
    }
    else {
        return false;
    }
}

exports.fetchResponse = (result) => {
    if (result.data) {
        return result.data;
    }
    else {
        return {};
    }
}
exports.traverseOffer = (result, content, authorized = true) => {

    let offers = {};
    Object.keys(result).map((data) => {
        try {
            if (data && data.status != "expired") {
                let temp = formateOffers(result[data], authorized);
                if (temp.advertiser_offer_id) {
                    temp = plugin.addExtraFields(temp, content);
                    offers[temp.advertiser_offer_id] = temp;
                }
            }
        }
        catch (err) {
            debug(err);

        }

    });
    return offers;
}

//api wise methods
function getCategory(field, data, authorized) {
    let category = [];
    if (data.category && data.category != '') {
        let cat = data.category.split(',');
        cat.map((obj) => {
            category.push(obj);
        })
    }
    return category;
}

function getOfferId(field, data, authorized) {
    let offer_id = '';
    if (data.offerid) {
        offer_id = data.offerid;
    }
    return offer_id;
}

function getOfferName(field, data, authorized) {
    let offer_name = '';
    if (data.name)
        offer_name = data.name;
    return offer_name;
}

function getIsGoalEnabled(field, data, authorized) {
    let goal_enable = false;
    if (data.events && data.events.length != 0)
        goal_enable = true;
    return goal_enable;
}

function getGoals(field, data, authorized) {
    let goal = [];
    // let tempGoals;
    // if (data.Offer['has_goals_enabled']  && data.Offer['has_goals_enabled'] != 0) {
    //     if (data.Goal  && data.Goal != null && data.Goal != {}) {
    //         tempGoals = defaultGoal();
    //         Object.keys(data.Goal).map(obj => {
    //             gdata = data.Goal[obj];
    //             if (gdata['name'] ) {
    //                 tempGoals.name = gdata['name'];
    //             }
    //             if (gdata['description'] ) {
    //                 tempGoals.description = gdata['description'];
    //             }
    //             if (gdata['payout_type'] ) {
    //                 tempGoals.payout_type = gdata['payout_type'];
    //             }
    //             if (gdata['default_payout'] ) {
    //                 tempGoals.payout = gdata['default_payout'];
    //             }
    //         })
    //         goal.push(tempGoals);
    //     }
    // }
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

function getRedirectionMethod(field, data, authorized) {
    let method = 'javascript_redirect';
    return method;
}

function getCurrency(field, data, authorized) {
    let currency = 'USD';
    if (data.currency)
        currency = data.currency.toUpperCase();
    return currency;
}

function getThumbnail(field, data, authorized) {
    let thumbnail = '';
    if (data.logo && data.logo != '')
        thumbnail = data.logo;
    return thumbnail;
}

function getDescription(field, data, authorized) {
    let description = '';
    if (data.offer_terms)
        description = data.offer_terms;
    return description;
}

function getKpi(field, data, authorized) {
    let kpi = '';
    if (data.offer_kpi)
        kpi = data.offer_kpi;
    return kpi;
}

function getPreviewUrl(field, data, authorized) {
    let preview_url = '';
    if (data.preview_url)
        preview_url = data.preview_url;
    return preview_url;
}

function getTrackingLink(field, data, authorized) {
    let tracking_link = '';
    if (data.click_url && authorized)
        tracking_link = data.click_url;
    return tracking_link;
}

function getExpiredUrl(field, data, authorized) {
    let expired_url = '';
    // if (data.Offer['expired_url'] )
    //     expired_url = data.Offer['expired_url'];
    return expired_url;
}

function getStartDate(field, data, authorized) {
    let start_date = moment();
    try {
        if (data.date_start) {
            stat_date = moment(data.date_start);
        }
    }
    catch {
        start_date = moment();
    }

    return start_date;
}

function getEndDate(field, data, authorized) {
    let end_date = moment().add(1, 'Y');
    try {
        if (data.date_end && moment(data.date_end).isValid()) {
            end_date = moment(data.date_end)
        }
    }
    catch {
        end_date = moment().add(1, 'Y');
    }

    return end_date;
}

function getRevenue(field, data, authorized) {
    let revenue = 0.0;
    if (data.price)
        revenue = +data.price;
    return revenue;
}

function getRevenueType(field, data, authorized) {
    let revenue_type = { enum_type: '', offer_type: '' };
    if (data.model)
        revenue_type.offer_type = data.model;
    return revenue_type;
}

function getPayout(field, data, authorized) {
    let payout = 0.0;
    if (data.price)
        payout = +data.price;
    return payout;
}

function getPayoutType(field, data, authorized) {
    let payout_type = { enum_type: '', offer_type: '' };
    if (data.model)
        payout_type.offer_type = data.model;
    return payout_type;
}

function getApprovalRequired(field, data, authorized) {
    let approval_required = false;
    if (!data.click_url || !authorized)
        approval_required = true;
    return approval_required;
}

function getIsCapEnabled(field, data, authorized) {
    let cap_enable = false;
    // if ((data.capping_budget && parseInt(data.capping_budget) > 0) || (data.capping_conversion && parseInt(data.capping_conversion) > 0))
    //     cap_enable = true;
    return cap_enable;
}

function getOfferCapping(field, data, authorized) {
    //capping needs to be checked
    let cap = defaultCap();
    // if (data.daily_cap ) {
    //     cap.daily_conv = +data.daily_cap;
    // }
    // if (data.total_cap ) {
    //     cap.overall_conv = +data.total_cap;
    // }
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

function getIsTargeting(field, data, authorized) {
    let targeting_enable = false;
    if (data.country_allow || data.country_block || data.os_allow || data.os_block || data.device_allow || data.device_block) {
        targeting_enable = true;
    }
    return targeting_enable;
}

function getGeoTargeting(field, data, authorized) {
    let geo_targeting = defaultGeoTargeting();
    if (data.country_allow && data.country_allow !== '') {
        let country_data = data.country_allow.split(',');
        country_data.map(obj => {
            if (obj && obj.trim()) {
                geo_targeting.country_allow.push({ key: obj, value: obj });
            }
        })

    }
    if (data.country_block && data.country_block !== '') {
        let country_data = data.country_block.split(',');
        country_data.map(obj => {
            if (obj && obj.trim()) {
                geo_targeting.country_deny.push({ key: obj, value: obj });
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

function getDeviceTargeting(field, data, authorized) {
    let device_targeting = defaultDeviceTargeting();
    let ismobile = false;
    if (data.device_allow && data.device_allow !== '') {
        let device = data.device_allow.split(',');
        device.map(obj => {
            if (obj != "") {
                if (ismobile != true && (obj == "tablet" || obj == "smartphone")) {
                    device_targeting.device.push("mobile");
                    ismobile = true;
                }
                else if (obj == "desktop") {
                    device_targeting.device.push("desktop");
                }

            }
        })
    }
    if (data.os_allow && data.os_allow !== '') {
        let os = data.os_allow.split(',');
        os.map(obj => {
            if (obj == "android" && !device_targeting.os.includes("android")) {
                device_targeting.os.push("android");
            }
            else if (obj == "ios" && !device_targeting.os.includes("ios")) {
                device_targeting.os.push("ios");

            }
            else if (obj == "windows" && !device_targeting.os.includes("windows")) {
                device_targeting.os.push("windows");

            }
            else if (obj == "blackberry_os" && !device_targeting.os.includes("blackberry")) {
                device_targeting.os.push("blackberry");

            }
            else if ((obj == "windows_mobile" || obj == "windows_phone") && !device_targeting.os.includes("windows")) {
                device_targeting.os.push("windows");

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

function getCreative(field, data, authorized) {
    let tempcreative = [];
    return tempcreative;
}

function getOfferVisible(field, data, authorized) {
    let offer_visible = 'public';
    return offer_visible;
}

function getStatusLabel(field, data, authorized) {
    let status_label = '';
    if (!data.click_url || !authorized) {
        status_label = "no_link";
    }
    
    if(data.click_url){
        status_label = 'active';
    }
    
    // if ((data.status == "active" && authorized) && data.click_url) {
    //     status_label = "active";
    // }
    // else if (data.status == "expired") {
    //     status_label = "deleted";
    // }
    return status_label;
}

const offer18 = {
    getOfferId: (field, data, authorized) => {
        return getOfferId(field, data, authorized);
    },
    getOfferName: (field, data, authorized) => {
        return getOfferName(field, data, authorized);
    },
    getCategory: (field, data, authorized) => {
        return getCategory(field, data, authorized);
    },
    getIsGoalEnabled: (field, data, authorized) => {
        return getIsGoalEnabled(field, data, authorized);
    },
    getGoals: (field, data, authorized) => {
        return getGoals(field, data, authorized);
    },
    getCurrency: (field, data, authorized) => {
        return getCurrency(field, data, authorized);
    },
    getThumbnail: (field, data, authorized) => {
        return getThumbnail(field, data, authorized);
    },
    getDescription: (field, data, authorized) => {
        return getDescription(field, data, authorized);
    },
    getKpi: (field, data, authorized) => {
        return getKpi(field, data, authorized);
    },
    getPreviewUrl: (field, data, authorized) => {
        return getPreviewUrl(field, data, authorized);
    },
    getTrackingLink: (field, data, authorized) => {
        return getTrackingLink(field, data, authorized);
    },
    getExpiredUrl: (field, data, authorized) => {
        return getExpiredUrl(field, data, authorized);
    },
    getStartDate: (field, data, authorized) => {
        return getStartDate(field, data, authorized);
    },
    getEndDate: (field, data, authorized) => {
        return getEndDate(field, data, authorized);
    },
    getRevenue: (field, data, authorized) => {
        return getRevenue(field, data, authorized);
    },
    getRevenueType: (field, data, authorized) => {
        return getRevenueType(field, data, authorized);
    },
    getPayout: (field, data, authorized) => {
        return getPayout(field, data, authorized);
    },
    getPayoutType: (field, data, authorized) => {
        return getPayoutType(field, data, authorized);
    },
    getApprovalRequired: (field, data, authorized) => {
        return getApprovalRequired(field, data, authorized);
    },
    getIsCapEnabled: (field, data, authorized) => {
        return getIsCapEnabled(field, data, authorized);
    },
    getOfferCapping: (field, data, authorized) => {
        return getOfferCapping(field, data, authorized);
    },
    getIsTargeting: (field, data, authorized) => {
        return getIsTargeting(field, data, authorized);
    },
    getGeoTargeting: (field, data, authorized) => {
        return getGeoTargeting(field, data, authorized);
    },
    getDeviceTargeting: (field, data, authorized) => {
        return getDeviceTargeting(field, data, authorized);
    },
    getCreative: (field, data, authorized) => {
        return getCreative(field, data, authorized);
    },
    getOfferVisible: (field, data, authorized) => {
        return getOfferVisible(field, data, authorized);
    },
    getStatusLabel: (field, data, authorized) => {
        return getStatusLabel(field, data, authorized);
    },
    getRedirectionMethod: (field, data, authorized) => {
        return getRedirectionMethod(field, data, authorized);
    }
}

function formateOffers(offer, authorized) {
    let formatedOffer = {};
    array = plugin.getOffersFields('', '');
    array.map(function (obj) {
        try {
            let field = obj.field;
            let action = obj.action;
            let data = offer18[action](field, offer, authorized);
            formatedOffer[field] = data;
        }
        catch (err) {
            debug(err);
            console.log('error-> ',err);

        }
    })
    return formatedOffer;
}

exports.getSingleOfferInfo = async (content, advertiser_offer_id) => {
    try {
        if (content.credentials.api_key && content.credentials.affiliate_id && content.credentials.mid) {
            let api_key = content.credentials['api_key'];
            let affiliate_id = content.credentials['affiliate_id'];
            let mid = content.credentials['mid'];

            let apiBaseurl = "https://api.offer18.com/api/af/offers?mid=" + mid + "&aid=" + affiliate_id + "&key=" + api_key + "&offer_status=1&authorized=1&offer_id=" + advertiser_offer_id; 
            // let apiBaseurl = "https://api.offer18.com/api/af/offers?mid=" + mid + "&aid=" + affiliate_id + "&key=" + api_key + "&offer_status=1&offer_id=" + advertiser_offer_id; 
            let result = await plugin.makeRequest({
                method: 'get',
                url: apiBaseurl,

            });

            if(result && result.data.response == '400' && result.data.error == 'no offers found'){
                apiBaseurl = "https://api.offer18.com/api/af/offers?mid=" + mid + "&aid=" + affiliate_id + "&key=" + api_key + "&offer_status=1&authorized=0&offer_id=" + advertiser_offer_id; 
                result = await plugin.makeRequest({
                    method: 'get',
                    url: apiBaseurl,
                });
            }

            if (result) {
                valid = this.checkValid(result.data);
                if (valid === true) {
                    let data = this.fetchResponse(result.data);
                    content['domain'] = content.credentials['network_id'] || 'api.offer18.com';
                    if (!content['payout_percent']) {
                        let platformData = await PlatformModel.getOnePlatform({ _id: content['advertiser_platform_id'] }, { payout_percent: 1 });
                        if (platformData && platformData['payout_percent'] && +platformData['payout_percent']) {
                            content['payout_percent'] = +platformData['payout_percent'];
                        }
                    }                   
                    let offer = this.traverseOffer(data, content);
                    let final_offer = null;                   
                    if (offer && offer[advertiser_offer_id]) { 
                        final_offer =  plugin.addUpdateExtraFields(offer[advertiser_offer_id], plugin.ImportantFields);
                    }
                    return final_offer;
                } else {
                    return null;
                }
            } else {
                return null;
            }
        } else {
            return null
        }
    } catch (error) {
        debug(error);
    }
}

exports.singleOfferUpdate = (content, advertiser_offer_id) => {

    return new Promise(async (resolve, reject) => {
        try {
            if (content.credentials.api_key && content.credentials.affiliate_id && content.credentials.mid && advertiser_offer_id) {
                let apiBaseurl = `https://api.offer18.com/api/af/offers?mid=${content.credentials['mid']}&aid=${content.credentials['affiliate_id']}&key=${content.credentials['api_key']}&offer_status=1&authorized=1&offer_id=${advertiser_offer_id}`;
                // let apiBaseurl = `https://api.offer18.com/api/af/offers?mid=${content.credentials['mid']}&aid=${content.credentials['affiliate_id']}&key=${content.credentials['api_key']}&offer_status=1&offer_id=${advertiser_offer_id}`;
                let result = await plugin.makeRequest({
                    method: 'get',
                    url: apiBaseurl,
                });
                if (result) {
                    valid = this.checkValid(result.data);
                    if (valid === true) {
                        let data = await this.fetchResponse(result.data);
                        content['domain'] = content.credentials.network_id || 'api.offer18.com';
                        let platformData = await PlatformModel.getOnePlatform({ _id: content['advertiser_platform_id'] }, { payout_percent: 1 });
                        if (platformData && platformData['payout_percent'] && +platformData['payout_percent']) {
                            content['offer_live_type'] = platformData['offer_live_type'];
                            content['visibility_status'] = platformData['offer_visibility_status'];
                            // content['publishers'] = platformData['publishers'];
                            content['payout_percent'] = +platformData['payout_percent'];
                            content['appidCountData'] = {};
                            let offer = this.traverseOffer(data, content);
                            let tempLog = await plugin.InsertUpdateOffer(plugin.ImportantFields, offer, content);
                            // if (tempLog.updated_offers || tempLog.approved_offers) {
                            //     return resolve(true);
                            // }
                            return resolve(true);
                        }
                    }
                }
            }
            return resolve(false);
        } catch (error) {
            console.log("error", error);
            return resolve(false);
        }
    });
}