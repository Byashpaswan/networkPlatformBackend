const { InsertUpdateOffer, makeRequest, getOffersFields, addExtraFields, ImportantFields, defaultLog, mergeOfferLog, lockOfferApiStats } = require('../plugin');

const { ActiveApi, InactiveApi } = require('../../helpers/Functions');
const debug = require("debug")("darwin:Plugin:Taptica");
const ENV_OFFERS_LIMIT = process.env.ENV_OFFERS_LIMIT;
const moment = require('moment');
const { toLower, compact, min } = require('lodash');
const limit = 500;

exports.countApiPages = (result) => {
    let page = 0;
    try {
        if (result.last_page) {
            page = result.data.last_page
        }

        return page;
    }
    catch (err) {
        return 0;
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

exports.apiCall = async (credentials, page, limit) => {
    if (credentials.api_key) {
        let token = credentials.api_key;
        let allOffer = {};
        let platforms = ["android", "iPhone"];
        for (let index = 0; index < platforms.length; index++) {
            let apiBaseurl = "https://api.taptica.com/v2/bulk?token=" + token + "&platforms=" + platforms[index];
            let result = await makeRequest({
                method: 'get',
                url: apiBaseurl
            });
            if (result.data && result.data.Error === "OK" && result.data.Data) {
                if (allOffer.data) {
                    allOffer.data.Data = allOffer.data.Data.concat(result.data.Data)
                }
                else {
                    allOffer = result;
                }
            }
        }
        return allOffer;
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
    let totalPages = 0;
    return new Promise(async (resolve, reject) => {
        try {
            let result = await this.apiCall(content.credentials, page, limit);
            if (result) {
                valid = this.checkValid(result.data);
                if (valid === true) {
                    let data = this.fetchResponse(result.data);
                    content['domain'] = "api.taptica.com";
                    let offer = this.traverseOffer(data, content);
                    let tempLog = await InsertUpdateOffer(ImportantFields, offer, content);
                    // totalPages = this.countApiPages(result.data);
                    // page++;
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
    if (result && result.Error == "OK" && result.Data) {
        return true;
    }
    else {
        return false;
    }
}

exports.fetchResponse = (result) => {
    return result.Data;
}

exports.traverseOffer = (data, content) => {
    let offers = {};
    try {
        if (data) {
            data.forEach(oneOfferData => {
                let temp = formateOffers(oneOfferData);
                if (temp.advertiser_offer_id && temp.advertiser_offer_id !== '') {
                    temp = addExtraFields(temp, content);
                    offers[temp.advertiser_offer_id] = temp;
                }
            });
        }
    }
    catch (err) {
        debug(err);
        // console.log('error', err); //skip this offer
    }
    // });
    return offers;
}

//api wise methods
function getCategory(field, data) {
    let category = [];
    if (data.Categories && data.Categories.length != 0) {
        category = data.Categories;
    }
    return category;
}

function getOfferId(field, data) {
    let offer_id = 0;
    if (data.OfferId) {
        offer_id = data.OfferId;
    }
    return offer_id;
}

function getOfferName(field, data) {
    let offer_name = '';
    if (data.Name)
        offer_name = data.Name;
    return offer_name;
}

function getIsGoalEnabled(field, data) {
    let goal_enable = false;
    if (data.payableAction) {
        goal_enable = true;
    }
    return goal_enable;
}

function getGoals(field, data) {
    let goal = defaultGoal();
    if (data.payableAction) {
        goal.name = data.payableAction;
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

function getCreative(field, data) {
    let creative = [];
    let tempCreative = defaultCreative();

    if (data.Creatives && data.Creatives.length != 0) {
        data.Creatives.forEach(creativeData => {
            let sizeArray = creativeData.CreativeSize.split('x');

            tempCreative.creative_id = creativeData.Id;
            tempCreative.name = creativeData.Name;
            tempCreative.creative_type = creativeData.CreativeType;
            tempCreative.width = Math.min(sizeArray[0], sizeArray[1]);
            tempCreative.height = Math.max(sizeArray[0], sizeArray[1]);
            tempCreative.tracking_link = creativeData.CreativeLink;

            creative.push(tempCreative)
        });
    }
    return creative;
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

function getCurrency(field, data) {
    let currency = 'USD';
    if (data.offer_currency)
        currency = data.offer_currency;
    return currency;
}

function getRedirectionMethod(field, data) {
    let method = 'javascript_redirect';
    return method;
}

function getThumbnail(field, data) {
    let thumbnail = '';
    if (data.AppIconUrl) {
        thumbnail = data.AppIconUrl
    }
    return thumbnail;
}

function getDescription(field, data) {
    let description = '';
    if (data.Description)
        description = data.Description;
    return description;
}

function getKpi(field, data) {
    let kpi = '';
    return kpi;
}

function getPreviewUrl(field, data) {
    let preview_url = '';
    if (data.PreviewLink)
        preview_url = data.PreviewLink;
    return preview_url;
}

function getTrackingLink(field, data) {
    let tracking_link = '';
    if (data.TrackingLink)
        tracking_link = data.TrackingLink;
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
    try {
        if (data.expire_date)
            end_date = moment(data.expire_date);
    } catch {
        end_date = moment().add(1, 'Y');
    }
    return end_date;
}

function getRevenue(field, data) {
    let revenue = 0.0;
    if (data.Payout) {
        revenue = data.Payout;
    }
    return revenue;
}

function getRevenueType(field, data) {
    let revenue_type = { enum_type: '', offer_type: '' };
    if (data.PayoutType)
        revenue_type.offer_type = data.PayoutType;
    return revenue_type;
}

function getPayout(field, data) {
    let payout = 0;
    if (data.Payout)
        payout = data.Payout;
    return payout;
}

function getPayoutType(field, data) {
    let payout_type = { enum_type: '', offer_type: '' };
    if (data.PayoutType)
        payout_type.offer_type = data.PayoutType;
    return payout_type;
}

function getApprovalRequired(field, data) {
    let approval_required = false;
    if (!data.TrackingLink)
        approval_required = true;
    return approval_required;
}

function getIsCapEnabled(field, data) {
    let cap_enable = false;
    if (data.DailyBudget && data.DailyBudget != "Unavailable") {
        cap_enable = true;
    }
    return cap_enable;
}

function getOfferCapping(field, data) {
    let cap = defaultCap();
    if (data.DailyBudget && data.DailyBudget != "Unavailable") {
        cap.payout_daily = parseInt(data.DailyBudget);
        cap.daily_revenue = parseInt(data.DailyBudget);
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
    if (data.SupportedCountries && data.SupportedCountries.length != 0) {
        targeting_enable = true;
    }
    return targeting_enable;
}

function getGeoTargeting(field, data) {
    let geo_targeting = defaultGeoTargeting();
    if (data.SupportedCountries && data.SupportedCountries.length != 0) {
        data.SupportedCountries.forEach(country => {
            geo_targeting.country_allow.push({ key: country, value: country });
        });
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
    if (data.Platforms && data.Platforms.length != 0) {
        data.Platforms.forEach(obj => {
            if ((obj == 'IPhone' || obj == 'IPad' || obj == 'IPod') && !device_targeting.os.includes('ios')) {
                device_targeting.os.push('ios');
                if (data.MinOsVersion) {
                    device_targeting.os_version.push({ os: 'ios', version: data.MinOsVersion, version_condition: 'gte' });
                }
            }
            else if ((obj == 'Android' || obj == 'AndroidTablet') && !device_targeting.os.includes('android')) {
                device_targeting.os.push('android');
                if (data.MinOsVersion) {
                    device_targeting.os_version.push({ os: 'android', version: data.MinOsVersion, version_condition: 'gte' });
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

function getOfferVisible(field, data) {
    let offer_visible = 'public';
    return offer_visible;
}

function getStatusLabel(field, data) {
    let status_label = 'unmanaged';
    if (data.TrackingLink) {
        status_label = "active";
    }
    // else if (data.offer_access == "request_pending") {
    //     status_label = "pending"
    // }
    // else if (data.offer_access == "request_rejected") {
    //     status_label = "rejected"
    // }
    else {
        status_label = "no_link";
    }
    return status_label;
}

const Offershub = {
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
            let data = Offershub[action](field, offer);
            formatedOffer[field] = data;
        }
        catch (err) {
            debug(err);
        }
    })
    // console.log(formatedOffer)
    return formatedOffer;
}
