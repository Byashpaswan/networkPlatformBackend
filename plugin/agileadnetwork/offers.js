const { InsertUpdateOffer, makeRequest, getOffersFields, addExtraFields, ImportantFields, defaultLog, mergeOfferLog, lockOfferApiStats } = require('../plugin');
const { InactiveApi, findDeviceVersion, ActiveApi } = require('../../helpers/Functions');

const debug = require("debug")("darwin:Plugin:Agileadnetwork");
const ENV_OFFERS_LIMIT = process.env.ENV_OFFERS_LIMIT;
const moment = require('moment');
const limit = 10;
exports.countApiPages = (response) => {
    let page = 0;
    try {
        if (response.per_page && response.total_row) {
            page = Math.floor(response.total_row / response.per_page);
        }
        return page;
    }
    catch (err) {
        return 0;
    }
}
exports.getApiDetail = async (credentials) => {
    if (credentials.email && credentials.network_id) {
        let email = credentials['email'];
        let network = credentials['network_id'];
        let apiBaseurl = "https://" + network + "/v1/publisher_details?email=" + email;
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
    return urlData.searchParams.get('agn_pub_id');
}

exports.getPidLocation = ()=>{
    return {
        lop : 'query', // lop means locations of pid
        location : 'agn_pub_id'
    }
}


exports.apiCall = async (credentials, page, apilimit) => {
    let apiDetails = await this.getApiDetail(credentials);
    let validApiDetails = false;
    if (apiDetails) {
        validApiDetails = await this.checkApiDetails(apiDetails.data);
        if (!validApiDetails) {
            return null;
        }
        if (apiDetails.data[0].email && apiDetails.data[0].key && apiDetails.data[0].company_name) {
            let email = apiDetails.data[0].email;
            let key = apiDetails.data[0].key;
            let company = apiDetails.data[0].company_name;
            let apiBaseurl = "https://" + credentials.network_id + "/v1/export/campaign?key=" + key + "&email=" + email + "&company_name=" + company + "&page_num=";
            // debug(apiBaseurl)
            return await makeRequest({
                method: 'get',
                url: apiBaseurl + page,
            });
        }
        else {
            return null;
        }
    } else {
        return null;
    }


}

exports.offersApiCall = async (content) => {
    // let network_id = content.credentials['network_id'];
    // let api_key = content.credentials['api_key'];
    let valid = false;
    let offerLog = defaultLog();
    let start_time = moment();
    let page = 0;
    let totalPages = 1;
    // let apiBaseurl = "http://" + network_id + "/3.0/partner/offers?limit=" + limit + "&page=" ;
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

exports.checkApiDetails = (result) => {
    if (Array.isArray(result) && result.length && result[0].key && result[0].email && result[0].company_name) {
        return true;
    }
    else {
        return false;
    }
}

exports.checkValid = (result) => {
    if (result.per_page && !result.code) {
        //valid credentials Agileadnetwork  
        return true;
    }
    else {
        return false;
    }
}

exports.fetchResponse = (result) => {
    let data = [];
    for (let i of Object.keys(result)) {
        if (typeof result[i] == "object") {
            data.push(result[i]);
        }
    }
    return data;
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
            // console.log('error', err); //skip this offer
        }
    });
    return offers;
}

//api wise methods
function getCategory(field, data) {
    let category = [];
    return category;
}

function getOfferId(field, data) {
    let offer_id = '';
    if (data.clg_id) {
        offer_id = data.clg_id;
    }
    return offer_id;
}

function getOfferName(field, data) {
    let offer_name = '';
    if (data.title)
        offer_name = data.title;
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
    return currency;
}

function getRedirectionMethod(field, data) {
    let method = 'javascript_redirect';    //dfdfd
    return method;
}

function getThumbnail(field, data) {
    let thumbnail = '';
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
    if (data.preview_link)
        preview_url = data.preview_link;
    return preview_url;
}

function getTrackingLink(field, data) {
    let tracking_link = '';
    if (data.tracking_url)
        tracking_link = data.tracking_url.split("&clickid")[0];
    return tracking_link;
}

function getExpiredUrl(field, data) {
    let expired_url = '';
    return expired_url;
}

function getStartDate(field, data) {
    let start_date = moment();
    try {
        if (data.start_date) {
            start_date = moment(data.start_date, 'YYYY/MM/DD');
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
        if (data.end_date) {
            end_date = moment(data.end_date, 'YYYY/MM/DD');
            end_date = end_date.toISOString();
        }
    }
    catch (e) {
        end_date = moment().add(1, 'Y')
    }
    return end_date;
}

function getRevenue(field, data) {
    let revenue = 0.0;
    if (data.bid_amount)
        revenue = data.bid_amount;
    return revenue;
}

function getRevenueType(field, data) {
    let revenue_type = { enum_type: '', offer_type: '' };
    if (data.payout) {
        revenue_type.offer_type = data.payout;
    }
    return revenue_type;
}

function getPayout(field, data) {
    let payout = 0;
    if (data.bid_amount)
        payout = data.bid_amount;
    return payout;
}

function getPayoutType(field, data) {
    let payout_type = { enum_type: '', offer_type: '' };
    if (data.payout)
        payout_type.offer_type = data.payout;
    return payout_type;
}

function getApprovalRequired(field, data) {
    let approval_required = false;
    // if (data.required_approval !== undefined)
    //     approval_required = data.required_approval;
    return approval_required;
}

function getIsCapEnabled(field, data) {
    let cap_enable = false;
    if (data.total_budget || data.daily_budget)
        cap_enable = true;
    return cap_enable;
}

function getOfferCapping(field, data) {
    let cap = defaultCap();      // sadfsdafds
    if (data.daily_budget) {
        cap.daily_conv = data.daily_budget;
    }
    if (data.total_budget) {
        cap.overall_conv = data.total_budget;
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
    if (data.os.length || data.ios_version.length || data.countries.length) {      //  sadfsafds
        targeting_enable = true;
    }
    return targeting_enable;
}

function getGeoTargeting(field, data) {
    let geo_targeting = defaultGeoTargeting();
    if (data.countries) {
        data.countries.map(obj => {
            if (obj.country_code && obj.name) {
                geo_targeting.country_allow.push({ key: obj.country_code, value: obj.name });
            }
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

function getDeviceTargeting(field, data) {
    let device_targeting = defaultDeviceTargeting();
    if (data.os && data.os.length) {
        data.os.map(obj => {
            if (obj['os_code']) {
                if (obj['os_code'].toLowerCase() == "ios") {
                    device_targeting.os.push("ios");
                    if (data.ios_version && data.ios_version.length) {
                        data.ios_version.map(ver_array => {
                            let version = findDeviceVersion([ver_array['title']]);
                            if (version.ios) {
                                device_targeting.os_version.push({ os: 'ios', version: version.ios, version_condition: 'eq' });
                            }
                        })
                    }
                }
                if (obj['os_code'].toLowerCase() == "android") {
                    device_targeting.os.push("android");
                    if (data.android_version && data.android_version.length) {
                        data.android_version.map(ver_array => {
                            let version = findDeviceVersion([ver_array['android_version']]);
                            if (version.ios) {
                                device_targeting.os_version.push({ os: 'android', version: version.android, version_condition: 'eq' });
                            }
                        })
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
    let creative = [];
    if (data.creatives && data.creatives.length) {
        for (let i of data.creatives) {
            let createObj = defaultCreative();
            createObj.name = i.creative_name;
            createObj.creative_file = i.image_url;
            creative.push(createObj);
        }
    }
    return creative;

}

function getOfferVisible(field, data) {
    let offer_visible = 'public';

    return offer_visible;
}

function getStatusLabel(field, data) {
    let status_label = 'unmanaged';
    if (data.tracking_url) {
        status_label = "active";
    } else {
        status_label = "no_link"
    }
    return status_label;
}

const Agileadnetwork = {
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
            let data = Agileadnetwork[action](field, offer);
            formatedOffer[field] = data;
        }
        catch (err) {
            debug(err);

        }
    })
    return formatedOffer;
}

