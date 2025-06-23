const Promise = require('promise');
// const { InsertUpdateOffer, makeRequest, getOffersFields, addUpdateExtraFields, addExtraFields, ImportantFields, defaultLog, mergeOfferLog, lockOfferApiStats } = require('../plugin');
const plugin = require('../plugin');
const debug = require("debug")("darwin:Plugin:Hasoffer");
const ENV_OFFERS_LIMIT = process.env.ENV_OFFERS_LIMIT;
const moment = require('moment');
const limit = 1000;
const { PlatformModel } = require('../../db/platform/Platform')

const { ActiveApi, InactiveApi } = require('../../helpers/Functions');
const Redis = require('../../helpers/Redis');
const EXTRA_FIELD_EXP = 21600;
const containFields = ['Goal'];

exports.countApiPages = (result) => {
    let page = 0;

    try {
        if (result.response && result.response['status'] == 1 && result.response['httpStatus'] == 200 && result.response.data && result.response.data.pageCount) {
            page = result.response.data.pageCount;
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

checkforContainFieldsFromLive = async (apiBaseurl, advertiser_platform_id) => {
    return new Promise(async (resolve, reject) => {
        validFields = '';
        let result = '';
        let field = '';
        let i = 0;
        for (i = 0; i < containFields.length; i++) {
            try {
                field = containFields[i];
                result = await plugin.makeRequest({
                    method: 'get',
                    url: apiBaseurl + '&limit=1&contain[]=' + field,

                });
                if (result) {
                    valid = this.checkValid(result.data)
                    if (valid === true) {
                        validFields = validFields + '&contain[]=' + field;
                    }
                    else {
                        // console.log('invalid', field);
                    }
                }
            }
            catch (err) {
                // console.log(err);
            }
        }
        Redis.setRedisHashData('hasOffer:ExtraContainFields', advertiser_platform_id, validFields, EXTRA_FIELD_EXP);
        return resolve(validFields);
    })

}

checkforContainFields = async (apiBaseurl, advertiser_platform_id) => {
    try {
        let extrafields = await Redis.getRedisHashData('hasOffer:ExtraContainFields', advertiser_platform_id);
        if (extrafields.data) {
            return extrafields.data;
        }
        else {
            let extrafield = await checkforContainFieldsFromLive(apiBaseurl, advertiser_platform_id);
            return extrafield;
        }
    }
    catch (err) {
        let extrafield = await checkforContainFieldsFromLive(apiBaseurl, advertiser_platform_id);
        return extrafield;
    }

}

exports.apiCall = async (credentials, page, apilimit, extrafield = '') => {
    if (credentials.network_id && credentials.api_key) {
        let network_id = credentials['network_id'];
        let api_key = credentials['api_key'];
        let apiBaseurl = "https://api.hasoffers.com/Apiv3/json?NetworkId=" + network_id + "&Target=Affiliate_Offer&Method=findAll&api_key=" + api_key + "&limit=" + apilimit + "&contain[]=TrackingLink&contain[]=GeoTargeting&contain[]=Thumbnail&contain[]=OfferOperatingSystem&contain[]=OfferCategory&contain[]=Country&page=";
        // debug(apiBaseurl)
        return await plugin.makeRequest({
            method: 'get',
            url: apiBaseurl + page + extrafield,

        });
    }
    else {
        return null;
    }
}
exports.offersApiCall = async (content) => {
    let network_id = content.credentials['network_id'];
    let api_key = content.credentials['api_key'];
    let apiBaseurl = "https://api.hasoffers.com/Apiv3/json?NetworkId=" + network_id + "&Target=Affiliate_Offer&Method=findMyApprovedOffers&api_key=" + api_key + "&limit=" + limit + "&page=";
    let page = 1;
    let totalPages = 1;
    let valid = false;
    let offerLog = plugin.defaultLog();
    let start_time = moment();
    let extrafield = await checkforContainFields(apiBaseurl, content.advertiser_platform_id);
    if (extrafield || extrafield == '') {
        return new Promise(async (resolve, reject) => {
            try {
                let result;
                do {
                    result = await this.apiCall(content.credentials, page, limit, extrafield);
                    if (result) {
                        valid = this.checkValid(result.data)
                        if (valid === true) {
                            let data = this.fetchResponse(result.data);
                            content['domain'] = "api.hasoffers.com";
                            let offer = this.traverseOffer(data, content);
                            let tempLog = await plugin.InsertUpdateOffer(plugin.ImportantFields, offer, content);
                            totalPages = this.countApiPages(result.data);
                            page++;
                            offerLog = plugin.mergeOfferLog(offerLog, tempLog);
                            await ActiveApi(content);
                        } else {
                            await InactiveApi(content);
                            await plugin.lockOfferApiStats(offerLog, content, start_time, remarks = `Fail, Api Response Status Code : ${result.status}, checkValid = false, Page = ${page}`);
                            return resolve(false);
                        }
                    } else {
                        await InactiveApi(content);
                        await plugin.lockOfferApiStats(offerLog, content, start_time, remarks = `Fail, Not Get Api Response, Reponse = null, Page = ${page}`);
                        return resolve(false);
                    }
                } while (page <= totalPages);
                await this.hasofferOffersApiCall(content, extrafield, offerLog, start_time);
                return resolve(true);
            }
            catch (err) {
                debug(err);
                await InactiveApi(content);
                await plugin.lockOfferApiStats(offerLog, content, start_time, remarks = `Fail, Api Response Error Msg : ${err}, Catch block, Page = ${page}`);
                return resolve(false);
            }
        });

    }


}

exports.hasofferOffersApiCall = async (content, extrafield, offerLog, start_time) => {
    // debug('hasoffer');
    let network_id = content.credentials['network_id'];
    let api_key = content.credentials['api_key'];
    let apiBaseurl = "https://api.hasoffers.com/Apiv3/json?NetworkId=" + network_id + "&Target=Affiliate_Offer&Method=findAll&api_key=" + api_key + "&limit=" + limit + "&contain[]=TrackingLink&contain[]=GeoTargeting&contain[]=Thumbnail&contain[]=OfferOperatingSystem&contain[]=OfferCategory&contain[]=Country&page=";
    let page = 1;
    let totalPages = 1;
    let valid = false;
    if (extrafield || extrafield == '') {
        return new Promise(async (resolve, reject) => {
            try {
                let result;
                do {
                    result = await plugin.makeRequest({
                        method: 'get',
                        url: apiBaseurl + page + extrafield,

                    });
                    if (result) {
                        valid = this.checkValid(result.data)
                        if (valid === true) {
                            let data = this.fetchResponse(result.data);
                            content['domain'] = "api.hasoffers.com";
                            let offer = this.traverseOffer(data, content);
                            let tempLog = await plugin.InsertUpdateOffer(plugin.ImportantFields, offer, content);
                            totalPages = this.countApiPages(result.data);
                            page++;
                            offerLog = plugin.mergeOfferLog(offerLog, tempLog);
                        } else {
                            await InactiveApi(content);
                            await plugin.lockOfferApiStats(offerLog, content, start_time, remarks = `Fail, Api Response Status Code : ${result.status}, checkValid = false, Page = ${page}`);
                            return resolve(false);
                        }
                    } else {
                        await InactiveApi(content);
                        await plugin.lockOfferApiStats(offerLog, content, start_time, remarks = `Fail, Not Get Api Response, Reponse = null, Page = ${page}`);
                        return resolve(false);
                    }
                } while (page <= totalPages);
                await plugin.lockOfferApiStats(offerLog, content, start_time, remarks = `Success, Api Response Status Code : ${result.status}, Page = ${page}`);
                return resolve(true);
            }
            catch (err) {
                debug(err);
                await InactiveApi(content);
                await plugin.lockOfferApiStats(offerLog, content, start_time, remarks = `Fail, Api Response Error Msg : ${err}, Catch block, Page = ${page}`);
                return resolve(false);
            }
        });

    }
    return resolve(false);

}

exports.checkValid = (result) => {

    if (result.response && result.response['status'] == 1 && result.response['httpStatus'] == 200) {
        //valid credentials hasoffer
        return true;
    }
    else {
        return false;
    }
}

exports.fetchResponse = (result) => {
    return result.response.data.data;
}


exports.traverseOffer = (result, content) => {

    let offers = {};
    Object.keys(result).map(function (data) {
        try {
            if (data) {
                let temp = formateOffers(result[data]);
                if (temp.advertiser_offer_id) {
                    temp = plugin.addExtraFields(temp, content);
                    offers[temp.advertiser_offer_id] = temp;
                    if ((temp.status_label == 'active' && temp.tracking_link == '') || (temp.approval_required == false && temp.tracking_link == '')) {
                        // console.log(result[data]);
                    }
                }
            }
        }
        catch (err) {
            debug(err);

        }
    });
    return offers;
}

//api wise methods
function getCategory(field, data) {
    let category = [];
    if (data.OfferCategory && typeof data.OfferCategory == "object") {
        Object.keys(data.OfferCategory).map((obj) => {
            category.push(data.OfferCategory[obj].name);
        })
    }
    return category;
}

function getOfferId(field, data) {
    let offer_id = '';
    if (data.Offer && data.Offer['id']) {
        offer_id = data.Offer['id'];
    }
    return offer_id;
}

function getOfferName(field, data) {
    let offer_name = '';
    if (data.Offer && data.Offer['name'])
        offer_name = data.Offer['name'];
    return offer_name;
}

function getIsGoalEnabled(field, data) {
    let goal_enable = false;
    if (data.Offer && data.Offer['has_goals_enabled'])
        goal_enable = true;
    return goal_enable;
}

function getGoals(field, data) {
    let goal = [];
    let tempGoals;
    if (data.Offer && data.Offer['has_goals_enabled']) {
        if (data.Goal && typeof data.Goal == "object") {
            tempGoals = defaultGoal();
            Object.keys(data.Goal).map(obj => {
                gdata = data.Goal[obj];
                if (gdata['name']) {
                    tempGoals.name = gdata['name'];
                }
                if (gdata['description']) {
                    tempGoals.description = gdata['description'];
                }
                if (gdata['payout_type']) {
                    tempGoals.payout_type = gdata['payout_type'];
                }
                if (gdata['default_payout']) {
                    tempGoals.payout = gdata['default_payout'];
                }
            })
            goal.push(tempGoals);
        }
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
    if (data.Offer && data.Offer['currency'])
        currency = data.Offer['currency'].toUpperCase();
    return currency;
}

function getThumbnail(field, data) {
    let thumbnail = '';
    if (data.Thumbnail && typeof data.Thumbnail == "object" && data.Thumbnail['thumbnail'])
        thumbnail = data.Thumbnail['thumbnail'];
    return thumbnail;
}

function getDescription(field, data) {
    let description = '';
    if (data.Offer && data.Offer['description'])
        description = data.Offer['description'];
    return description;
}

function getKpi(field, data) {
    let kpi = '';
    if (data.Offer && data.Offer['kpi'])
        kpi = data.Offer['kpi'];
    return kpi;
}

function getPreviewUrl(field, data) {
    let preview_url = '';
    if (data.Offer && data.Offer['preview_url'])
        preview_url = data.Offer['preview_url'];
    return preview_url;
}

function getTrackingLink(field, data) {
    let tracking_link = '';
    if (data.TrackingLink && data.TrackingLink['click_url'])
        tracking_link = data.TrackingLink['click_url'];
    return tracking_link;
}

function getExpiredUrl(field, data) {
    let expired_url = '';
    if (data.Offer && data.Offer['expired_url'])
        expired_url = data.Offer['expired_url'];
    return expired_url;
}

function getStartDate(field, data) {
    let start_date = moment();
    return start_date;
}

function getEndDate(field, data) {
    let end_date = moment().add(1, 'Y');
    try {
        if (data.Offer && data.Offer['expiration_date'])
            end_date = moment(data.Offer['expiration_date']);
    }
    catch {
        end_date = moment().add(1, 'Y');
    }

    return end_date;
}

function getRevenue(field, data) {
    let revenue = 0.0;
    if (data.Offer && data.Offer['default_payout'])
        revenue = data.Offer['default_payout'];
    return revenue;
}

function getRevenueType(field, data) {
    let revenue_type = { enum_type: '', offer_type: '' };
    if (data.Offer && data.Offer['payout_type'])
        revenue_type.offer_type = data.Offer['payout_type'];
    return revenue_type;
}

function getPayout(field, data) {
    let payout = 0.0;
    if (data.Offer && data.Offer['default_payout'])
        payout = data.Offer['default_payout'];
    return payout;
}

function getPayoutType(field, data) {
    let payout_type = { enum_type: '', offer_type: '' };
    if (data.Offer && data.Offer['payout_type'])
        payout_type.offer_type = data.Offer['payout_type'];
    return payout_type;
}

function getApprovalRequired(field, data) {
    let approval_required = false;
    if (data.Offer && data.Offer['approval_required'])
        approval_required = data.Offer['approval_required'];
    return approval_required;
}

function getIsCapEnabled(field, data) {
    let cap_enable = false;
    if (data.Offer && data.Offer['cap_enable'])
        cap_enable = data.Offer['cap_enable'];
    return cap_enable;
}

function getOfferCapping(field, data) {
    let cap = defaultCap();
    if (data.Offer) {
        if (data.Offer['conversion_cap']) {
            cap.daily_conv = +data.Offer['conversion_cap'];
        }
        if (data.Offer['monthly_conversion_cap']) {
            cap.monthly_conv = +data.Offer['monthly_conversion_cap'];
        }
        if (data.Offer['payout_cap']) {
            cap.payout_daily = +data.Offer['payout_cap'];
        }
        if (data.Offer['monthly_payout_cap']) {
            cap.monthly_payout = +data.Offer['monthly_payout_cap'];
        }
        if (data.Offer['revenue_cap']) {
            cap.daily_revenue = +data.Offer['revenue_cap'];
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
    if (data.Offer && data.Offer['use_target_rules'] && (data.Offer['use_target_rules'] != '0' || data.GeoTargeting.Countries)) {
        targeting_enable = true;
    }
    return targeting_enable;
}

function getGeoTargeting(field, data) {
    let geo_targeting = defaultGeoTargeting();
    if (data.GeoTargeting && typeof data.GeoTargeting == "object") {
        if (data.GeoTargeting['Countries'] && typeof data.GeoTargeting['Countries'] == "object") {
            country_data = data.GeoTargeting['Countries'];
            Object.keys(country_data).map(obj => {
                geo_targeting.country_allow.push({ key: country_data[obj].code, value: country_data[obj].name });

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
    if (data.OfferOperatingSystem && typeof data.OfferOperatingSystem == "object") {
        let obj_keys = Object.keys(data.OfferOperatingSystem);
        obj_keys.map(key => {
            if (data.OfferOperatingSystem[key].attribute && data.OfferOperatingSystem[key].attribute == "Operating System") {
                if (data.OfferOperatingSystem[key].name == "Android" && !device_targeting.os.includes('android')) {
                    device_targeting.os.push('android');
                    if (!device_targeting.device.includes('mobile')) {
                        device_targeting.device.push('mobile');
                    }
                }
                else if (data.OfferOperatingSystem[key].name == "iOS" && !device_targeting.os.includes('ios')) {
                    device_targeting.os.push('ios');
                    if (!device_targeting.device.includes('mobile')) {
                        device_targeting.device.push('mobile');
                    }
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
    let tempcreative = [];
    if (data.Thumbnail && typeof data.Thumbnail == "object") {
        let creative = defaultCreative();
        if (data.Thumbnail['id']) {
            creative.creative_id = data.Thumbnail['id'];
        }
        if (data.Thumbnail['filename']) {
            creative.creative_file = data.Thumbnail['filename'];
        }
        if (data.Thumbnail['status']) {
            creative.status = data.Thumbnail['status'];
        }
        if (data.Thumbnail['width']) {
            creative.width = data.Thumbnail['width'];
        }
        if (data.Thumbnail['height']) {
            creative.height = data.Thumbnail['height'];
        }
        if (data.Thumbnail['url']) {
            creative.tracking_link = data.Thumbnail['url'];
        }
        if (data.Thumbnail['type']) {
            creative.creative_type = data.Thumbnail['type'];
        }
        tempcreative.push(creative);
    }
    return tempcreative;
}

function getOfferVisible(field, data) {
    let offer_visible = 'public';

    return offer_visible;
}

function getStatusLabel(field, data) {
    let status_label = 'unmanaged';
    if (data.Offer['approval_status'] && data.Offer['approval_status'] == "approved") {
        status_label = "active";
    }
    if (data.Offer['require_approval'] && data.Offer['require_approval'] == 1) {
        status_label = "no_link";
    }
    if (data.TrackingLink) {
        if (data.TrackingLink['click_url']) {
            status_label = "active";
        }
        else {
            status_label = "no_link";
        }
    }
    return status_label;
}

const hasoffer = {
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
    array = plugin.getOffersFields('', '');
    array.map(function (obj) {
        try {
            let field = obj.field;
            let action = obj.action;
            let data = hasoffer[action](field, offer);
            formatedOffer[field] = data;
        }
        catch (err) {
            debug(err);

        }
    })
    return formatedOffer;
}


exports.getSingleOfferInfo = async (content, advertiser_offer_id) => {
    try {
        if (content.credentials.api_key && content.credentials.network_id && advertiser_offer_id) {

            let network_id = content.credentials['network_id'];
            let api_key = content.credentials['api_key'];
            let apiBaseurl = "https://api.hasoffers.com/Apiv3/json?NetworkId=" + network_id + "&Target=Affiliate_Offer&Method=findById&api_key=" + api_key + "&id=" + advertiser_offer_id + "&contain[]=TrackingLink&contain[]=GeoTargeting&contain[]=Thumbnail&contain[]=OfferOperatingSystem&contain[]=OfferCategory&contain[]=Country"
            // debug(apiBaseurl)
            let result = await plugin.makeRequest({
                method: 'get',
                url: apiBaseurl,

            });

            if (result) {
                valid = this.checkValid(result.data);
                if (valid === true) {
                    // let data = this.fetchResponseSingleOffer(result.data);
                    content['domain'] = "api.hasoffers.com";
                    if (!content['payout_percent']) {
                        let platformData = await PlatformModel.getOnePlatform({ _id: content['advertiser_platform_id'] }, { payout_percent: 1 });
                        if (platformData && platformData['payout_percent'] && +platformData['payout_percent']) {
                            content['payout_percent'] = +platformData['payout_percent'];
                        }
                    }
                    let offer = this.traverseOffer({ 'data': result.data.response.data }, content);
                    let final_offer = null;
                    if (offer && offer[advertiser_offer_id]) {
                        final_offer = plugin.addUpdateExtraFields(offer[advertiser_offer_id], plugin.ImportantFields);
                    }
                    return final_offer;
                } else {
                    return null;
                }
            } else {
                return null;
            }


        } else {
            return null
        }
    } catch (error) {
        debug(error);
    }
}

exports.singleOfferUpdate = (content, advertiser_offer_id) => {

    return new Promise(async (resolve, reject) => {
        try {
            if (content.credentials.api_key && content.credentials.network_id && advertiser_offer_id) {
                let apiBaseurl = `https://api.hasoffers.com/Apiv3/json?NetworkId=${content.credentials.network_id}&Target=Affiliate_Offer&Method=findById&api_key=${content.credentials.api_key}&id=${advertiser_offer_id}&contain[]=TrackingLink&contain[]=GeoTargeting&contain[]=Thumbnail&contain[]=OfferOperatingSystem&contain[]=OfferCategory&contain[]=Country`;
                let result = await plugin.makeRequest({
                    method: 'get',
                    url: apiBaseurl,
                });
                if (result) {
                    valid = this.checkValid(result.data);
                    if (valid === true) {
                        let data = result.data.response.data;
                        content['domain'] = 'api.hasoffers.com';
                        let platformData = await PlatformModel.getOnePlatform({ _id: content['advertiser_platform_id'] }, { payout_percent: 1 });
                        if (platformData && platformData['payout_percent'] && +platformData['payout_percent']) {
                            content['offer_live_type'] = platformData['offer_live_type'];
                            content['visibility_status'] = platformData['offer_visibility_status'];
                            // content['publishers'] = platformData['publishers'];
                            content['payout_percent'] = +platformData['payout_percent'];
                            content['appidCountData'] = {};
                            let offer = this.traverseOffer(data, content);
                            let tempLog = await plugin.InsertUpdateOffer(plugin.ImportantFields, offer, content);
                            // if (tempLog.updated_offers || tempLog.approved_offers) {
                            //     return resolve(true);
                            // }
                            return resolve(true);
                        }
                    }
                }
            }
            return resolve(false);
        } catch (error) {
            console.log("error", error);
            return resolve(false);
        }
    });
}