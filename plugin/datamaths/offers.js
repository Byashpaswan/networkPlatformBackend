const { InsertUpdateOffer, makeRequest, addUpdateExtraFields, getOffersFields, addExtraFields, ImportantFields, defaultLog, mergeOfferLog, lockOfferApiStats } = require('../plugin');

const { ActiveApi, InactiveApi } = require('../../helpers/Functions');
const debug = require("debug")("darwin:Plugin:datamaths");
const ENV_OFFERS_LIMIT = process.env.ENV_OFFERS_LIMIT;
const moment = require('moment');
const limit = 100;

exports.apiCall = async (credentials, page, apilimit) => {
    if (credentials.network_id && credentials.username && credentials.password) {
        let network_id = credentials['network_id'];
        let username = credentials['username'];
        let password = credentials['password'];
        let apiBaseurl = `https://${network_id}/api/v1/affiliate/offers?limit=${apilimit}&page=${page}`;
        let auth = Buffer.from(username + ':' + password).toString('base64');
        // debug(apiBaseurl + page)
        let result = await makeRequest({
            method: 'get',
            url: apiBaseurl,
            headers: { 'Authorization': 'Basic ' + auth }
        });
        return result
    }
    else {
        return null;
    }
}

// not valid, update after check sample  tracking link  
exports.getPid = (url) =>{
    if(!url){
        return null;
    }
    let urlData = new URL(url);
    return urlData.searchParams.get('affiliate_id');
}
exports.getPidLocation = ()=>{
    return {
        lop : 'query', // lop means locations of pid
        location : 'affiliate_id'
    }
}

exports.checkValid = (result) => {
    if (result && result.success && result.data && result.data.items && result.data.items.length) {
        return true;
    }
    else {
        return false;
    }

}

exports.fetchResponse = (result) => {
    return result.data.items;
}

const datamaths = {
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
            let data = datamaths[action](field, offer);
            formatedOffer[field] = data;
        }
        catch (err) {
            debug(err)

        }
    })
    // console.log(formatedOffer)
    return formatedOffer;
}

exports.traverseOffer = (result, content) => {
    let offers = {};
    result.map((data) => {
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
            debug(err)

        }
    });
    return offers;
}

exports.countApiPages = (response) => {
    let page = 0;
    try {
        if (response.data && response.data.pages) {
            page = response.data.pages;
            return page //>= 10 ? (process.env.OFFERS_FETCH_PAGE_LIMIT || 10 ) : page;
        }
        return page;
    }
    catch (err) {
        return 0;
    }
}

exports.offersApiCall = async (content) => {
    let valid = false;
    let page = 1;
    let totalPages = 1;
    let offerLog = defaultLog();
    let start_time = moment();
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
            // await this.offerslookOffersApiCall(content, offerLog, start_time);
            return resolve(true);

        }
        catch (err) {
            debug(err)
            await InactiveApi(content);
            await lockOfferApiStats(offerLog, content, start_time, remarks = `Fail, Api Response Error Msg : ${err}, Catch block, Page = ${page}`);
            return resolve(false);
        }
    });
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
    if (data.categories) {
        return data.categories
    }
    return [];
}
function getIsGoalEnabled(field, data) {
    let goal_enable = false;
    if (data.events && data.events.length) {
        goal_enable = true;
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
    if (data.events && data.events.length) {
        data.events.map(obj => {
            let tempGoals = defaultGoal();
            if (obj.event_id) {
                tempGoals.goal_id = obj.event_id;
            }
            if (obj.event_name) {
                tempGoals.name = obj.event_name;
            }
            if (obj.payout) {
                tempGoals.payout = +obj.payout;
            }
            if (obj.payout_type) {
                tempGoals.payout_type = obj.payout_type;
            }
            goal.push(tempGoals);
        })
    }
    return goal;
}
function getCurrency(field, data) {
    let currency = 'USD';
    if (data.currency)
        currency = data.currency;
    return currency;
}
function getThumbnail(field, data) {
    return '';
}
function getDescription(field, data) {
    let description = '';
    if (data.description)
        description = data.description;
    return description;
}
function getKpi(field, data) {
    return '';
}
function getPreviewUrl(field, data) {
    let preview_url = '';
    if (data.preview_url)
        preview_url = data.preview_url;
    return preview_url;
}
function getTrackingLink(field, data) {
    let tracking_link = '';
    if (data.tracking_url)
        tracking_link = data.tracking_url;
    return tracking_link;
}
function getExpiredUrl(field, data) {
    return '';
}
function getStartDate(field, data) {
    let start_date = moment();
    try {
        if (data.start_datetime !== undefined && data.start_datetime != "") {
            start_date = moment(data.start_datetime, 'YYYY/MM/DD');
            start_date = start_date.toISOString();
        }
    }
    catch (e) {
        start_date = moment();
    }
    return start_date;
}
function getEndDate(field, data) {
    let end_date = moment().add(1, 'Y');
    try {
        if (data.end_datetime !== undefined && data.end_datetime !== "") {
            end_date = moment(data.end_datetime, 'YYYY/MM/DD');
            end_date = end_date.toISOString();
        }
    }
    catch {
        end_date = moment().add(1, 'Y');
    }
    return end_date;
}
function getRevenue(field, data) {
    let revenue = 0.0;
    if (data.payout) {
        revenue = +data.payout;
    }
    else if (data.max_payout) {
        payout = +data.max_payout
    }
    return revenue;
}
function getRevenueType(field, data) {
    let revenue_type = { enum_type: '', offer_type: '' };
    if (data.payout_type) {
        revenue_type.offer_type = data.payout_type;
    }
    return revenue_type;
}
function getPayout(field, data) {
    let payout = 0.0;
    if (data.payout) {
        payout = +data.payout;
    }
    else if (data.max_payout) {
        payout = +data.max_payout
    }
    return payout;
}
function getPayoutType(field, data) {
    let payout_type = { enum_type: '', offer_type: '' };
    if (data.payout_type) {
        payout_type.offer_type = data.payout_type;
    }
    return payout_type;
}
function getApprovalRequired(field, data) {
    if (!data.tracking_url) {
        return true;
    }
    return false;
}
function getIsCapEnabled(field, data) {
    if (data.isCapEnabled)
        return true;
    return false;
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
    if (data.daily_convs) {
        cap.daily_conv = +data.daily_convs;
    }
    if (data.monthly_convs) {
        cap.monthly_conv = +data.monthly_convs;
    }
    if (data.daily_payout) {
        cap.payout_daily = +data.daily_payout;
    }
    if (data.monthly_payout) {
        cap.monthly_payout = +data.monthly_payout;
    }
    if (data.daily_payout) {
        cap.daily_revenue = +data.daily_payout;
    }
    if (data.monthly_payout) {
        cap.monthly_revenue = +data.monthly_payout;
    }
    return cap;
}
function getIsTargeting(field, data) {
    if (data.en_targeting || (data.targeting && data.targeting.countries && data.targeting.countries.values && data.targeting.countries.values.length)) {
        return true;
    }
    return false;
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
    if (data.targeting && data.targeting.countries && data.targeting.countries.values && data.targeting.countries.values.length) {
        for (const contryObj of data.targeting.countries.values) {
            geo_targeting.country_allow.push({ key: contryObj.iso_code2, value: contryObj.country });
        }
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
    // let os_version = {};
    // if (data.offer_platform && data.offer_platform.target && data.offer_platform.target.length) {
    //     data.offer_platform.target.forEach(element => {
    //         let os = "";
    //         if (element.platform == 'Mobile' || element.platform == "Tablet") {
    //             if (!device_targeting.device.includes('mobile'))
    //                 device_targeting.device.push('mobile');
    //         }
    //         else if (element.platform == 'PC') {
    //             if (!device_targeting.device.includes('desktop'))
    //                 device_targeting.device.push('desktop');
    //         }
    //         if (element.system == 'iOS') {
    //             if (!device_targeting.os.includes('ios')) {
    //                 device_targeting.os.push('ios');
    //             }
    //             os = 'ios';
    //         }
    //         else if (element.system && element.system == 'Android') {
    //             if (!device_targeting.os.includes('android')) {
    //                 device_targeting.os.push('android')
    //             }
    //             os = 'android';
    //         }
    //         else if (element.system) {
    //             if (!device_targeting.os.includes('all')) {
    //                 device_targeting.os.push('all');
    //             }
    //         }
    //         if (os && element.version && element.version.length) {
    //             let above_version = element.above_version;
    //             element.version.map(ver_array => {
    //                 if (ver_array && ver_array !== 'all') {
    //                     if (!os_version[ver_array] || os_version[ver_array].version_condition == "eq") {
    //                         if (element.is_above && above_version == ver_array) {
    //                             os_version[ver_array] = ({ os: os, version: ver_array, version_condition: 'gte' });
    //                         }
    //                         else {
    //                             os_version[ver_array] = ({ os: os, version: ver_array, version_condition: 'eq' });
    //                         }
    //                     }
    //                 }
    //             })
    //         }
    //     });
    //     if (device_targeting.os.length) {
    //         for (let ver in os_version) {
    //             device_targeting.os_version.push(os_version[ver]);
    //         }
    //     }
    // }
    // debug(device_targeting, data.offer.id)

    return device_targeting;
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
function getCreative(field, data) {
    return [];
}
function getOfferVisible(field, data) {
    return 'public';
}
function getStatusLabel(field, data) {
    let status_label = 'unmanaged';
    if (data.tracking_url && data.offer_status == 2) {
        status_label = "active";
    }
    else if (!data.tracking_url && data.offer_status == 0) {
        status_label = 'no_link';
    }
    else if (!data.tracking_url && data.offer_status == 1) {
        status_label = 'waitingForApproval';
    }
    else if (!data.tracking_url && data.offer_status == 3) {
        status_label = 'rejected';
    }
    return status_label;
}
function getRedirectionMethod(field, data) {
    return 'javascript_redirect';
}