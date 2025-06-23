const { InsertUpdateOffer, makeRequest, getOffersFields, addExtraFields, ImportantFields, defaultLog, mergeOfferLog, lockOfferApiStats } = require('../plugin');
const { ActiveApi, InactiveApi } = require('../../helpers/Functions');

const debug = require("debug")("darwin:Plugin:Mediumin");
const moment = require('moment');
const limit = 500; // Max limit by API

// update valid pid from sample tracking link.
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
    if (credentials.network_id && credentials.aff_id && credentials.token) {
        // let apiBaseurl = `http://${credentials['network_id']}/offers/?aff_id=${credentials['aff_id']}&aff_token=${credentials['token']}&get_creatives=1`;
        let apiBaseurl = `http://${credentials['network_id']}/offers/?aff_id=${credentials['aff_id']}&aff_token=${credentials['token']}`;
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

exports.checkValid = (result) => {
    if (result && result.data && result.data.length > 0) {
        return true
    }
    return false;
}

exports.fetchResponse = (result) => {
    return result.data;
}

const Mediumin = {
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
            let data = Mediumin[action](field, offer);
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
        if (response.count && response.ads.total_records) {
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
                if (result && Object.keys(result).length) {
                    valid = this.checkValid(result.data)
                    if (valid === true) {
                        let data = this.fetchResponse(result.data);
                        content['domain'] = content.credentials['network_id'];
                        let offer = this.traverseOffer(data, content);
                        let tempLog = await InsertUpdateOffer(ImportantFields, offer, content);
                        // totalPages = this.countApiPages(result.data);
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
    if (data.offer_name)
        offer_name = data.offer_name;
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
    let category = []
    if (data.app_category) {
        category.push(data.app_category)
    }
    return category;
}

function getCurrency(field, data) {
    let currency = "USD";
    if (data.currency) {
        currency = data.currency.toUpperCase();
    }
    return currency;
}

function getOfferId(field, data) {
    let offer_id = '';
    if (data.id) {
        offer_id = data.id;
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
    if (data.offer_desc) {
        description = data.offer_desc;
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
    if (data.tracking_link) {
        tracking_link = data.tracking_link;
    }
    return tracking_link;
}

function getExpiredUrl(field, data) {
    return "";
}

function getStartDate(field, data) {
    return moment().toDate();
}

function getEndDate(field, data) {
    return moment().add(1, 'Y').toDate();
}

function getRevenue(field, data) {
    let revenue = 0.0;
    if (data.offer_price) {
        revenue = +data.offer_price;
    }
    return revenue;
}

function getRevenueType(field, data) {
    let revenue_type = { enum_type: 'unknown', offer_type: '' };
    if (data.pricing_model) {
        revenue_type.offer_type = data.pricing_model;
    }
    return revenue_type;
}

function getPayout(field, data) {
    let payout = 0.0;
    if (data.offer_price) {
        payout = +data.offer_price;
    }
    return payout;
}

function getPayoutType(field, data) {
    let payout_type = { enum_type: 'unknown', offer_type: '' };
    if (data.bid_type) {
        payout_type.offer_type = data.pricing_model;
    }
    return payout_type;
}

function getApprovalRequired(field, data) {
    let approval_required = false;
    if (!data.tracking_link)
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
    if (data.regions || data.os || (data.os && data.os_version)) {
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
    if (data.regions) {
        country = data.regions.split(',');
        country.map(obj => {
            if (obj) {
                geo_targeting.country_allow.push({ key: obj, value: obj });
            }
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
    if (data.os) {
        let OS = ""
        if (data.os === 'ios') {
            OS = "ios"
        }
        if (data.os === 'android') {
            OS = "android"
        }

        if (OS && data.os_version) {
            device_targeting.device.push('mobile');
            device_targeting.os.push(OS);
            device_targeting.os_version.push({ os: OS, version: data.os_version, version_condition: 'gte' })
        }
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
    if (data.creatives) {
        let testcreatives = JSON.parse(data.creatives);
        if (testcreatives && Array.isArray(testcreatives) && testcreatives.length > 0) {
            testcreatives.map(obj => {
                let dfltCreative = defaultCreative();
                dfltCreative.creative_id = obj.material_id;
                dfltCreative.name = obj.name;
                dfltCreative.creative_type = obj.type;
                if (obj.creative_dimensions && Object.keys(obj.creative_dimensions).length) {
                    dfltCreative.height = obj.creative_dimensions.height;
                    dfltCreative.width = obj.creative_dimensions.width;
                }
                dfltCreative.landing_page_url = obj.link ? obj.link : obj.creative_url;
                creatives.push(dfltCreative)
            })
        } else if (testcreatives && Object.keys(testcreatives).length) {
            let creativeKeys = Object.keys(testcreatives);
            creativeKeys.map(id => {
                let dfltCreative = defaultCreative();
                dfltCreative.creative_id = testcreatives[id]['id'];
                dfltCreative.creative_file = testcreatives[id]['url'];
            })
        }
    }
    return creatives;
}

function getOfferVisible(field, data) {
    return 'public';
}

function getStatusLabel(field, data) {
    let status_label = 'no_link';
    if (data.tracking_link) {
        status_label = "active";
    }
    return status_label;
}

function getRedirectionMethod(field, data) {
    return 'javascript_redirect';
}
