const { InsertUpdateOffer, makeRequest, getOffersFields, addExtraFields, ImportantFields, defaultLog, mergeOfferLog, lockOfferApiStats } = require('../plugin');
const debug = require("debug")("darwin:plugin:Tabatoo");
const ENV_OFFERS_LIMIT = process.env.ENV_OFFERS_LIMIT;
const moment = require('moment');

const { ActiveApi, InactiveApi } = require('../../helpers/Functions');
const limit = 500;
exports.nextApiPages = (response) => {
    try {
        let nextPage = false;
        if (response.nextPageUrl) {
            nextPage = response.nextPageUrl;
        }
        // debug(nextPage);
        return nextPage;
    }
    catch (err) {
        return false;
    }
}

// update after find right pid 
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
    if (credentials.network_id && credentials.api_key && credentials.app_id) {
        let network_id = credentials['network_id'];
        let api_key = credentials['api_key'];
        let app_id = credentials['app_id'];
        let apiBaseurl = "https://" + network_id + "/offers/apiV2?appId=" + app_id + "&key=" + api_key + "&all=1";
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
    let network_id = content.credentials['network_id'];
    let api_key = content.credentials['api_key'];
    let app_id = content.credentials['app_id'];
    let apiBaseurl = "https://" + network_id + "/offers/apiV2?appId=" + app_id + "&key=" + api_key + "&all=1";
    let valid = false;
    let offerLog = defaultLog();
    let start_time = moment();
    let page = 0;
    let nextPage = true;
    return new Promise(async (resolve, reject) => {
        try {
            let result;
            do {
                result = await makeRequest({
                    method: 'get',
                    url: apiBaseurl,

                });
                if (result) {
                    valid = this.checkValid(result.data);
                    if (valid === true) {
                        let data = this.fetchResponse(result.data);
                        content['domain'] = network_id;
                        let offer = this.traverseOffer(data, content);
                        let tempLog = await InsertUpdateOffer(ImportantFields, offer, content);
                        nextPage = this.nextApiPages(result.data);
                        apiBaseurl = nextPage;
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
            } while (nextPage)
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
    if (result.nextPageUrl != undefined && result.offers) {
        //valid credentials tabatoo
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
    result.map((data) => {
        try {
            if (data) {

                let temp = formateOffers(data);
                if (temp.advertiser_offer_id) {
                    temp = addExtraFields(temp, content);
                    offers[temp.advertiser_offer_id] = temp;
                }
            }
        }
        catch (err) {
            debug(err);
            // console.log('error', err); // if error occurs skip that offer
        }
    });
    return offers;
}

//api wise methods
function getCategory(field, data) {
    let category = [];
    if (data.category) {
        category.push(data.category);
    }
    return category;
}

function getOfferId(field, data) {
    let offer_id = '';
    if (data.externalOfferId) {
        offer_id = data.externalOfferId;
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
    return currency;
}

function getRedirectionMethod(field, data) {
    let method = 'javascript_redirect';
    return method;
}

function getThumbnail(field, data) {
    let thumbnail = '';
    if (data.iconLink)
        thumbnail = data.iconLink;
    return thumbnail;
}

function getDescription(field, data) {
    let description = '';
    if (data.description)
        description = data.description;
    return description;
}

function getKpi(field, data) {
    let kpi = '';
    if (data.restrictions)
        kpi = data.restrictions;
    return kpi;
}

function getPreviewUrl(field, data) {
    let preview_url = '';
    let ios = "http://itunes.apple.com/jp/app/id"
    let android = "https://play.google.com/store/apps/details?id="
    if (data.packageName) {
        if (data.packageName.isNaN)
            preview_url = android + data.packageName
        else
            preview_url = ios + data.packageName
    }
    return preview_url;
}

function getTrackingLink(field, data) {
    let tracking_link = '';
    if (data.shortenURL)
        tracking_link = data.shortenURL;
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
    if (data.bid)
        revenue = data.bid;
    return revenue;
}

function getRevenueType(field, data) {
    let revenue_type = { enum_type: '', offer_type: '' };
    if (data.offerType) {
        if (data.offerType == '0')
            revenue_type.offer_type = "CPI";
        else if (data.offerType == '1')
            revenue_type.offer_type = "CPA";
    }
    return revenue_type;
}

function getPayout(field, data) {
    let payout = 0;
    if (data.bid)
        payout = data.bid;
    return payout;
}

function getPayoutType(field, data) {
    let payout_type = { enum_type: '', offer_type: '' };
    if (data.offerType) {
        if (data.offerType == '0')
            payout_type.offer_type = "CPI";
        else if (data.offerType == '1')
            payout_type.offer_type = "CPA";
    }
    return payout_type;
}

function getApprovalRequired(field, data) {
    let approval_required = false;
    if (data.shortenURL)
        approval_required = true;
    return approval_required;
}

function getIsCapEnabled(field, data) {
    let cap_enable = false;
    if (data.daily_capping)
        cap_enable = true;
    return cap_enable;
}

function getOfferCapping(field, data) {
    let cap = defaultCap();
    if (data.daily_capping)
        cap.daily_conv = +data.daily_capping
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
    if ((data.platform) || (data.geo)) {
        targeting_enable = true;
    }
    return targeting_enable;
}

function getGeoTargeting(field, data) {
    let geo_targeting = defaultGeoTargeting();
    countryAllow = []
    if (data.geo) {
        {
            countryAllow = data.geo.split(",")
            countryAllow.map(element => {
                geo_targeting.country_allow.push({ key: element, value: element });
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
    platform = []
    isMobile = false;

    if (data.platform)
        platform = data.platform.split("")
    if (platform.includes("1") || platform.includes("2")) {
        device_targeting.os.push("ios")
        if (data.minOsVersion) {
            device_targeting.os_version.push({ os: 'ios', version: data.minOsVersion, version_condition: "gte" })
        }
        if (!isMobile) {
            device_targeting.device.push("mobile")
            isMobile = true
        }
    }
    else if (platform.includes("0")) {
        device_targeting.os.push("android")
        if (data.minOsVersion) {
            device_targeting.os_version.push({ os: 'android', version: data.minOsVersion, version_condition: "gte" })
        }
        if (!isMobile) {
            device_targeting.device.push("mobile")
            isMobile = true
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
    let creative = defaultCreative();
    if (data.creatives_link)
        creative.tracking_link = data.creatives_link
    return creative;
}

function getOfferVisible(field, data) {
    let offer_visible = 'public';
    return offer_visible;
}

function getStatusLabel(field, data) {
    let status_label = 'unmanaged';
    if (data.shortenURL) {
        status_label = 'active'
    }
    else {
        status_label = "no_link";
    }
    return status_label;
}

const tabatoo = {
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
            let data = tabatoo[action](field, offer);
            formatedOffer[field] = data;
        }
        catch (err) {
            debug(err);

        }
    })
    return formatedOffer;
}