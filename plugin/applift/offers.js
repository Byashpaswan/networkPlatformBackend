const { InsertUpdateOffer, makeRequest, getOffersFields, addExtraFields, ImportantFields, defaultLog, mergeOfferLog, lockOfferApiStats } = require('../plugin');
const { ActiveApi, InactiveApi } = require('../../helpers/Functions');

const debug = require("debug")("darwin:Plugin:Applift");
const ENV_OFFERS_LIMIT = process.env.ENV_OFFERS_LIMIT;
const moment = require('moment');
const limit = 500;
exports.countApiPages = (response) => {
    let nextpage = false;
    try {
        if (response.results && response.results.length) {
            nextpage = true;
        }
        return nextpage;
    }
    catch (err) {
        return false;
    }
}


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
exports.apiCall = async (credentials, page, apilimit) => {
    if (credentials.api_key) {
        let api_key = credentials['api_key'];
        let apiBaseurl = "https://bapi.applift.com/bapi_v2?token=" + api_key + "&format=json&v=4&gu=TRUE&per=" + apilimit + "&page=";
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
                        content['domain'] = "bapi.applift.com";
                        let offer = this.traverseOffer(data, content);
                        let tempLog = await InsertUpdateOffer(ImportantFields, offer, content);
                        nextpage = this.countApiPages(result.data);
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
            } while (nextpage);
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
    if (result.results && result.error === undefined) {
        // valid credentials hasoffer  
        // console.log(result.count);
        return true;
    }
    else {
        return false;
    }
}

exports.fetchResponse = (result) => {
    return result.results;
}
exports.traverseOffer = (result, content) => {

    let offers = {};
    result.map((data) => {
        try {
            let app_details = {};
            if (data) {
                app_details = data.app_details;
                if (app_details) {
                    data.offers.map((offer_data) => {
                        let temp = formateOffers(app_details, offer_data);
                        if (temp.advertiser_offer_id && temp.advertiser_offer_id !== '') {
                            temp = addExtraFields(temp, content);
                            offers[temp.advertiser_offer_id] = temp;
                        }
                    })
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
function getCategory(app_details, data) {
    let category = [];
    if (app_details.category) {
        let cat = app_details.category.split(',');
        cat.map((obj) => {
            if (obj) {
                category.push(obj);
            }
        })
    }
    return category;
}

function getOfferId(app_details, data) {
    let offer_id = '';
    if (data.offer_id) {
        offer_id = data.offer_id;
    }
    return offer_id;
}

function getOfferName(app_details, data) {
    let offer_name = '';
    if (data.offer_name)
        offer_name = data.offer_name;
    return offer_name;
}

function getIsGoalEnabled(app_details, data) {
    let goal_enable = false;
    if (data.goal_payouts && data.goal_payouts.length != 0)
        goal_enable = true;
    return goal_enable;
}

function getGoals(app_details, data) {
    let goal = [];
    let tempGoals;
    if (data.goal_payouts && data.goal_payouts.length != 0) {
        tempGoals = defaultGoal();
        data.goal_payouts.map(obj => {
            if (obj.goal_name) {
                tempGoals.name = obj.goal_name;
            }
            if (obj.payout) {
                tempGoals.payout = obj.payout;
                tempGoals.revenue = obj.payout;
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

function getRedirectionMethod(app_details, data) {
    let method = 'javascript_redirect';
    return method;
}

function getCurrency(app_details, data) {
    let currency = 'USD';
    // if (data.Offer['currency'] !== undefined && data.Offer['currency'] !== null)
    //     currency = data.Offer['currency'].toUpperCase();
    return currency;
}

function getThumbnail(app_details, data) {
    let thumbnail = '';
    if (data.creatives && data.creatives.length) {
        data.creatives.map(obj => {
            if (obj.creative_type == 'icon' && obj.url) {
                thumbnail = obj.url;
            }
        })
    }
    return thumbnail;
}

function getDescription(app_details, data) {
    let description = '';

    return description;
}

function getKpi(app_details, data) {
    let kpi = '';
    if (data.billing_kpis && data.billing_kpis.length) {
        kpi = data.billing_kpis.join(', ');
    }
    return kpi;
}

function getPreviewUrl(app_details, data) {
    let preview_url = '';
    if (app_details.preview_url)
        preview_url = app_details.preview_url;
    return preview_url;
}

function getTrackingLink(app_details, data) {
    let tracking_link = '';
    if (data.click_url)
        tracking_link = data.click_url;
    return tracking_link;
}

function getExpiredUrl(app_details, data) {
    let expired_url = '';
    // if (data.Offer['expired_url'] !== undefined)
    //     expired_url = data.Offer['expired_url'];
    return expired_url;
}

function getStartDate(app_details, data) {
    let start_date = moment();
    return start_date;
}

function getEndDate(app_details, data) {
    let end_date = moment().add(1, 'Y');

    // if (data.Offer['expiration_date'] !== undefined)
    //     end_date = moment(data.Offer['expiration_date']);
    return end_date;
}

function getRevenue(app_details, data) {
    let revenue = 0.0;
    if (data.goal_payouts && data.goal_payouts.length && data.goal_payouts[0].payout)
        revenue = data.goal_payouts[0].payout / 1000;
    return revenue;
}

function getRevenueType(app_details, data) {
    let revenue_type = { enum_type: 'unknown', offer_type: '' };
    if (data.goal_type)
        revenue_type.offer_type = data.goal_type;
    return revenue_type;
}

function getPayout(app_details, data) {
    let payout = 0.0;
    if (data.goal_payouts && data.goal_payouts.length && data.goal_payouts[0].payout)
        payout = data.goal_payouts[0].payout / 1000;
    return payout;
}

function getPayoutType(app_details, data) {
    let payout_type = { enum_type: 'unknown', offer_type: '' };
    if (data.goal_type)
        payout_type.offer_type = data.goal_type;
    return payout_type;
}

function getApprovalRequired(app_details, data) {
    let approval_required = false;
    if (!data.click_url)
        approval_required = true;
    return approval_required;
}

function getIsCapEnabled(app_details, data) {
    let cap_enable = false;

    return cap_enable;
}

function getOfferCapping(app_details, data) {
    let cap = defaultCap();

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

function getIsTargeting(app_details, data) {
    let targeting_enable = false;
    if (data.geo_targeting && data.geo_targeting.length) {
        targeting_enable = true;
    }
    return targeting_enable;
}

function getGeoTargeting(app_details, data) {
    let geo_targeting = defaultGeoTargeting();
    if (data.geo_targeting && data.geo_targeting.length) {
        data.geo_targeting.map(obj => {
            geo_targeting.country_allow.push({ key: obj.country_code, value: obj.country_code });
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

function getDeviceTargeting(app_details, data) {
    let device_targeting = defaultDeviceTargeting();
    if (data.devices && data.devices.length) {
        if ((data.devices.includes('iPad') || data.devices.includes('iPhone')) && !device_targeting.os.includes('ios')) {
            device_targeting.os.push('ios');
        }
        else if (data.devices.includes('Android') && !device_targeting.os.includes('android')) {
            device_targeting.os.push('android');
        }
    }
    if (device_targeting.os.length == 0 && app_details.platform) {
        device_targeting.os.push(app_details.platform);
    }
    device_targeting.device.push('mobile');
    if (data.preferences && data.preferences.length && app_details.platform) {
        data.preferences.map(obj => {
            if (obj.preference_type == 'min_os_version' && obj.value) {
                device_targeting.os_version.push({ os: app_details.platform, version: obj.value, version_condition: 'gte' });
            }
            else if (obj.preference_type == 'max_os_version' && obj.value) {
                device_targeting.os_version.push({ os: app_details.platform, version: obj.value, version_condition: 'lte' });
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

function getCreative(app_details, data) {
    let creative = [];
    try {
        if (data.creatives && data.creatives.length) {
            data.creatives.map(obj => {
                let crt_status = false;
                let tempcreative = defaultCreative();
                if (obj.creative_id) {
                    crt_status = true;
                    tempcreative.creative_id = obj.creative_id;
                }
                if (obj.creative_type) {
                    crt_status = true;
                    tempcreative.creative_type = obj.creative_type;
                }
                if (obj.click_url) {
                    crt_status = true;
                    tempcreative.tracking_link = obj.click_url;
                }
                if (obj.creative_name) {
                    crt_status = true;
                    tempcreative.name = obj.creative_name;
                }
                if (obj.creative_dimesions && obj.creative_dimesions.includes('x')) {
                    crt_status = true;
                    let dim = obj.creative_dimesions.split('x');
                    tempcreative.height = dim[0];
                    tempcreative.width = dim[1];
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

function getOfferVisible(app_details, data) {
    let offer_visible = 'public';
    return offer_visible;
}

function getStatusLabel(app_details, data) {
    let status_label = 'unmanaged';
    if (data.click_url && data.click_url !== '') {
        status_label = "active";
    }
    else {
        status_label = "no_link";
    }
    return status_label;
}

const applift = {
    getOfferId: (app_details, data) => {
        return getOfferId(app_details, data);
    },
    getOfferName: (app_details, data) => {
        return getOfferName(app_details, data);
    },
    getCategory: (app_details, data) => {
        return getCategory(app_details, data);
    },
    getIsGoalEnabled: (app_details, data) => {
        return getIsGoalEnabled(app_details, data);
    },
    getGoals: (app_details, data) => {
        return getGoals(app_details, data);
    },
    getCurrency: (app_details, data) => {
        return getCurrency(app_details, data);
    },
    getThumbnail: (app_details, data) => {
        return getThumbnail(app_details, data);
    },
    getDescription: (app_details, data) => {
        return getDescription(app_details, data);
    },
    getKpi: (app_details, data) => {
        return getKpi(app_details, data);
    },
    getPreviewUrl: (app_details, data) => {
        return getPreviewUrl(app_details, data);
    },
    getTrackingLink: (app_details, data) => {
        return getTrackingLink(app_details, data);
    },
    getExpiredUrl: (app_details, data) => {
        return getExpiredUrl(app_details, data);
    },
    getStartDate: (app_details, data) => {
        return getStartDate(app_details, data);
    },
    getEndDate: (app_details, data) => {
        return getEndDate(app_details, data);
    },
    getRevenue: (app_details, data) => {
        return getRevenue(app_details, data);
    },
    getRevenueType: (app_details, data) => {
        return getRevenueType(app_details, data);
    },
    getPayout: (app_details, data) => {
        return getPayout(app_details, data);
    },
    getPayoutType: (app_details, data) => {
        return getPayoutType(app_details, data);
    },
    getApprovalRequired: (app_details, data) => {
        return getApprovalRequired(app_details, data);
    },
    getIsCapEnabled: (app_details, data) => {
        return getIsCapEnabled(app_details, data);
    },
    getOfferCapping: (app_details, data) => {
        return getOfferCapping(app_details, data);
    },
    getIsTargeting: (app_details, data) => {
        return getIsTargeting(app_details, data);
    },
    getGeoTargeting: (app_details, data) => {
        return getGeoTargeting(app_details, data);
    },
    getDeviceTargeting: (app_details, data) => {
        return getDeviceTargeting(app_details, data);
    },
    getCreative: (app_details, data) => {
        return getCreative(app_details, data);
    },
    getOfferVisible: (app_details, data) => {
        return getOfferVisible(app_details, data);
    },
    getStatusLabel: (app_details, data) => {
        return getStatusLabel(app_details, data);
    },
    getRedirectionMethod: (app_details, data) => {
        return getRedirectionMethod(app_details, data);
    }
}

function formateOffers(app_data, offer) {
    let formatedOffer = {};
    array = getOffersFields('', '');
    array.map(function (obj) {
        try {
            let field = obj.field;
            let action = obj.action;
            let data = applift[action](app_data, offer);
            formatedOffer[field] = data;
        }
        catch (err) {
            debug(err);

        }
    })
    return formatedOffer;
}
