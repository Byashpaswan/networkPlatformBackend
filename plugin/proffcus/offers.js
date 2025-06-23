// const {
//   InsertUpdateOffer,
//   makeRequest,
//   getOffersFields,
//   addExtraFields,
//   ImportantFields,
//   defaultLog,
//   mergeOfferLog,
//   lockOfferApiStats
// } = require("../plugin");
const plugin = require('../plugin')
const { InactiveApi } = require("../../helpers/Functions");
const debug = require("debug")("darwin:Plugin:proffcus");
const ENV_OFFERS_LIMIT = process.env.ENV_OFFERS_LIMIT;
const moment = require("moment");
// const limit = 500;
const limit = 5;
const OfferModel = require('../../db/offer/Offer');
const {PlatformModel} = require('../../db/platform/Platform')
exports.countApiPages = response => {
  let page = 0;
  try {
    if (response.nextPage) {
      return +response.nextPage
    }
    return page;
  } catch (err) {
    return 0;
  }
};

exports.getPid = (url) =>{
  if(!url){
      return null;
  }
  let urlData = new URL(url);
  return urlData.searchParams.get('aff_id');
}
exports.getPidLocation = ()=>{
  return {
      lop : 'query', // lop : locations of pid
      location : 'aff_id'
  }
}

exports.apiCall = async (credentials, page, apilimit) => {
  if (credentials.secretkey && credentials.apikey) {
    let secretkey = credentials["secretkey"];
    let apikey = credentials["apikey"];
    let apiBaseurl = `http://api.proffcus.com/publisher/offers/v2?limit=${apilimit}&page=${page}`
    debug(apiBaseurl)
    return await plugin.makeRequest({
      method: "get",
      url: apiBaseurl,
      headers: { 'Content-Type': 'application/json', 'apikey': apikey, 'secretkey': secretkey }
    });
  } else {
    return null;
  }
};
exports.offersApiCall = async content => {
  let valid = false;
  let offerLog = plugin.defaultLog();
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
            content['domain'] = "api.proffcus.com";
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
        totalPages = 0; // temp changes to block fetch api Offer from proffcus to proffcus. 
      } while (totalPages);
      // await this.allOffersApiCall(content, page)
      return resolve(true);
    } catch (err) {
      debug(err);
      await InactiveApi(content);
      await plugin.lockOfferApiStats(offerLog, content, start_time, remarks = `Fail, Api Response Error Msg : ${err}, Catch block, Page = ${page}`);
      return resolve(false);
    }
  });
};
exports.allOffersApiCall = async (content, prevPage) => {
  let valid = false;
  let offerLog = plugin.defaultLog();
  let start_time = moment();
  let page = 1;
  return new Promise(async (resolve, reject) => {
    try {
      let result;
      do {
        let apiBaseurl = `http://api.proffcus.com/publisher/offers/all?limit=${limit}&page=${page}`;
        debug(apiBaseurl)
        result = await plugin.makeRequest({
          method: "get",
          url: apiBaseurl,
          headers: { 'Content-Type': 'application/json', 'apikey': content['credentials']['apikey'], 'secretkey': content['credentials']['secretkey'] }
        });
        if (result) {
          valid = this.checkValid(result.data);
          if (valid === true) {
            let data = this.fetchResponse(result.data);
            content['domain'] = "api.proffcus.com";
            let offer = this.traverseOffer(data, content);
            let tempLog = await plugin.InsertUpdateOffer(plugin.ImportantFields, offer, content);
            page++;
            offerLog = plugin.mergeOfferLog(offerLog, tempLog);
          } else {
            await InactiveApi(content);
            await plugin.lockOfferApiStats(offerLog, content, start_time, remarks = `Fail, Api Response Status Code : ${result.status}, checkValid = false, Page = ${page + prevPage}`);
            return resolve(false);
          }
        } else {
          await InactiveApi(content);
          await plugin.lockOfferApiStats(offerLog, content, start_time, remarks = `Fail, Not Get Api Response, Reponse = null, Page = ${page + prevPage}`);
          return resolve(false);
        }
      } while (page * limit <= 5000);
      await plugin.lockOfferApiStats(offerLog, content, start_time, remarks = `Success, Api Response Status Code : ${result.status}, Page = ${page + prevPage}`);
      return resolve(true);
    } catch (err) {
      debug(err);
      await InactiveApi(content);
      await plugin.lockOfferApiStats(offerLog, content, start_time, remarks = `Fail, Api Response Error Msg : ${err}, Catch block, Page = ${page}`);
      return resolve(false);
    }
  });
};

exports.getSingleOfferInfo = async (content, advertiser_offer_id) => {
  try {
    if (content.credentials.apikey && content.credentials.secretkey) {
        let page = 1;
        let limit = 1; 
        let apiBaseurl = `http://api.proffcus.com/publisher/offers/v2?limit=${limit}&page=${page}&offer_id=${advertiser_offer_id}`;
        let result = await plugin.makeRequest({
            method: 'get',
            url: apiBaseurl,
            headers: { 'Content-Type': 'application/json', 'apikey': content['credentials']['apikey'], 'secretkey': content['credentials']['secretkey'] }
        });
        if (result) {
          valid = this.checkValid(result.data);
          if (valid === true) {
            let data = this.fetchResponse(result.data);
            content['domain'] = 'api.proffcus.com';
            if (!content['payout_percent']) {
              let platformData = await PlatformModel.getOnePlatform({ _id: content['advertiser_platform_id'] }, { payout_percent: 1 });
              if (platformData && platformData['payout_percent'] && +platformData['payout_percent']) {
                content['payout_percent'] = +platformData['payout_percent'];
              }
            }                   
                let offer = this.traverseOffer(data, content);
                let final_offer = null;                   
                if (offer && offer[advertiser_offer_id]) { 
                    final_offer =  plugin.addUpdateExtraFields(offer[advertiser_offer_id], plugin.ImportantFields);
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
exports.checkValid = result => {
  if (result && result.msg == 'Success' && result.payload && result.payload.length) {
    return true;
  } else {
    return false;
  }
};

exports.fetchResponse = result => {
  return result.payload;
};
exports.traverseOffer = (result, content) => {
  let offers = {};
  result.map(function (data) {
    try {
      if (data) {
        let temp = formateOffers(data);

        if (temp.advertiser_offer_id) {
          temp = plugin.addExtraFields(temp, content);
          if (offers[temp.advertiser_offer_id]) {
          }
          offers[temp.advertiser_offer_id] = temp;
        }
      }
    } catch (err) {
      debug(err);
      // console.log('error', err); //skip this offer
    }
  });
  return offers;
};

//api wise methods
function getCategory(field, data) {
  return data.category || [];
}

function getOfferId(field, data) {
  return data.offer_id || "";
}

function getOfferName(field, data) {
  return data.offer_name || "";
}

function getIsGoalEnabled(field, data) {
  return data.isgoalEnabled;
}

function getGoals(field, data) {
  return data.goal || [];
}

function defaultGoal() {
  let goal = {
    goal_id: "",
    name: "",
    type: "",
    tracking_method: "",
    tracking_link: "",
    status: "",
    payout_type: "",
    payout: 0,
    revenue: 0,
    description: ""
  };
  return goal;
}

function defaultCreative() {
  let creative = {
    creative_id: "",
    name: "",
    creative_type: "",
    width: 0,
    height: 0,
    landing_page_url: "",
    tracking_link: "",
    creative_file: "",
    status: "",
    description: ""
  };
  return creative;
}

function getCurrency(field, data) {
  return data.currency || "USD";
}

function getRedirectionMethod(field, data) {
  return "javascript_redirect";
}

function getThumbnail(field, data) {
  return data.thumbnail || "";
}

function getDescription(field, data) {
  return data.description || "";
}

function getKpi(field, data) {
  return data.kpi || "";
}

function getPreviewUrl(field, data) {
  return data.preview_url || "";
}

function getTrackingLink(field, data) {
  return data.tracking_link || "";
}

function getExpiredUrl(field, data) {
  return "";
}

function getStartDate(field, data) {
  return moment().toDate();
}

function getEndDate(field, data) {
  return moment().add(1, "Y").toDate();
}

function getRevenue(field, data) {
  return data.payout || 0.0;
}

function getRevenueType(field, data) {
  return data.payout_type || { enum_type: "", offer_type: "" };
}

function getPayout(field, data) {
  return data.payout || 0.0;
}

function getPayoutType(field, data) {
  return data.payout_type || { enum_type: "", offer_type: "" };
}

function getApprovalRequired(field, data) {
  return data.tracking_link ? true : false;
}

function getIsCapEnabled(field, data) {
  return false;
}

function getOfferCapping(field, data) {
  return defaultCap();
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
  };
  return cap;
}

function getIsTargeting(field, data) {
  return data.isTargeting;
}

function getGeoTargeting(field, data) {
  return data.geo_targeting || defaultGeoTargeting();
}

function defaultGeoTargeting() {
  let geo_targeting = {
    country_allow: [],
    country_deny: [],
    city_allow: [],
    city_deny: []
  };
  return geo_targeting;
}

function getDeviceTargeting(field, data) {
  return data.device_targeting || defaultDeviceTargeting();
}

function defaultDeviceTargeting() {
  let device_targeting = {
    device: [],
    os: [],
    os_version: []
  };
  return device_targeting;
}

function getCreative(field, data) {
  return data.creative || [];
}

function getOfferVisible(field, data) {
  return "public";
}

function getStatusLabel(field, data) {
  let status_label = "unmanaged";
  if (data.tracking_link) {
    status_label = "active";
  } else {
    status_label = "no_link";
  }
  return status_label;
}

const proffcus = {
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
};

function formateOffers(offer) {
  let formatedOffer = {};
  array = plugin.getOffersFields("", "");
  array.map(function (obj) {
    try {
      let field = obj.field;
      let action = obj.action;
      let data = proffcus[action](field, offer);
      formatedOffer[field] = data;
    } catch (err) {
      debug(err);
    }
  });
  return formatedOffer;
}
