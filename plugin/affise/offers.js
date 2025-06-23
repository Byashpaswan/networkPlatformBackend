const debug = require("debug")("darwin:Plugin:Affise");
const ENV_OFFERS_LIMIT = process.env.ENV_OFFERS_LIMIT;
const Promise = require('promise');
const moment = require('moment');
const { PlatformModel } = require('../../db/platform/Platform')
const limit = 500; // this is one api call fetch offer limit, it may be different according to plugin
/**
 * InsertUpdateOffer: this is main function to insert into db also for checking updated offer or new offer
 * makeRequest: used to calling axios call or for api call
 * addUpdateExtraFields: used for setting offer_hash, payout_type,revenue_type and status
 * getOffersFields: these fields we are going to save from api responses
 * addExtraFields: used for setting our own offer keys in db ex: platform_name, platform_id 
 * ImportantFields: These fields are used to check offer is updated or not
 * defaultLog: it is giving just default doc of offer stats
 * mergeOfferLog: merging all the stats of every page like how many new offer, no link offer and so on.
 * lockOfferApiStats: for save last (every hour) api response of this plugin 
 */
// const { InsertUpdateOffer, makeRequest, addUpdateExtraFields, getOffersFields, addExtraFields, ImportantFields, defaultLog, mergeOfferLog, lockOfferApiStats } = require('../plugin');
/**
 * ActiveApi: used for save this advertiser platform last status
 * InactiveApi: After five attempt we are marking this advertiser platform as inactive
 */
const plugin = require('../plugin');
const { ActiveApi, InactiveApi } = require('../../helpers/Functions');
const platformController = require('../../controllers/platform/Platform')
const Redis = require('../../helpers/Redis');
/**
 * This is a local function for finding next page
 * @param { Object } response 
 * @returns total page number from api call
 */
exports.countApiPages = (response) => {
    let page = 0;
    try {
        if (response.pagination && response.pagination['per_page'] && response.pagination['total_count']) {
            page = Math.ceil(response.pagination['total_count'] / response.pagination['per_page']);
            // return page >= 10 ? (process.env.OFFERS_FETCH_PAGE_LIMIT || 10 ) : page;
        }
        return page;
    }
    catch (err) {
        return 0;
    }
}
/**
 * @param { Object } credentials 
 * @param { Number } page 
 * @param { Number } apilimit 
 * @returns api call response
 * This function is also called from controller => offer => offerApiStats, plugin => validApi
 * used to find only approved offer from affise platform
 */
exports.apiCall = async (credentials, page, apilimit) => {
    if (credentials.network_id && credentials.api_key) {
        let network_id = credentials['network_id'];
        let api_key = credentials['api_key'];

        let apiBaseurl = "http://" + network_id + "/3.0/partner/offers?sort[id]=desc&page=" + page + "&limit=" + apilimit;
        // console.log("Affise hit URL : ", network_id,  apiBaseurl)
        return await plugin.makeRequest({
            method: 'get',
            url: apiBaseurl,
            headers: { 'API-Key': api_key }
        });
    }
    else {
        return null;
    }

}
/**
 * @param { Object } credentials 
 * @param { Number } page 
 * @param { Number } apilimit 
 * @returns api call response
 * This is a local function for getting all affise offer
 */
exports.apiCallForAllOffers = async (credentials, page, apilimit) => {
    if (credentials.network_id && credentials.api_key) {
        let network_id = credentials['network_id'];
        let api_key = credentials['api_key'];

        let apiBaseurl = "http://" + network_id + "/3.0/offers?sort[id]=desc&page=" + page + "&limit=" + apilimit;

        let result = await plugin.makeRequest({
            method: 'get',
            url: apiBaseurl,
            headers: { 'API-Key': api_key }
        });
        if (!result || result.status !== 200) {
            result = await plugin.makeRequest({
                method: 'get',
                url: apiBaseurl,
                headers: { 'API-Key': api_key }
            });
        }
        return result
    }
    else {
        return null;
    }

}
/**
 * @param { Object } content
 * @returns total page number from api call
 * This is a local function
 */
exports.affiseApiPages = (content) => {
    return new Promise(async (resolve, reject) => {
        try {
            let result = await this.apiCall(content.credentials, 1, limit);
            if (result) {
                valid = this.checkValid(result.data);
                if (valid === true) {
                    totalPages = this.countApiPages(result.data);
                    return resolve(totalPages);
                } else {
                    await InactiveApi(content);
                    await plugin.lockOfferApiStats(offerLog, content, start_time);
                    return resolve(false);
                }
            } else {
                await InactiveApi(content);
                return resolve(false);
            }
        }
        catch (err) {
            debug(err);
            return resolve(false);
        }
    });
}
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

/**
 * @param { Object } content get from the rabbitmq publisher
 * @returns true | false as acknowledgement
 * this function is also called from other files also
 * main function to start with
 * used to get offer from platform and insert into db
 */
exports.offersApiCall = async (content) => {
    // let network_id = content.credentials['network_id'];
    // let api_key = content.credentials['api_key'];
    let valid = false;
    let offerLog = plugin.defaultLog();
    let start_time = moment();
    let page = 1;
    let totalPages = 0;
    // let apiBaseurl = "http://" + network_id + "/3.0/partner/offers?limit=" + limit + "&page=" ;
    return new Promise(async (resolve, reject) => {
        try {
            let result;
            do {
                result = await this.apiCallForAllOffers(content.credentials, page, limit);
                if (result) {
                    valid = this.checkValid(result.data);
                    if (valid === true) {
                        let data = this.fetchResponse(result.data);
                        content['domain'] = content.credentials['network_id'];
                        let offer = this.traverseOffer(data, content);
                        let tempLog = await plugin.InsertUpdateOffer(plugin.ImportantFields, offer, content);
                        totalPages = this.countApiPages(result.data);
                        page++;
                        offerLog = plugin.mergeOfferLog(offerLog, tempLog);
                        await ActiveApi(content);
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
            } while (page <= totalPages);
            await plugin.lockOfferApiStats(offerLog, content, start_time, remarks = `Success, Api Response Status Code : ${result.status}, Page = ${page}`);
            // if (valid === true) {
            // await this.affiseAllOffersApiCall(content, offerLog, start_time);
            // }
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
/**
 * @param { Object } content 
 * @param { Object } offerLog 
 * @param { moment } start_time starting time of calling api
 * @returns true | false as acknowledgement
 * This function is used to call all type of offer from affise platform, Locally used
 */
exports.affiseAllOffersApiCall = async (content, offerLog, start_time) => {
    let page = 1;
    let totalPages = 0;
    return new Promise(async (resolve, reject) => {
        try {
            do {
                let result = await this.apiCallForAllOffers(content.credentials, page, limit);
                let data = this.fetchResponse(result.data);
                content['domain'] = content.credentials['network_id'];
                let offer = this.traverseOffer(data, content);
                let tempLog = await plugin.InsertUpdateOffer(plugin.ImportantFields, offer, content);
                totalPages = this.countApiPages(result.data);
                page++;
                offerLog = plugin.mergeOfferLog(offerLog, tempLog);
            } while (page <= totalPages);
            await plugin.lockOfferApiStats(offerLog, content, start_time);
            return resolve(true);
        }
        catch (err) {
            debug(err);
            return resolve(false);
        }
    });

}
/**
 * @param { Object} result 
 * @returns true | false
 * This function is also called from plugin => validApi
 * used to check there is valid offers in api call response or not
 */
exports.checkValid = (result) => {
    if (result && result.status && result.status == 1 && result.error === undefined) {
        return true;
    }
    else {
        return false;
    }
}
/**
 * @param { Object } result 
 * @returns api call offers array
 * This function is also called from plugin => validApi
 * used to find the exact key of offer array in api call
 */
exports.fetchResponse = (result) => {
    return result.offers;
}
/**
 * @param { Array } result 
 * @param { Object } content 
 * @returns formatted offer according to our db
 * This function is also called from plugin => validApi
 * used to traverse and format every offer which we ger from api call
 */
exports.traverseOffer = (result, content) => {

    let offers = {};
    result.map(function (data) {
        try {
            if (data) {

                let temp = formateOffers(data);
                if (temp.advertiser_offer_id && temp.advertiser_offer_id !== '') {
                    temp = plugin.addExtraFields(temp, content);
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

/**
 * @param { String } field our offer model key
 * @param { Object } data data is api response (single offer)
 * @returns value of field from data
 * These are fixed methods
 * it is used locally but we can't remove it, you can change it's definitions according to data
 * all these are used for format offers according to our offer model
 * from line no: 284 to 724
 */
function getCategory(field, data) {
    let category = [];
    if (data.categories && data.categories.length) {
        data.categories.map((obj) => {
            category.push(obj);
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
    if (data.title)
        offer_name = data.title;
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
    if (data.payments && data.payments[0] && data.payments[0].currency)
        currency = data.payments[0].currency.toUpperCase();
    return currency;
}

function getRedirectionMethod(field, data) {
    let method = 'javascript_redirect';
    return method;
}

function getThumbnail(field, data) {
    let thumbnail = '';
    if (data.logo)
        thumbnail = data.logo;
    return thumbnail;
}

function getDescription(field, data) {
    let description = '';
    if (data.description_lang && data.description_lang['en'])
        description = data.description_lang['en'];
    return description;
}

function getKpi(field, data) {
    let kpi = '';
    if (data.kpi && data.kpi['en'])
        kpi = data.kpi['en'];
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
    if (data.link)
        tracking_link = data.link;
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
    if (data.payments && data.payments[0] && data.payments[0].revenue)
        revenue = data.payments[0].revenue;
    return revenue;
}

function getRevenueType(field, data) {
    let revenue_type = { enum_type: '', offer_type: '' };
    if (data.payments && data.payments[0] && data.payments[0].type)
        revenue_type.offer_type = data.payments[0].type;
    return revenue_type;
}

function getPayout(field, data) {
    let payout = 0;
    if (data.payments && data.payments[0] && data.payments[0].revenue)
        payout = data.payments[0].revenue;
    return payout;
}

function getPayoutType(field, data) {
    let payout_type = { enum_type: '', offer_type: '' };
    if (data.is_cpi)
        payout_type.offer_type = 'cpi';
    return payout_type;
}

function getApprovalRequired(field, data) {
    let approval_required = false;
    if (data.required_approval)
        approval_required = data.required_approval;
    return approval_required;
}

function getIsCapEnabled(field, data) {
    let cap_enable = false;
    if (data.cap)
        cap_enable = true;
    return cap_enable;
}

function getOfferCapping(field, data) {
    let cap = defaultCap();
    data.caps.map(obj => {
        if (obj.period && obj.type) {
            if (obj.period == "day") {
                if (obj.type == "conversions") {
                    cap.daily_conv = obj.value;
                }
                else if (obj.type == "budget") {
                    cap.daily_revenue = obj.value;
                }
            }
            if (obj.period == "month") {
                if (obj.type == "conversions") {
                    cap.monthly_conv = obj.value;
                }
                else if (obj.type == "budget") {
                    cap.monthly_revenue = obj.value;
                }
            }
            if (obj.period == "all") {
                if (obj.type == "conversions") {
                    cap.overall_conv = obj.value;
                }
                else if (obj.type == "budget") {
                    cap.overall_revenue = obj.value;
                }
            }
        }
    })
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
    if (data.strictly_country || (data.targeting && data.targeting.length && ((data.targeting[0].country && Object.keys(data.targeting[0].country).length !== 0) || (data.targeting[0].os && data.targeting[0].os.allow)))) {
        targeting_enable = true;
    }
    return targeting_enable;
}

function getGeoTargeting(field, data) {
    let geo_targeting = defaultGeoTargeting();
    if (data.targeting && data.targeting.length) {
        if (data.targeting[0].country && Object.keys(data.targeting[0].country).length !== 0) {
            let country_data = data.targeting[0].country;
            if (country_data.allow && country_data.allow.length) {
                country_data.allow.map(obj => {
                    if (!geo_targeting.country_allow.some(ele => ele.value == obj)) {
                        geo_targeting.country_allow.push({ key: obj, value: obj });
                    }
                })
            }
            if (country_data.deny && country_data.deny.length) {
                country_data.deny.map(obj => {
                    if (!geo_targeting.country_deny.some(ele => ele.value == obj)) {
                        geo_targeting.country_deny.push({ key: obj, value: obj });
                    }
                })
            }
        }
        try {
            if (data.targeting[0].city && Object.keys(data.targeting[0].city).length !== 0) {
                let city_data = data.targeting[0].city;
                if (Array.isArray(city_data.allow)) {
                    if (city_data.allow && city_data.allow.length) {
                        city_data.allow.map(obj => {
                            if (!geo_targeting.city_allow.some(ele => ele.value == obj)) {
                                geo_targeting.city_allow.push({ key: obj, value: obj });
                            }
                        })
                    }
                } else {
                    if (((Object.keys(city_data.allow)).length) != 0) {
                        let city_allows = Object.keys(city_data.allow);
                        city_allows.map(obj => {
                            if (!geo_targeting.city_allow.some(ele => ele.value == obj)) {
                                geo_targeting.city_allow.push({ key: obj, value: obj });
                            }
                        })
                    }
                }
                if (city_data.deny && city_data.deny.length) {
                    city_data.deny.map(obj => {
                        if (!geo_targeting.city_deny.some(ele => ele.value == obj)) {
                            geo_targeting.city_deny.push({ key: obj, value: obj });
                        }
                    })
                }
            }
        } catch {

        }
    }
    if (data.payments && data.payments.length) {
        for (const paymentObj of data.payments) {
            let country_data = paymentObj.countries
            let city_data = paymentObj.cities
            if (country_data && country_data.length) {
                country_data.map(obj => {
                    if (!geo_targeting.country_allow.some(ele => ele.value == obj)) {
                        geo_targeting.country_allow.push({ key: obj, value: obj });
                    }
                })
            }
            try {
                if (city_data && city_data.length) {
                    city_data.map(obj => {
                        if (typeof (obj) != 'object') {
                            if (!geo_targeting.city_allow.some(ele => ele.value == obj)) {
                                geo_targeting.city_allow.push({ key: obj, value: obj });
                            }
                        } else {
                            if (!geo_targeting.city_allow.some(ele => ele.value == obj.name)) {
                                geo_targeting.city_allow.push({ key: obj.name, value: obj.name });
                            }
                        }
                    })
                }
            } catch {

            }
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
    if (data.targeting && data.targeting.length) {
        if (data.targeting[0].os) {
            let targeting = data.targeting[0].os;
            if (targeting.allow && targeting.allow.length) {
                targeting.allow.map(obj => {
                    tempos = '';
                    if (obj.name == "iOS" && !device_targeting.os.includes('ios')) {
                        device_targeting.os.push('ios');
                        tempos = 'ios'
                        if (!device_targeting.device.includes('mobile')) {
                            device_targeting.device.push('mobile')
                        }
                    }
                    else if (obj.name == "Android" && !device_targeting.os.includes('android')) {
                        tempos = 'android';
                        device_targeting.os.push('android');
                        if (!device_targeting.device.includes('mobile')) {
                            device_targeting.device.push('mobile')
                        }
                    }
                    if (tempos != '' && obj.version && obj.comparison) {
                        device_targeting.os_version.push({ os: tempos, version: obj.version, version_condition: obj.comparison.toLowerCase() });
                    }
                })
            }
            else if (data.payments && data.payments[0] && data.payments[0].os) {
                data.payments[0].os.map(obj => {
                    tempos = '';
                    if (obj == "iOS" && !device_targeting.os.includes('ios')) {
                        device_targeting.os.push('ios');
                        tempos = 'ios';
                        if (!device_targeting.device.includes('mobile')) {
                            device_targeting.device.push('mobile')
                        }
                    }
                    else if (obj == "Android" && !device_targeting.os.includes('android')) {
                        tempos = 'android';
                        device_targeting.os.push('android');
                        if (!device_targeting.device.includes('mobile')) {
                            device_targeting.device.push('mobile')
                        }
                    }
                })
            }
        }
        if (data.targeting[0].device_type) {
            let targeting = data.targeting[0];
            if (targeting.device_type && targeting.device_type.length) {
                ismobile = false;
                targeting.device_type.map(device => {
                    if (ismobile != true && (device == "tablet" || device == "mobile") && !device_targeting.device.includes('mobile')) {
                        ismobile = true;
                        device_targeting.device.push("mobile");
                    }
                    else if (device == "desktop" && !device_targeting.device.includes('desktop')) {
                        device_targeting.device.push("desktop");
                    }
                })
            }
            else if (data.payments && data.payments[0] && data.payments[0].devices) {
                ismobile = false;
                data.payments[0].devices.map(device => {
                    if (ismobile != true && (device == "tablet" || device == "mobile") && !device_targeting.device.includes('mobile')) {
                        ismobile = true;
                        device_targeting.device.push("mobile");
                    }
                    else if (device == "desktop" && !device_targeting.device.includes('desktop')) {
                        device_targeting.device.push("desktop");
                    }
                })
            }
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
    if (data.creatives && data.creatives.length) {
    }
    return creative;
}

function getOfferVisible(field, data) {
    let offer_visible = 'public';
    return offer_visible;
}

function getStatusLabel(field, data) {
    let status_label = 'unmanaged';
    // if (data.required_approval) {
    //     status_label = "no_link";
    // }
    // else if (data.required_approval === false) {
    //     status_label = "active";
    // }
    if (data.link) {
        status_label = "active";
    }
    else {
        status_label = "no_link";
    }
    return status_label;
}
/**
 * this is used as base for calling all format functions
 */
const affise = {
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
/**
 * @param { Object } offer single offer which we get in api responses
 * @returns Object of new formatted offer
 * Locally used
 */
function formateOffers(offer) {
    let formatedOffer = {};
    array = plugin.getOffersFields('', '');
    array.map(function (obj) {
        try {
            let field = obj.field;
            let action = obj.action;
            let data = affise[action](field, offer);
            formatedOffer[field] = data;
        }
        catch (err) {
            debug(err);

        }
    })
    return formatedOffer;
}
/**
 * @param { Object } content get from the rabbitmq publisher
 * @param { String } advertiser_offer_id 
 * @returns Object | null new formatted offer
 * This function used to sync any offer from the ui
 * it is valid for those platform which has REST api for fetching single offer
 * so it is not required in every plugin
 * it is also used in /darwin/plugin/fetchSingleOffer
 */
// curl -X GET "http://${network_id}/3.0/partner/offers?int_id[]=${advertiser_offer_id}" -H "API-Key: api_key"
exports.getSingleOfferInfo = async (content, advertiser_offer_id) => {
    try {
        if (content.credentials.network_id && content.credentials.api_key) {
            let network_id = content.credentials['network_id'];
            let api_key = content.credentials['api_key'];
            let date = new Date();
            let hours = parseInt(date.getHours());
            let redisKey = `FAIL:SYNC:D${Math.floor(hours/4)}:${content['advertiser_platform_id']}`;
            // let apiBaseurl = "http://" + network_id + "/3.0/offer/" + advertiser_offer_id;
            let apiBaseurl = `http://${network_id}/3.0/partner/offers?int_id[]=${advertiser_offer_id}`

            let result = await plugin.makeRequest({
                method: 'get',
                url: apiBaseurl,
                headers: { 'API-Key': api_key },
                timeout: 10000
            });
            if(result == 'ECONNABORTED'){
                await Redis.incrbyRedisData(redisKey, 1, 21600);
                return 1;
            }

            if (result) {
                valid = this.checkValid(result.data);
                if (valid === true) {
                    let data = this.fetchResponse(result.data)
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
/**
 * @param { Object } content get from the rabbitmq publisher
 * @param { String } advertiser_offer_id 
 * @returns true | false as acknowledgement
 * This function used to update offer after apply api is call, so it is not required in every plugin
 * conditions:
        if offer is instantly approved by advertiser then we are updating it
        if not then we are not calling this function
 * it is also used in
        /darwin/plugin/<plugin_name>/apply
        /darwin/workers/singleOfferUpdate/worker
 */
exports.singleOfferUpdate = (content, advertiser_offer_id) => {

    return new Promise(async (resolve, reject) => {
        try {
            if (content.credentials.network_id && content.credentials.api_key && advertiser_offer_id) {
                let apiBaseurl = `http://${content.credentials.network_id}/3.0/offer/${advertiser_offer_id}`;
                let result = await plugin.makeRequest({
                    method: 'get',
                    url: apiBaseurl,
                    headers: { 'API-Key': content.credentials.api_key }
                });
                if (result) {
                    valid = this.checkValid(result.data);
                    if (valid === true) {
                        let data = [result.data.offer];
                        content['domain'] = content.credentials.network_id;
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