const { InsertUpdateOffer, makeRequest, getOffersFields, addExtraFields, ImportantFields, defaultLog, mergeOfferLog, lockOfferApiStats } = require('../plugin');

const { ActiveApi, InactiveApi } = require('../../helpers/Functions');
const debug = require("debug")("darwin:Plugin:mobrand");
const ENV_OFFERS_LIMIT = process.env.ENV_OFFERS_LIMIT;
const moment = require('moment');
// const { device_version } = require('@bit/ashok.eagle.constants/Macros');
const limit = 500;
exports.countApiPages = (response) => {
    let page = 0;
    return page;
}

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

exports.apiCall = async (credentials, page, apilimit) => {
    if (credentials.userid && credentials.sourceid && credentials.apiKey) {
        let apiKey = credentials['apiKey'];
        let userid = credentials['userid'];
        let sourceid = credentials['sourceid'];
        let apiBaseurl = "https://api.mobrand.net/" + userid + "/bulk/liveoffers/v3/" + sourceid + "?apikey=" + apiKey;
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
    let valid = false;
    let offerLog = defaultLog();
    let start_time = moment();
    let page = 0;
    let totalPages = 1;
    return new Promise(async (resolve, reject) => {
        try {
            let result;
            do {
                result = await this.apiCall(content.credentials, page * limit, limit);
                if (result) {
                    valid = this.checkValid(result.data)
                    if (valid === true) {
                        let data = this.fetchResponse(result.data);
                        content['domain'] = "api.mobrand.net";
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
                // debug(page , totalPages , limit );
            } while (page < totalPages);
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
    if (result.sourceid && result.campaigns && result.campaigns.length) {
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
        if (data && data.list && data.list.length) {
            for (let obj of data.list) {
                try {
                    let temp = formateOffers(data, obj);
                    if (temp.advertiser_offer_id && temp.advertiser_offer_id !== '') {
                        temp = addExtraFields(temp, content);
                        offers[temp.advertiser_offer_id] = temp;
                    }
                } catch (err) {
                    debug(err)
                }
            }
        }
    });
    return offers;
}

//api wise methods
function getCategory(field, data) {
    let category = [];
    if (data.category1) {
        category.push(data.category1);
    }
    if (data.category2) {
        category.push(data.category2);
    }
    return category;
}

function getOfferId(field, data, obj) {
    let offer_id = '';
    if (data.list && data.list.length) {
        offer_id = obj.id;
    }
    return offer_id;
}

function getOfferName(field, data, obj) {
    let offer_name = '';
    if (data.list && data.list.length) {
        offer_name = obj.offerName;
    }
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
    if (data.icon) {
        thumbnail = data.icon;
    }
    return thumbnail;
}

function getDescription(field, data, obj) {
    let description = '';
    if (data.list && data.list.length) {
        description = obj.notes;
    }
    return description;
}

function getKpi(field, data, obj) {
    let kpi = '';
    if (data.list && data.list.length) {
        if (obj.kpi != null) {
            kpi = obj.kpi;
        }
    }
    return kpi;
}

function getPreviewUrl(field, data) {
    let preview_url = '';
    if (data.previewLink) {
        preview_url = data.previewLink;
    }
    return preview_url;
}

function getTrackingLink(field, data, obj) {
    let tracking_link = '';
    if (data.list && data.list.length) {
        tracking_link = obj.offerLink;
    }
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

function getRevenue(field, data, obj) {
    let revenue = 0.0;
    if (data.list && data.list.length) {
        revenue = obj.payout;
    }
    return revenue;
}

function getRevenueType(field, data) {
    let revenue_type = { enum_type: 'unknown', offer_type: '' };
    return revenue_type;
}

function getPayout(field, data, obj) {
    let payout = 0.0;
    if (data.list && data.list.length) {
        payout = obj.payout;
    }
    return payout;
}

function getPayoutType(field, data) {
    let payout_type = { enum_type: 'unknown', offer_type: '' };
    return payout_type;
}

function getApprovalRequired(field, data, obj) {
    let approval_required = false;
    if (data.list && data.list.length) {
        if (!obj.offerLink) {
            approval_required = true;
        }
    }

    return approval_required;
}

function getIsCapEnabled(field, data, obj) {
    let cap_enable = false;
    if (obj.caps && obj.caps.length) {
        cap_enable = true;
    }
    return cap_enable;
}

function getOfferCapping(field, data, obj) {
    let cap = defaultCap();
    if (obj.caps && obj.caps.length) {
        obj.caps.map(el => {
            if (el.title == 'Daily Cap') {
                cap.daily_conv = el.amount
            }
        })
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

function getIsTargeting(field, data, obj) {
    let targeting_enable = false;
    if (obj.countries && obj.countries.length) {
        targeting_enable = true;
    }
    return targeting_enable;
}

function getGeoTargeting(field, data, obj) {
    let geo_targeting = defaultGeoTargeting();
    if (data.list && data.list.length) {
        if (obj.countries && obj.countries.length) {
            targeting_enable = true;
            obj.countries.map(country => {
                if (country)
                    geo_targeting.country_allow.push({ key: country, value: country });
            })
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
    if (data.platform) {
        device_targeting.os.push(data.platform);
    }
    if (data.minOsVer) {
        device_targeting.os_version.push({ os: data.platform, version: data.minOsVer, version_condition: 'eq' });
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
    return creative;
}

function getOfferVisible(field, data) {
    let offer_visible = 'public';
    return offer_visible;
}

function getStatusLabel(field, data, obj) {
    let status_label = 'unmanaged';
    if (obj.offerLink) {
        status_label = "active";
    }
    else {
        status_label = "no_link";
    }
    return status_label;
}

const mobrand = {
    getOfferId: (field, data, obj) => {
        return getOfferId(field, data, obj);
    },
    getOfferName: (field, data, obj) => {
        return getOfferName(field, data, obj);
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
    getDescription: (field, data, obj) => {
        return getDescription(field, data, obj);
    },
    getKpi: (field, data, obj) => {
        return getKpi(field, data, obj);
    },
    getPreviewUrl: (field, data) => {
        return getPreviewUrl(field, data);
    },
    getTrackingLink: (field, data, obj) => {
        return getTrackingLink(field, data, obj);
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
    getRevenue: (field, data, obj) => {
        return getRevenue(field, data, obj);
    },
    getRevenueType: (field, data, obj) => {
        return getRevenueType(field, data, obj);
    },
    getPayout: (field, data, obj) => {
        return getPayout(field, data, obj);
    },
    getPayoutType: (field, data, obj) => {
        return getPayoutType(field, data, obj);
    },
    getApprovalRequired: (field, data, obj) => {
        return getApprovalRequired(field, data, obj);
    },
    getIsCapEnabled: (field, data, obj) => {
        return getIsCapEnabled(field, data, obj);
    },
    getOfferCapping: (field, data, obj) => {
        return getOfferCapping(field, data, obj);
    },
    getIsTargeting: (field, data, obj) => {
        return getIsTargeting(field, data, obj);
    },
    getGeoTargeting: (field, data, obj) => {
        return getGeoTargeting(field, data, obj);
    },
    getDeviceTargeting: (field, data, obj) => {
        return getDeviceTargeting(field, data, obj);
    },
    getCreative: (field, data) => {
        return getCreative(field, data);
    },
    getOfferVisible: (field, data, obj) => {
        return getOfferVisible(field, data, obj);
    },
    getStatusLabel: (field, data, obj) => {
        return getStatusLabel(field, data, obj);
    },
    getRedirectionMethod: (field, data) => {
        return getRedirectionMethod(field, data);
    }
}

function formateOffers(offer, obj) {
    let formatedOffer = {};
    array = getOffersFields('', '');
    array.map(function (ele) {
        try {
            let field = ele.field;
            let action = ele.action;
            let data = mobrand[action](field, offer, obj);
            formatedOffer[field] = data;
        }
        catch (err) {
            debug(err);

        }
    })
    return formatedOffer;
}
