const { InsertUpdateOffer, makeRequest, getOffersFields, addExtraFields, ImportantFields, defaultLog, mergeOfferLog, lockOfferApiStats } = require('../plugin');

const { ActiveApi, InactiveApi } = require('../../helpers/Functions');
const debug = require("debug")("darwin:Plugin:NeewSeed");
const ENV_OFFERS_LIMIT = process.env.ENV_OFFERS_LIMIT;
const moment = require('moment');
const limit = 500;

// update after find pid 
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
                        content['domain'] = content.credentials['api_domain'];
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

exports.apiCall = async (credentials, page, apilimit) => {
    if (credentials.api_key && credentials.api_domain) {

        let api_key = credentials['api_key'];
        let api_domain = credentials['api_domain'];

        let apiBaseurl = `http://${api_domain}/api/v1/offers.do?key=${api_key}&page=${page}&limit=${apilimit}`;

        return await makeRequest({
            method: 'get',
            url: apiBaseurl,
        });
    }
    else {
        return null;
    }

}

exports.checkValid = (result) => {
    if (result.status == 200 && result.message == "success" && result.offers.length >= 0) {
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
    result.map(function (data) {
        try {
            if (data) {

                let temp = formateOffers(data);

                if (temp.advertiser_offer_id) {
                    temp = addExtraFields(temp, content);
                    if (offers[temp.advertiser_offer_id]) {
                    }
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

function formateOffers(offer) {
    let formatedOffer = {};
    array = getOffersFields('', '');
    array.map(function (obj) {
        try {
            let field = obj.field;
            let action = obj.action;
            let data = newseed[action](field, offer);
            formatedOffer[field] = data;
        }
        catch (err) {
            debug(err);

        }
    })
    return formatedOffer;
}

exports.countApiPages = (response) => {
    let page = 0;
    try {
        if (response.total) {
            page = response.total
        }
        return page;
    }
    catch (err) {
        return 0;
    }
}


//api wise methods
function getOfferId(field, data) {
    let offer_id = '';
    if (data.offer_id) {
        offer_id = data.offer_id.toString();
    }
    return offer_id;
}

function getOfferName(field, data) {
    let offer_name = '';
    if (data.offer_name) {
        offer_name = data.offer_name;
    }
    return offer_name;
}

function getDescription(field, data) {
    let description = '';
    if (data.description) {
        description = data.description;
    }
    return description;
}

function getThumbnail(field, data) {
    let thumbnail = '';
    if (data.logo_url) {
        thumbnail = data.logo_url;
    }
    return thumbnail;
}

function getPreviewUrl(field, data) {
    let preview_url = '';
    if (data.preview_url) {
        preview_url = data.preview_url;
    }
    return preview_url;
}

function getTrackingLink(field, data) {
    let tracking_link = '';
    if (data.tracking_url) {
        tracking_link = data.tracking_url;
    }
    return tracking_link;
}

function getApprovalRequired(field, data) {
    let approval_required = false;
    if (!data.tracking_url)
        approval_required = true;
    return approval_required;
}

function getCurrency(field, data) {
    let currency = 'USD';
    if (data.currency) {
        currency = data.currency;
    }
    return currency;
}

function getRedirectionMethod(field, data) {
    let method = 'javascript_redirect';
    return method;
}

function getStartDate(field, data) {
    let start_date = moment();
    return start_date;
}

function getEndDate(field, data) {
    let end_date = moment().add(1, 'Y');
    return end_date;
}

function getOfferVisible(field, data) {
    let offer_visible = 'public';
    return offer_visible;
}

function getStatusLabel(field, data) {
    let status_label = 'unmanaged';
    if (data.tracking_url) {
        status_label = "active";
    }
    else {
        status_label = "no_link";
    }
    return status_label;
}

function getRevenueType(field, data) {
    let revenue_type = { enum_type: '', offer_type: '' };
    if (data.type == 1) {
        revenue_type.offer_type = "cpi";
    }
    else if (data.type == 2) {
        revenue_type.offer_type = "cpa";
    }
    return revenue_type;
}

function getPayoutType(field, data) {
    let payout_type = { enum_type: '', offer_type: '' };
    if (data.type == 1) {
        payout_type.offer_type = "cpi";
    }
    else if (data.type == 2) {
        payout_type.offer_type = "cpa";
    }
    return payout_type;
}

function getPayout(field, data) {
    let payout = 0.0;
    if (data.payments && data.payments.length > 0) {
        let payments = data.payments;
        let lowestPayout = payments[0].payout;

        for (let i = 0; i < payments.length; i++) {
            if (payments[i].is_payable == 1 && lowestPayout < payments[i].payout) {
                lowestPayout = element.payout;
            }
        }
        payout = lowestPayout;
    }
    return payout;
}

function getRevenue(field, data) {
    let revenue = 0.0;
    if (data.payments && data.payments.length > 0) {
        let payments = data.payments;
        let lowestPayout = payments[0].payout;

        for (let i = 0; i < payments.length; i++) {
            if (payments[i].is_payable == 1 && lowestPayout < payments[i].payout) {
                lowestPayout = element.payout;
            }
        }
        revenue = lowestPayout;
    }
    return revenue;
}

function getExpiredUrl(field, data) {
    let expired_url = '';
    return expired_url;
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
    let creative = [];
    if (data.creatives && data.creatives.length > 0) {
        let tempCreatives = data.creatives;
        tempCreatives.forEach(ele => {
            let temp = defaultCreative();
            if (ele.type == "1") {
                temp.creative_type = 'image';
            }
            else if (ele.type == "2") {
                temp.creative_type = 'video';
            }
            else if (ele.type == "3") {
                temp.creative_type = 'zip';
            }
            temp.landing_page_url = ele.url;
            temp.creative_file = ele.filename;
            creative.push(temp);
        });
    }
    return creative;
}

function getCategory(field, data) {
    let category = [];
    return category;
}

function getKpi(field, data) {
    let kpi = '';
    return kpi;
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

function getIsTargeting(field, data) {
    let targeting_enable = false;
    if ((data.platform.length) || (data.countries.length)) {
        targeting_enable = true;
    }
    return targeting_enable;
}

function getGeoTargeting(field, data) {
    let geo_targeting = defaultGeoTargeting();

    if (data.countries && data.countries.length) {
        let country = data.countries;
        country.map(element => {
            if (element.country) {
                geo_targeting.country_allow.push({
                    key: element.country.toUpperCase(),
                    value: element.country.toUpperCase()
                });
            }
            if (element.cities) {
                geo_targeting.city_allow.push({
                    key: element.cities,
                    value: element.cities
                });
            }
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
    if (data.platform && data.platform.length > 0) {
        let platforms = data.platform;
        let os = data.os.toLowerCase();

        if (os && (os == 'ios' || os == 'android')) {
            if (os && !device_targeting.os.includes(os)) {
                device_targeting.os.push(os);
            }
        }

        platforms.forEach(element => {
            if (element.platform_type == 1 || element.platform_type == 2) {
                if (!device_targeting.device.includes('mobile'))
                    device_targeting.device.push('mobile');
            }

            if (os && element.system_version) {
                let version_arr = element.system_version.split(',');
                if (element.is_above == 1) {
                    version_arr.forEach(obj_ver => {
                        device_targeting.os_version.push({ os: os, version: obj_ver, version_condition: 'gte' });
                    });
                }
                else if (element.is_above == 0) {
                    version_arr.forEach(obj_ver => {
                        device_targeting.os_version.push({ os: os, version: obj_ver, version_condition: 'lte' });
                    });
                }
            }
        });
    }
    return device_targeting;
}

function getIsGoalEnabled(field, data) {
    let goal_enable = false;
    if (data.payments && data.payments.length) {
        goal_enable = true
    }
    return goal_enable;
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
    let goal = [];
    if (data.payments && data.payments.length > 0) {
        let payments = data.payments;

        payments.forEach(element => {
            let temp = defaultGoal();
            temp.name = element.event_name;
            temp.status = element.is_payable.toString();
            temp.payout = element.payout;
            temp.revenue = element.payout;
            goal.push(temp)
        });
    }
    return goal;
}

function getIsCapEnabled(field, data) {
    let cap_enable = false;
    if (data.cap != 0) {
        cap_enable = true;
    }
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
    if (data.cap != 0) {
        if (data.cap_type == 2) {
            cap.overall_conv = data.cap;
        }
        else if (data.cap_type == 3) {
            cap.daily_conv = data.cap;
        }
    }
    return cap;
}

const newseed = {
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
