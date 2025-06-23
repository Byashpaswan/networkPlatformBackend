const { InsertUpdateOffer, makeRequest, getOffersFields, addExtraFields, ImportantFields, defaultLog, mergeOfferLog, lockOfferApiStats } = require('../plugin');
const { ActiveApi, InactiveApi } = require('../../helpers/Functions');

const debug = require("debug")("darwin:Plugin:Turbomobi");
const moment = require('moment');
const limit = 500; // Max limit by API


exports.apiCall = async (credentials, page, apilimit) => {
    if (credentials.network_id && credentials.api_key) {
        let network_id = credentials['network_id'];
        let api_key = credentials['api_key'];
        let apiBaseurl = `http://${network_id}/api?token=${api_key}&rcap=1`;
        debug(apiBaseurl)
        return await makeRequest({
            method: 'get',
            url: apiBaseurl,
        });
    }
    else {
        return null;
    }
}


// update aff_id after check sample tracking_link 
exports.getPid = (url) =>{
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

exports.checkValid = (result) => {
    if (result && result.code === 200 && result.data && result.data.length > 0) {
        return true
    }
    else {
        return false;
    }
}

exports.fetchResponse = (result) => {
    return result.data;
}

const Turbomobi = {
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
            let data = Turbomobi[action](field, offer);
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
                        content['domain'] = content.credentials['network_id'];
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
    if (data.name)
        offer_name = data.name;
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
    return [];
}

function getCurrency(field, data) {
    return 'USD';
}

function getOfferId(field, data) {
    let offer_id = '';
    if (data.adid) {
        offer_id = data.adid;
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
    if (data.click_url) {
        tracking_link = data.click_url;
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
        revenue = +data.payout;
    }
    return revenue;
}

function getRevenueType(field, data) {
    let revenue_type = { enum_type: 'unknown', offer_type: '' };
    if (data.bid_type) {
        if (data.bid_type == 1) {
            revenue_type.offer_type = "CPI";
        } else if (data.bid_type == 2) {
            revenue_type.offer_type = "CPA";
        } else if (data.bid_type == 3) {
            revenue_type.offer_type = "CPS";
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
    if (data.bid_type) {
        if (data.bid_type == 1) {
            payout_type.offer_type = "CPI";
        } else if (data.bid_type == 2) {
            payout_type.offer_type = "CPA";
        } else if (data.bid_type == 3) {
            payout_type.offer_type = "CPS";
        }
    }
    return payout_type;
}

function getApprovalRequired(field, data) {
    let approval_required = false;
    if (!data.click_url)
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
    if (data.cn || data.platform === 0 || data.platform === 1) {
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
    if (data.cn) {
        country = data.cn.split('|');
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
    if (data.platform === 0) {
        device_targeting.device.push('mobile');
        device_targeting.os.push('android');
    } else if (data.platform === 0) {
        device_targeting.device.push('mobile');
        device_targeting.os.push('ios');
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
    if (data.creative) {
        let dfltCreative = defaultCreative();
        dfltCreative.creative_type = data.creative.type;
        dfltCreative.height = data.creative.height;
        dfltCreative.width = data.creative.width;
        dfltCreative.creative_file = data.creative.url;
        creatives.push(dfltCreative)
    }
    return creatives;
}

function getOfferVisible(field, data) {
    return 'public';
}

function getStatusLabel(field, data) {
    let status_label = 'unmanaged';
    if (data.click_url) {
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
