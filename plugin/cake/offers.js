const { InsertUpdateOffer, makeRequest, getOffersFields, addExtraFields, ImportantFields, defaultLog, mergeOfferLog, lockOfferApiStats } = require('../plugin');

const { ActiveApi, InactiveApi } = require('../../helpers/Functions');
const debug = require("debug")("darwin:Plugin:Cake");
const ENV_OFFERS_LIMIT = process.env.ENV_OFFERS_LIMIT;
const moment = require('moment');
const limit = 500;
exports.countApiPages = (response) => {
    let page = 0;
    try {
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
    return urlData.searchParams.get('a');
}

exports.getPidLocation = ()=>{
    return {
        lop : 'query', // lop means locations of pid
        location : 'a'
    }
}
exports.apiCall = async (credentials, page, apilimit) => {
    if (credentials.api_key && credentials.network_id && credentials.affiliate_id) {
        let api_key = credentials['api_key'];
        let network_id = credentials['network_id'];
        let affiliate_id = credentials['affiliate_id'];
        // let apiBaseurl = "https://" + network_id + "/affiliates/api/4/offers.asmx/OfferFeed?api_key=" + api_key + "&affiliate_id=" + affiliate_id + "&campaign_name=&media_type_category_id=0&vertical_category_id=0&vertical_id=0&offer_status_id=0&tag_id=0&start_at_row=1&row_limit=" + apilimit;
        
        // let apiBaseurl = "https://affiliates.motiveinteractive.com/affiliates/api/Offers/Campaign?api_key=" + api_key + "&affiliate_id=" + affiliate_id

        let apiBaseurl = `http://motivefeed.com/affiliate/4/campaigns?api_key=${api_key}&affiliate_id=${affiliate_id}&format=json`

        // &creatives=[TRUE/FALSE]&d[]=[WIDTH]x[HEIGHT]&creative_limit=[INTEGER]&vertical_id=[VERTICAL_ID]&tag_id=[TAG_ID]&payout_at_least=[INTEGER]&payout_at_most=[INTEGER&incent_id=[INTEGER]&format=json

        // debug(apiBaseurl)
        return await makeRequest({
            method: 'get',
            url: apiBaseurl,
            headers: { 'Content-Type': 'application/json' }
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
    let totalPages = 1;
    return new Promise(async (resolve, reject) => {
        try {
            let result;
            do {
                result = await this.apiCall(content.credentials, page, limit);
                if (result) {
                    valid = this.checkValid(result.data)
                    if (valid === true) {
                        let data = this.fetchResponse(result.data);
                        content['domain'] = "motivefeed.com";
                        offer = this.traverseOffer(data, content);
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
    if (result.success) {
        // valid credentials hasoffer  
        // console.log(result.count);
        return true;
    }
    else {
        return false;
    }
}

exports.fetchResponse = (result) => {
    return result.campaigns;
}
exports.traverseOffer = (result, content) => {

    let offers = {};
    for(const props in result){
        let data = result[props];
        try {
            if (data) {

                let temp = formateOffers(data, content);
                if (temp.advertiser_offer_id && temp.advertiser_offer_id !== '') {
                    temp = addExtraFields(temp, content);
                    offers[temp.advertiser_offer_id] = temp;
                }
            }
        }
        catch (err) {
            debug(err);
            // console.log('error', err); //skip this offer
        }
    }
    return offers;
}

//api wise methods
function getCategory(field, data, content) {
    let category = [];
    if (data.vertical_name) {
        category.push(data.vertical_name);
    }
    return category;
}

function getOfferId(field, data, content) {
    let offer_id = '';
    if (data.offer_id) {
        offer_id = data.offer_id;
    }
    return offer_id;
}

function getOfferName(field, data, content) {
    let offer_name = '';
    if (data.offer_name)
        offer_name = data.offer_name;
    return offer_name;
}

function getIsGoalEnabled(field, data, content) {
    let goal_enable = false;
    return goal_enable;
}

function getGoals(field, data, content) {
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

function getRedirectionMethod(field, data, content) {
    let method = 'javascript_redirect';
    return method;
}

function getCurrency(field, data, content) {
    let currency = 'USD';
    // if (data.currency)
    // currency = data.currency.toUpperCase();
    return currency;
}

function getThumbnail(field, data, content) {
    let thumbnail = '';
    if (data.thumbnail_image_url) {
        thumbnail = data.thumbnail_image_url;
    }
    return thumbnail;
}

function getDescription(field, data, content) {
    let description = '';
    if (data.description) {
        description = data.description;
    }
    return description;
}

function getKpi(field, data, content) {
    let kpi = '';
    if (data.restrictions) {
        kpi = data.restrictions;
    }
    return kpi;
}

function getPreviewUrl(field, data, content) {
    let preview_url = '';
    if (data.app_details)
        preview_url = data.app_details.app_store_url;
    return preview_url;
}
async function getTrackingLinkData(id, network_id, affiliate_id, api_key) {
    try {
        let apiBaseurl = "https://" + network_id + "/affiliates/api/2/offers.asmx/GetCampaign?api_key=" + api_key + "&affiliate_id=" + affiliate_id + "&campaign_id=" + id;
        let result = await makeRequest({
            method: 'post',
            url: apiBaseurl,
            headers: { 'Authorization': 'ApiKey ' + api_key + ":simpleMode", 'Content-Type': 'application/json' },
            data: {
                offerIds: [id],
            },
        });
        if (result && result.data) {
            return result.data;
        }
    }
    catch (err) {
        return false;
    }

}
async function getTrackingLink(field, data, credentials) {
    let tracking_link = '';
    if (data) {
      tracking_link = data.tracking_link;
    }
    return tracking_link;

}

function getExpiredUrl(field, data, content) {
    let expired_url = '';
    // if (data.Offer['expired_url'] !== undefined)
    //     expired_url = data.Offer['expired_url'];
    return expired_url;
}

function getStartDate(field, data, content) {
    let start_date = moment();
    return start_date;
}

function getEndDate(field, data, content) {
    let end_date = moment().add(1, 'Y');
    try {
        if (data.expiration_date) {
            end_date = moment(data.expire, 'YYYY/MM/DD');
            end_date = end_date.toISOString();
        }
    } catch (e) {
        end_date = moment().add(1, 'Y');
    }
    // if (data.Offer['expiration_date'] !== undefined)
    //     end_date = moment(data.Offer['expiration_date']);
    return end_date;
}

function getRevenue(field, data, content) {
    let revenue = 0.0;
    if (data.payout)
        num = data.payout.substring(1);
    revenue = +num;
    return revenue;
}

function getRevenueType(field, data, content) {
    let revenue_type = { enum_type: 'unknown', offer_type: '' };
    if (data.price_format)
        revenue_type.offer_type = data.price_format.toLowerCase();
    return revenue_type;
}

function getPayout(field, data, content) {
    let payout = 0.0;
    if (data.payout) {
        num = data.payout.substring(1);
        payout = +num;
    }

    return payout;
}

function getPayoutType(field, data, content) {
    let payout_type = { enum_type: 'unknown', offer_type: '' };
    if (data.price_format)
        payout_type.offer_type = data.price_format.toLowerCase();
    return payout_type;
}

function getApprovalRequired(field, data, content) {
    let approval_required = false;
    return approval_required;
}

function getIsCapEnabled(field, data, content) {
    let cap_enable = false;
    return cap_enable;
}

function getOfferCapping(field, data, content) {
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

function getIsTargeting(field, data, content) {
    let targeting_enable = false;
    if (data.allowed_countries && data.allowed_countries.length) {
        targeting_enable = true;
    }
    return targeting_enable;
}

function getGeoTargeting(field, data, content) {
    let geo_targeting = defaultGeoTargeting();
    if (data.allowed_countries && data.allowed_countries.length) {
        data.allowed_countries.map(obj => {
            geo_targeting.country_allow.push({ key: obj, value: obj });
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

function getDeviceTargeting(field, data, content) {
    let device_targeting = defaultDeviceTargeting();
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

function getCreative(field, data, content) {
    let creative = [];
    return creative;
}

function getOfferVisible(field, data, content) {
    let offer_visible = 'public';
    return offer_visible;
}

function getStatusLabel(field, data, content) {
    let status_label = 'no_link';
    if(data.tracking_link){
        status_label = 'active'
    }
    // if (data.offer_status.status_name == 'Apply To Run') {
    //     status_label = "new";
    // }
    // else if (data.offer_status.status_name == 'Active') {
    //     status_label = "active";
    // }
    // else if (data.offer_status.status_name == 'Public') {
    //     status_label = "active";
    // } else if (data.offer_status.status_name == 'Pending') {
    //     status_label = "active";
    // }
    return status_label;
}

const Cake = {
    getOfferId: (field, data, content) => {
        return getOfferId(field, data, content);
    },
    getOfferName: (field, data, content) => {
        return getOfferName(field, data, content);
    },
    getCategory: (field, data, content) => {
        return getCategory(field, data, content);
    },
    getIsGoalEnabled: (field, data, content) => {
        return getIsGoalEnabled(field, data, content);
    },
    getGoals: (field, data, content) => {
        return getGoals(field, data, content);
    },
    getCurrency: (field, data, content) => {
        return getCurrency(field, data, content);
    },
    getThumbnail: (field, data, content) => {
        return getThumbnail(field, data, content);
    },
    getDescription: (field, data, content) => {
        return getDescription(field, data, content);
    },
    getKpi: (field, data, content) => {
        return getKpi(field, data, content);
    },
    getPreviewUrl: (field, data, content) => {
        return getPreviewUrl(field, data, content);
    },
    getTrackingLink: async (field, data, content, credentials) => {
        return await getTrackingLink(field, data, content);
    },
    getExpiredUrl: (field, data, content) => {
        return getExpiredUrl(field, data, content);
    },
    getStartDate: (field, data, content) => {
        return getStartDate(field, data, content);
    },
    getEndDate: (field, data, content) => {
        return getEndDate(field, data, content);
    },
    getRevenue: (field, data, content) => {
        return getRevenue(field, data, content);
    },
    getRevenueType: (field, data, content) => {
        return getRevenueType(field, data, content);
    },
    getPayout: (field, data, content) => {
        return getPayout(field, data, content);
    },
    getPayoutType: (field, data, content) => {
        return getPayoutType(field, data, content);
    },
    getApprovalRequired: (field, data, content) => {
        return getApprovalRequired(field, data, content);
    },
    getIsCapEnabled: (field, data, content) => {
        return getIsCapEnabled(field, data, content);
    },
    getOfferCapping: (field, data, content) => {
        return getOfferCapping(field, data, content);
    },
    getIsTargeting: (field, data, content) => {
        return getIsTargeting(field, data, content);
    },
    getGeoTargeting: (field, data, content) => {
        return getGeoTargeting(field, data, content);
    },
    getDeviceTargeting: (field, data, content) => {
        return getDeviceTargeting(field, data, content);
    },
    getCreative: (field, data, content) => {
        return getCreative(field, data, content);
    },
    getOfferVisible: (field, data, content) => {
        return getOfferVisible(field, data, content);
    },
    getStatusLabel: (field, data, content) => {
        return getStatusLabel(field, data, content);
    },
    getRedirectionMethod: (field, data, content) => {
        return getRedirectionMethod(field, data, content);
    }
}

function formateOffers(offer, content) {
    let formatedOffer = {};
    array = getOffersFields('', '');
    for (let i = 0; i < array.length; i++) {
        try {
            let field = array[i].field;
            let action = array[i].action;
            if(field === 'tracking_link'){
                formatedOffer[field] = offer.tracking_link || '';
                continue;
            }
            let data = Cake[action](field, offer, content);
            formatedOffer[field] = data;
        }
        catch (err) {
            debug(err);

        }
    }
    return formatedOffer;
}
