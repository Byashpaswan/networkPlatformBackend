const Mongoose = require('mongoose');
const mongooseObjectId = Mongoose.Types.ObjectId;
const { ConversionModel, ClickLogModel } = require('../../../db/click/clickLog');
const { ConversionFailed } = require('../../../db/conversion/conversionFailed')
const debug = require("debug")("darwin:Controller:Conversion");

const clickSummaryModel = require('../../../db/click/clickSummary');
const PostbackModel = require('../../../db/postback/Postback');
const Response = require('../../../helpers/Response');
const { payloadType } = require('../../../constants/config');
// const moment = require('moment');
const moment = require("moment-timezone");
const { setRedisHashData } = require('../../../helpers/Redis');
const { filterHash, getCacheData } = require('../../../helpers/Functions');
const axios = require('axios');
const {LiveDaily_AdvertiserOfferPublisherSourceSummary,LiveAdvOffPubSouSummaryModel}=require('../../../db/click/sourceSummary/sourceSummary')
const Network=require('../../../db/network/Network')
const Redis=require('../../../helpers/Redis');

exports.getConversionSummary = async (req, res) => {
    let search = {};
    let projection = {};
    let groupprojection = {};
    let limit = 100;
    let skip = 0;
    let page = 1;
    let options = {};
    let group = false;
    let sort = { "_id.year": -1, "_id.month": -1, "_id.day": -1 };
    try {
        if (req.user_category == 'advertiser') {
            search["advertiser_id"] = req.user.userDetail.parentId;
        } else if (req.user_category == 'network') {
            if (req.loginType == 'advertiser') {
                search["advertiser_id"] = req.loginId;
            }
            if (req.loginType == 'publisher') {
                search["publisher_id"] = +req.accountid;
            }
            else {
                if (!req.permissions.includes("adv.list")) {
                    // if (req.user.userDetail.parentId.length && req.advertiser.length) {
                    advertiser = req.advertiser.map(data => data.id);
                    search["advertiser_id"] = { $in: advertiser };
                }
            }
        }
        else if (req.user_category == 'publisher') {
            search['publisher_id'] = +req.accountid;
        }
        if (req.body.search) {
            if (req.body.search.publisher_id) {
                {
                    search['publisher_id'] = +req.body.search.publisher_id;
                }
            }
            if (req.body.search.advertiser_id) {
                search['advertiser_id'] = mongooseObjectId(req.body.search.advertiser_id.trim());
            }
            if (req.body.search.offer_id) {
                if (mongooseObjectId.isValid(req.body.search.offer_id.trim())) {
                    search['offer_id'] = mongooseObjectId(req.body.search.offer_id.trim());
                }
                else {
                    search['offer_name'] = { $regex: req.body.search.offer_id.trim(), $options: 'i' };
                }
            }
            if (req.body.search.start_date) {
                search['createdAt'] = { $gte: moment(req.body.search.start_date.trim()).toDate(), $lte: moment(req.body.search.end_date.trim()).toDate() };
            }
        }
        if (req.body.projection) {
            if (req.body.projection.Offer) {
                projection["offer_id"] = "$offer_id";
                projection["offer_name"] = "$offer_name";
                group = true;
            }
            if (req.body.projection.Publisher) {
                projection["publisher_id"] = "$publisher_id";
                group = true;
            }
            if (req.body.projection.Advertiser) {
                projection["advertiser_id"] = "$advertiser_id";
                group = true;

            }
            if (req.body.projection.Day) {
                projection["year"] = { $year: "$TimeSlot" };
                projection["month"] = { $month: "$TimeSlot" };
                projection["day"] = { $dayOfMonth: "$TimeSlot" };
                group = true;

            }
            else if (req.body.projection.Month) {
                projection["year"] = { $year: "$TimeSlot" };
                projection["month"] = { $month: "$TimeSlot" };
                group = true;
            }
            if (!group) {
                projection["year"] = { $year: "$TimeSlot" };
                projection["month"] = { $month: "$TimeSlot" };
                projection["day"] = { $dayOfMonth: "$TimeSlot" };
            }

        }
        groupprojection['_id'] = projection;
        groupprojection['count'] = { $sum: 1 };
        groupprojection['total_payout'] = { $sum: { $cond: [{ $gt: ["$conversion", 0] }, "$payout", 0] } };
        groupprojection['total_revenue'] = { $sum: { $cond: [{ $gt: ["$conversion", 0] }, "$revenue", 0] } };
        // if (req.params.reportType == 'conversion') {
        groupprojection['total_conversion'] = { $sum: "$conversion" };
        // }
        // else {
        groupprojection['total_click'] = { $sum: "$click" };
        // }
        if (req.body.options && req.body.options != {}) {
            if (req.body.options.limit && req.body.options.limit != 0) {
                limit = +req.body.options.limit;
                if (req.body.options.page && req.body.options.page != 0) {
                    page = +req.body.options.page;
                    skip = (page - 1) * limit;
                }
            }
        }

        if (req.body.sort && Object.keys(req.body.sort).length) {
            sort = {};
            sort = req.body.sort;
        }

        search['network_id'] = mongooseObjectId(req.user.userDetail.network[0]);
        options['limit'] = limit;
        options['skip'] = skip;
        options['sort'] = sort;
        // let key = filterHash({ search:search, projection:projection, limit:options['limit'], skip:options['skip'], sort:options['sort'] });
        // let hash = req.path;
        // debug(key,hash)
        // let result = await getCacheData(hash, key);
        let result = await clickSummaryModel.getSummaryDaily(search, groupprojection, limit, skip, sort);
        let output = { data: {}, sum: {} };
        if (result) {
            output['data'] = result;
            output['page'] = page;
            output['pageSize'] = limit;
            try {
                sumReport = await clickSummaryModel.getReportSummary(search);
                if (sumReport) {
                    output['sum'] = sumReport[0]
                }
            }
            catch {
            }
            try {
                let countProj = { _id: groupprojection['_id'] }
                let countRes = await clickSummaryModel.getSummaryCount(search, countProj);
                if (countRes && countRes.length) {
                    output['total'] = countRes[0].total;
                }
            }
            catch (e) {
                debug(e)
            }
            // setRedisHashData(hash, key, output, process.env.REDIS_OFFER_EXP)
        }
        // else {
        //     output = result;
        // }

        if (!result) {
            let response = Response.error();
            response.msg = "error while fetch data";
            return res.status(200).json(response);
        }

        if (output['data'].length == 0) {
            let response = Response.error();
            response.msg = "No Record Found!!";
            response.error = ["no Record found"];
            return res.status(200).json(response);
        }
        let response = Response.success();
        response.payloadType = payloadType.object;
        response.payload = output;
        response.msg = "success";
        return res.status(200).json(response);
    }
    catch (e) {
        debug(e.message)
        let response = Response.error();
        response.msg = "No Record Found!!";
        response.error = [e.message];
        return res.status(200).json(response);
    }
}
exports.getConversion = async (req, res) => {
    let search = {};
    let projection = {}
    let invalidSearch = false;
    let sort = { "_id.year": -1, "_id.month": -1, "_id.day": -1 };
    try {
        options = { sort: sort, limit: 10 };
        if (req.user_category == 'advertiser') {
            search["advertiser_id"] = req.user.userDetail.parentId;
        } else if (req.user_category == 'network') {
            if (req.loginType == 'advertiser') {
                search["advertiser_id"] = req.loginId;
            }
            if (req.loginType == 'publisher') {
                search["publisher_id"] = +req.accountid;
            }
            else {
                if (!req.permissions.includes("adv.list")) {
                    // if (req.user.userDetail.parentId.length && req.advertiser.length) {
                    advertiser = req.advertiser.map(data => data.id);
                    search["advertiser_id"] = { $in: advertiser };
                }
            }
        }
        else if (req.user_category == 'publisher') {
            search['publisher_id'] = +req.accountid;
        }
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
            if (req.body.search.click_id) {
                search['click_id'] = req.body.search.click_id.trim();
                if (search.createdAt) {
                    delete search.createdAt;
                }
            }
        }
        if (invalidSearch) {
            let response = Response.error();
            response.msg = "No Conversion Log Found!!";
            response.error = ["no Conversion Log found"];
            return res.status(200).json(response);
        }
        if (req.body.projection !== undefined && req.body.projection !== {}) {
            projection['advertiser_id'] = 1;
            projection['publisher_id'] = 1;
            projection['offer_name'] = 1;
            projection['click_id'] = 1;
            projection['payout_click'] = 1;
            projection['device_type'] = 1;
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
            // sort = {};
            options['sort'] = req.body.sort;
        }
    }
    catch (err) {
        let response = Response.error();
        response.msg = "No Record Found!!";
        response.error = [err.message];
        return res.status(200).json(response);
    }
    search['network_id'] = mongooseObjectId(req.user.userDetail.network[0]);
    try {
        //     let key = filterHash({ search: search, projection: projection, limit: options['limit'], skip:options['skip'], sort:options['sort'] });
        //     let hash = req.path;
        //     let result = await getCacheData(hash, key);
        let output = { result: [], totalconversion: null }
        let result = await ConversionModel.getLogConversion(search, projection, options)
        if (result) {
            output['result'] = result;
            output['pageSize'] = req.body.options.limit;
            output['page'] = req.body.options.page;
            try {
                let count = await ConversionModel.getTotalPagesCount(search);
                output['totalconversion'] = count;
            }
            catch (err) {
            }
            // setRedisHashData(hash, key, output, process.env.REDIS_OFFER_EXP)
        }
        // else {
        //     output = result;
        // }
        if (!result) {
            let response = Response.error();
            response.msg = "error while fetch data";
            return res.status(200).json(response);
        }
        if (output['result'].length == 0) {
            let response = Response.error();
            response.msg = "No Conversion List Found...!!";
            response.error = ["no Conversion List found"];
            return res.status(200).json(response);
        }
        let response = Response.success();
        response.payloadType = payloadType.object;
        response.payload = output;
        response.msg = "success";
        return res.status(200).json(response);
    }
    catch (err) {
        debug(e)
        let response = Response.error();
        response.error = [err.message];
        response.msg = "Error Occured"
        return res.status(200).json(response);
    }
}

exports.getClick = async (req, res) => {
    try {
        let [search, projection, options, invalidSearch] = [{}, {}, {}, false];

        if (req.user_category == 'advertiser') {
            search["advertiser_id"] = req.user.userDetail.parentId;
        } else if (req.user_category == 'network') {
            if (req.loginType == 'advertiser') {
                search["advertiser_id"] = req.loginId;
            }
            if (req.loginType == 'publisher') {
                search["publisher_id"] = +req.accountid;
            }
            else {
                if (!req.permissions.includes("adv.list")) {
                    // if (req.user.userDetail.parentId.length && req.advertiser.length) {
                    advertiser = req.advertiser.map(data => data.id);
                    search["advertiser_id"] = { $in: advertiser };
                }
            }
        }
        else if (req.user_category == 'publisher') {
            search['publisher_id'] = +req.accountid;
        }

        if (req.body.search) {
            if (req.body.search.click_id) {
                search['click_id'] = req.body.search.click_id;
                if (search["advertiser_id"]) delete search["advertiser_id"];
                if (search['publisher_id']) delete search['publisher_id'];
            } else {
                if (req.body.search.publisher_id !== undefined && req.body.search.publisher_id != '') {
                    if (req.body.search.publisher_id) {
                        search['publisher_id'] = +req.body.search.publisher_id;
                    } else {
                        invalidSearch = true;
                    }
                }
                if (req.body.search.offer_id !== undefined && req.body.search.offer_id != '') {
                    if (mongooseObjectId.isValid(req.body.search.offer_id.trim())) {
                        search['offer_id'] = mongooseObjectId(req.body.search.offer_id.trim());
                    } else {
                        invalidSearch = true;
                    }
                }
                search['network_id'] = mongooseObjectId(req.user.userDetail.network[0]);
                search['createdAt'] = { $gte: moment().startOf("D").toDate(), $lte: moment().toDate() };
                if (req.body.search.start_date !== undefined && req.body.search.start_date !== '') {
                    search['createdAt'] = { $gte: moment(req.body.search.start_date.trim()).toDate(), $lte: moment(req.body.search.end_date.trim()).toDate() };
                }
                if (req.body.search.offer_name !== undefined && req.body.search.offer_name !== '') {
                    search['offer_name'] = { $regex: req.body.search.offer_name.trim(), $options: 'i' };
                }

                options = { sort: { createdAt: -1 }, limit: 10, skip: 0 }
            }
        } else {
            search['network_id'] = mongooseObjectId(req.user.userDetail.network[0]);
            search['createdAt'] = { $gte: moment().startOf("D").toDate(), $lte: moment().toDate() };
            options = { sort: { createdAt: -1 }, limit: 10, skip: 0 }
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
            projection['click_id'] = 1;
            projection['platform'] = 1;
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

        let output = { result: [], totalclick: null };
        let result = await ClickLogModel.getLogClick(search, projection, options);
        if (result) {
            output['result'] = result;
            output['pageSize'] = req.body.options.limit;
            output['page'] = req.body.options.page;
            try {
                let count = await ClickLogModel.getTotalPagesCount(search);
                output['totalclick'] = count;
            } catch (err) {
                debug(err)
            }
        }
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
    } catch (error) {
        let response = Response.error();
        response.msg = "No Record Found!!";
        response.error = [error.message];
        return res.status(200).json(response);
    }
}

exports.getConversionFailed = async (req, res) => {
    try {
        let filter = {
            network_id: req.user.userDetail.network[0]
        };
        let projection = {
            click_id: 1,
            offer_id: 1,
            publisher_id: 1,
            advertiser_name: 1,
            request_ip: 1,
            requested_url: 1,
            referral_url: 1,
            useragent: 1,
            remarks: 1,
            createdAt: 1
        }
        let options = { sort: { createdAt: -1 }, limit: 100, skip: 0 };
        if (req.body.search) {
            if (req.body.search.start_date && req.body.search.end_date) {
                filter['createdAt'] = {
                    $gte: moment(req.body.search.start_date).startOf('day').toDate(),
                    $lte: moment(req.body.search.end_date).endOf('day').toDate()
                };
            }
            if (req.body.search.offer_id && req.body.search.offer_id.trim()) {
                filter['offer_id'] = req.body.search.offer_id.trim();
            }
            if (req.body.search.publisher_id && req.body.search.publisher_id.trim()) {
                filter['publisher_id'] = +req.body.search.publisher_id.trim();
            }
            if (req.body.search.click_id && req.body.search.click_id.trim()) {
                filter['click_id'] = req.body.search.click_id.trim();
            }
            if (req.body.search.remark_status) {
                filter['status'] = +req.body.search.remark_status;
            }
        }

        if (req.body.options) {
            if (req.body.options.limit) {
                options['limit'] = +req.body.options.limit;
            }
            if (req.body.options.page) {
                options['skip'] = (+req.body.options.page - 1) * options['limit'];
            }
            if (req.body.options.sort) {
                options['sort'] = req.body.options.sort;
            }
        }

        let data = await ConversionFailed.getConversionFailedLog(filter, projection, options);
        let count = await ConversionFailed.countConversionFailed(filter);

        let response = Response.success();
        response.payload = { data: data, count: count };
        response.msg = "Data fetched successfully!";
        return res.status(200).json(response);
    } catch (err) {
        let response = Response.error();
        response.msg = "Something went wrong. Please try again!";
        response.error = [err.message];
        return res.status(200).json(response);
    }
}

exports.approvePendingConversions = async (req, res) => {
    // req.setTimeout(300000);
    let search = {};
    let update = {}
    try {
        search['_id'] = { $in: req.body.conversions };
        search['network_id'] = mongooseObjectId(req.user.userDetail.network[0]);
        update['publisher_conversion'] = 1;
        await ConversionModel.updateConversion(search, update).then(async (result) => {
            if (result.nModified > 0) {

                let conversionDetails = await ConversionModel.getLogConversion(search, { "goals_count": 1, "network_id": 1, "publisher_id": 1, "goal_id": 1, "aff_sub1": 1, "aff_sub2": 1, "aff_sub3": 1, "aff_sub4": 1, "aff_sub5": 1, "aff_sub6": 1, "aff_sub7": 1, "aff_source": 1, "payout_click": 1, "goals": 1, "click_id": 1, "offer_id": 1 })

                if (conversionDetails.length) {
                    for (const conversionDetail of conversionDetails) {
                        this.handleAffMultiplePostback(conversionDetail)
                    }
                }
                let response = Response.success();
                response.payloadType = payloadType.object;
                response.payload = result;
                response.msg = "Publisher Conversion approved successfully!!!";
                return res.status(200).json(response);
            } else {
                let response = Response.error();
                response.msg = "No record found!!!";
                response.error = ["No record found"];
                return res.status(200).json(response);
            }
        });

    } catch (err) {
        let response = Response.error();
        response.msg = "Something went wrong, Try again!!!";
        response.error = [err.message];
        return res.status(200).json(response);
    }
}

exports.handleAffMultiplePostback = async (conversionDetails) => {

    try {

        let postbackHitCount = 0;
        let postbackHitStatus = [];
        let link = ''
        let allPostback = await PostbackModel.getPostback({ network_id: conversionDetails.network_id, publisher_id: conversionDetails.publisher_id }, { endpoint: 1, parm: 1, token: 1 });

        if (allPostback && allPostback.length > 0) {
            allPostback.forEach(async (postback) => {
                if (postback && postback.endpoint && postbackHitCount < 5) {
                    let url = postback.endpoint + "?" + postback.parm;
                    link = this.replaceMacros(url, conversionDetails);
                    let status = await this.hitPostback(link);
                    if (status) {
                        postbackHitStatus.push(status);
                    }
                    postbackHitCount = postbackHitCount + 1;
                }
            });
        }
        if (postbackHitStatus.length > 0) {
            let status_b = await ConversionModel.updateRemark({ network_id: mongoObjectId(conversionDetails.network_id), offer_id: mongoObjectId(conversionDetails.offer_id), publisher_id: conversionDetails.publisher_id, click_id: conversionDetails.click_id }, { status_remark: JSON.stringify(postbackHitStatus[0]), postback_url: link }, {});
        }
    } catch (error) {
        console.log("controllers:reports:handleAffMultiplePostback", error);
    }
}

exports.replaceMacros = (url, conversionDetails) => {
    try {
        let updatedUrl = url;
        for (let key in conversionDetails) {
            let regex = new RegExp("{" + key + "}", "g");
            updatedUrl = updatedUrl.replace(regex, conversionDetails[key]);
        }
        return updatedUrl;
    } catch (error) {
        console.log("controllers:reports:replaceMacros", err);
    }
}

exports.hitPostback = async (url) => {
    try {
        let res = await axios({
            method: 'get',
            url: url,
        });
        if (res && res.data) {
            return res.data;
        }
        return 'Postback hit but no response';
    }
    catch (err) {
        console.log("controllers:reports:hitPostback", err);
        if (err.response && err.response.data) {
            return err.response.data;
        }
        else {
            return 'error receiving postback response';
        }
    }
}
exports.changeStatusConversion=async(req,res)=>{
    let search={}
    let update={}
    try {
        console.log("req.body--",req.body)
        search['_id']={$in:req.body.conversions}
        search['network_id']=mongooseObjectId(req.user.userDetail.network[0]);
        if(req.body.status=='approved'){
            update['publisher_conversion']=1;
            await ConversionModel.updateConversion(search,update).then(async (result)=>{
            if(result.nModified>0){
                let conversionDetails=await ConversionModel.getLogConversion(search,{ "goals_count": 1, "network_id": 1, "publisher_id": 1, "goal_id": 1, "aff_sub1": 1, "aff_sub2": 1, "aff_sub3": 1, "aff_sub4": 1, "aff_sub5": 1, "aff_sub6": 1, "aff_sub7": 1, "aff_source": 1, "payout_click": 1, "goals": 1, "click_id": 1, "offer_id": 1,'createdAt':1,'advertiser_offer_id':1,"hold_revenue":1,"ad_source":1,"final_payout":1});
                if(conversionDetails.length){
                    // handle postback fire   1
                    for (const conversionDetail of conversionDetails) {
                        this.handleAffMultiplePostback(conversionDetail)
                    }

                     //handle resport accordingly 
                    //  this.handleReport(conversionDetails,req.body.status);

                }


                let response = Response.success();
                response.payloadType = payloadType.object;
                response.payload = result;
                response.msg = "Publisher Conversion approved successfully!!!";
                return res.status(200).json(response);
            } else {
                let response = Response.error();
                response.msg = "No record found!!!";
                response.error = ["No record found"];
                return res.status(200).json(response);
            }
             })

        }

        // else{
        //  update['publisher_conversion']=-1;
        //  await ConversionModel.updateConversion(search,update).then(async (result)=>{
        //     if(result.nModified>0){
        //         let conversionDetails=await ConversionModel.getLogConversion(search,{ "goals_count": 1, "network_id": 1, "publisher_id": 1, "goal_id": 1, "aff_sub1": 1, "aff_sub2": 1, "aff_sub3": 1, "aff_sub4": 1, "aff_sub5": 1, "aff_sub6": 1, "aff_sub7": 1, "aff_source": 1, "payout_click": 1, "goals": 1, "click_id": 1, "offer_id": 1,'createdAt':1,'advertiser_offer_id':1,"final_payout":1 });
        //         if(conversionDetails.length){
        //             console.log("conversionDetails--",conversionDetails)
        //             // handle postback fire   1
        //             for (const conversionDetail of conversionDetails) {
        //                 this.handleAffMultiplePostback(conversionDetail)
        //             }
        //              //handle resport accordingly  2
        //             //  this.handleReport(conversionDetails,req.body.status)

        //         }


        //         let response = Response.success();
        //         response.payloadType = payloadType.object;
        //         response.payload = result;
        //         response.msg = "Publisher Conversion rejected successfully!!!";
        //         return res.status(200).json(response);
        //     } else {
        //         let response = Response.error();
        //         response.msg = "No record found!!!";
        //         response.error = ["No record found"];
        //         return res.status(200).json(response);
        //     }
        //  })

        // }

        
    } catch (error) {
        let response=Response.error();
        response.msg='something went wrong';
        response.err=[error.message]
        return res.status(200).json(response);
        
    }
}

exports.handleReport = async (convData, status) => {
    try {
        for (let item of convData) {
            const search1 = {
                network_id: mongooseObjectId(item.network_id),
                source:item['ad_source'],
                offer_id: item.offer_id,
                publisher_id: item.publisher_id,
            };

            const search2 = {
                N_id: mongooseObjectId(item.network_id),
                source:item['ad_source'],
                oId: item.offer_id,
                pid: item.publisher_id,
            };

            const timeSlot1 = getTimeSlote1(item.createdAt);
            const timeSlot2 = await getTimeSlote(item.createdAt, item.network_id);

            if (timeSlot1) {
                search1.timeSlot = timeSlot1;
            }

            if (timeSlot2) {
                search2.slot = timeSlot2;
            }

            // initialize update objects
            const update1 = { $inc: {} };
            const update2 = { $inc: {} };

            if (status === 'approved') {
                // update1.$inc.conversion = 1
                // update2.$inc.conv = 1;

                update1.$inc.publisher_conversion = 1
                update1.$inc.hConv = 1
                update1.$inc.pRev = parseFloat(item['revenue_click']);
                update1.$inc.hRev = -parseFloat(item['revenue_click']);
                update1.$inc.publisher_payout = parseFloat(item['final_payout']);
                update1.$inc.hPay = -parseFloat(item['final_payout']);

                update2.$inc.pConv = 1
                update2.$inc.hConv = -1;
                update2.$inc.pRev =  parseFloat(item['revenue_click']);
                update2.$inc.hRev = -parseFloat(item['revenue_click']);
                update2.$inc.pPay =  parseFloat(item['final_payout']);
                update2.$inc.hPay = -parseFloat(item['final_payout']);



            } 
            // else if (status === 'reject') {
            //     update1.$inc.conversion = -1;
            //     update2.$inc.conv = -1;
            //     update1.$inc.hold_revenue = -1;
            //     update2.$inc.hRev = -1;
            // }

            // console.log("search1:", search1);
            // console.log("search2:", search2);
            // console.log("update1:", update1);
            // console.log("update2:", update2);

            // Uncomment below after confirming correctness
            await LiveDaily_AdvertiserOfferPublisherSourceSummary.updateOneDoc(search2, update2, {});
            await LiveAdvOffPubSouSummaryModel.updateOneDoc(search1, update1, {});
        }

        return "Update completed";
    } catch (error) {
        console.error("Error in handleReport:", error.message);
        return "Something went wrong. Try again.";
    }
};


 async function getTimeSlote(time,network_id){
    let redishSlot = await Redis.getRedisData("DAYWISESLOT:" + network_id.toString());
    if (!redishSlot.data) {
        let timeZone = await Network.getOneNetwork({ _id: mongooseObjectId(network_id) }, { current_timezone: 1, _id: 0 });

        let timeSlot = moment.tz(time, timeZone.current_timezone).format('YYYY-MM-DD');
        let date = new Date(timeSlot)
        let setInRedis = await Redis.setRedisData("DAYWISESLOT:" + network_id.toString(), timeZone.current_timezone);
        
        return date;
    } else {
        let timeSlot = moment.tz(time, redishSlot.data).format('YYYY-MM-DD');
        let date = new Date(timeSlot)
        return date;
    }
}

function getTimeSlote1(timeString){
    let timeSlot = moment(timeString).startOf('minute');
    let minutes = timeSlot.minutes();
    if (minutes >= 30) {
        timeSlot.subtract((minutes - 30), 'minutes');
    } else {
        timeSlot.subtract(minutes, 'minutes');
    }
    return timeSlot;

}
