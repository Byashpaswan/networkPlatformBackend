const { InsertUpdateOffer, makeRequest, getOffersFields, addExtraFields, ImportantFields, defaultLog, mergeOfferLog, lockOfferApiStats } = require('../plugin');
const { ActiveApi, InactiveApi } = require('../../helpers/Functions');

const debug = require("debug")("darwin:Plugin:adosiz");
const ENV_OFFERS_LIMIT = process.env.ENV_OFFERS_LIMIT;
const moment = require('moment');
const limit = 500;
const { spawn } = require('child_process');

const runPy = (params, headers) => {
  let result = { data: null }
  const pyprog = spawn('python3', ['../../plugin/adosiz/adosiz.py', params, headers]);
  pyprog.stdout.on('data', function (data) {
    result.data = JSON.parse(data.toString())
  });
  pyprog.stderr.on('data', (data) => {
    console.log("adosiz ~ pyprog.stderr.on ~ data:", data.toString())
  });
  return result
};
exports.countApiPages = (result) => {
  let page = 0;
  if (result) {
    page = Math.ceil(result.total_page);
  }
  return page;
}

exports.getPid = (url) =>{
  if(!url){
      return null;
  }
  let urlData = new URL(url);
  // return urlData.searchParams.get('pub_id');
  let path_value = urlData.pathname.split('/').filter(segment => segment);
  return path_value[3];
}

exports.getPidLocation = ()=>{
  return {
      lop : 'path', // lop means locations of pid
      location : 3
  }
}

exports.apiCall = async (credentials, page, apilimit) => {
  if (credentials.api_key && credentials.client_id && credentials.pub_id) {
    let api_key = credentials['api_key'];
    let client_id = credentials['client_id'];
    let pub_id = credentials['pub_id'];
    let apiBaseurl = 'http://api.adosiz.com/api/offers/list_v5?client_id=' + client_id + '&pub_id=' + pub_id + '&limit=' + apilimit + '&page=';
    return await makeRequest({
      method: 'GET',
      url: apiBaseurl + page,
      headers: {
        'X-Api-Token': api_key,
        "User-Agent": `Proffcus_${new Date().getTime()}`
      }
    });
  } else {
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
      let result;
      do {
        result = await this.apiCall(content.credentials, page, limit);
        if (result) {
          valid = this.checkValid(result.data);
          if (valid === true) {
            let data = this.fetchResponse(result.data);
            content['domain'] = "adminapi.adosiz.com";
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

exports.checkValid = (result) => {
  if (result && result.status == true && result.message == 'success' && result.offers && result.offers.length) {
    return true;
  } else {
    return false;
  }
}

exports.fetchResponse = (result) => {
  return result.offers;
}
exports.traverseOffer = (result, content) => {
  let offers = {};

  for (let data of result)
    try {
      if (data) {
        let temp = formateOffers(data);
        if (temp.advertiser_offer_id) {
          temp = addExtraFields(temp, content);
          offers[temp.advertiser_offer_id] = temp;
        }
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
  if (data.camp_categories != null) {
    category.push(data.camp_categories);
  }
  return category;
}

function getOfferId(field, data) {
  let offer_id = '';
  if (data.camp_id) {
    offer_id = data.camp_id;
  }
  return offer_id;
}

function getOfferName(field, data) {
  let offer_name = '';
  if (data.camp_name)
    offer_name = data.camp_name;
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

function getCurrency(field, data) {
  let currency = 'USD';
  if (data.payout_curr) {
    currency = data.payout_curr;
  }
  return currency;
}

function getRedirectionMethod(field, data) {
  let method = 'javascript_redirect';
  return method;
}

function getThumbnail(field, data) {
  let thumbnail = '';
  return thumbnail;
}

function getDescription(field, data) {
  let description = '';
  return description;
}

function getKpi(field, data) {
  let kpi = '';
  if (data.camp_kpi != null) {
    kpi = data.camp_kpi;
  }
  return kpi;
}

function getPreviewUrl(field, data) {
  return data.camp_previewUrl || data.preview_url_android || data.preview_url_ios || '';
}

function getTrackingLink(field, data) {
  let tracking_link = '';
  if (data.creatives && data.creatives.length && data.creatives[0].click_tracker) {
    tracking_link = data.creatives[0].click_tracker;
  }
  return tracking_link;
}

function getExpiredUrl(field, data) {
  let expired_url = '';
  return expired_url;
}

function getStartDate(field, data) {
  let start_date = moment();
  try {
    if (data.camp_startDate && data.camp_startDate != null) {
      start_date = moment(data.camp_startDate, "YYYY/MM/DD");
      start_date = end_date.toISOString();
    }
  } catch {
    start_date = moment().add(1, "Y");
  }
  return start_date;
}

function getEndDate(field, data) {
  let end_date = moment().add(1, 'Y');
  try {
    if (data.camp_endDate && data.camp_endDate != null) {
      end_date = moment(data.camp_endDate, "YYYY/MM/DD");
      end_date = end_date.toISOString();
    }
  } catch {
    end_date = moment().add(1, "Y");
  }
  return end_date;
}

function getRevenue(field, data) {
  let revenue = 0.0;
  if (data.camp_payout)
    revenue = data.camp_payout;
  return revenue;

}

function getRevenueType(field, data) {
  let revenue_type = {
    enum_type: '',
    offer_type: ''
  };
  if (data.camp_type)
    revenue_type.offer_type = data.camp_type;
  return revenue_type;
}

function getPayout(field, data) {
  let payout = 0.0;
  if (data.camp_payout)
    payout = data.camp_payout;
  return payout;

}

function getPayoutType(field, data) {
  let payout_type = {
    enum_type: '',
    offer_type: ''
  };
  if (data.camp_type)
    payout_type.offer_type = data.camp_type;
  return payout_type;
}

function getApprovalRequired(field, data) {
  let approval_required = false;
  if(data.creatives && data.creatives.length)
  if (!data.creatives[0].click_tracker) {
    approval_required = true
  }
  return approval_required;
}

function getIsCapEnabled(field, data) {
  let cap_enable = false;
  if (data.capping)
    cap_enable = true;
  return cap_enable;
}

function getOfferCapping(field, data) {
  let cap = defaultCap();
  if (data.capping && data.capping.dailyCap) {
    cap.daily_conv = data.capping.dailyCap;
  }
  if (data.capping && data.capping.monthlyCap) {
    cap.monthly_conv = data.capping.monthlyCap;
  }
  if (data.capping && data.capping.totalCap) {
    cap.overall_conv = data.capping.totalCap;
  }

  if (data.capping && data.capping.daily_cap) {
    cap.daily_conv = data.capping.daily_cap;
  }
  if (data.capping && data.capping.montly_cap) {
    cap.monthly_conv = data.capping.montly_cap;
  }
  if (data.capping && data.capping.total_cap) {
    cap.overall_conv = data.capping.total_cap;
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
  if (data.camp_device || data.geo_country || data.geo_city || data.platform || data.platformVersion) {
    targeting_enable = true;
  }
  return targeting_enable;
}

function getGeoTargeting(field, data) {
  let geo_targeting = defaultGeoTargeting();
  if (data.geo_country != " ") {
    geo_targeting.country_allow.push(data.geo_country);
  }
  if (data.geo_city != " ") {
    geo_targeting.city_allow.push(data.geo_city);
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
  if (data.camp_device) {
    let device = data.camp_device.toLowerCase()
    device_targeting.device.push(device);
  }
  if (data.platform == 'android' || data.platform == 'ios') {
    device_targeting.os.push(data.platform);
    if (data.platformVersion != null) {
      device_targeting.os_version.push({ os: data.platform, version: data.platformVersion, version_condition: 'eq' })
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
  let tempcreative = [];
  if (data.creatives && data.creatives.length) {
    let create = defaultCreative();
    data.creatives.map(obj => {
      create.creative_id = obj.creativeId;
      create.name = obj.name;
      create.status = obj.status;
      create.creative_type = obj.type;
      create.creative_file = obj.click_tracker;
    })
  }
  return tempcreative;
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

function getOfferVisible(field, data) {
  let offer_visible = 'public';
  return offer_visible;
}

function getStatusLabel(field, data) {
  let status_label = 'unmanaged';
  if(data.creatives && data.creatives.length){
  if (data.creatives[0].click_tracker) { // clickTracker 
    status_label = "active";
  } else {
    status_label = "no_link";
  }
  }
  return status_label;
}


const adosiz = {
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
      let data = adosiz[action](field, offer);
      formatedOffer[field] = data;
    } catch (err) {
      debug(err);

    }
  })
  return formatedOffer;
}
