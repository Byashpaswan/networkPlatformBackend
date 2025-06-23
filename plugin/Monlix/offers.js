const { InsertUpdateOffer, makeRequest, getOffersFields, addExtraFields, ImportantFields, defaultLog, mergeOfferLog, lockOfferApiStats } = require('../plugin');

const { ActiveApi, InactiveApi } = require('../../helpers/Functions');
const debug = require("debug")("darwin:Plugin:Monlix");
const ENV_OFFERS_LIMIT = process.env.ENV_OFFERS_LIMIT;
const moment = require('moment');
const crypto = require('crypto-js');
const limit = 500;
exports.countApiPages = (response) => {
    let page = 0;
    try {
        if (response.success && response.data && response.data.count) {
            page = Math.ceil(response.data.count / limit);
        }
        // debug(page)
        return page;
    }
    catch (err) {
        return 0;
    }
}

// update after find pid 
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

exports.apiCall = async (credentials, page, apilimit) => {

    if (credentials.api_key && credentials.secret_key) {
        let api_key = credentials['api_key'];
        let secret_key = credentials['secret_key'];
        let param = api_key + secret_key;
        let token = crypto.MD5(param).toString()
        let apiBaseurl = `https://api.monlix.com/api/static?appid=${api_key}&token=${token}` + "&limit=" + apilimit + "&page=";
        // debug(apiBaseurl)
        let result = await makeRequest({
            method: 'get',
            url: apiBaseurl + page,
        });
        if (!result || result.status !== 200) {
            result = await makeRequest({
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
    let valid = false;
    let offerLog = defaultLog();
    let start_time = moment();
    let page = 1;
    let totalPages = 1;
    return new Promise(async (resolve, reject) => {
        try {
            let result;
            do {
                result = await this.apiCall(content.credentials, page, limit);
                if (result) {

                    valid = this.checkValid(result.data)
                    if (valid === true) {
                        let data = this.fetchResponse(result.data);
                        content['domain'] = "api.monlix.com";
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
    if (result.campaigns.length > 0) {
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
            if (data.oss=='android' || data.oss=='ios') {

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
    if (data.name)
        offer_name = data.name;
    return offer_name;
}

function getIsGoalEnabled(field, data) {
    let goal_enable = false;
    if (data.goals && data.goals.length)
        goal_enable = true;
    return goal_enable;
}

function getGoals(field, data) {
    let goal = [];
    let tempGoals;
    if (data.goals && data.goals.length) {
        tempGoals = defaultGoal();
        data.goals.map(obj => {
            if (obj.name) {
                tempGoals.name = obj.name;
            }
            if (obj.id) {
                tempGoals.goal_id = obj.id;
            }
            if (obj.payouts && obj.payouts.length && obj.payouts[0].payout) {
                tempGoals.payout = obj.payouts[0].payout;
                tempGoals.revenue = obj.payouts[0].payout;
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
    if (data.currency)
        currency = data.currency.toUpperCase();
    return currency;
}

function getThumbnail(field, data) {
    let thumbnail = '';
    if (data.thumbnail) {
        thumbnail = data.thumbnail;
    }
    return thumbnail;
}

function getDescription(field, data) {
    let description = '';
    if (data.description) {
        description = data.description;
    }
    return description;
}

function getKpi(field, data) {
    let kpi = '';
    if (data.kpi) {
        kpi = data.kpi;
    }
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
    if (data.url) {
        tracking_link = Tracking_link(data.url, '{click_id}')
    }
    return tracking_link;
}

function Tracking_link(url, key) {
    let trackinLink = '';
    if (url)
        trackinLink = url.replace('{{userid}}', key)

    return trackinLink;
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
    if (data.payout && data.payout != null)
        revenue = data.payout;
    return revenue;
}

function getRevenueType(field, data) {
    let revenue_type = { enum_type: 'unknown', offer_type: '' };
    return revenue_type;
}

function getPayout(field, data) {
    let payout = 0.0;
    if (data.payout !== undefined && data.payout !== null)
        payout = data.payout;
    return payout;
}

function getPayoutType(field, data) {
    let payout_type = { enum_type: 'unknown', offer_type: '' };
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
    if (data.cap) {
        cap_enable = true;
    }
    return cap_enable;
}

function getOfferCapping(field, data) {
    let cap = defaultCap();
    if (data.cap) {
        if (data.cap.type && data.cap.type == 'conversion') {
            if (data.cap.daily) {
                cap.daily_conv = data.cap.daily;
            }
            if (data.cap.monthly) {
                cap.monthly_conv = data.cap.monthly;
            }
            if (data.cap.lifetime) {
                cap.overall_conv = data.cap.lifetime;
            }
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
    if (data.countries || data.device || data.oss) {
        targeting_enable = true;
    }
    return targeting_enable;
}

function getGeoTargeting(field, data) {
    let geo_targeting = defaultGeoTargeting();
    if (data.countries && data.countries.length) {
        data.countries.map(obj => {
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
    if (data.oss) {

        if ((data.oss == 'mobile' || data.oss == 'tablet') && !device_targeting.device.includes('mobile')) {
            device_targeting.device.push('mobile');
        }
        else if (data.oss == 'desktop' && !device_targeting.device.includes('desktop')) {
            device_targeting.device.push('desktop');
        }
        else if (data.oss == 'all' && !device_targeting.device.includes('all')) {
            device_targeting.device.push('all');
        }

    }
    if (data.oss && data.oss.length) {

        if (data.oss == 'android' && !device_targeting.os.includes('android')) {
            device_targeting.os.push('android');
        }

        else if (data.oss == 'ios' && !device_targeting.os.includes('ios')) {
            device_targeting.os.push('ios');
        }
    }
    if (data.os_version) {
        let version_arr = data.os_version;
        Object.keys(version_arr).map(key => {
            if (version_arr[key].max && version_arr[key].min && version_arr[key].max == version_arr[key].min) {
                device_targeting.os_version.push({ os: key, version: version_arr[key].max, version_condition: 'eq' });
            }
            else {
                if (version_arr[key].max) {
                    device_targeting.os_version.push({ os: key, version: version_arr[key].max, version_condition: 'lte' });
                }
                if (version_arr[key].min) {
                    device_targeting.os_version.push({ os: key, version: version_arr[key].min, version_condition: 'gte' });
                }
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
            data.creatives.map(obj => {
                let crt_status = false;
                let tempcreative = defaultCreative();
                if (obj.file_name) {
                    crt_status = true;
                    tempcreative.creative_file = obj.file_name;
                }
                if (obj.mime_type) {
                    crt_status = true;
                    tempcreative.creative_type = obj.mime_type;
                }
                if (obj.full_url) {
                    crt_status = true;
                    tempcreative.tracking_link = obj.full_url;
                }
                if (obj.title) {
                    crt_status = true;
                    tempcreative.name = obj.title;
                }
                if (obj.dimensions) {
                    crt_status = true;
                    if (obj.dimensions.height)
                        tempcreative.height = obj.dimensions.height;
                    if (obj.dimensions.width)
                        tempcreative.width = obj.dimensions.width;
                }
                if (crt_status) {
                    creative.push(tempcreative);
                }
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
    if (data.url && data.url !== '') {

        status_label = "active";
    }
    else {
        status_label = "no_link";
    }
    return status_label;
}

const Monlix = {
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
            let data = Monlix[action](field, offer);
            formatedOffer[field] = data;
        }
        catch (err) {
            debug(err);

        }
    })
    return formatedOffer;
}
