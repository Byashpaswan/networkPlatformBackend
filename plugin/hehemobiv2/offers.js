const { InsertUpdateOffer, makeRequest, getOffersFields, addExtraFields, ImportantFields, defaultLog, mergeOfferLog, lockOfferApiStats } = require('../plugin');
const { InactiveApi, ActiveApi } = require('../../helpers/Functions');
const globalConfig = require("../../constants/Global");

const debug = require("debug")("darwin:Plugin:hehemobiv2");
const ENV_OFFERS_LIMIT = process.env.ENV_OFFERS_LIMIT;
const moment = require('moment');
const limit = 5000;

exports.getPid = (url) =>{
  if(!url){
      return null;
  }
  let urlData = new URL(url);
  return urlData.searchParams.get('aff');
}
exports.getPidLocation = ()=>{
  return {
      lop : 'query', // lop means locations of pid
      location : 'aff'
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

exports.apiCall = async (credentials, page, apilimit) => {
  if (credentials.token && credentials.network_id) {
    let apiBaseurl = `http://${credentials.network_id}/v4/offer/get?code=${credentials.token}&page_size=${apilimit}&page=${page}`

    return await makeRequest({
      method: 'get',
      url: apiBaseurl
    });
  } else {
    return null;
  }
}
exports.checkValid = (result) => {
  if (result && result.success && result.offers && result.offers.length) {
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
  let page = 0;
  if (result.total && result.current_page && result.page_size && (result.total > (result.current_page * result.page_size))) {
    page = parseInt(result.total / result.page_size);
  }
  return page;
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
  let category = [];
  if (data.offer_category) {
    category = data.offer_category;
  }
  return category;
}

function getIsGoalEnabled(field, data) {
  let goal_enable = false;
  if (data.cap_payouts && data.cap_payouts.length && data.cap_payouts.length > 1) {
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
  let goals = [];
  if (data.cap_payouts && data.cap_payouts.length && data.cap_payouts.length > 1) {
    for (const obj of data.cap_payouts) {
      let tmpGoal = defaultGoal();
      tmpGoal['payout'] = +obj.payout;
      tmpGoal['revenue'] = +obj.payout;
      tmpGoal['name'] = +obj.event_name;
      goals.push(tmpGoal)
    }
  }
  return goals;
}

function getCurrency(field, data) {
  let currency = 'USD';
  if (data.currency) {
    currency = data.currency;
  }
  return currency;
}

function getThumbnail(field, data) {
  let thumbnail = '';
  return thumbnail;
}

function getDescription(field, data) {
  let description = '';
  if (data.offer_description) {
    description = data.offer_description;
  }
  return description;
}

function getKpi(field, data) {
  let kpi = '';
  if (data.conversion_flow) {
    kpi = data.conversion_flow;
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
  if (data.tracking_link) {
    tracking_link = data.tracking_link;
  }
  return tracking_link;
}

function getExpiredUrl(field, data) {
  let expired_url = '';
  return expired_url;
}

function getStartDate(field, data) {
  let start_date = moment().toDate();
  return start_date;
}

function getEndDate(field, data) {
  let end_date = moment().add(1, 'Y').toDate();
  return end_date;
}

function getRevenue(field, data) {
  let revenue = 0.0;
  if (data.cap_payouts && data.cap_payouts.length) {
    revenue = +data.cap_payouts[0]['payout'];
    if (data.cap_payouts.length > 1) {
      for (const obj of data.cap_payouts) {
        if (revenue > +obj.payout) {
          revenue = +obj.payout;
        }
      }
    }
  }
  return revenue;
}
function getRevenueType(field, data) {
  let revenue_type = {
    enum_type: '',
    offer_type: ''
  };
  return revenue_type;
}

function getPayout(field, data) {
  let payout = 0.0;
  if (data.cap_payouts && data.cap_payouts.length) {
    payout = +data.cap_payouts[0]['payout'];
    if (data.cap_payouts.length > 1) {
      for (const obj of data.cap_payouts) {
        if (payout > +obj.payout) {
          payout = +obj.payout;
        }
      }
    }
  }
  return payout;
}
function getPayoutType(field, data) {
  let payout_type = {
    enum_type: '',
    offer_type: ''
  };
  return payout_type;
}

function getApprovalRequired(field, data) {
  let approval_required = false;
  if (!data.tracking_link) {
    approval_required = true
  }
  return approval_required;
}

function getIsCapEnabled(field, data) {
  let cap_enable = false;
  if (data.total_click_cap > 0)
    cap_enable = true;
  return cap_enable;
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
  if (data.total_click_cap > 0) {
    cap.overall_click = data.total_click_cap;
  }
  return cap;
}

function getIsTargeting(field, data) {
  let targeting_enable = false;
  if ((data.countries && data.countries.length) || data.os_min_version || data.platforms) {
    targeting_enable = true;
  }
  return targeting_enable;
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
    for (let country of data.countries) {
      geo_targeting.country_allow.push({
        key: country,
        value: country
      });
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
  if (data.platforms && data.platforms.length) {
    for (const os of data.platforms) {
      if (!device_targeting.os.includes(os.toLowerCase()) && globalConfig.config.OS.includes(os.toLowerCase())) {
        device_targeting.os.push(os.toLowerCase())
        if (os.toLowerCase() == 'android' && data.os_min_version) {
          device_targeting.os_version.push({ os: 'android', version: data.os_min_version, version_condition: 'gte' });
        }
        if (os.toLowerCase() == 'ios' && data.os_min_version) {
          device_targeting.os_version.push({ os: 'ios', version: data.os_min_version, version_condition: 'gte' });
        }
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
  let creatives = [];
  if (data.creatives && data.creatives.length) {
    let tmpCreative = defaultCreative();
    for (const obj of data.creatives) {
      tmpCreative['creative_id'] = obj.id;
      tmpCreative['creative_file'] = obj.url;

      let pixel = obj.pixel.split('x');
      if (pixel.length) {
        tmpCreative['width'] = pixel[0] > pixel[1] ? pixel[1] : pixel[0];
        tmpCreative['height'] = pixel[0] > pixel[1] ? pixel[0] : pixel[1];
      }
      creatives.push(tmpCreative)
    }
  }
  return creatives;
}

function getOfferVisible(field, data) {
  let offer_visible = 'public';
  return offer_visible;
}

function getStatusLabel(field, data) {
  let status_label = 'unmanaged';
  if (data.tracking_link) {
    status_label = "active";
  } else {
    status_label = "no_link";
  }
  return status_label;
}

function getRedirectionMethod(field, data) {
  let method = 'javascript_redirect';
  return method;
}

const hehemobiv2 = {
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
      let data = hehemobiv2[obj.action](obj.field, offer);
      formattedOffer[obj.field] = data;
    } catch (err) {
      debug(err);
    }
  })
  return formattedOffer;
}
