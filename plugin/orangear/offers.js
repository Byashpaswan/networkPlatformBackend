// const { InsertUpdateOffer, makeRequest, addUpdateExtraFields, getOffersFields, addExtraFields, ImportantFields, defaultLog, mergeOfferLog, lockOfferApiStats } = require('../plugin');
const moment = require('moment');
const Promise = require('promise');
const debug = require("debug")("darwin:Plugin:Orangear");
const limit = 500;
const { PlatformModel } = require('../../db/platform/Platform')

const { ActiveApi, InactiveApi } = require('../../helpers/Functions');
const plugin = require('../plugin');
const ENV_OFFERS_LIMIT = process.env.ENV_OFFERS_LIMIT;
exports.countApiPages = (response) => {
    let page = 0;
    try {
        if (response.count_pages) {
            page = parseInt(response.count_pages);
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
exports.apiCall = async (credentials, page, apilimit) => {
    if (credentials.network_id && credentials.api_key) {
        let network_id = credentials['network_id'];
        let api_key = credentials['api_key'];
        let apiBaseurl = "http://" + network_id + "/v2/affiliate/offer/findAll/?token=" + api_key + "&approved=1&limit=" + apilimit + "&page=";
        // debug(apiBaseurl)
        return await plugin.makeRequest({
            method: 'get',
            url: apiBaseurl + page,

        });
    }
    else {
        return null;
    }
}

exports.fetchAllOffersApiCall = async (credentials, page, apilimit) => {
    if (credentials.network_id && credentials.api_key) {
        let network_id = credentials['network_id'];
        let api_key = credentials['api_key'];
        let apiBaseurl = "http://" + network_id + "/v2/affiliate/offer/findAll/?token=" + api_key + "&limit=" + apilimit + "&page=";
        // debug(apiBaseurl)
        return await plugin.makeRequest({
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
    let offerLog = plugin.defaultLog();
    let start_time = moment();
    let page = 1;
    let totalPages = 1;
    return new Promise(async (resolve, reject) => {
        try {
            let result;
            do {
                result = await this.fetchAllOffersApiCall(content.credentials, page, limit);
                if (result) {
                    valid = this.checkValid(result.data);
                    if (valid === true) {
                        let data = this.fetchResponse(result.data);
                        content['domain'] = content.credentials['network_id'];
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
            await plugin.lockOfferApiStats(offerLog, content, start_time, remarks = `Success, Api Response Status Code : ${result.status}, Page = ${page}`);
            // await this.orangearOffersApiCall(content, offerLog, start_time);
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
exports.orangearOffersApiCall = async (content, offerLog, start_time) => {
    // debug('I am called');
    let network_id = content.credentials['network_id'];
    let api_key = content.credentials['api_key'];
    let apiBaseurl = "http://" + network_id + "/v2/affiliate/offer/findAll/?token=" + api_key + "&approved=0&limit=" + limit + "&page=";
    let valid = false;
    let page = 1;
    let totalPages = 1;
    return new Promise(async (resolve, reject) => {
        try {
            let result;
            do {
                result = await plugin.makeRequest({
                    method: 'get',
                    url: apiBaseurl + page,

                });
                if (result) {
                    valid = this.checkValid(result.data);
                    if (valid === true) {
                        let data = this.fetchResponse(result.data);
                        content['domain'] = network_id;
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

exports.checkValid = (result) => {
    if (result.success && result.success == true && result.error_messages.length == 0) {
        //valid credentials orangear
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
    Object.keys(result).map((data) => {
        try {
            if (data) {
                let temp = formateOffers(result[data]);
                if (temp.advertiser_offer_id) {
                    temp = plugin.addExtraFields(temp, content);
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

//api wise methods
function getCategory(field, data) {
    let category = [];
    data.Restrictions.map(element => {
        if (element.allow == true) {
            category.push(element.name);
        }
    })
    return category;
}

function getOfferId(field, data) {
    let offer_id = '';
    if (data.ID) {
        offer_id = data.ID;
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
    if (data.Goals && data.Goals.length > 0) {
        goal_enable = true;
    }
    return goal_enable;
}

function getGoals(field, data) {
    let goal = [];
    let tempGoals;
    if (data.Goals && data.Goals.length != 0) {
        data.Goals.map(obj => {
            tempGoals = defaultGoal();

            if (obj.Goal) {
                tempGoals.goal_id = obj.Goal;
            }
            if (obj.Name) {
                tempGoals.name = obj.Name;
            }
            if (obj.Payout) {
                tempGoals.payout = obj.Payout;
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
    if (data.Currency)
        currency = data.Currency.toUpperCase();
    return currency;
}

function getRedirectionMethod(field, data) {
    let method = 'javascript_redirect';
    return method;
}

function getThumbnail(field, data) {
    let thumbnail = '';
    if (data.Icon_url)
        thumbnail = data.Icon_url;

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
    // if (data.kpi  && data.kpi['en']  && data.kpi['en'] !== null)
    //     kpi = data.kpi['en'];
    return kpi;
}

function getPreviewUrl(field, data) {
    let preview_url = '';
    if (data.Preview_url)
        preview_url = data.Preview_url;
    return preview_url;
}

function getTrackingLink(field, data) {
    let tracking_link = '';
    if (data.Tracking_url)
        tracking_link = data.Tracking_url;
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
        if (data.Expiration_date)
            end_date = moment(data.Expiration_date);
    }
    catch {
        end_date = moment().add(1, 'Y');
    }

    return end_date;
}

function getRevenue(field, data) {
    let revenue = 0.0;
    if (data.Goals && data.Goals[0])
        revenue = data.Goals[0].Payout;
    return revenue;
}

function getRevenueType(field, data) {
    let revenue_type = { enum_type: '', offer_type: '' };
    if (data.offer_type) {
        if (data.offer_type == "1")
            revenue_type.offer_type = 'cpi';
        else if (data.offer_type == "2")
            revenue_type.offer_type = 'cpa';
        else if (data.offer_type == "3")
            revenue_type.offer_type = 'dynamic';
        else
            revenue_type.offer_type = data.offer_type;
    }
    return revenue_type;
}

function getPayout(field, data) {
    let payout = 0;
    if (data.Goals && data.Goals[0])
        payout = data.Goals[0].Payout;
    return payout;
}

function getPayoutType(field, data) {
    let payout_type = { enum_type: '', offer_type: '' };
    if (data.offer_type) {
        if (data.offer_type == "1")
            payout_type.offer_type = 'cpi';
        else if (data.offer_type == "2")
            payout_type.offer_type = 'cpa';
        else if (data.offer_type == "3")
            payout_type.offer_type = 'dynamic';
        else
            payout_type.offer_type = data.offer_type;
    }
    return payout_type;
}

function getApprovalRequired(field, data) {
    let approval_required = false;
    if (data.Approved && !data.Tracking_url)
        approval_required = true;
    return approval_required;
}

function getIsCapEnabled(field, data) {
    let cap_enable = false;
    if (data.Goals && data.Goals.length > 0 && (data.Goals[0].Daily_cap || data.Goals[0].Monthly_cap)) {
        cap_enable = true;
    }
    return cap_enable;
}

function getOfferCapping(field, data) {
    let cap = defaultCap();
    if (data.Goals && data.Goals.length > 0) {
        if (data.Goals[0].Monthly_cap) {
            cap.monthly_conv = parseInt(data.Goals[0].Monthly_cap);
        }
        if (data.Goals[0].Daily_cap) {
            cap.daily_conv = parseInt(data.Goals[0].Daily_cap);
        }
    }

    // data.caps.map(obj => {
    //     if (obj.period  && obj.type ) {
    //         // if (obj.period == "day") {
    //         //     if (obj.type == "conversions")
    //         //     {
    //         //         cap.daily_conv = obj.value;
    //         //     }
    //         //     else if (obj.type == "budget") {
    //         //         cap.daily_revenue = obj.value;
    //         //     }
    //         // }
    //         // if (obj.period == "month") {
    //         //     if (obj.type == "conversions") {
    //         //         cap.monthly_conv = obj.value;
    //         //     }
    //         //     else if (obj.type == "budget") {
    //         //         cap.monthly_revenue = obj.value;
    //         //     }
    //         // }
    //         // if (obj.period == "all") {
    //         //     if (obj.type == "conversions") {
    //         //         cap.overall_conv = obj.value;
    //         //     }
    //         //     else if (obj.type == "budget") {
    //         //         cap.overall_revenue = obj.value;
    //         //     }
    //         // }
    //     }
    // })
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
    if (data.Goals && data.Goals.length > 0 && data.Goals[0].Countries) {
        targeting_enable = true;
    }
    return targeting_enable;
}

function getGeoTargeting(field, data) {
    let geo_targeting = defaultGeoTargeting();
    if (data.Goals && data.Goals !== [] && data.Goals !== null && data.Goals[0]) {
        if (data.Goals[0].Countries) {
            let country_data = data.Goals[0].Countries.split(',');
            country_data.map(obj => {
                geo_targeting.country_allow.push({ key: obj, value: obj });
            })

            if (data.Goals[0].Cities) {
                if (data.Goals[0].Cities != 'All' && data.Goals[0].Cities != '') {
                    let city = data.Goals[0].Cities.split(',');
                    city.map(obj => {
                        geo_targeting.city_allow.push({ key: obj, value: obj });
                    })
                }
            }
        }
        return geo_targeting;
    }
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
    device = []

    if (data.Goals && data.Goals.length) {
        let iosVer = ""
        if (data.Goals[0].Platforms && data.Goals[0].Platforms !== "") {
            device = data.Goals[0].Platforms.split(',')
            device.map(element => {
                let a = element.split(' ')
                iosVer = '';
                device_data = '';
                version = '';
                // let b=element.split(' ')[1]
                if (a[0])
                    device_data = a[0]
                if (a[1])
                    version = a[1]

                // for device
                if ((device_data == 'iPad' || device_data == 'iPhone') && !device_targeting.os.includes('ios')) {
                    iosVer = 'ios'
                    if (!device_targeting.device.includes('mobile')) {
                        device_targeting.device.push('mobile')
                    }
                    if (!device_targeting.os.includes('ios')) {
                        device_targeting.os.push('ios')
                    }
                }
                else if (device_data == 'Android' && !device_targeting.os.includes('android')) {
                    iosVer = 'android'
                    if (!device_targeting.device.includes('mobile')) {
                        device_targeting.device.push('mobile')
                    }
                    if (!device_targeting.os.includes('android')) {
                        device_targeting.os.push('android')
                    }
                }
                else if (device_data == 'Desktop') {
                    if (!device_targeting.device.includes('desktop')) {
                        device_targeting.device.push('desktop')
                    }
                }
                else if (device_data == 'All') {
                    device_targeting.device.push('all')
                }

                // for version

                if (version && version !== "" && iosVer != "") {
                    lastChar = version.charAt(version.length - 1)
                    if (lastChar == '+') {
                        device_targeting.os_version.push({ os: iosVer, version: version.replace(version.substring(version.length - 1), ""), version_condition: 'gte' })

                    }
                    else if (lastChar == '-') {
                        device_targeting.os_version.push({ os: iosVer, version: version.replace(version.substring(version.length - 1), ""), version_condition: 'lte' })

                    }
                    else if (lastChar == "") {
                        device_targeting.os_version.push({ os: iosVer, version: version, version_condition: 'eq' })
                    }
                }
            })
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
    let creative = [];
    // api call needed for creatives
    if (data.creatives && data.creative.length) {
        data.creatives.map(result => {
            tempcreative = defaultCreative();
            if (result.name) {
                tempcreative.name = result.name
            }
            if (result.url) {
                tempcreative.tracking_link = result.url
            }
            if (result.type) {
                tempcreative.creative_type = result.type
            }
            if (result.width) {
                tempcreative.width = +result.width

            }
            if (result.height) {
                tempcreative.height = +result.height
            }
            creative.push(tempcreative);
        })
    }
    return creative;
}

function getOfferVisible(field, data) {
    let offer_visible = 'public';
    return offer_visible;
}

function getStatusLabel(field, data) {
    let status_label = 'unmanaged';
    if (data.Tracking_url) {
        status_label = "active";
    }
    else {
        status_label = "no_link";
    }
    return status_label;
}

const orangear = {
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
            let data = orangear[action](field, offer);
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
        if (content.credentials.network_id && content.credentials.api_key) {
            let network_id = content.credentials['network_id'];
            let api_key = content.credentials['api_key'];

            let apiBaseurl = "http://" + network_id + "/v2/affiliate/offer/findAll/?token=" + api_key + "&approved=1&offer_id=" + advertiser_offer_id;

            let result = await plugin.makeRequest({
                method: 'get',
                url: apiBaseurl,

            });

            if (result) {
                valid = this.checkValid(result.data);
                if (valid === true) {
                    let data = this.fetchResponse(result.data);
                    content['domain'] = network_id;
                    if (!content['payout_percent']) {
                        let platformData = await PlatformModel.getOnePlatform({ _id: content['advertiser_platform_id'] }, { payout_percent: 1 });
                        if (platformData && platformData['payout_percent'] && +platformData['payout_percent']) {
                            content['payout_percent'] = +platformData['payout_percent'];
                        }
                    }
                    let offer = this.traverseOffer(data, content);
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
            if (content.credentials.network_id && content.credentials.api_key && advertiser_offer_id) {
                let apiBaseurl = `http://${content.credentials.network_id}/v2/affiliate/offer/findAll/?token=${content.credentials.api_key}&approved=1&offer_id=${advertiser_offer_id}`;
                let result = await plugin.makeRequest({
                    method: 'get',
                    url: apiBaseurl,
                });
                if (result) {
                    valid = this.checkValid(result.data);
                    if (valid === true) {
                        let data = await this.fetchResponse(result.data);
                        content['domain'] = content.credentials.network_id;
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