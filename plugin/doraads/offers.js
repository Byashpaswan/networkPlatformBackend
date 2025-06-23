const { InsertUpdateOffer, makeRequest, getOffersFields, addExtraFields, ImportantFields, defaultLog, mergeOfferLog, lockOfferApiStats, addUpdateExtraFields } = require('../plugin');
const { ActiveApi, InactiveApi, getAllCountryList, getCountryCode } = require('../../helpers/Functions');
const debug = require("debug")("darwin:Plugin:Doraads");
const ENV_OFFERS_LIMIT = process.env.ENV_OFFERS_LIMIT;
const moment = require('moment');
const limit = 1000;

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

exports.apiCall = async (credentials, page = 1, limit = 100) => {
    try {
        let { token, network_id ,pid} = credentials;
        if (network_id && token && pid) {
            let config = {
                method: 'get',
                url: `http://${network_id}/offers/?id=${pid}&token=${token}`,
                
            };
            let result = await makeRequest(config);
            // console.log("file: offers.js:65 ~ exports.apiCall= ~ data:", result.data.offers)
            return result;
        }
    } catch (error) {
        debug(error)
    }
    return null;
}

exports.checkValid = (result) => {
    return (result && result.offers && result.offers.length) ? true : false;
}

exports.fetchResponse = (result) => {
    return result.offers;
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
    return false
}

//api wise methods
function getOfferId(field, data) {
    return data.offer_id ? data.offer_id : ""
}

function getOfferName(field, data) {
    return data.offer_name ? data.offer_name : ""
}

function getCategory(field, data) {
    return data.category ? [data.category]: [];
}

function getIsGoalEnabled(field, data) {
    return false;
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
    return [];
}

function getCurrency(field, data) {
    return data.currency ? data.currency: 'USD'
}

function getThumbnail(field, data) {
    return data.icon ? data.icon : '';
}

function getDescription(field, data) {
    return data.description ? data.description : '';
}

function getKpi(field, data) {
    return data.kpi ? data.kpi : "";
}

function getPreviewUrl(field, data) {
    return data.preview_url ? data.preview_url : "";
}

function getTrackingLink(field, data) {
    return data.tracking_link ? data.tracking_link : "";
}

function getExpiredUrl(field, data) {
    return '';
}

function getStartDate(field, data) {
    return moment().toDate();
}
function getEndDate(field, data) {
    return moment().add(1, 'Y').toDate();
}

function getRevenue(field, data) {
    return data.payout ? +data.payout : 0.0
}
function getRevenueType(field, data) {
    return data.payout_type ? { enum_type: data.payout_type.toUpperCase(), offer_type: data.payout_type.toUpperCase() } : { enum_type: "", offer_type: "" };
}
function getPayout(field, data) {
    return data.payout ? data.payout : 0.0
}
function getPayoutType(field, data) {
    return data.payout_type ? { enum_type: data.payout_type.toUpperCase(), offer_type: data.payout_type.toUpperCase() } : { enum_type: "", offer_type: "" };
}

function getApprovalRequired(field, data) {
    return data.tracking_link ? false : true;
}

function getIsCapEnabled(field, data) {
    return data.daily_cap ? true : false;
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
    if (data.daily_cap) cap.daily_conv = data.daily_cap;
    return cap;
}

function getIsTargeting(field, data) {
    return data.country || data.os ? true : false;
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
    if (data.country) {
        for (const country of data.country.split(",")) {
            let index = geo_targeting.country_allow.findIndex(ele => ele.key == country.toUpperCase())
            if (index < 0)
                geo_targeting.country_allow.push({ key: country.toUpperCase(), value: country.toUpperCase() })
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
    if (!data.os) {
        device_targeting.os.push("all")
    } else {
        let tempOs = ""
        if (["iphone", "android", "ipad", "ios"].includes(data.os.toLowerCase()) && !device_targeting.device.includes("mobile")) {
            device_targeting.device.push("mobile")
        }
        if (["iphone", "ipad", "ios"].includes(data.os.toLowerCase()) && !device_targeting.os.includes("ios")) {
            device_targeting.os.push("ios")
            tempOs = "ios"
        }
        if (["android"].includes(data.os.toLowerCase()) && !device_targeting.os.includes("android")) {
            device_targeting.os.push("android")
            tempOs = "android"
        }
        if(data.os_version){
            device_targeting.os_version.push({ os: tempos, version: data.os_version, version_condition: 'gte' });
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
    if(data.creatives){
        let creative = defaultCreative();
        creative.creative_file = data.creatives
        return [creative]
    }
    return [];
}

function getOfferVisible(field, data) {
    return 'public';
}

function getStatusLabel(field, data) {
    return data.tracking_link ? "active" : "no_link"
}

function getRedirectionMethod(field, data) {
    return 'javascript_redirect';
}

const Doraads = {
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
            let data = Doraads[action](field, offer);
            formatedOffer[field] = data;
        }
        catch (err) {
            debug(err);
        }
    })
    return formatedOffer;
}

exports.getSingleOfferInfo = async (content, advertiser_offer_id) => {
    try {
        let { apiKey, network_id } = content.credentials;
        if (network_id && apiKey) {
            let config = {
                method: 'get',
                url: `http://${network_id}/api/v1/offers?token=${token}&offer_id=${advertiser_offer_id}`,
            };
            let result = await makeRequest(config);
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
                        final_offer = addUpdateExtraFields(offer[advertiser_offer_id], ImportantFields);
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
