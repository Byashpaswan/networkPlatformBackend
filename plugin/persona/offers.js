const { InsertUpdateOffer, makeRequest, getOffersFields, addExtraFields, ImportantFields, defaultLog, mergeOfferLog, lockOfferApiStats } = require('../plugin');

const { ActiveApi, InactiveApi } = require('../../helpers/Functions');
const debug = require("debug")("darwin:Plugin:Persona");
const ENV_OFFERS_LIMIT = process.env.ENV_OFFERS_LIMIT;
const moment = require('moment');
const limit = 500;
exports.countApiPages = (response) => {
    let nextPage = false;
    try {
        if (response.page && response.limit && response.campaigns && response.campaigns.length >= limit) {
            nextPage = true;
        }
        // debug(nextPage)
        return nextPage;
    }
    catch (err) {
        return nextPage;
    }
}


// update after find pid 
exports.getPid = (url) =>{
    console.log(" url -> ", url);
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
    if (credentials.api_key) {
        let api_key = credentials['api_key'];
        let apiBaseurl = "http://dsp.persona.ly/api/campaigns?token=" + api_key + "&limit=" + apilimit + "&page=";
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
    let valid = false;
    let offerLog = defaultLog();
    let start_time = moment();
    let page = 0;
    let nextPage = false;
    return new Promise(async (resolve, reject) => {
        try {
            let result;
            do {
                nextPage = false;
                result = await this.apiCall(content.credentials, page, limit);
                if (result) {
                    valid = this.checkValid(result.data)
                    if (valid === true) {
                        let data = this.fetchResponse(result.data);
                        content['domain'] = "dsp.persona.ly";
                        let offer = this.traverseOffer(data, content);
                        let tempLog = await InsertUpdateOffer(ImportantFields, offer, content);
                        nextPage = this.countApiPages(result.data);
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
            } while (nextPage);
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
    if (result.status_message && result.error === undefined && result.campaigns && result.limit) {
        // valid credentials hasoffer  
        // console.log(result.count);
        return true;
    }
    else {
        return false;
    }
}

exports.fetchResponse = (result) => {
    return result.campaigns;
}
exports.traverseOffer = (result, content) => {

    let offers = {};
    result.map(function (data) {
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
            debug(err);
            // console.log('error', err); //skip this offer
        }
    });
    return offers;
}

//api wise methods
function getCategory(field, data) {
    let category = [];
    if (data.categories && data.categories.length) {
        category = data.categories;
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
    if (data.campaign_name)
        offer_name = data.campaign_name;
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

function getRedirectionMethod(field, data) {
    let method = 'javascript_redirect';
    return method;
}

function getCurrency(field, data) {
    let currency = 'USD';
    return currency;
}

function getThumbnail(field, data) {
    let thumbnail = '';
    if (data.campaign_icon_url) {
        thumbnail = data.campaign_icon_url;
    }
    return thumbnail;
}

function getDescription(field, data) {
    let description = '';
    return description;
}

function getKpi(field, data) {
    let kpi = '';
    return kpi;
}

function getPreviewUrl(field, data) {
    let preview_url = '';
    if (data.preview_url_android)
        preview_url = data.preview_url_android;
    else if (data.preview_url_ios)
        preview_url = data.preview_url_ios;
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
    if (data.payouts && data.payouts.length && data.payouts[0].usd_payout)
        revenue = data.payouts[0].usd_payout;
    return revenue;
}

function getRevenueType(field, data) {
    let revenue_type = { enum_type: 'unknown', offer_type: '' };
    if (data.conversion_mode)
        revenue_type.offer_type = data.conversion_mode;
    return revenue_type;
}

function getPayout(field, data) {
    let payout = 0.0;
    if (data.payouts && data.payouts.length && data.payouts[0].usd_payout)
        payout = data.payouts[0].usd_payout;
    return payout;
}

function getPayoutType(field, data) {
    let payout_type = { enum_type: 'unknown', offer_type: '' };
    if (data.conversion_mode)
        payout_type.offer_type = data.conversion_mode;
    return payout_type;
}

function getApprovalRequired(field, data) {
    let approval_required = false;
    if (!data.tracking_url)
        approval_required = true;
    return approval_required;
}

function getIsCapEnabled(field, data) {
    let cap_enable = false;
    if (data.subscription_caps && data.subscription_caps.is_cap_defined) {
        cap_enable = true;
    }
    return cap_enable;
}

function getOfferCapping(field, data) {
    let cap = defaultCap();
    if (data.subscription_caps && data.subscription_caps.is_cap_defined) {
        if (data.subscription_caps.daily_cap_limit) {
            cap.daily_conv = data.subscription_caps.daily_cap_limit;
        }
        if (data.subscription_caps.total_cap_limit) {
            cap.monthly_conv = data.subscription_caps.total_cap_limit;
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
    if (data.payouts && data.payouts.length) {
        targeting_enable = true;
    }
    return targeting_enable;
}

function getGeoTargeting(field, data) {
    let geo_targeting = defaultGeoTargeting();
    if (data.payouts && data.payouts.length) {
        let country_array = [];
        data.payouts.map(obj => {
            obj.countries.map(elem => {
                if (elem && !country_array.includes(elem)) {
                    geo_targeting.country_allow.push({ key: elem, value: elem });
                    country_array.push(elem);
                }
            })
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
    if (data.payouts && data.payouts.length) {
        data.payouts.map(obj => {
            if ((obj.platform == 'Android') && !device_targeting.os.includes('android')) {
                device_targeting.os.push('android');
                if (!device_targeting.device.includes('mobile')) {
                    device_targeting.device.push('mobile');
                }
                if (data.android_min_version) {
                    device_targeting.os_version.push({ os: 'android', version: data.android_min_version, version_condition: 'gte' });
                }
                if (data.android_max_version) {
                    device_targeting.os_version.push({ os: 'android', version: data.android_max_version, version_condition: 'lte' });
                }
            }
            else if (obj.platform == 'iPhone' && !device_targeting.os.includes('ios')) {
                device_targeting.os.push('ios');
                if (!device_targeting.device.includes('mobile')) {
                    device_targeting.device.push('mobile');
                }
                if (data.ios_min_version) {
                    device_targeting.os_version.push({ os: 'ios', version: data.ios_min_version, version_condition: 'gte' });
                }
                if (data.ios_max_version) {
                    device_targeting.os_version.push({ os: 'ios', version: data.ios_max_version, version_condition: 'lte' });
                }
            }
            else if (obj.platform == 'Desktop' && !device_targeting.device.includes('desktop')) {
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

function getCreative(field, data) {
    let creative = [];
    try {
        if (data.creatives && data.creatives.length) {
            data.creatives.map(crt => {
                crt.map(obj => {
                    let crt_status = false;
                    let tempcreative = defaultCreative();
                    if (obj.creative_url) {
                        crt_status = true;
                        tempcreative.creative_file = obj.creative_url;
                    }
                    if (obj.creative_type) {
                        crt_status = true;
                        tempcreative.creative_type = obj.creative_type;
                    }
                    if (obj.file_type) {
                        crt_status = true;
                        tempcreative.name = obj.file_type;
                    }
                    if (obj.creative_dimensions) {
                        crt_status = true;
                        if (obj.creative_dimensions.height)
                            tempcreative.height = obj.creative_dimensions.height;
                        if (obj.creative_dimensions.width)
                            tempcreative.width = obj.creative_dimensions.width;
                    }
                    if (crt_status) {
                        creative.push(tempcreative);
                    }
                })
            })
        }
    }
    catch (err) {
        debug(err)
    }
    return creative;
}

function getOfferVisible(field, data) {
    let offer_visible = 'public';
    return offer_visible;
}

function getStatusLabel(field, data) {
    let status_label = 'unmanaged';
    if (data.tracking_url && data.tracking_url !== '') {
        status_label = "active";
    }
    else {
        status_label = "no_link";
    }
    return status_label;
}

const Persona = {
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
            let data = Persona[action](field, offer);
            formatedOffer[field] = data;
        }
        catch (err) {
            debug(err);

        }
    })
    return formatedOffer;
}
