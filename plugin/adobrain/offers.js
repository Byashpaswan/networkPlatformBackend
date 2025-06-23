// const { InsertUpdateOffer, makeRequest, getOffersFields, addExtraFields, ImportantFields, defaultLog, mergeOfferLog, lockOfferApiStats, addUpdateExtraFields } = require('../plugin');
const plugin = require("../plugin")
const { ActiveApi, InactiveApi, getCountryCode } = require('../../helpers/Functions');
const FormData = require('form-data');
const debug = require("debug")("darwin:Plugin:Adobrain");
const ENV_OFFERS_LIMIT = process.env.ENV_OFFERS_LIMIT;
const moment = require('moment');
const limit = 100;


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

exports.offersApiCall = async (content) => {
    let valid = false;
    let offerLog = plugin.defaultLog();
    let start_time = moment();
    let page = 1;
    let isNext = true;
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
                        let tempLog = await plugin.InsertUpdateOffer(plugin.ImportantFields, offer, content);
                        isNext = this.countApiPages(result.data);
                        page++;
                        offerLog = plugin.mergeOfferLog(offerLog, tempLog);
                        await ActiveApi(content)
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
            } while (isNext);
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

exports.apiCall = async (credentials, page = 1, limit = 100) => {
    try {
        let { apiKey, network_id } = credentials;
        if (network_id && apiKey) {
            let config = {
                method: 'get',
                url: `https://${network_id}/api/feed/offers?limit=${limit}&page=${page}`,
                headers: { 'Authorization': `Bearer ${apiKey}` },
            };
            let data = await plugin.makeRequest(config);
            // console.log("file: offers.js:65 ~ exports.apiCall= ~ data:", data.data.items)
            return data;
        }
    } catch (error) {
        debug(error)
    }
    return null;
}

exports.checkValid = (result) => {
    return (result && result.items && result.items.length) ? true : false;
}

exports.fetchResponse = (result) => {
    return result.items;
}

exports.traverseOffer = (result, content) => {

    let allOffer = {}

    result.map((offer) => {
        try {
            // debug(offer)
            if (offer.events) {
                let temp = formateOffers(offer);
                if (temp.advertiser_offer_id) {
                    temp = plugin.addExtraFields(temp, content);
                    allOffer[temp.advertiser_offer_id] = temp;
                }
            }
        } catch (error) {
            debug(error)
        }
    });

    // debug(allOffer)
    return allOffer
}

exports.countApiPages = (result) => {
    if (result.page && result.limit && result.total && result.items && result.items.length) {
        if ((result.page * result.limit) <= result.total) return true;
        else return false;
    }
    return false
}

//api wise methods
function getOfferId(field, data) {
    return data.id ? data.id : ""
}

function getOfferName(field, data) {
    return data.name ? data.name : ""
}

function getCategory(field, data) {
    return data.categories ? data.categories : [];
}

function getIsGoalEnabled(field, data) {
    return data.events && data.events.length ? true : false;
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

function getGoals(field, data) {
    let goals = [];
    for (const eventObj of data.events) {
        let tempGoals = new defaultGoal();
        tempGoals.name = eventObj.name;
        tempGoals.goal_id = eventObj.id;
        tempGoals.payout = eventObj.payout;
        tempGoals.revenue = eventObj.payout;
        tempGoals.payout_type = eventObj.payout_type;
        goals.push(tempGoals)
    }
    return goals;
}

function getCurrency(field, data) {
    return data.currency ? data.currency : 'USD'
}

function getThumbnail(field, data) {
    return '';
}

function getDescription(field, data) {
    return data.description ? data.description : '';
}

function getKpi(field, data) {
    return data.offerKpi ? data.offerKpi : "";
}

function getPreviewUrl(field, data) {
    return data.urls && data.urls.length ? data.urls[0].preview_url : "";
}

function getTrackingLink(field, data) {
    return data.tracking_url ? data.tracking_url : "";
}

function getExpiredUrl(field, data) {
    return '';
}

function getStartDate(field, data) {
    try {
        return moment(data.start_time).toDate();
    } catch (error) {
        return moment().toDate();
    }
}
function getEndDate(field, data) {
    try {
        return moment(data.start_time).add(1, 'Y').toDate();
    } catch (error) {
        return moment().add(1, 'Y').toDate();
    }
}

function getRevenue(field, data) {
    let revenue = 0.0;
    for (const eventObj of data.events) {
        if (revenue < +eventObj.payout) revenue = +eventObj.payout;
    }
    return revenue;
}
function getRevenueType(field, data) {
    let revenue = 0.0;
    let revenueType = "";
    for (const eventObj of data.events) {
        if (revenue < +eventObj.payout) {
            revenue = +eventObj.payout;
            revenueType = eventObj.payout_type
        };
    }
    return { enum_type: revenueType, offer_type: revenueType };
}
function getPayout(field, data) {
    let payout = 0.0;
    for (const eventObj of data.events) {
        if (payout < eventObj.payoutValue) payout = eventObj.payoutValue;
    }
    return payout;
}
function getPayoutType(field, data) {
    let payout = 0.0;
    let payoutType = "";
    for (const eventObj of data.events) {
        if (payout < +eventObj.payout) {
            payout = +eventObj.payout;
            payoutType = eventObj.payout_type
        };
    }
    return { enum_type: payoutType, offer_type: payoutType };
}

function getApprovalRequired(field, data) {
    return data.tracking_url ? false : true;
}

function getIsCapEnabled(field, data) {
    let capStatus = false;
    for (const eventObj of data.events) {
        if (eventObj.daily_cap) { capStatus = true; break }
    }
    return capStatus
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

function getOfferCapping(field, data) {
    let cap = defaultCap();
    let payout = 0.0;
    for (const eventObj of data.events) {
        if (payout < +eventObj.payout) {
            payout = +eventObj.payout;
            cap.daily_conv = eventObj.daily_cap || ''
        };
    }
    return cap;
}

function getIsTargeting(field, data) {
    return data.is_targeting ? true : false;
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
function getGeoTargeting(field, data) {
    let geo_targeting = defaultGeoTargeting();
    if (data.targeting) {
        if (data.targeting.country && data.targeting.country.include) {
            for (const country of data.targeting.country.include) {
                let index = geo_targeting.country_allow.findIndex(ele => ele.key == country.toUpperCase())
                if (index < 0)
                    geo_targeting.country_allow.push({ key: country.toUpperCase(), value: country.toUpperCase() })
            }
        }
        if (data.targeting.city && data.targeting.city.include) {
            for (const city of data.targeting.city.include) {
                let index = geo_targeting.city_allow.findIndex(ele => ele.key == city.toUpperCase())
                if (index < 0)
                    geo_targeting.city_allow.push({ key: city.toUpperCase(), value: city.toUpperCase() })
            }
        }
    }
    return geo_targeting;
}

function defaultDeviceTargeting() {
    let device_targeting = {
        device: [],
        os: [],
        os_version: []
    }
    return device_targeting;
}
function getDeviceTargeting(field, data) {
    let device_targeting = defaultDeviceTargeting();
    if (!data.targeting || !data.targeting.os || !data.targeting.os.include) {
        device_targeting.os.push("all")
    } else {
        if (data.targeting.os && data.targeting.os.include) {
            for (const os of data.targeting.os.include) {
                if (["iphone", "android", "ipad", "ios"].includes(os.toLowerCase()) && !device_targeting.device.includes("mobile")) {
                    device_targeting.device.push("mobile")
                }
                if (["iphone", "ipad", "ios"].includes(os.toLowerCase()) && !device_targeting.os.includes("ios")) {
                    device_targeting.os.push("ios")
                }
                if (["android"].includes(os.toLowerCase()) && !device_targeting.os.includes("android")) {
                    device_targeting.os.push("android")
                }
            }
        }
    }
    return device_targeting;
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
function getCreative(field, data) {
    return [];
}

function getOfferVisible(field, data) {
    return 'public';
}

function getStatusLabel(field, data) {
    return data.tracking_url ? "active" : "no_link"
}

function getRedirectionMethod(field, data) {
    return 'javascript_redirect';
}

const Adobrain = {
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
    array = plugin.getOffersFields('', '');
    array.map(function (obj) {
        try {
            let field = obj.field;
            let action = obj.action;
            let data = Adobrain[action](field, offer);
            formatedOffer[field] = data;
        }
        catch (err) {
            debug(err);
        }
    })
    return formatedOffer;
}
// curl -X GET "apiBaseUrl" \
//      -H "Authorization: Bearer apiKey"

exports.getSingleOfferInfo = async (content, advertiser_offer_id) => {
    try {
        let { apiKey, network_id } = content.credentials;
        if (network_id && apiKey) {
            let config = {
                method: 'get',
                url: `https://${network_id}/api/feed/offers/${advertiser_offer_id}`,
                headers: { 'Authorization': `Bearer ${apiKey}` },
            };
            let result = await plugin.makeRequest(config);
            if (result) {
                let valid = this.checkValid(result.data);
                if (valid === true) {
                    let data = [result.data['offer']];
                    content['domain'] = network_id;
                    if (!content['payout_percent']) {
                        let platformData = await PlatformModel.getOnePlatform({ _id: content['advertiser_platform_id'] }, { payout_percent: 1 });
                        if (platformData && platformData['payout_percent'] && +platformData['payout_percent']) {
                            content['payout_percent'] = +platformData['payout_percent'];
                        }
                    }
                    let offer = this.traverseOffer(data, content);
                    let final_offer = null;
                    if (offer && offer[advertiser_offer_id]) {
                        final_offer = plugin.addUpdateExtraFields(offer[advertiser_offer_id], plugin.ImportantFields);
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
