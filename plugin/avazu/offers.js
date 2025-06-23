const { InsertUpdateOffer, makeRequest, getOffersFields, addExtraFields, ImportantFields, defaultLog, mergeOfferLog, lockOfferApiStats } = require('../plugin');
const { ActiveApi, InactiveApi } = require('../../helpers/Functions');

const debug = require("debug")("darwin:Plugin:Avazu");
const moment = require('moment');
const limit = 500; // Max limit by API


exports.apiCall = async (credentials, page, apilimit) => {
    if (credentials.sourceid) {
        let source_id = credentials['sourceid'];
        let apiBaseurl = `http://api.c.avazunativeads.com/s2s?sourceid=${source_id}&enforcedv=device_id,appname,bundle_name&campaigndesc=1&os=all&incent=2&market=google|apple|ddl|optin&limit=${apilimit}&page=${page}`;
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

// update after find pid 
exports.getPid = (url) =>{
    if(!url){
        return null;
    }
    let urlData = new URL(url);
    return urlData.searchParams.get('trafficsourceid');
}
exports.getPidLocation = ()=>{
    return {
        lop : 'query', // lop means locations of pid
        location : 'trafficsourceid'
    }
}

exports.checkValid = (result) => {
    if (result && result.status === "OK" && result.ads && result.ads.ad.length > 0) {
        return true
    }
    else {
        return false;
    }
}

exports.fetchResponse = (result) => {
    return result.ads.ad;
}

const Avazu = {
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
            let data = Avazu[action](field, offer);
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
        if (response.ads && response.ads.total_records) {
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
                if (result) {
                    valid = this.checkValid(result.data)
                    if (valid === true) {
                        let data = this.fetchResponse(result.data);
                        content['domain'] = "api.c.avazunativeads.com";
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


//api wise methods
function getOfferName(field, data) {
    let offer_name = '';
    if (data.title)
        offer_name = data.title;
    return offer_name;
}

function getIsGoalEnabled(field, data) {
    return false;
}

function getGoals(field, data) {
    return [];
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
    let category = [];
    if (data.appcategory) {
        category.push(data.appcategory);
    }
    return category;
}

function getCurrency(field, data) {
    return 'USD';
}

function getOfferId(field, data) {
    let offer_id = '';
    if (data.campaignid) {
        offer_id = data.campaignid;
    }
    return offer_id;
}

function getThumbnail(field, data) {
    let thumbnail = '';
    if (data.icon) {
        thumbnail = data.icon;
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
    if (data.description) {
        kpi = data.description;
    }
    return kpi;
}

function getPreviewUrl(field, data) {
    let preview_url = '';
    if (data.landingpageurl)
        preview_url = data.landingpageurl;
    return preview_url;
}

function getTrackingLink(field, data) {
    let tracking_link = '';
    if (data.clkurl) {
        tracking_link = data.clkurl;
    }
    return tracking_link;
}

function getExpiredUrl(field, data) {
    return "";
}

function getStartDate(field, data) {
    return moment();
}

function getEndDate(field, data) {
    return moment().add(1, 'Y');
}

function getRevenue(field, data) {
    let revenue = 0.0;
    if (data.payout) {
        if (data.payout.includes("$")) {
            revenue = +data.payout.split("$")[0]
        }
        else {
            revenue = +data.payout;
        }
    }
    return revenue;
}

function getRevenueType(field, data) {
    let revenue_type = { enum_type: 'unknown', offer_type: '' };
    if (data.convflow) {
        if (data.convflow == '101') {
            revenue_type.offer_type = "CPI";
        } else if (data.convflow == '102') {
            revenue_type.offer_type = "DOI Sign Up";
        } else if (data.convflow == '103') {
            revenue_type.offer_type = "MO Flow";
        } else if (data.convflow == '104') {
            revenue_type.offer_type = "MO MSISDN Flow";
        } else if (data.convflow == '105') {
            revenue_type.offer_type = "MO Flow with Click2SMS";
        } else if (data.convflow == '106') {
            revenue_type.offer_type = "MT Flow";
        } else if (data.convflow == '107') {
            revenue_type.offer_type = "MT MSISDN Flow";
        } else if (data.convflow == '108') {
            revenue_type.offer_type = "One Click Billing";
        } else if (data.convflow == '109') {
            revenue_type.offer_type = "Pay Per Call";
        } else if (data.convflow == '110') {
            revenue_type.offer_type = "SOI Sign Up";
        } else if (data.convflow == '111') {
            revenue_type.offer_type = "Two Click Billing";
        } else if (data.convflow == '112') {
            revenue_type.offer_type = "IVR Flow";
        } else if (data.convflow == '113') {
            revenue_type.offer_type = "Other";
        } else if (data.convflow == '115') {
            revenue_type.offer_type = "CPE (Cost per Event)";
        }
    }
    return revenue_type;
}

function getPayout(field, data) {
    let payout = 0.0;
    if (data.payout) {
        if (data.payout.includes("$")) {
            payout = +data.payout.split("$")[0]
        }
        else {
            payout = +data.payout;
        }
    }
    return payout;
}

function getPayoutType(field, data) {
    let payout_type = { enum_type: 'unknown', offer_type: '' };
    if (data.convflow) {
        if (data.convflow == '101') {
            payout_type.offer_type = "CPI";
        } else if (data.convflow == '102') {
            payout_type.offer_type = "DOI Sign Up";
        } else if (data.convflow == '103') {
            payout_type.offer_type = "MO Flow";
        } else if (data.convflow == '104') {
            payout_type.offer_type = "MO MSISDN Flow";
        } else if (data.convflow == '105') {
            payout_type.offer_type = "MO Flow with Click2SMS";
        } else if (data.convflow == '106') {
            payout_type.offer_type = "MT Flow";
        } else if (data.convflow == '107') {
            payout_type.offer_type = "MT MSISDN Flow";
        } else if (data.convflow == '108') {
            payout_type.offer_type = "One Click Billing";
        } else if (data.convflow == '109') {
            payout_type.offer_type = "Pay Per Call";
        } else if (data.convflow == '110') {
            payout_type.offer_type = "SOI Sign Up";
        } else if (data.convflow == '111') {
            payout_type.offer_type = "Two Click Billing";
        } else if (data.convflow == '112') {
            payout_type.offer_type = "IVR Flow";
        } else if (data.convflow == '113') {
            payout_type.offer_type = "Other";
        } else if (data.convflow == '115') {
            payout_type.offer_type = "CPE (Cost per Event)";
        }
    }
    return payout_type;
}

function getApprovalRequired(field, data) {
    let approval_required = false;
    if (!data.clkurl)
        approval_required = true;
    return approval_required;
}

function getIsCapEnabled(field, data) {
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
    return defaultCap();
}

function getIsTargeting(field, data) {
    let targeting_enable = false;
    if (data.countries || data.os || data.devicetype) {
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
    if (data.countries) {
        country = data.countries.split('|');
        country.map(obj => {
            geo_targeting.country_allow.push({ key: obj, value: obj });
        })
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
    if (data.devicetype) {
        device_targeting.device.push('mobile');
    }
    if (data.os) {
        device_targeting.os.push(data.os);
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
    if (data.creatives) {
        let creativeKey = Object.keys(data.creatives);

        creativeKey.map(key => {
            let dfltCreative = defaultCreative();
            dfltCreative.height = key.split("x")[0];
            dfltCreative.width = key.split("x")[1];
            dfltCreative.creative_file = data.creatives[key][0];
            creatives.push(dfltCreative)
        })
    }
    return creatives;
}

function getOfferVisible(field, data) {
    let offer_visible = 'public';
    return offer_visible;
}

function getStatusLabel(field, data) {
    let status_label = 'unmanaged';
    if (data.clkurl) {
        status_label = "active";
    }
    else {
        status_label = "no_link";
    }
    return status_label;
}

function getRedirectionMethod(field, data) {
    return 'javascript_redirect';
}
