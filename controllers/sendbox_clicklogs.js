const Mongoose = require("mongoose");
const mongooseObjectId = Mongoose.Types.ObjectId;
const Response = require("../helpers/Response");
const puppeteer = require("puppeteer");
const axios = require("axios");
const postbackModel = require("../db/postback/Postback");
const url = require("url");
let sendbox_clicklogsModel = require("../db/sendbox_clicklogs");
let OfferModel = require("../db/offer/Offer");
let publisherModel = require("../db/publisher/Publisher");
let advertiserModel = require("../db/advertiser/Advertiser");
const { setRedisHashData } = require('../helpers/Redis');
const { filterHash, getCacheData } = require('../helpers/Functions');
const debug = require("debug")("darwin:Controller:sendbox_clicklogs");
const moment = require('moment');
const { payloadType } = require('../constants/config');


/**
 * Postback Testing function
 * @param {Object} req request object
 * @param {Object} res Response Object
 * @returns {Response} send response object with status code with msg
 */
exports.sendbox_clicklogs = async (req, res) => {

  try {
    if (!req.body.link || !req.user.userDetail) {
      let response = Response.error();
      response.msg = "Send Postback Link";
      return res.status(400).json(response);
    }
    var clickUrl = req.body.link;
    let trackerDomain = (req.user.userDetail.domain && req.user.userDetail.domain.tracker) ? req.user.userDetail.domain.tracker : "";
    let networkUniqueId = req.user.userDetail.network_unique_id || "";
    if (!trackerDomain || !networkUniqueId) {
      let response = Response.error();
      response.msg = "Send data with your token"
      return res.status(400).json(response);
    }

    const urls = [];
    const headers = { headless: true, timeout: 800000, ignoreHTTPSErrors: true, args: [], devtools: true };
    const browser = await puppeteer.launch(headers);
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    await page.setExtraHTTPHeaders({ "postback-test-click": "true" })

    let userAgent = await browser.userAgent()
    let obj = {
      network_id: req.user.userDetail.network[0],
      link: clickUrl,
      user_agent: userAgent,
      aff_sub1: "",
      aff_sub2: "",
      aff_sub3: "",
      aff_sub4: "",
      aff_sub5: "",
      aff_sub6: "",
      aff_sub7: "",
      source: "",
      payout: 0
    };

    let clickId = "";
    let domainFound = false;

    page.on('request', async (interceptedRequest) => {

      urls.push(interceptedRequest._url)
      let interceptedRequestUrl = new URL(interceptedRequest._url)
      let requestUrlDomain = interceptedRequestUrl.hostname

      if (requestUrlDomain === trackerDomain || requestUrlDomain === `${networkUniqueId}.g2prof.net`) {

        domainFound = true

        for (let paramsArr of interceptedRequestUrl.searchParams) {
          if (paramsArr[0] == "offer_id") {
            let dbResult = await OfferModel.getOneOffer({ _id: mongooseObjectId(paramsArr[1]) }, { offer_name: 1, _id: 0 });
            if (dbResult) {
              obj["offer_id"] = paramsArr[1];
              obj["offer_name"] = dbResult.offer_name || "";
            } else {
              await interceptedRequest.abort();
              await browser.close();
              let response = Response.error();
              response.msg = "Offer not found.";
              return res.status(200).json(response);
            }
          }
          if (paramsArr[0] == "aff_id") {
            let dbResult = await publisherModel.searchOnePublisher({ pid: paramsArr[1] }, { company: 1, _id: 0 });
            if (dbResult) {
              obj["publisher_id"] = paramsArr[1];
              obj["publisher_name"] = dbResult.company;
            } else {
              await interceptedRequest.abort();
              await browser.close();
              let response = Response.error();
              response.msg = "Publisher not found.";
              return res.status(200).json(response);
            }
          }
          if (paramsArr[0] == "adv_id") {
            let dbResult = await advertiserModel.searchOneAdvertiser({ _id: paramsArr[1] }, { company: 1, _id: 0 });
            if (dbResult) {
              obj["advertiser_id"] = paramsArr[1];
              obj["advertiser_name"] = dbResult.company;
            }
          }
          if (["aff_sub1", "aff_sub2", "aff_sub3", "aff_sub4", "aff_sub5", "aff_sub6", "aff_sub7", "source", "payout"].includes(paramsArr[0].trim())) {
            obj[paramsArr[0]] = paramsArr[1];
          }
        }
      }

      if (clickId) {
        let result = await sendbox_clicklogsModel.save_logs(obj);
        if (result) {
          let postbackResult = await hitOwnPostback(trackerDomain, clickId, networkUniqueId)
          if (postbackResult) {
            await interceptedRequest.abort();
            await browser.close();
            let response = Response.success();
            response.msg = postbackResult.data
            response.payload = urls
            return res.status(200).json(response);
          } else {
            await interceptedRequest.abort();
            await browser.close();
            let response = Response.error();
            response.msg = "Postback send error!"
            return res.status(200).json(response);
          }
        }
      }
      await interceptedRequest.continue();
    });
    page.on('response', (response) => {
      if (response._headers.click_id && domainFound) {
        clickId = response._headers.click_id;
      }
    });
    try {
      await page.goto(clickUrl, { timeout: 80000, waitUntil: "load" }); //default load
    } catch (err) { 
      console.log(" page.goto Error ", err );
    // debug(error)
    let response = Response.error();
    response.msg = "Somthing went wrong.";
    return res.status(500).json(response);

    }
    await browser.close();
  } catch (error) {
    debug(error)
    let response = Response.error();
    response.msg = "Somthing went wrong.";
    return res.status(500).json(response);
  }
};


async function hitOwnPostback(trackerDomain, clickId, networkUniqueId) {

  try {
    let postbackUrl;
    if (trackerDomain) {
      postbackUrl = `http://${trackerDomain}/pb/?click_id=${clickId}`
    } else if (networkUniqueId) {
      postbackUrl = `http://${networkUniqueId}.g2prof.net/pb/?click_id=${clickId}`
    }
    if (postbackUrl) {
      return await axios({ method: 'get', url: postbackUrl });
    }
  } catch (error) {
    debug(error)
  }
  return false;
}

async function makeRequest(method, url, headers) {
  try {
    let config = {
      method: method,
      url: url
    };
    return await axios(config);
  } catch (error) {
    console.log("errrrrrrrrrrrrrr", error);
  }
}
async function hitPostback(url, parm, obj) {
  const method = "POST";
  const postback_url = url + "?" + parm;
  try {
    let p_url = await replaceMacros(postback_url, obj);
    let p_result = await makeRequest(method, p_url);
    return p_result.data;
  } catch (error) {
    console.log(error);
    return false;
  }
}
function replaceMacros(url, offersField) {
  let updatedUrl = url;
  for (let key in offersField) {
    let regex = new RegExp("{" + key + "}", "g");
    updatedUrl = updatedUrl.replace(regex, offersField[key]);
  }
  return updatedUrl;
}


exports.getTestClick = async (req, res) => {

  let search = {};
  let projection = {};
  let invalidSearch = false;
  let sort = { createdAt: -1 };
  try {
    options = { sort: sort, limit: 10 };
    if (req.body.search) {
      if (req.body.search.offer_id !== undefined && req.body.search.offer_id != '') {
        if (mongooseObjectId.isValid(req.body.search.offer_id.trim())) {
          search['offer_id'] = mongooseObjectId(req.body.search.offer_id.trim());
        }
        else {
          invalidSearch = true;
        }
      }
      if (req.body.search.advertiser_id !== undefined && req.body.search.advertiser_id != '') {
        if (mongooseObjectId.isValid(req.body.search.advertiser_id.trim())) {
          search['advertiser_id'] = mongooseObjectId(req.body.search.advertiser_id.trim());
        }
        else {
          invalidSearch = true;
        }
      }
      if (req.body.search.publisher_id !== undefined && req.body.search.publisher_id != '') {
        if (req.body.search.publisher_id) {
          {
            search['publisher_id'] = +req.body.search.publisher_id;
          }
        }
        else {
          invalidSearch = true;
        }
      }
      if (req.body.search.offer_name !== undefined && req.body.search.offer_name !== '') {
        search['offer_name'] = { $regex: req.body.search.offer_name.trim(), $options: 'i' };
      }
      if (req.body.search.start_date !== undefined && req.body.search.start_date !== '') {
        search['createdAt'] = { $gte: moment(req.body.search.start_date.trim()).toDate(), $lte: moment(req.body.search.end_date.trim()).toDate() };
      }
    }
    if (invalidSearch) {
      let response = Response.error();
      response.msg = "No Click Log Found!!";
      response.error = ["no Click Log found"];
      return res.status(200).json(response);
    }
    if (req.body.projection !== undefined && req.body.projection !== {}) {
      projection['publisher_id'] = 1;
      projection['offer_name'] = 1;
      projection['advertiser_id'] = 1;
      projection['offer_id'] = 1;
      for (let item in req.body.projection) {
        projection[item] = 1;
      }
    }
    if (req.body.options !== undefined && req.body.options != {}) {
      if (req.body.options.limit !== undefined && req.body.options.limit != 0) {
        options['limit'] = req.body.options.limit;
        if (req.body.options.page !== undefined && req.body.options.page != 0) {
          options['skip'] = (req.body.options.page - 1) * req.body.options.limit;
        }
      }
    }
    if (req.body.sort && Object.keys(req.body.sort).length) {
      options['sort'] = req.body.sort;
    }
    search['network_id'] = mongooseObjectId(req.user.userDetail.network[0]);
    // let key = filterHash({ search: search, projection: projection, options:options});
    // let hash = req.path;
    // let result = await getCacheData(hash, key);
    let output = { result: [], totalclick: null };
    let result = await sendbox_clicklogsModel.getTestClickLogs(search, projection, options);
    if (result) {
      output['result'] = result;
      output['pageSize'] = req.body.options.limit;
      output['page'] = req.body.options.page;
      try {
        let count = await sendbox_clicklogsModel.getTotalPagesCount(search);
        debug(count);
        output['totalclick'] = count;
      }
      catch (err) {
        debug(err)
      }
      // setRedisHashData(hash, key, output, process.env.REDIS_OFFER_EXP)
    }
    // else {
    //   output = result;
    // }
    if (!result) {
      let response = Response.error();
      response.msg = "error while fetch data";
      return res.status(200).json(response);
    }
    if (output['result'].length == 0) {
      let response = Response.error();
      response.msg = "No Click List Found...!!";
      response.error = ["no Click List found"];
      return res.status(200).json(response);
    }
    let response = Response.success();
    response.payloadType = payloadType.object;
    response.payload = output;
    response.msg = "success";
    return res.status(200).json(response);


  } catch (err) {
    let response = Response.error();
    response.msg = "No Record Found!!";
    response.error = [err.message];
    return res.status(200).json(response);
  }
}
