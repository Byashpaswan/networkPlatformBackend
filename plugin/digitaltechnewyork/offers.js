const crypto = require('crypto');
const { InsertUpdateOffer, makeRequest, getOffersFields, addExtraFields, ImportantFields, defaultLog, mergeOfferLog, lockOfferApiStats } = require('../plugin');
const { InactiveApi, ActiveApi } = require('../../helpers/Functions');
const globalConfig = require("../../constants/Global");

const debug = require("debug")("darwin:Plugin:Digitaltechnewyork");

const ENV_OFFERS_LIMIT = process.env.ENV_OFFERS_LIMIT;
const moment = require('moment');
const limit = 1000;


// not valid, update after check sample  tracking link  
exports.getPid = (url) =>{
  if(!url){
      return null;
  }
  let urlData = new URL(url);
  return urlData.searchParams.get('partid');
}
exports.getPidLocation = ()=>{
  return {
      lop : 'query', // lop means locations of pid
      location : 'partid'
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
    } catch (err) {
      debug(err);
      await InactiveApi(content);
      await lockOfferApiStats(offerLog, content, start_time, remarks = `Fail, Api Response Error Msg : ${err}, Catch block, Page = ${page}`);
      return resolve(false);
    }
  });

}

exports.apiCall = async (credentials) => {
  if (credentials.network_id && credentials.api_key) {
    let apiBaseurl = `https://${credentials.network_id}/api/get_offers/?api_key=${credentials.api_key}`
    return await makeRequest({
      method: 'get',
      url: apiBaseurl
    });
  } else {
    return null;
  }
}
exports.checkValid = (result) => {
  if (result && result.offers && result.offers.length) {
    return true;
  }
  return false;
}
exports.fetchResponse = (result) => {
  return result.offers;
}
exports.traverseOffer = (result, content) => {
  let offers = {};
  for (let data of result) {
    try {
      if (data) {
        let temp = formateOffers(data);
        if (temp.advertiser_offer_id) {
          temp = addExtraFields(temp, content);
          if (offers[temp.advertiser_offer_id]) { }
          offers[temp.advertiser_offer_id] = temp;
        }
      }
    }
    catch (err) {
      debug(err);
    }
  }
  return offers;
}
exports.countApiPages = (result) => {
  return 0;
}

//api wise methods
function getOfferId(field, data) {
  return data.oid ? data.oid : "";
}

function getOfferName(field, data) {
  return data.name ? data.name : "";
}

function getCategory(field, data) {
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
  let goal = defaultGoal();
  return goal;
}

function getCurrency(field, data) {
  return "USD";
}

function getThumbnail(field, data) {
  return "";
}

function getDescription(field, data) {
  return data.description ? data.description : '';
}

function getKpi(field, data) {
  return '';
}

function getPreviewUrl(field, data) {
  return data.preview ? data.preview : '';
}

function getTrackingLink(field, data) {
  return data.your_link ? data.your_link : "";
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
  return data.payout ? data.payout : 0.0;
}
function getRevenueType(field, data) {
  return { enum_type: '', offer_type: '' };
}

function getPayout(field, data) {
  return data.payout ? data.payout : 0.0;
}
function getPayoutType(field, data) {
  return { enum_type: '', offer_type: '' };
}

function getApprovalRequired(field, data) {
  return data.your_link ? false : true;
}

function getIsCapEnabled(field, data) {
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
  return cap;
}

function getIsTargeting(field, data) {
  return data.platform || (data.countries && data.countries.length) ? true : false;
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
    data.countries.map(obj => {
      if (obj) { geo_targeting.country_allow.push({ key: obj, value: obj }); }
    });
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
  if (data.mobileRules && data.mobileRules.length) {
    if (data.mobileRules[0].req_device_os) {
      if (data.mobileRules[0].req_device_os.toLowerCase() == 'android' && !device_targeting.os.includes('android')) {
        device_targeting.os.push('android');
      } else if (data.mobileRules[0].req_device_os.toLowerCase() == 'ios' && !device_targeting.os.includes('ios')) {
        device_targeting.os.push('ios');
      }
    }
    if (data.mobileRules[0].req_device_os_version) {
      if (typeof (data.mobileRules[0].req_device_os_version) == 'object') {
        device_targeting.os_version.push({ version: data.mobileRules[0].req_device_os_version[0], version_condition: 'gte' })//
      } else {
        device_targeting.os_version.push({ version: data.mobileRules[0].req_device_os_version, version_condition: 'gte' });
      }
    }
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
  let creative = defaultCreative();
  if (data.creative) {
    creative.creative_file = data.creative;
  }
  return creative;
}

function getOfferVisible(field, data) {
  return 'public';
}

function getStatusLabel(field, data) {
  let status_label = 'unmanaged';
  if (data.your_link) status_label = "active";
  else status_label = "no_link";
  return status_label;
}

function getRedirectionMethod(field, data) {
  return 'javascript_redirect';
}

const Digitaltechnewyork = {
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
  let formattedOffer = {};
  array = getOffersFields('', '');
  array.map(function (obj) {
    try {
      let data = Digitaltechnewyork[obj.action](obj.field, offer);
      formattedOffer[obj.field] = data;
    } catch (err) {
      debug(err);
    }
  })
  return formattedOffer;
}
