const { InsertUpdateOffer, makeRequest, getOffersFields, addExtraFields, ImportantFields, defaultLog, mergeOfferLog, lockOfferApiStats } = require('../plugin');
const { ActiveApi, InactiveApi } = require('../../helpers/Functions');
const debug = require("debug")("darwin:Plugin:Appdiscover");

const ENV_OFFERS_LIMIT = process.env.ENV_OFFERS_LIMIT;
const moment = require('moment');
const limit = 500;
exports.countApiPages = (response) => {
    let page = 0;
    try {
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
    return urlData.searchParams.get('pub_id');
}

exports.getPidLocation = ()=>{
    return {
        lop : 'query', // lop means locations of pid
        location : 'pub_id'
    }
}
exports.apiCall = async (credentials, page, apilimit) => {
    if (credentials.api_key) {
        let api_key = credentials['api_key'];
        // QW5kcjE1NzA4NjY1MzQwMjE
        let apiBaseurl = "https://ob.appsdiscover.com/obb_api/aff_ob/v1.0/all_offer?api_key=" + api_key + "&method=findAll&limit=" + apilimit;
        // debug(apiBaseurl)
        return await makeRequest({
            method: 'get',
            url: apiBaseurl,
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
    let totalPages = 1;
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
                        content['domain'] = "ob.appsdiscover.com";
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
    if (result.success && result.error == "No Error") {
        //valid credentials Appdiscover  
        return true;
    }
    else {
        return false;
    }
}

exports.fetchResponse = (result) => {
    return result.response;
}
exports.traverseOffer = (result, content) => {

    let offers = {};
    result.map(function (data) {
        try {
            if (data) {

                let temp = formateOffers(data, content.credentials);

                if (temp.advertiser_offer_id && temp.advertiser_offer_id !== '') {
                    temp = addExtraFields(temp, content);
                    if (offers[temp.advertiser_offer_id]) {
                    }
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
function getCategory(field, data, content) {
    let category = [];
    return category;
}

function getOfferId(field, data, content) {
    let offer_id = '';
    if (data.id) {
        offer_id = data.id;
    }
    return offer_id;
}

function getOfferName(field, data, content) {
    let offer_name = '';
    if (data.name)
        offer_name = data.name;
    return offer_name;
}

function getIsGoalEnabled(field, data, content) {
    let goal_enable = false;
    return goal_enable;
}

function getGoals(field, data, content) {
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

function getCurrency(field, data, content) {
    let currency = 'USD';
    if (data.currency_type) {
        currency = data.currency_type.toUpperCase();
    }
    return currency;
}

function getRedirectionMethod(field, data, content) {
    let method = 'javascript_redirect';
    return method;
}

function getThumbnail(field, data, content) {
    let thumbnail = '';
    return thumbnail;
}

function getDescription(field, data, content) {
    let description = '';
    if (data.desc)
        description = data.desc;
    return description;
}

function getKpi(field, data, content) {
    let kpi = '';
    return kpi;
}

function getPreviewUrl(field, data, content) {
    let preview_url = '';
    if (data.preview_url)
        preview_url = data.preview_url;
    return preview_url;
}

function getTrackingLink(field, data, content) {
    let tracking_link = '';
    if (data.id && content.aff_id) {
        tracking_link = "http://offtrk.appsdiscover.co.in/pck/click?aff_id=" + content.aff_id + "&off_id=" + data.id
    }
    return tracking_link;
}

function getExpiredUrl(field, data, content) {
    let expired_url = '';
    return expired_url;
}

function getStartDate(field, data, content) {
    let start_date = moment();
    try {
        if (data.start_date) {
            start_date = moment(data.start_date, 'YYYY/MM/DD');
            start_date = start_date.toISOString();
        }
    } catch (e) {
        start_date = moment();
    }
    return start_date;
}

function getEndDate(field, data, content) {
    let end_date = moment().add(1, 'Y');
    try {
        if (data.end_date) {
            end_date = moment(data.end_date, 'YYYY/MM/DD');
            end_date = end_date.toISOString();
        }
    } catch (e) {
        end_date = moment().add(1, 'Y');
    }
    return end_date;
}

function getRevenue(field, data, content) {
    let revenue = 0.0;
    if (data.payout)
        revenue = data.payout;
    return revenue;
}

function getRevenueType(field, data, content) {
    let revenue_type = { enum_type: '', offer_type: '' };
    if (data.pricing_type) {
        revenue_type.offer_type = data.pricing_type.toLowerCase();
    }
    return revenue_type;
}

function getPayout(field, data, content) {
    let payout = 0;
    if (data.payout)
        payout = data.payout;
    return payout;
}

function getPayoutType(field, data, content) {
    let payout_type = { enum_type: '', offer_type: '' };
    if (data.pricing_type) {
        payout_type.offer_type = data.pricing_type.toLowerCase();
    }
    return payout_type;
}

function getApprovalRequired(field, data, content) {
    let approval_required = false;
    // if (data.required_approval !== undefined)
    //     approval_required = data.required_approval;
    return approval_required;
}

function getIsCapEnabled(field, data, content) {
    let cap_enable = false;
    if (typeof data.restrictions == 'object') {
        cap_enable = true;
    }
    return cap_enable;
}

function getOfferCapping(field, data, content) {
    let cap = defaultCap();
    if (typeof data.restrictions == 'object') {
        if (data.restrictions.cap_type == "Daily Conversion") {
            cap.daily_conv = data.restrictions.cap_limit;
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

function getIsTargeting(field, data, content) {
    let targeting_enable = false;
    if (data.targeting && data.targeting.length) {
        targeting_enable = true;
    }
    return targeting_enable;
}

function getGeoTargeting(field, data, content) {
    let geo_targeting = defaultGeoTargeting();
    if (data.targeting && data.targeting.length) {
        data.targeting.map(obj => {
            if (obj.geo) {
                geo_targeting.country_allow.push({ key: obj.geo, value: obj.geo });
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

function getDeviceTargeting(field, data, content) {
    let device_targeting = defaultDeviceTargeting();
    if (data.targeting && data.targeting.length) {
        data.targeting.map(obj => {
            if (obj.os == 'android' || obj.os == "ios") {
                device_targeting.os.push(obj.os.toLowerCase());
            }
            if (obj.platform == 'mobile' || obj.platform == 'tablet') {
                device_targeting.device.push('mobile');
            } else if (obj.platform == 'pc') {
                device_targeting.device.push('desktop');
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

function getCreative(field, data, content) {
    let creative = defaultCreative();
    return creative;
}

function getOfferVisible(field, data, content) {
    let offer_visible = 'public';

    return offer_visible;
}

function getStatusLabel(field, data, content) {
    let status_label = 'unmanaged';
    if (data.status == 'panding') {
        status_label = "waitingForApproval";
    } else if (data.status == 'active') {
        status_label = "active"
    } else if (data.status == 'blank') {
        status_label = "no_link"
    }
    return status_label;
}

const Appdiscover = {
    getOfferId: (field, data, content) => {
        return getOfferId(field, data, content);
    },
    getOfferName: (field, data, content) => {
        return getOfferName(field, data, content);
    },
    getCategory: (field, data, content) => {
        return getCategory(field, data, content);
    },
    getIsGoalEnabled: (field, data, content) => {
        return getIsGoalEnabled(field, data, content);
    },
    getGoals: (field, data, content) => {
        return getGoals(field, data, content);
    },
    getCurrency: (field, data, content) => {
        return getCurrency(field, data, content);
    },
    getThumbnail: (field, data, content) => {
        return getThumbnail(field, data, content);
    },
    getDescription: (field, data, content) => {
        return getDescription(field, data, content);
    },
    getKpi: (field, data, content) => {
        return getKpi(field, data, content);
    },
    getPreviewUrl: (field, data, content) => {
        return getPreviewUrl(field, data, content);
    },
    getTrackingLink: (field, data, content) => {
        return getTrackingLink(field, data, content);
    },
    getExpiredUrl: (field, data, content) => {
        return getExpiredUrl(field, data, content);
    },
    getStartDate: (field, data, content) => {
        return getStartDate(field, data, content);
    },
    getEndDate: (field, data, content) => {
        return getEndDate(field, data, content);
    },
    getRevenue: (field, data, content) => {
        return getRevenue(field, data, content);
    },
    getRevenueType: (field, data, content) => {
        return getRevenueType(field, data, content);
    },
    getPayout: (field, data, content) => {
        return getPayout(field, data, content);
    },
    getPayoutType: (field, data, content) => {
        return getPayoutType(field, data, content);
    },
    getApprovalRequired: (field, data, content) => {
        return getApprovalRequired(field, data, content);
    },
    getIsCapEnabled: (field, data, content) => {
        return getIsCapEnabled(field, data, content);
    },
    getOfferCapping: (field, data, content) => {
        return getOfferCapping(field, data, content);
    },
    getIsTargeting: (field, data, content) => {
        return getIsTargeting(field, data, content);
    },
    getGeoTargeting: (field, data, content) => {
        return getGeoTargeting(field, data, content);
    },
    getDeviceTargeting: (field, data, content) => {
        return getDeviceTargeting(field, data, content);
    },
    getCreative: (field, data, content) => {
        return getCreative(field, data, content);
    },
    getOfferVisible: (field, data, content) => {
        return getOfferVisible(field, data, content);
    },
    getStatusLabel: (field, data, content) => {
        return getStatusLabel(field, data, content);
    },
    getRedirectionMethod: (field, data, content) => {
        return getRedirectionMethod(field, data, content);
    }
}

function formateOffers(offer, content) {
    let formatedOffer = {};
    array = getOffersFields('', '');
    array.map(function (obj) {
        try {
            let field = obj.field;
            let action = obj.action;
            let data = Appdiscover[action](field, offer, content);
            formatedOffer[field] = data;
        }
        catch (err) {
            debug(err);

        }
    })
    return formatedOffer;
}

