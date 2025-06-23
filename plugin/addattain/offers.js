const { InsertUpdateOffer, makeRequest, getOffersFields, addExtraFields, ImportantFields, defaultLog, mergeOfferLog, lockOfferApiStats } = require('../plugin');
const { ActiveApi, InactiveApi } = require('../../helpers/Functions');

const debug = require("debug")("darwin:Plugin:addattain");
const ENV_OFFERS_LIMIT = process.env.ENV_OFFERS_LIMIT;
const moment = require('moment');
const limit = 100;
exports.countApiPages = (response) => {
    let page = 0;
    try {
        if (response.data && response.data.totalPages) {
            page = response.data.totalPages;
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
    return urlData.searchParams.get('pubid');
}

exports.getPidLocation = ()=>{
    return {
        lop : 'query', // lop means locations of pid
        location : 'pubid'
    }
}
// curl -X GET "https://example.com/api/endpoint" -H "Authorization: Basic dXNlcm5hbWU6cGFzc3dvcmQ="

exports.apiCall = async (credentials, page, apilimit) => {
    if (credentials.network_id && credentials.api_key && credentials.login_email) {
        let network_id = credentials['network_id'];
        let api_key = credentials['api_key'];
        let login_email = credentials['login_email'];
        let apiBaseurl = "http://" + network_id + "/aff/v1/batches/offers?type=personal&limit=" + apilimit + "&offset=";
        let key = login_email + ':' + api_key;
        let basicHeader = Buffer.from(key).toString('base64');
        // debug(apiBaseurl + page)
        return await makeRequest({
            method: 'get',
            url: apiBaseurl + page,
            headers: { 'Authorization': 'Basic ' + basicHeader }
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
            while (page <= totalPages) {
                let result = await this.apiCall(content.credentials, page, limit);
                if (result) {
                    valid = this.checkValid(result.data);
                    if (valid === true) {
                        let data = this.fetchResponse(result.data);
                        content['domain'] = content.credentials['network_id'];
                        let offer = this.traverseOffer(data, content);
                        let tempLog = await InsertUpdateOffer(ImportantFields, offer, content);
                        totalPages = this.countApiPages(result.data);
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
            }
            await this.addattainOffersApiCall(content, offerLog, start_time);
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

exports.addattainOffersApiCall = async (content, offerLog, start_time) => {
    // debug('addattain');
    let network_id = content.credentials['network_id'];
    let api_key = content.credentials['api_key'];
    let login_email = content.credentials['login_email'];
    let apiBaseurl = "http://" + network_id + "/aff/v1/batches/offers?type=all&limit=" + limit + "&offset=";
    let key = login_email + ':' + api_key;
    let basicHeader = Buffer.from(key).toString('base64');
    let valid = false;
    let page = 1;
    let totalPages = 1;
    return new Promise(async (resolve, reject) => {
        try {
            let result;
            do {
                result = await makeRequest({
                    method: 'get',
                    url: apiBaseurl + page,
                    headers: { 'Authorization': 'Basic ' + basicHeader }
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
            debug(err)
            await InactiveApi(content);
            await lockOfferApiStats(offerLog, content, start_time, remarks = `Fail, Api Response Error Msg : ${err}, Catch block, Page = ${page}`);
            return resolve(false);
        }
    });
}

exports.checkValid = (result) => {
    if (result && result.code !== undefined && result.code == 0 && result.message && result.message == 'Success') {
        //valid credentials affiliate
        return true;
    }
    else {
        return false;
    }

}

exports.fetchResponse = (result) => {
    return result.data.rowset;
}

exports.traverseOffer = (result, content) => {

    let offers = {};
    result.map((data) => {
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
            debug(err)

        }
    });
    return offers;
}

//api wise methods
function getCategory(field, data) {
    let category = [];
    if (data.offer && data.offer.category) {
        category = data.offer.category.split(',');
    }
    return category;
}

function getOfferId(field, data) {
    let offer_id = '';
    if (data.offer && data.offer.id) {
        offer_id = data.offer.id;
    }
    return offer_id;
}

function getOfferName(field, data) {
    let offer_name = '';
    if (data.offer && data.offer.name)
        offer_name = data.offer.name;
    return offer_name;
}

function getIsGoalEnabled(field, data) {
    let goal_enable = false;
    if (data.offer_event && data.offer_event.length) {
        goal_enable = true;
    }
    return goal_enable;
}

function getGoals(field, data) {
    let goal = [];
    if (data.offer_event && data.offer_event.length) {
        data.offer_event.map(obj => {
            let tempGoals = defaultGoal();
            if (obj.event_id) {
                tempGoals.goal_id = obj.event_id;
            }
            if (obj.event_name) {
                tempGoals.name = obj.event_name;
            }
            if (obj.event_payout) {
                tempGoals.payout = +obj.event_payout;
            }
            if (obj.event_payout_type) {
                tempGoals.payout_type = obj.event_payout_type;
            }
            goal.push(tempGoals);
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

function getCurrency(field, data) {
    let currency = 'USD';
    if (data.offer && data.offer.currency)
        currency = data.offer.currency;
    return currency;
}

function getRedirectionMethod(field, data) {
    let method = 'javascript_redirect';
    return method;
}

function getThumbnail(field, data) {
    let thumbnail = '';
    if (data.offer && data.offer.thumbnail)
        thumbnail = data.offer.thumbnail;
    return thumbnail;
}

function getDescription(field, data) {
    let description = '';
    if (data.offer && data.offer.description)
        description = data.offer.description;
    return description;
}

function getKpi(field, data) {
    let kpi = '';
    return kpi;
}

function getPreviewUrl(field, data) {
    let preview_url = '';
    if (data.offer && data.offer.preview_url)
        preview_url = data.offer.preview_url;
    return preview_url;
}

function getTrackingLink(field, data) {
    let tracking_link = '';
    if (data.offer && data.offer.tracking_link && data.offer.tracking_link != 'Need to apply')
        tracking_link = data.offer.tracking_link;
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

    if (data.offer && data.offer.payout) {
        revenue = +data.offer.payout;
    }

    return revenue;
}

function getRevenueType(field, data) {
    let revenue_type = { enum_type: '', offer_type: '' };
    if (data.offer && data.offer.pricing_type) {
        revenue_type.offer_type = data.offer.pricing_type;
    }
    return revenue_type;
}

function getPayout(field, data) {
    let payout = 0;
    if (data.offer && data.offer.payout) {
        payout = +data.offer.payout;
    }
    return payout;
}

function getPayoutType(field, data) {
    let payout_type = { enum_type: '', offer_type: '' };
    if (data.offer && data.offer.pricing_type) {
        payout_type.offer_type = data.offer.pricing_type;
    }
    return payout_type;
}

function getApprovalRequired(field, data) {
    let approval_required = false;
    if (data.offer && (data.offer.tracking_link == 'Need to apply' || data.offer.offer_approval == 1 || data.offer.approval_msg == 'Require Approval')) {
        approval_required = true;
    }
    return approval_required;
}

function getIsCapEnabled(field, data) {
    let cap_enable = false;
    if (data.offer_cap)
        cap_enable = true;
    return cap_enable;
}

function getOfferCapping(field, data) {
    let cap = defaultCap();
    if (data.offer_cap && data.offer_cap.cap_type && data.offer_cap.cap_type == 2) {
        if (data.offer_cap.cap_conversion)
            cap.daily_conv = +data.offer_cap.cap_conversion;
        if (data.offer_cap.cap_click)
            cap.daily_conv = +data.offer_cap.cap_click;
        if (data.offer_cap.cap_budget)
            cap.payout_daily = +data.offer_cap.cap_budget;
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
    if ((data.offer_geo && data.offer_geo.target && data.offer_geo.target.length) || (data.offer_platform && data.offer_platform.target && data.offer_platform.target.length)) {
        targeting_enable = true;
    }
    return targeting_enable;
}

function getGeoTargeting(field, data) {
    let geo_targeting = defaultGeoTargeting();
    if (data.offer_geo && data.offer_geo.target && data.offer_geo.target.length && data.offer_geo.type) {
        if (data.offer_geo.type == 1) {
            data.offer_geo.target.map(obj => {
                geo_targeting.country_allow.push({ key: obj.country_code, value: obj.country });
            });
        }
        else if (data.offer_geo.type == 2) {
            data.offer_geo.target.map(obj => {
                geo_targeting.country_deny.push({ key: obj.country_code, value: obj.country });
            });
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
    let os_version = {};
    if (data.offer_platform && data.offer_platform.target && data.offer_platform.target.length) {
        data.offer_platform.target.forEach(element => {
            let os = "";
            if (element.platform == 'Mobile' || element.platform == "Tablet") {
                if (!device_targeting.device.includes('mobile'))
                    device_targeting.device.push('mobile');
            }
            else if (element.platform == 'PC') {
                if (!device_targeting.device.includes('desktop'))
                    device_targeting.device.push('desktop');
            }
            if (element.system == 'iOS') {
                if (!device_targeting.os.includes('ios')) {
                    device_targeting.os.push('ios');
                }
                os = 'ios';
            }
            else if (element.system && element.system == 'Android') {
                if (!device_targeting.os.includes('android')) {
                    device_targeting.os.push('android')
                }
                os = 'android';
            }
            else if (element.system) {
                if (!device_targeting.os.includes('all')) {
                    device_targeting.os.push('all');
                }
            }
            if (os && element.version && element.version.length) {
                let above_version = element.above_version;
                element.version.map(ver_array => {
                    if (ver_array && ver_array !== 'all') {
                        if (!os_version[ver_array] || os_version[ver_array].version_condition == "eq") {
                            if (element.is_above && above_version == ver_array) {
                                os_version[ver_array] = ({ os: os, version: ver_array, version_condition: 'gte' });
                            }
                            else {
                                os_version[ver_array] = ({ os: os, version: ver_array, version_condition: 'eq' });
                            }
                        }
                    }
                })
            }
        });
        if (device_targeting.os.length) {
            for (let ver in os_version) {
                device_targeting.os_version.push(os_version[ver]);
            }
        }
    }
    // debug(device_targeting, data.offer.id)

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
    if (data.offer_creative && data.offer_creative.length) {
        data.offer_creative.map(obj => {
            let temp = defaultCreative();
            if (obj.id) {
                temp.creative_id = obj.id;
            }
            if (obj.url) {
                temp.creative_file = obj.url;
            }
            if (obj.filename) {
                temp.name = obj.filename;
            }
            if (obj.mime) {
                temp.creative_type = obj.mime;
            }
            if (obj.width) {
                temp.width = obj.width;
            }
            if (obj.height) {
                temp.height = obj.height;
            }
            creative.push(temp);
        });
    }
    return creative;
}

function getOfferVisible(field, data) {
    let offer_visible = 'public';
    return offer_visible;
}

function getStatusLabel(field, data) {
    let status_label = 'unmanaged';
    if (data.offer && data.offer.status == "active") {
        status_label = "active";
    }
    if (data.offer && data.offer.tracking_link == "Need to apply") {
        status_label = 'no_link';
    }
    return status_label;
}

const addattain = {
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
            let data = addattain[action](field, offer);
            formatedOffer[field] = data;
        }
        catch (err) {
            debug(err)

        }
    })
    // console.log(formatedOffer)
    return formatedOffer;
}