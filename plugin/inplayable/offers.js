const { InsertUpdateOffer, makeRequest, getOffersFields, addExtraFields, ImportantFields, defaultLog, mergeOfferLog, lockOfferApiStats } = require('../plugin');
const { ActiveApi, InactiveApi } = require('../../helpers/Functions');

const debug = require("debug")("darwin:Plugin:InplayAble");
const ENV_OFFERS_LIMIT = process.env.ENV_OFFERS_LIMIT;
const moment = require('moment');
const limit = 1;


// update after find pid 
exports.getPid = (url) =>{
    if(!url){
        return null;
    }
    let urlData = new URL(url);
    return urlData.searchParams.get('pubid');
}
exports.getPidLocation = ()=>{
    return {
        lop : 'query', // lop means locations of pid
        location : 'pubid'
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

exports.apiCall = async (credentials, page, limit) => {
    try {
        if (credentials.network_id && credentials.sid && credentials.secret) {
            let apiBaseurl = `http://${credentials.network_id}/index.php?m=server&p=getoffer&sid=${credentials.sid}&secret=${credentials.secret}&page=${page}&pagesize=${limit}`
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
    if (result && result.code == 0 && result.status == "success" && result.datas && result.datas.length) {
        return true;
    }
    else {
        return false;
    }
}

exports.fetchResponse = (result) => {
    return result.datas;
}

exports.traverseOffer = (result, content) => {

    let allOffer = {}

    result.map((offer) => {
        try {
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
    if (result.paging && result.paging.total && result.paging.page && result.paging.pagesize && result.paging.total >= (result.paging.page * result.paging.pagesize)) {
        return +result.paging.page + 1;
    }
    return 0;
}

//api wise methods
function getOfferId(field, data) {
    let offer_id = '';
    if (data.id) {
        offer_id = data.id;
    }
    return offer_id;
}

function getOfferName(field, data) {
    let offer_name = '';
    if (data.app_name)
        offer_name = data.app_name;
    return offer_name;
}

function getCategory(field, data) {
    if (data.category && data.category.trim()) {
        return [category]
    }
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
    return 'USD';
}

function getThumbnail(field, data) {
    if (data.app_icon) return data.app_icon;
    return '';
}

function getDescription(field, data) {
    let description = '';
    if (data.details)
        description = data.details;
    return description;
}

function getKpi(field, data) {
    if (data.kpitype) return data.kpitype;
    return "";
}

function getPreviewUrl(field, data) {
    if (data.preview_url) return data.preview_url;
    return "";
}

function getTrackingLink(field, data) {
    if (data.click_url) return data.click_url;
    return "";
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
    if (data.price) return data.price;
    return 0.0;
}

function getRevenueType(field, data) {
    let revenue_type = { enum_type: '', offer_type: '' };
    if (data.pricing_models) {
        revenue_type['offer_type'] = data.pricing_models
    }
    return revenue_type;
}

function getPayout(field, data) {
    if (data.price) return data.price;
    return 0.0;
}

function getPayoutType(field, data) {
    let payout_type = { enum_type: '', offer_type: '' };
    if (data.pricing_models) {
        payout_type['offer_type'] = data.pricing_models
    }
    return payout_type;
}

function getApprovalRequired(field, data) {
    if (!data.click_url) return true
    return false;
}

function getIsCapEnabled(field, data) {
    if (data.daily_cap) return true;
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
    if (data.daily_cap) {
        cap.daily_conv = data.daily_cap;
    }
    return cap;
}

function getIsTargeting(field, data) {
    if ((data.countries && data.countries.length) || data.platform || data.min_os_version) return true;
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
    if (data.countries && data.countries.length) {
        data.countries.map((country) => {
            geo_targeting.country_allow.push({ key: country, value: country })
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
    if (data.platform === "") {
        device_targeting.os.push("all")
    }
    else if (data.platform) {
        if ((data.platform == 'Android' || data.platform == 'Android Tablet') && !device_targeting.os.includes('android')) device_targeting.os.push('android');
        else if ((data.platform == 'iPhone' || data.platform == 'iPad' || data.platform == 'iPod') && !device_targeting.os.includes('ios')) device_targeting.os.push('ios');
        else if ((data.platform == 'Windows Phone' || data.platform == 'Windows Mobile' || data.platform == 'Windows') && !device_targeting.os.includes('windows')) device_targeting.os.push('windows');
        else if ((data.platform == 'Blackberry' || data.platform == 'Blackberry Tablet') && !device_targeting.os.includes('blackberry')) device_targeting.os.push('blackberry');
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
    if (data.click_url) status_label = "active";
    else status_label = "no_link";
    return status_label;
}

function getRedirectionMethod(field, data) {
    return 'javascript_redirect';
}

const inplayAble = {
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
            let data = inplayAble[action](field, offer);
            formatedOffer[field] = data;
        }
        catch (err) {
            debug(err);

        }
    })
    return formatedOffer;
}