const { InsertUpdateOffer, makeRequest, getOffersFields, addExtraFields, ImportantFields, defaultLog, mergeOfferLog, lockOfferApiStats } = require('../plugin');

const { ActiveApi, InactiveApi } = require('../../helpers/Functions');
const debug = require("debug")("darwin:Plugin:Fuseclick");
const ENV_OFFERS_LIMIT = process.env.ENV_OFFERS_LIMIT;
const moment = require('moment');
const limit = 500;
exports.countApiPages = (response) => {
    let page = 0;
    try {
        if (response.data && response.data.totalPages) {
            page = response.data.totalPages;
        }
        return page;
    }
    catch (err) {
        return 0;
    }
}

exports.apiCall = async (credentials, page, apilimit) => {
    if (credentials.network_id && credentials.api_key && credentials.affiliate_id) {
        let network_id = credentials['network_id'];
        let api_key = credentials['api_key'];
        let affiliate_id = credentials['affiliate_id'];
        let apiBaseurl = "http://" + network_id + "/api/v2/getOffers?key=" + api_key + "&a=" + affiliate_id + "&cap_info=1&limit=" + apilimit + "&page=";
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

// update pid after check sample tracking link.
exports.getPid = (url) =>{
    if(!url){
        return null;
    }
    let urlData = new URL(url);
    return urlData.searchParams.get('a');
}
exports.getPidLocation = ()=>{
    return {
        lop : 'query', // lop means locations of pid
        location : 'a'
    }
}
exports.offersApiCall = async (content) => {
    // let network_id = content.credentials['network_id'];
    // let api_key = content.credentials['api_key'];
    // let affiliate_id = content.credentials['affiliate_id'];
    // let apiBaseurl = "http://" + network_id + "/api/v2/getOffers?key=" + api_key + "&a=" + affiliate_id+"&cap_info=1&limit="+limit + "&page=";
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


exports.checkValid = (result) => {
    if (result && result.httpStatus && result.httpStatus == 200 && result.errorMessage.length == 0 && result.errorCode == 0) {
        //valid credentials pykoo
        return true;
    }
    else {
        return false;
    }

}

exports.fetchResponse = (result) => {
    return result.data.content;

}
exports.traverseOffer = (result, content) => {

    let offers = {};
    Object.keys(result).map((data) => {
        try {
            if (data) {
                let temp = formateOffers(result[data]);
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

//api wise methods
function getCategory(field, data) {
    let category = [];
    if (data.categories.length > 0) {
        data.categories.map(element => {
            category.push(element.category_name);
        })
    }
    return category;
}

function getOfferId(field, data) {
    let offer_id = '';
    if (data.id) {
        offer_id = data.id;
    }
    return offer_id;
}

function getOfferName(field, data) {
    let offer_name = '';
    if (data.name)
        offer_name = data.name;
    return offer_name;
}

function getIsGoalEnabled(field, data) {
    let goal_enable = false;
    if (data.events && data.events.length != 0) {
        goal_enable = true;
    }
    return goal_enable;
}

function getGoals(field, data) {
    let goal = [];
    let tempGoals;
    if (data.events && data.events.length != 0) {
        data.events.map(obj => {
            tempGoals = defaultGoal();
            if (obj.e_id) {
                tempGoals.goal_id = obj.e_id;
            }
            if (obj.event_name) {
                tempGoals.name = obj.event_name;
            }
            if (obj.payout) {
                tempGoals.payout = obj.payout;
            }
            if (obj.payout_type) {
                tempGoals.payout_type = obj.payout_type;
            }
            if (obj.description) {
                tempGoals.description = obj.description;
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
    return currency;
}

function getRedirectionMethod(field, data) {
    let method = 'javascript_redirect';
    // TODO := status 302 and 303 needs to be added
    return method;
}

function getThumbnail(field, data) {
    let thumbnail = '';
    if (data.logo)
        thumbnail = data.logo;
    return thumbnail;
}

function getDescription(field, data) {
    let description = '';
    if (data.description)
        description = data.description;
    return description;
}

function getKpi(field, data) {
    let kpi = '';
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
    if (data.tracking_link)
        tracking_link = data.tracking_link;
    return tracking_link;
}

function getExpiredUrl(field, data) {
    let expired_url = '';
    return expired_url;
}

function getStartDate(field, data) {
    let start_date = moment();
    try {
        if (data.create_date && data.create_date != "") {
            start_date = moment(data.create_date, 'YYYY/MM/DD');
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
        if (data.expire_date && data.expire_date !== "")
            end_date = moment(data.expire_date, 'YYYY/MM/DD');
        end_date = end_date.toISOString();
    }
    catch {
        end_date = moment().add(1, 'Y');
    }

    return end_date;
}

function getRevenue(field, data) {
    let revenue = 0.0;
    if (data.payout)
        revenue = data.payout;
    return revenue;
}

function getRevenueType(field, data) {
    let revenue_type = { enum_type: '', offer_type: '' };
    if (data.payout_type)
        revenue_type.offer_type = data.payout_type;
    return revenue_type;
}

function getPayout(field, data) {
    let payout = 0;
    if (data.payout) {
        payout = data.payout;
    }
    return payout;
}

function getPayoutType(field, data) {
    let payout_type = { enum_type: '', offer_type: '' };
    if (data.payout_type)
        payout_type.offer_type = data.payout_type;
    return payout_type;
}

function getApprovalRequired(field, data) {
    let approval_required = false;
    if (data.tracking_link && data.tracking_link == "")
        approval_required = true;
    return approval_required;
}

function getIsCapEnabled(field, data) {
    let cap_enable = false;
    if (data.has_cap_limit && data.has_cap_limit !== "No")
        cap_enable = true;
    return cap_enable;
}

function getOfferCapping(field, data) {
    let cap = defaultCap();
    // if(data.cap_type!==undefined && data.cap_type!=="")
    // {
    //     if(data.cap_type=='budget'){
    //    cap.daily_revenue=""
    //    cap.monthly_revenue="" 
    //    cap.weekly_revenue="" 
    //     }
    //     else if(data.cap_type=='conversion'){
    //     cap.daily_clicks=""
    //     cap.monthly_clicks="" 
    //     cap.weekly_clicks=""
    //     }
    // }
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
    if ((data.geo_countries || data.device_rules) && (data.geo_countries !== "" || data.device_rules.length != 0))
        targeting_enable = true;
    return targeting_enable;
}

function getGeoTargeting(field, data) {
    let geo_targeting = defaultGeoTargeting();
    countryAllow = []
    countryDeny = []
    if (data.geo_type && data.geo_countries) {
        if (data.geo_type == "Include" && data.geo_countries !== "") {
            countryAllow = data.geo_countries.split(';')
            countryAllow.map(ele => {
                geo_targeting.country_allow.push({ key: ele, value: ele });
            })
        }
        else if (data.geo_type == "Exclude" && data.geo_countries !== "") {
            countryDeny = data.geo_countries.split(';')
            countryDeny.map(ele => {
                geo_targeting.country_deny.push({ key: ele, value: ele });
            })
        }
    }
    // TODO: CITY ALLOW AND DENY NEEDS TO BE SET := instead of cities the api is showing states.
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
    device = []
    if (data.type && data.type == "Mobile") {
        device_targeting.device.push('mobile')
        if (data.device_rules && data.device_rules.length > 0) {
            data.device_rules.map(element => {
                let split_device = element.split(":");
                device_data = '';
                if (split_device[2]) {
                    device_data = split_device[2]
                }
                if (split_device[0] && split_device[0] == 1 && split_device[1] && split_device[1] == "OS" && device_data) {
                    let os = device_data.split("(");
                    if (os[0] && os[0] !== "") {
                        if (os[0] == "Android")
                            device_targeting.os.push('android')
                        else if (os[0] == 'iOS')
                            device_targeting.os.push('ios')
                        else if (os[0] == 'Windows')
                            device_targeting.os.push('windows')
                    }
                    if (os[1] && os[1] !== "") {
                        os1 = os[1].replace(")", "")
                        ver = os1.split("-");
                        if (ver[0] && ver[0] !== "") {
                            if (os[0] && os[0] == 'Android') {
                                device_targeting.os_version.push({ os: "android", version: ver[0], version_condition: "gte" })
                            }
                            else if (os[0] && os[0] == 'iOS') {
                                device_targeting.os_version.push({ os: "ios", version: ver[0], version_condition: "gte" })
                            }
                        }
                        if (ver[1] && ver[1] !== "") {
                            if (os[0] && os[0] == 'Android') {
                                device_targeting.os_version.push({ os: "android", version: ver[1], version_condition: "lte" })

                            }
                            else if (os[0] && os[0] == 'Android') {
                                device_targeting.os_version.push({ os: "ios", version: ver[1], version_condition: "lte" })

                            }
                        }
                    }

                }
            })
        }
    }
    else if (data.type && data.type == "Desktop") {
        device_targeting.os.push('windows')
        device_targeting.device.push('desktop')
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
    return creative;
}

function getOfferVisible(field, data) {
    let offer_visible = 'public';
    return offer_visible;
}

function getStatusLabel(field, data) {
    let status_label = 'unmanaged';
    if (data.status) {
        if (data.status == "Active") {
            status_label = "active";
        }
        else if (data.status == "Pending") {
            status_label = "waitingForApproval";
        }
    }
    if (!data.tracking_link) {
        status_label = "no_link";
    }
    return status_label;
}

const fuseClick = {
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
            let data = fuseClick[action](field, offer);
            formatedOffer[field] = data;
        }
        catch (err) {
            debug(err);

        }
    })
    return formatedOffer;
}