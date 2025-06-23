const { InsertUpdateOffer, makeRequest, getOffersFields, addExtraFields, ImportantFields, defaultLog, mergeOfferLog, lockOfferApiStats } = require('../plugin');
const moment = require('moment');
const debug = require("debug")("darwin:Plugin:Cpology");
const ENV_OFFERS_LIMIT = process.env.ENV_OFFERS_LIMIT;
const limit = 500;

const { ActiveApi, InactiveApi } = require('../../helpers/Functions');
exports.countApiPages = (response) => {
    let page = 0;
    try {
        if (response.page_total !== undefined && response.page_total) {
            page = response.page_total;
        }
        return page;
    }
    catch (err) {
        return 0;
    }
}

// not valid, update after check sample  tracking link  
exports.getPid = (url) =>{
    if(!url){
        return null;
    }
    let urlData = new URL(url);
    return urlData.searchParams.get('aff');
}
exports.getPidLocation = ()=>{
    return {
        lop : 'query', // lop means locations of pid
        location : 'aff'
    }
}
exports.apiCall = async (credentials, page, apilimit) => {
    if (credentials.api_key) {
        let api_key = credentials['api_key'];
        let apiBaseurl = "https://api.cp-ology.com/?version=1&apikey=" + api_key + "&c=api.get_offers&limit=" + apilimit + "&my_offers=1&page=";
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
    // let network_id = content.credentials['network_id'];
    // let api_key = content.credentials['api_key'];
    // let apiBaseurl = "https://" + network_id + "/api/public/v3/offers?api_key=" + api_key +"&approved=1&limit="+limit+"&page=";
    let page = 1;
    let totalPages = 1;
    let valid = false;
    let offerLog = defaultLog();
    let start_time = moment();
    return new Promise(async (resolve, reject) => {
        try {
            let result;
            while (page <= totalPages) {
                result = await this.apiCall(content.credentials, page, limit);
                if (result) {
                    valid = this.checkValid(result.data)
                    if (valid === true) {
                        let data = this.fetchResponse(result.data);
                        content['domain'] = "api.cp-ology.com";
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
            }
            await this.CpologyOffersApiCall(content, offerLog, start_time);
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

exports.CpologyOffersApiCall = async (content, offerLog, start_time) => {
    // debug('Cpology');
    let api_key = content.credentials['api_key'];
    let apiBaseurl = "https://api.cp-ology.com/?version=1&apikey=" + api_key + "&c=api.get_offers&limit=" + limit + "&my_offers=0&page";
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
                        content['domain'] = "api.cp-ology.com";
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
        if (result.error == null && result.success == true) {
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
    return result.offers;
}
exports.traverseOffer = (result, content) => {

    let offers = {};
    result.map((data) => {
        try {
            if (data !== undefined) {

                let temp = formateOffers(data);
                if (temp.advertiser_offer_id !== undefined && temp.advertiser_offer_id !== '') {
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
    return category;
}

function getOfferId(field, data) {
    let offer_id = '';
    if (data.id !== undefined) {
        offer_id = data.id;
    }
    return offer_id;
}

function getOfferName(field, data) {
    let offer_name = '';
    if (data.name !== undefined)
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
function getCreative(field, data) {
    let creatives = [];
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
    if (data.currency !== undefined && data.currency !== null)
        currency = data.currency.toUpperCase();
    return currency;
}

function getThumbnail(field, data) {
    let thumbnail = '';
    if (data.icon_url)
        thumbnail = data.icon_url;
    return thumbnail;
}

function getDescription(field, data) {
    let description = '';
    if (data.description !== undefined)
        description = data.description;
    return description;
}

function getKpi(field, data) {
    let kpi = '';
    // if (data.Offer['kpi'] !== undefined)
    //     kpi = data.Offer['kpi'];
    return kpi;
}

function getPreviewUrl(field, data) {
    let preview_url = '';
    if (data.preview_url !== undefined)
        preview_url = data.preview_url;
    return preview_url;
}

function getTrackingLink(field, data) {
    let tracking_link = '';
    if (data.tracking_link)
        tracking_link = data.tracking_link;
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
    return start_date;
}

function getEndDate(field, data) {
    let end_date = moment().add(1, 'Y');
    return end_date;
}

function getRevenue(field, data) {
    let revenue = 0.0;
    if (data.payouts && Object.keys(data.payouts).length) {
        value = Object.values(data.payouts);
        revenue = value[0];
    }
    return revenue;
}

function getRevenueType(field, data) {
    let revenue_type = { enum_type: '', offer_type: '' };
    if (data.payout_model !== undefined)
        revenue_type.offer_type = data.payout_model.toLowerCase();
    return revenue_type;
}

function getPayout(field, data) {
    let payout = 0.0;
    if (data.payouts && Object.keys(data.payouts).length) {
        value = Object.values(data.payouts);
        payout = value[0];
    }
    return payout;
}

function getPayoutType(field, data) {
    let payout_type = { enum_type: '', offer_type: '' };
    if (data.payout_model !== undefined)
        payout_type.offer_type = data.payout_model.toLowerCase();;
    return payout_type;
}

function getApprovalRequired(field, data) {
    let approval_required = false;
    if (data.requires_approval == 1) {
        approval_required = true;
    }
    return approval_required;
}

function getIsCapEnabled(field, data) {
    let cap_enable = false;
    if (data.caps.overall_cap != 0 || data.caps.daily_cap != 0 || data.caps.monthly_cap != 0 || data.caps.overall_payout_cap != 0 || data.caps.daily_payout_cap != 0 || data.caps.monthly_payout_cap != 0) {
        cap_enable = true;
    }
    return cap_enable;
}

function getOfferCapping(field, data) {
    let cap = defaultCap();
    if (data.caps.overall_cap != 0) {
        cap.overall_conv = data.caps.overall_cap;
    } if (data.caps.daily_cap != 0) {
        cap.daily_conv = data.caps.daily_cap;
    } if (data.caps.monthly_cap != 0) {
        cap.monthly_conv = data.caps.monthly_cap;
    } if (data.caps.overall_payout_cap != 0) {
        cap.overall_payout = data.caps.overall_payout_cap;
    } if (data.caps.daily_payout_cap != 0) {
        cap.payout_daily = data.caps.daily_payout_cap;
    } if (data.caps.monthly_payout_cap != 0) {
        cap.monthly_payout = data.caps.monthly_payout_cap;
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
    if ((data.payouts && Object.keys(data.payouts).length) || (data.devices && data.devices.length)) {
        targeting_enable = true;
    }
    return targeting_enable;
}

function getGeoTargeting(field, data) {
    let geo_targeting = defaultGeoTargeting();
    if (data.payouts && Object.keys(data.payouts).length) {
        country = Object.keys(data.payouts);
        country.map(obj => {
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
    if (data.devices && data.devices.length) {
        for (let i of data.devices) {
            if (i.name == "Mobile") {
                device_targeting.device.push('mobile');
            } else if (i.name == "Desktop") {
                device_targeting.device.push('desktop');
            } else if (i.name == "iOS" || i.name == "Android") {
                device_targeting.os.push(i.name.toLowerCase());
            }

            if (i.min_os_version != null && i.min_os_version != undefined && i.min_os_version) {
                if (i.name == "iOS" || i.name == "Android") {
                    device_targeting.os_version.push({ os: i.name.toLowerCase(), version: i.min_os_version, version_condition: 'gte' });
                }
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



function getOfferVisible(field, data) {
    let offer_visible = 'public';
    return offer_visible;
}

function getStatusLabel(field, data) {
    let status_label = 'unmanaged';
    if (data.tracking_link && data.tracking_link != null && data.tracking_link !== undefined) {
        status_label = "active";
    }
    else {
        status_label = "no_link";
    }
    return status_label;
}

const Cpology = {
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
            let data = Cpology[action](field, offer);
            formatedOffer[field] = data;
        }
        catch (err) {
            debug(err);

        }
    })
    return formatedOffer;
}
