const { InsertUpdateOffer, makeRequest, getOffersFields, addExtraFields, ImportantFields, defaultLog, mergeOfferLog, lockOfferApiStats } = require('../plugin');
const { ActiveApi, InactiveApi } = require('../../helpers/Functions');

const debug = require("debug")("darwin:Plugin:Rocmob");
const moment = require('moment');
const limit = 500; // Max limit by API

// update after find pid
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
exports.apiCall = async (credentials, page, apilimit) => {
    if (credentials.network_id && credentials.RUID && credentials.RTOK) {
        // let apiBaseurl = `http://${credentials['network_id']}/offers/?aff_id=${credentials['aff_id']}&aff_token=${credentials['token']}&get_creatives=1`;
        let apiBaseurl = `http://${credentials.network_id}/wall/v1/offers`;
        debug(apiBaseurl)
        return await makeRequest({
            method: 'get',
            url: apiBaseurl,
            headers: {
                'RUID': credentials.RUID,
                'RTOK': credentials.RTOK
            }
        });
    }
    else {
        return null;
    }
}

exports.checkValid = (result) => {
    if (result && result.offers && result.offers.length > 0) {
        return true
    }
    return false;
}

exports.fetchResponse = (result) => {
    return result.offers;
}

const Rocmob = {
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
            let data = Rocmob[action](field, offer);
            formatedOffer[field] = data;
        }
        catch (err) {
            debug(err);

        }
    })
    return formatedOffer;
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
        }
    });
    return offers;
}

exports.countApiPages = (response) => {
    try {
        let page = 0;
        if (response.count && response.ads.total_records) {
            page = Math.ceil(response.ads.total_records / limit);
        }
        // debug(page)
        return page;
    }
    catch (err) {
        return 0;
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
                if (result && Object.keys(result).length) {
                    valid = this.checkValid(result.data)
                    if (valid === true) {
                        let data = this.fetchResponse(result.data);
                        content['domain'] = content.credentials['network_id'];
                        let offer = this.traverseOffer(data, content);
                        let tempLog = await InsertUpdateOffer(ImportantFields, offer, content);
                        // totalPages = this.countApiPages(result.data);
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


//api wise methods
function getOfferName(field, data) {
    let offer_name = '';
    if (data.name)
        offer_name = data.name;
    return offer_name;
}

function getIsGoalEnabled(field, data) {
    if (data.user_flow) {
        return true
    }
    return false;
}

function getGoals(field, data) {
    let goals = [];
    if (data.user_flow) {
        let dfltGoals = defaultGoal();
        dfltGoals.name = data.user_flow
        goals.push(dfltGoals)
    }
    return goals;
}

function defaultGoal() {
    return {
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
}

function getCategory(field, data) {
    let category = []
    if (data.categories) {
        if (data.categories.includes(',')) {
            category = data.categories.split(',').filter(el => el != "")
        }
        else {
            category.push(data.categories)
        }
    }
    return category;
}

function getCurrency(field, data) {
    return "USD";
}

function getOfferId(field, data) {
    let offer_id = '';
    if (data.id) {
        offer_id = data.id;
    }
    return offer_id;
}

function getThumbnail(field, data) {
    let thumbnail = '';
    if (data.thumbnail_url) {
        thumbnail = data.thumbnail_url;
    }
    return thumbnail;
}

function getDescription(field, data) {
    return '';
}

function getKpi(field, data) {
    return '';
}

function getPreviewUrl(field, data) {
    let preview_url = '';
    if (data.destination_url) {
        preview_url = data.destination_url;
    }
    return preview_url;
}

function getTrackingLink(field, data) {
    let tracking_link = '';
    if (data.track_url) {
        tracking_link = data.track_url;
    }
    return tracking_link;
}

function getExpiredUrl(field, data) {
    return "";
}

function getStartDate(field, data) {
    return moment().toDate();
}

function getEndDate(field, data) {
    return moment().add(1, 'Y').toDate();
}

function getRevenue(field, data) {
    let revenue = 0.0;
    if (data.payout) {
        revenue = +data.payout;
    }
    return revenue;
}

function getRevenueType(field, data) {
    let revenue_type = { enum_type: 'unknown', offer_type: '' };
    if (data.mode) {
        if (["cpc", "cpi", "cpa", "cpe", "cpl", "cps", "cpm"].includes(data.mode)) {
            revenue_type.offer_type = data.mode.toUpperCase();
        }
    }
    return revenue_type;
}

function getPayout(field, data) {
    let payout = 0.0;
    if (data.payout) {
        payout = +data.payout;
    }
    return payout;
}

function getPayoutType(field, data) {
    let payout_type = { enum_type: 'unknown', offer_type: '' };
    if (data.mode) {
        if (["cpc", "cpi", "cpa", "cpe", "cpl", "cps", "cpm"].includes(data.mode)) {
            payout_type.offer_type = data.mode.toUpperCase();
        }
    }
    return payout_type;
}

function getApprovalRequired(field, data) {
    let approval_required = false;
    if (!data.track_url)
        approval_required = true;
    return approval_required;
}

function getIsCapEnabled(field, data) {
    if (data.daily_cap > 0) {
        return true
    }
    return false;
}

function defaultCap() {
    return {
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
}

function getOfferCapping(field, data) {
    let offerCap = defaultCap()
    if (data.daily_cap > 0) {
        offerCap.daily_conv = data.daily_cap
    }
    return offerCap;
}

function getIsTargeting(field, data) {
    let targeting_enable = false;
    if (data.country || data.platform) {
        targeting_enable = true;
    }
    return targeting_enable;
}

function defaultGeoTargeting() {
    return {
        country_allow: [],
        country_deny: [],
        city_allow: [],
        city_deny: []
    }
}

function getGeoTargeting(field, data) {
    let geo_targeting = defaultGeoTargeting();
    if (data.country) {
        geo_targeting.country_allow.push({ key: data.country, value: data.country });
    }
    return geo_targeting;
}

function defaultDeviceTargeting() {
    return {
        device: [],
        os: [],
        os_version: []
    }
}

function getDeviceTargeting(field, data) {
    let device_targeting = defaultDeviceTargeting();
    if (data.platform) {
        if (data.platform === 'ios' || data.platform === 'iphone' || data.platform === 'ipad') {
            if (!device_targeting.os.includes("ios")) {
                device_targeting.os.push("ios");
            }
            if (!device_targeting.device.includes("mobile")) {
                device_targeting.device.push('mobile');
            }
        }
        if (data.platform === 'android') {
            if (!device_targeting.os.includes("android")) {
                device_targeting.os.push("android");
            }
            if (!device_targeting.device.includes("mobile")) {
                device_targeting.device.push('mobile');
            }
        }
        if (data.platform === 'windows') {
            if (!device_targeting.os.includes("windows")) {
                device_targeting.os.push("windows");
            }
            if (!device_targeting.device.includes("mobile")) {
                device_targeting.device.push('mobile');
            }
        }
        if (data.platform === 'desktop') {
            if (!device_targeting.os.includes("desktop")) {
                device_targeting.os.push("desktop");
            }
            if (!device_targeting.device.includes("desktop")) {
                device_targeting.device.push('desktop');
            }
        }
    }

    return device_targeting;
}

function defaultCreative() {
    return {
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
}

function getCreative(field, data) {
    let creatives = []
    if (data.creative_url) {
        let dfltCreative = defaultCreative();
        dfltCreative.tracking_link = data.creative_url;
        creatives.push(dfltCreative)
    }
    return creatives;
}

function getOfferVisible(field, data) {
    return 'public';
}

function getStatusLabel(field, data) {
    let status_label = 'no_link';
    if (data.track_url) {
        status_label = "active";
    }
    return status_label;
}

function getRedirectionMethod(field, data) {
    return 'javascript_redirect';
}
