const { InsertUpdateOffer, makeRequest, getOffersFields, addExtraFields, ImportantFields, defaultLog, mergeOfferLog, lockOfferApiStats } = require('../plugin');
const { ActiveApi, InactiveApi, getCountryCode } = require('../../helpers/Functions');
const FormData = require('form-data');
const debug = require("debug")("darwin:Plugin:Icubeswire");
const ENV_OFFERS_LIMIT = process.env.ENV_OFFERS_LIMIT;
const moment = require('moment');
const limit = 2000;

exports.getPid = (url) =>{
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

exports.offersApiCall = async (content) => {
    let valid = false;
    let offerLog = defaultLog();
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
                        let tempLog = await InsertUpdateOffer(ImportantFields, offer, content);
                        isNext = this.countApiPages(result.data);
                        page++;
                        offerLog = mergeOfferLog(offerLog, tempLog);
                        await ActiveApi(content)
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
            } while (isNext);
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

exports.apiCall = async (credentials, page, limit) => {
    try {
        let { apiKey, network_id } = credentials;
        if (network_id && apiKey) {
            let data = new FormData();
            data.append('pagination[page]', page);
            data.append('pagination[perpage]', limit);
            data.append('sort[sort]', 'desc');
            data.append('sort[field]', 'campId');
            let config = {
                method: 'post',
                url: `http://${network_id}/partner/get/offers`,
                headers: {
                    apiKey,
                    ...data.getHeaders()
                },
                data: data
            };
            return await makeRequest(config);
        }
    } catch (error) {
        debug(error)
    }
    return null;
}

exports.checkValid = (result) => {
    return (result && result.data && result.data.length) ? true : false;
}

exports.fetchResponse = (result) => {
    return result.data;
}

exports.traverseOffer = (result, content) => {

    let allOffer = {}

    result.map((offer) => {
        try {
            // debug(offer)
            let temp = formateOffers(offer);
            if (temp.advertiser_offer_id) {
                temp = addExtraFields(temp, content);
                allOffer[temp.advertiser_offer_id] = temp;
            }
        } catch (error) {
            debug(error)
        }
    });

    // debug(allOffer)
    return allOffer
}

exports.countApiPages = (result) => {
    if (result.isNext === "yes") return true;
    return false
}

//api wise methods
function getOfferId(field, data) {
    return data.campId ? data.campId : ""
}

function getOfferName(field, data) {
    return data.campName ? data.campName : ""
}

function getCategory(field, data) {
    return [];
}

function getIsGoalEnabled(field, data) {
    let goalStatus = false;
    for (const obj of data.payouts) {
        if (obj.groups && obj.groups.length) {
            goalStatus = true;
            break
        }
    }
    return goalStatus
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
    for (const payoutObj of data.payouts) {
        if (payoutObj.groups && payoutObj.groups.length) {
            for (const groupsObj of payoutObj.groups) {
                let tempGoals = new defaultGoal();
                tempGoals.name = groupsObj.goalName;
                tempGoals.goal_id = groupsObj.goalId;
                goals.push(tempGoals)
            }
        }
    }
    return goals;
}

function getCurrency(field, data) {
    return data.campCurrency ? data.campCurrency : 'USD'
}

function getThumbnail(field, data) {
    return '';
}

function getDescription(field, data) {
    return data.campDescription ? data.campDescription : '';
}

function getKpi(field, data) {
    return data.offerKpi ? data.offerKpi : "";
}

function getPreviewUrl(field, data) {
    return data.campPreviewUrl ? data.campPreviewUrl : "";
}

function getTrackingLink(field, data) {
    return data.trackingUrl ? data.trackingUrl : "";
}

function getExpiredUrl(field, data) {
    return '';
}

function getStartDate(field, data) {
    return moment(data.campStartDate).toDate();
}
function getEndDate(field, data) {
    return moment(data.campStartDate).add(1, 'Y');
}

function getRevenue(field, data) {
    let revenue = 0.0;
    for (const payoutObj of data.payouts) {
        if (revenue < +payoutObj.payoutValue) revenue = +payoutObj.payoutValue;
    }
    return revenue;
}
function getRevenueType(field, data) {
    if (data.CampVertical.includes("cpi-")) {
        return { enum_type: 'CPI', offer_type: 'CPI' };
    }
    return { enum_type: '', offer_type: '' };
}
function getPayout(field, data) {
    let payout = 0.0;
    for (const payoutObj of data.payouts) {
        if (payout < +payoutObj.payoutValue) payout = +payoutObj.payoutValue;
    }
    return payout;
}
function getPayoutType(field, data) {
    if (data.CampVertical.includes("cpi-")) {
        return { enum_type: 'CPI', offer_type: 'CPI' };
    }
    return { enum_type: '', offer_type: '' };
}

function getApprovalRequired(field, data) {
    return data.trackingUrl ? false : true;
}

function getIsCapEnabled(field, data) {
    return false;
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
    return defaultCap();
}

function getIsTargeting(field, data) {
    if (data.geo && data.geo.length) return true;
    if (data.campOs) return true;
    return false;
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
    if (data.geo && data.geo.length) {
        for (const campGeoObj of data.geo) {
            let campGeo = JSON.parse(campGeoObj.campGeo);
            for (const country of campGeo.countries) {
                let countryCode = getCountryCode(country)
                let index = geo_targeting.country_allow.findIndex(ele => ele.key == countryCode)
                if (index < 0)
                    geo_targeting.country_allow.push({ key: countryCode, value: countryCode })
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
    if (!data.campOs) {
        device_targeting.os.push("all")
    } else {
        if (["iphone", "android", "ipad"].includes(data.campOs.toLowerCase()) && !device_targeting.device.includes("mobile")) {
            device_targeting.device.push("mobile")
        }
        if (["iphone", "ipad", "ios"].includes(data.campOs.toLowerCase()) && !device_targeting.os.includes("ios")) {
            device_targeting.os.push("ios")
        }
        if (["android"].includes(data.campOs.toLowerCase()) && !device_targeting.os.includes("android")) {
            device_targeting.os.push("android")
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
    return data.trackingUrl ? "active" : "no_link"
}

function getRedirectionMethod(field, data) {
    return 'javascript_redirect';
}

const Icubeswire = {
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
            let data = Icubeswire[action](field, offer);
            formatedOffer[field] = data;
        }
        catch (err) {
            debug(err);
        }
    })
    return formatedOffer;
}

