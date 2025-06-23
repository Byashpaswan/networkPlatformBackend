const { InsertUpdateOffer, makeRequest, getOffersFields, addExtraFields, ImportantFields, defaultLog, mergeOfferLog, lockOfferApiStats } = require('../plugin');
const { ActiveApi, InactiveApi } = require('../../helpers/Functions');

const debug = require("debug")("darwin:Plugin:Movablead");
const ENV_OFFERS_LIMIT = process.env.ENV_OFFERS_LIMIT;
const moment = require('moment');
const limit = 2000;

// update after find pid 
exports.getPid = (url) =>{
    if(!url){
        return null;
    }
    let urlData = new URL(url);
    return urlData.searchParams.get('key');
}

exports.getPidLocation = ()=>{
    return {
        lop : 'query', // lop means locations of pid
        location : 'key'
    }
}
exports.offersApiCall = async (content) => {
    let valid = false;
    let offerLog = defaultLog();
    let start_time = moment();
    let page = 1;
    let totalPages = 0;
    return new Promise(async (resolve, reject) => {
        try {
            let result;
            do {
                result = await this.apiCall(content.credentials, page, limit);
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

exports.apiCall = async (credentials, page, apilimit) => {
    try {
        if (credentials.appkey && credentials.network_id) {
            let apiBaseurl = `https://${credentials.network_id}/api/offer/list?app_id=${credentials.appkey}`
            return await makeRequest({
                method: 'get',
                url: apiBaseurl
            });
        }
    } catch (error) {
        debug(error)
    }
    return null;
}

exports.checkValid = (result) => {
    if (result && result.code == 200 && result.offer_list && result.offer_list.length) {
        return true;
    }
    else {
        return false;
    }
}

exports.fetchResponse = (result) => {
    return result.offer_list;
}

exports.traverseOffer = (result, content) => {

    let allOffer = {}

    result.map((offer) => {
        try {
            // debug(offer)
            let temp = formateOffers(offer);
            if (temp.advertiser_offer_id) {
                temp = addExtraFields(temp, content);
                allOffer[temp.advertiser_offer_id] = temp;
            }
        } catch (error) {
            debug(error)
        }
    });

    // debug(allOffer)
    return allOffer
}

exports.countApiPages = (result) => {
    if (result.total && result.current_page && result.last_page && (result.total >= result.current_page * limit)) {
        return result.current_page + 1;
    }
    return 0;
}

//api wise methods
function getOfferId(field, data) {
    let offer_id = '';
    if (data.offer_id) {
        offer_id = data.offer_id;
    }
    return offer_id;
}

function getOfferName(field, data) {
    let offer_name = '';
    if (data.offer_name)
        offer_name = data.offer_name;
    return offer_name;
}

function getCategory(field, data) {
    return [];
}

function getIsGoalEnabled(field, data) {
    return false;
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

function getGoals(field, data) {
    return [];
}

function getCurrency(field, data) {
    let currency = 'USD';
    if (data.currency) {
        currency = data.currency;
    }
    return currency;
}

function getThumbnail(field, data) {
    return '';
}

function getDescription(field, data) {
    let description = '';
    if (data.details)
        description = data.details;
    return description;
}

function getKpi(field, data) {
    let kpi = '';
    if (data.remarks) {
        kpi = data.remarks
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
        tracking_link = data.url;
    }
    return tracking_link;
}

function getExpiredUrl(field, data) {
    return '';
}

function getStartDate(field, data) {
    return moment().toDate();
}

function getEndDate(field, data) {
    return moment().add(1, 'Y').toDate();
}

function getRevenue(field, data) {
    let revenue = 0.0;
    if (data.unit_price)
        revenue = data.unit_price;
    return revenue;

}

function getRevenueType(field, data) {
    let revenue_type = { enum_type: '', offer_type: '' };
    if (data.billing_plan) {
        revenue_type['offer_type'] = data.billing_plan
    }
    return revenue_type;
}

function getPayout(field, data) {
    let payout = 0.0;
    if (data.unit_price)
        payout = data.unit_price;
    return payout;

}

function getPayoutType(field, data) {
    let payout_type = { enum_type: '', offer_type: '' };
    if (data.billing_plan) {
        payout_type['offer_type'] = data.billing_plan
    }
    return payout_type;
}

function getApprovalRequired(field, data) {
    let approval_required = false;
    if (!data.url) {
        approval_required = true
    }
    return approval_required;
}

function getIsCapEnabled(field, data) {
    let cap_enable = false;
    if (data.daily_toplimit)
        cap_enable = true;
    return cap_enable;
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

function getOfferCapping(field, data) {
    let cap = defaultCap();
    if (data.daily_toplimit) {
        cap.daily_conv = data.daily_toplimit;
    }
    return cap;
}

function getIsTargeting(field, data) {
    let targeting_enable = true;
    if ((data.deliverable_countries && data.deliverable_countries.length) || data.os) {
        targeting_enable = true;
    }
    return true;
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

function getGeoTargeting(field, data) {
    let geo_targeting = defaultGeoTargeting();
    if (data.deliverable_countries && data.deliverable_countries.length) {
        data.deliverable_countries.map((country) => {
            geo_targeting.country_allow.push({ key: country, value: country })
        })
    }
    if (data.undeliverable_countries && data.undeliverable_countries.length) {
        data.undeliverable_countries.map((country) => {
            geo_targeting.country_deny.push({ key: country, value: country })
        })
    }
    return geo_targeting;
}

function defaultDeviceTargeting() {
    let device_targeting = {
        device: [],
        os: [],
        os_version: []
    }
    return device_targeting;
}

function getDeviceTargeting(field, data) {
    let device_targeting = defaultDeviceTargeting();
    if (data.os === "") {
        device_targeting.os.push("all")
    }
    else if (data.os) {
        device_targeting.os.push(data.os);
    }
    return device_targeting;
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

function getCreative(field, data) {
    return []
}

function getOfferVisible(field, data) {
    return 'public';
}

function getStatusLabel(field, data) {
    let status_label = 'unmanaged';
    if (data.url) {
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

const movablead = {
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
            let data = movablead[action](field, offer);
            formatedOffer[field] = data;
        }
        catch (err) {
            debug(err);

        }
    })
    return formatedOffer;
}

