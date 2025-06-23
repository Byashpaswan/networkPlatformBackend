// const { InsertUpdateOffer, makeRequest, getOffersFields, addExtraFields, ImportantFields, defaultLog, mergeOfferLog, lockOfferApiStats } = require('../plugin');
const plugin = require('../plugin');
const { ActiveApi, InactiveApi } = require('../../helpers/Functions');

const debug = require("debug")("darwin:Plugin:Afftrack");
const ENV_OFFERS_LIMIT = process.env.ENV_OFFERS_LIMIT;
const moment = require('moment');
const limit = 500;
exports.countApiPages = (response) => {
    try {
        let nextpage = false;
        if (response.count && response.count == limit) {
            nextpage = true;
        }
        return nextpage;
    }
    catch (err) {
        return false;
    }
}

exports.apiCall = async (credentials, page, apilimit) => {
    if (credentials.network_id && credentials.api_key) {
        let network_id = credentials['network_id'];
        let api_key = credentials['api_key'];
        let apiBaseurl = "http://" + network_id + "/apiv2/?key=" + api_key + "&action=offer_feed&limit=" + apilimit + "&page=";
        // debug(apiBaseurl)
        return await plugin.makeRequest({
            method: 'get',
            url: apiBaseurl + page,
        });
    }
    else {
        return null;
    }
}
// update after check 
exports.getPid = (url) =>{
    if(!url){
        return null;
    }
    let urlData = new URL(url);
    return urlData.searchParams.get('aid');
}

exports.getPidLocation = ()=>{
    return {
        lop : 'query', // lop means locations of pid
        location : 'aid'
    }
}

exports.offersApiCall = async (content) => {
    // let network_id = content.credentials['network_id'];
    // let api_key = content.credentials['api_key'];
    // let apiBaseurl = "http://" + network_id + "/apiv2/?key=" + api_key + "&action=offer_feed&limit=" + limit + "&page=";
    let valid = false;
    let offerLog = plugin.defaultLog();
    let start_time = moment();
    let page = 1;
    let nextpage = true;
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
                        offer = this.traverseOffer(data, content);
                        let tempLog = await plugin.InsertUpdateOffer(plugin.ImportantFields, offer, content);
                        nextpage = this.countApiPages(result.data);
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
            } while (nextpage);
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
    if (result.offers !== undefined && result.count !== undefined && result.errors == "") {
        // valid credentials hasoffer  
        // console.log(result.count);
        return true;
    }
    else {
        return false;
    }
}

exports.fetchResponse = (result) => {
    return result.offers;
}
exports.traverseOffer = (result, content) => {

    let offers = {};
    // result.map((data) =>
    for (let i = 0; i < result.length; i++) {
        try {
            if (result[i]) {

                let temp = formateOffers(content, result[i]);
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
    }
    // });
    return offers;
}

//api wise methods
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
    // if (data.Offer['has_goals_enabled'] !== undefined && data.Offer['has_goals_enabled'] != 0)
    //     goal_enable = true;
    return goal_enable;
}

function getGoals(field, data) {
    let goal = [];
    // let tempGoals;
    // if (data.Offer['has_goals_enabled'] !== undefined && data.Offer['has_goals_enabled'] != 0) {
    //     if (data.Goal !== undefined && data.Goal != null && data.Goal != {}) {
    //         tempGoals = defaultGoal();
    //         Object.keys(data.Goal).map(obj => {
    //             gdata = data.Goal[obj];
    //             if (gdata['name'] !== undefined) {
    //                 tempGoals.name = gdata['name'];
    //             }
    //             if (gdata['description'] !== undefined) {
    //                 tempGoals.description = gdata['description'];
    //             }
    //             if (gdata['payout_type'] !== undefined) {
    //                 tempGoals.payout_type = gdata['payout_type'];
    //             }
    //             if (gdata['default_payout'] !== undefined) {
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

function getRedirectionMethod(field, data) {
    let method = 'javascript_redirect';
    return method;
}

function getCurrency(field, data) {
    let currency = 'USD';
    // if (data.Offer['currency'] !== undefined && data.Offer['currency'] !== null)
    //     currency = data.Offer['currency'].toUpperCase();
    return currency;
}

function getThumbnail(field, data) {
    let thumbnail = '';
    if (data.thumbnail_url && data.thumbnail_url != '')
        thumbnail = data.thumbnail_url;
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
    if (data.preview_link !== undefined)
        preview_url = data.preview_link;
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

    // if (data.Offer['expiration_date'] !== undefined)
    //     end_date = moment(data.Offer['expiration_date']);
    return end_date;
}

function getRevenue(field, data) {
    let revenue = 0.0;
    if (data.payout)
        revenue = +data.payout;
    return revenue;
}

function getRevenueType(field, data) {
    let revenue_type = { enum_type: 'unknown', offer_type: '' };
    if (data.type)
        revenue_type.offer_type = data.type;
    return revenue_type;
}

function getPayout(field, data) {
    let payout = 0.0;
    if (data.payout)
        payout = +data.payout;
    return payout;
}

function getPayoutType(field, data) {
    let payout_type = { enum_type: 'unknown', offer_type: '' };
    if (data.type)
        payout_type.offer_type = data.type;
    return payout_type;
}

function getApprovalRequired(field, data) {
    let approval_required = false;
    if (!data.tracking_link)
        approval_required = true;
    return approval_required;
}

function getIsCapEnabled(field, data) {
    let cap_enable = false;
    if (data.daily_cap && (parseInt(data.daily_cap) > 0 || parseInt(data.total_cap) > 0))
        cap_enable = true;
    return cap_enable;
}

function getOfferCapping(field, data) {
    let cap = defaultCap();
    if (data.daily_cap !== undefined) {
        cap.daily_conv = +data.daily_cap;
    }
    if (data.total_cap !== undefined) {
        cap.overall_conv = +data.total_cap;
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
    if (data.countries !== undefined && data.countries.length) {
        targeting_enable = true;
    }
    return targeting_enable;
}

function getGeoTargeting(field, data) {
    let geo_targeting = defaultGeoTargeting();
    if (data.countries && data.countries.length) {
        country_data = data.countries;
        country_data.map(obj => {
            geo_targeting.country_allow.push({ key: obj.code, value: obj.name });

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
    let tempos = '';
    let ios = false;
    let mobile = false;
    if (data.devices && data.devices.length) {
        data.devices.map(obj => {
            tempos = '';
            if (obj.device_type.includes("Desktop")) {
                device_targeting.device.push("desktop");
            }
            else if (obj.device_type.includes("Android")) {

                device_targeting.os.push("android");
                if (!mobile) {
                    device_targeting.device.push('mobile');
                }
                mobile = true;
                tempos = "android";
            }
            else if (ios == false && (obj.device_type.includes("iOS") || obj.device_type.includes("iPhone") || obj.device_type.includes("iPad"))) {
                device_targeting.os.push("ios");
                if (!mobile) {
                    device_targeting.device.push('mobile');
                }
                mobile = true;
                tempos = "ios";
                ios = true;
            }
            if (tempos != '' && obj.minimum_version) {
                device_targeting.os_version.push({ os: tempos, version: obj.minimum_version, version_condition: "gte" });
            }
            else if (tempos != '' && obj.maximum_version) {
                device_targeting.os_version.push({ os: tempos, version: obj.maximum_version, version_condition: "lte" });
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

async function getCreative(field, data) {
    let tempcreative = [];
    try {
        if (data.creatives_url !== undefined && data.creatives_url !== null && data.creatives_url !== '') {
            let network_id = field['network_id'];
            let api_key = field['api_key'];
            let apiBaseurl = "http://" + network_id + "/apiv2/?key=" + api_key + "&action=offer_creatives&format=json&pid=" + data.id;
            let creativeData = await makeExtraCall(apiBaseurl);
            if (creativeData && creativeData.offer_text_creatives && creativeData.offer_text_creatives.length) {
                for (let i = 0; i < creativeData.offer_text_creatives.length; i++) {
                    let obj = creativeData.offer_text_creatives[i];
                    let creative = defaultCreative();
                    if (obj.creative_tid)
                        creative.creative_id = obj.creative_tid;
                    if (obj.creative_link)
                        creative.tracking_link = obj.creative_link;
                    if (obj.creative_text)
                        creative.description = obj.creative_text;

                    tempcreative.push(creative);
                }
                return tempcreative;

            }
            if (creativeData && creativeData.offer_creative_banners && creativeData.offer_creative_banners.length) {
                for (let i = 0; i < creativeData.offer_creative_banners.length; i++) {
                    let obj = creativeData.offer_creative_banners[i];
                    let creative = defaultCreative();
                    if (obj.banner_bid)
                        creative.creative_id = obj.banner_bid;
                    if (obj.banner_tracking_link)
                        creative.tracking_link = obj.banner_tracking_link;
                    if (obj.banner_creative_url)
                        creative.creative_file = obj.banner_creative_url;
                    if (obj.banner_height)
                        creative.height = obj.banner_height;
                    if (obj.banner_width)
                        creative.width = obj.banner_width;
                    creative.creative_type = "banner";
                    tempcreative.push(creative);
                }
                return tempcreative;

            }
            else {
                return tempcreative;
            }
        }
        else {
            return tempcreative;
        }
    }
    catch (err) {
        debug(err)
        return tempcreative;

    }
}

function getOfferVisible(field, data) {
    let offer_visible = 'public';

    return offer_visible;
}

function getStatusLabel(field, data) {
    let status_label = 'unmanaged';
    if (data.tracking_link && data.tracking_link !== '') {
        status_label = "active";
    }
    else {
        status_label = "no_link";
    }
    return status_label;
}

const afftrack = {
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
    getCreative: async (field, data) => {
        return await getCreative(field, data);
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

function formateOffers(content, offer) {
    let formatedOffer = {};
    array = plugin.getOffersFields('', '');
    // array.map(function (obj)
    for (let i = 0; i < array.length; i++) {
        try {
            field = array[i].field;
            action = array[i].action;
            let data = afftrack[action](content, offer);
            formatedOffer[field] = data;
        }
        catch (err) {
            debug(err);

        }
    }
    // })
    return formatedOffer;
}

async function makeExtraCall(url) {
    try {

        let result = await plugin.makeRequest({
            method: 'get',
            url: url,
        });
        if (result) {
            let data = result.data;
            if (data && data['Offer Creatives'] && data['Offer Creatives'].length && data['Offer Creatives'][0]) {
                return data['Offer Creatives'][0];
            }
        }
        return null;
    }
    catch (err) {
        debug(err);
        return false;
    }
}