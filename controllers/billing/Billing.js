const Mongoose = require('mongoose');
const debug = require("debug")("darwin:Controller:Offer");
const mongooseObjectId = Mongoose.Types.ObjectId;
const Response = require('../../helpers/Response');
const { payloadType } = require('../../constants/config');
const Moment = require('moment-timezone');
// require("moment-timezone");
const { seprateCommaIntoArray, convertStringIntoIntArray, formatMongooseIdArray } = require('../../helpers/Functions');
const { MonthlyAdvertiserOfferPublisherSummaryModel ,MonthlySourceOfferAdvertiserPublisherSummaryModel} = require("../../db/click/sourceSummary/sourceSummary");
var NetworkModel = require("../../db/network/Network");
var AdvertiserModel = require("../../db/advertiser/Advertiser");
var PublisherModel = require("../../db/publisher/Publisher");
const InvoiceDroft=require('../../db/invoiceDraft/invoicedroft');

exports.getBillingInfo = async (req, res) => {
    try {
        let timezone = 'Asia/Kolkata';
        let network_id = mongooseObjectId(req.user.userDetail.network[0]);
        let networkDetails = await NetworkModel.getOneNetwork({ _id: network_id }, { current_timezone: 1 });
        if (networkDetails && networkDetails['current_timezone']) {
            timezone = networkDetails['current_timezone'];
        }
        let count = [];
        let data = [];
        let total = [];
        let filter = {};
        let groupBy = {};
        let sort = { conversion: -1 };
        let options = { sort: sort, limit: 100, skip: 0 };
        let groupProjection = {};
        let projection = { '_id': 1 };
        // let totalGroupProjection = {};
        if (Object.keys(req.body.sort).length) {
            options['sort'] = req.body.sort;
        }
        if (req.body.search) {
            if (req.body.search.date) {
                filter['timeSlot'] = { $gte: Moment(req.body.search.date).tz(timezone)._d, $lte: Moment(req.body.search.end_date).tz(timezone)._d }
            }
            if (req.body.search.publisher_id) {
                let searchAff = seprateCommaIntoArray(req.body.search.publisher_id);
                filter['publisher_id'] = { $in: convertStringIntoIntArray(searchAff) };
            }
            if (req.body.search.advertiser_id) {
                let searchAdv = seprateCommaIntoArray(req.body.search.advertiser_id)
                filter['advertiser_id'] = { $in: formatMongooseIdArray(searchAdv) };
            }
            if (req.body.search.offer_id) {
                if (mongooseObjectId.isValid(req.body.search.offer_id.trim())) {
                    filter['offer_id'] = mongooseObjectId(req.body.search.offer_id.trim());
                }
                else {
                    filter['offer_name'] = { $regex: req.body.search.offer_id.trim(), $options: 'i' };
                }
            }
            if (req.body.search.limit) {
                options['limit'] = +req.body.search.limit;
            }
            if (req.body.search.page) {
                options['skip'] = +req.body.search.limit * (+req.body.search.page - 1);
            }
        }
        if (req.user_category == 'publisher' || req.loginType == 'publisher') {
            filter['publisher_id'] = +req.accountid;
        }
        else if (req.user_category == 'advertiser' || req.loginType == 'advertiser') {
            filter['advertiser_id'] = mongooseObjectId(req.loginId) || mongooseObjectId(req.parentId);
        }
        filter['network_id'] = network_id;
        filter['conversion'] = { $gt: 0 };
        if (req.body.search.group) {
            let groupArray = req.body.search.group;
            if (groupArray.includes('offer')) {
                groupBy['offer_id'] = "$offer_id";
            }
            if (groupArray.includes('advertiser')) {
                groupBy['advertiser_id'] = "$advertiser_id";
            }
            if (groupArray.includes('publisher')) {
                groupBy['publisher_id'] = "$publisher_id";
            }
            // if (groupArray.includes('month')) {
            groupBy["year"] = { $year: { "date": "$timeSlot" } };
            groupBy["month"] = { $month: { "date": "$timeSlot" } };     
            // }
        }
        if (req.body.projection !== undefined && req.body.projection != {}) {
            groupProjection = { _id: groupBy };
            // totalGroupProjection = { _id: null };
            groupProjection['offer_name'] = { $first: "$offer_name" };
            projection['offer_name'] = 1;
            if (req.body.projection.hasOwnProperty('click')) {
                groupProjection['click'] = { $sum: "$click" };
                projection['click'] = 1;
                // totalGroupProjection['grossClick'] = { $sum: "$click" };
            }
            if (req.body.projection.hasOwnProperty('conversion')) {
                groupProjection['conversion'] = { $sum: "$conversion" };
                projection['conversion'] = 1;
                // totalGroupProjection['grossConversion'] = { $sum: "$conversion" };
            }
            if (req.body.projection.hasOwnProperty('pre_conversion')) {
                groupProjection['pre_conversion'] = { $sum: "$pre_conversion" };
                projection['pre_conversion'] = 1;
                // totalGroupProjection['grossPreConversion'] = { $sum: "$pre_conversion" };
            }
            if (req.body.projection.hasOwnProperty('publisher_conversion')) {
                groupProjection['publisher_conversion'] = { $sum: "$publisher_conversion" };
                projection['publisher_conversion'] = 1;
                // totalGroupProjection['grossPublisherConversion'] = { $sum: "$publisher_conversion" };
            }
            if (req.body.projection.hasOwnProperty('revenue')) {
                groupProjection['revenue'] = { $sum: "$revenue" };
                projection['revenue'] = 1;
                // totalGroupProjection['grossRevenue'] = { $sum: "$revenue" };
            }
            if (req.body.projection.hasOwnProperty('payout')) {
                groupProjection['payout'] = { $sum: "$payout" };
                projection['payout'] = 1;
                // totalGroupProjection['grossPayout'] = { $sum: "$payout" };
            }
            if (req.body.projection.hasOwnProperty('publisher_payout')) {
                groupProjection['publisher_payout'] = { $sum: "$publisher_payout" };
                projection['publisher_payout'] = 1;
                // totalGroupProjection['grossPublisherPayout'] = { $sum: "$publisher_payout" };
            }
            groupProjection['publisher_confirm_conversion'] = { $first: "$publisher_confirm_conversion" };
            projection['publisher_confirm_conversion'] = 1;
            groupProjection['total_confirm_conversion'] = { $first: "$total_confirm_conversion" };
            projection['total_confirm_conversion'] = 1;
            groupProjection['is_verified'] = { $first: "$is_verified" };
            projection['is_verified'] = 1;
        }
        console.log("req.body", req.body);
        console.log("filter", filter);
        console.log("groupProjection", groupProjection);
        console.log("projection", projection);
        console.log("options", options);
        console.log("groupBy", groupBy);
        count = await MonthlyAdvertiserOfferPublisherSummaryModel.countMonthlyAdvertiserOfferPublisherSummary(filter, groupBy);
        data = await MonthlyAdvertiserOfferPublisherSummaryModel.getMonthlyAdvertiserOfferPublisherSummaryByLookup(filter, groupProjection, projection, options);
        // total = await MonthlyAdvertiserOfferPublisherSummaryModel.totalMonthlyAdvertiserOfferPublisherSummary(filter, totalGroupProjection);

        let result = { data: "", totalCount: "", grossTotal: "" };

        if (data && count) {
            result['data'] = data;
            result['totalCount'] = count[0];
            // if (total) {
            //     result['grossTotal'] = total[0];
            // }
            let response = Response.success();
            response.payloadType = payloadType.array;
            response.payload = result;
            response.msg = "success";
            return res.status(200).send(response)
        }
    } catch (err) {
        console.log(err);
        let response = Response.error();
        response.error = err.message;
        response.msg = 'No Record Found!';
        return res.status(200).json(response);
    }
}

exports.getBillingByPublisher = async (req, res) => {
    try {
        let timezone = 'Asia/Kolkata';
        let network_id = mongooseObjectId(req.user.userDetail.network[0]);
        let networkDetails = await NetworkModel.getOneNetwork({ _id: network_id }, { current_timezone: 1 });
        if (networkDetails && networkDetails['current_timezone']) {
            timezone = networkDetails['current_timezone'];
        }
        let filter = {};
        let groupProjection = {
            _id: { publisher_id: "$publisher_id" },
            conversion: { $sum: "$conversion" },
            publisher_conversion: { $sum: "$publisher_conversion" },
            publisher_payout: { $sum: "$publisher_payout" },
            payout: { $sum: "$payout" },
            publisher_id: { $first: "$publisher_id" },
            publisher_name: { $first: "$publisher_name" },
            total_confirm_conversion: { $first: "$total_confirm_conversion" },
            publisher_confirm_conversion: { $first: "$publisher_confirm_conversion" }
        };

        filter['network_id'] = network_id;
        if (req.body.offer_id) {
            filter['offer_id'] = mongooseObjectId(req.body.offer_id);
        }
        if (req.body.date) {
            filter['timeSlot'] = Moment(req.body.date).tz(timezone)._d;
        }

        let result = await MonthlyAdvertiserOfferPublisherSummaryModel.totalMonthlyAdvertiserOfferPublisherSummary(filter, groupProjection);

        if (result && result.length) {
            let response = Response.success();
            response.payloadType = payloadType.array;
            response.payload = result;
            response.msg = "success";
            return res.status(200).send(response)
        } else {
            let response = Response.error();
            response.error = 'No Record Found!';
            response.msg = 'No Record Found!';
            return res.status(200).json(response);
        }
    } catch (err) {
        let response = Response.error();
        response.error = err.message;
        response.msg = 'Something went wrong!';
        return res.status(200).json(response);
    }
}

exports.updateBillingByPublisher = async (req, res) => {
    try {
        let timezone = 'Asia/Kolkata';
        let network_id = mongooseObjectId(req.user.userDetail.network[0]);
        let networkDetails = await NetworkModel.getOneNetwork({ _id: network_id }, { current_timezone: 1 });
        if (networkDetails && networkDetails['current_timezone']) {
            timezone = networkDetails['current_timezone'];
        }
        let data = req.body;
        for (let item of data) {
            let filter = {
                network_id: network_id,
                timeSlot: Moment(item.date).tz(timezone)._d,
                offer_id: mongooseObjectId(item.offer_id),
                publisher_id: +item.publisher_id
            };
            let update = {
                total_confirm_conversion: +item['total_confirm_conversion'],
                publisher_confirm_conversion: +item['publisher_confirm_conversion'],
                publisher_payout: +item['publisher_payout'],
            };
            if (item['is_verified']) {
                update['is_verified'] = true;
            }

            await MonthlyAdvertiserOfferPublisherSummaryModel.updateMonthlyAdvertiserOfferPublisherSummary(filter, update);
        }

        let response = Response.success();
        response.msg = "success";
        return res.status(200).send(response)
    } catch (err) {
        let response = Response.error();
        response.error = err.message;
        response.msg = 'Something went wrong!';
        return res.status(200).json(response);
    }
}

exports.getBillingByGroup = async (req, res) => {
    try {
        let timezone = 'Asia/Kolkata';
        let network_id = mongooseObjectId(req.user.userDetail.network[0]);
        let networkDetails = await NetworkModel.getOneNetwork(
            { _id: network_id },
            {
                current_timezone: 1,
                company_name: 1,
                owner: 1,
                address: 1,
                networklogo_Url: 1
            });
        let clientDetails = {};
        if (networkDetails && networkDetails['current_timezone']) {
            timezone = networkDetails['current_timezone'];
        }

        let filter = {};
        let groupBy = { offer_id: "$offer_id" };
        let groupProjection = { _id: groupBy };
        let projection = { '_id': 1 };
        let totalGroupProjection = { _id: null };
        let options = { sort: { publisher_conversion: -1 }, limit: 100, skip: 0 };

        if (req.body.date) {
            filter['timeSlot'] = Moment(req.body.date).tz(timezone)._d;
        }
        if (req.body.publisher_id) {
            filter['publisher_id'] = +req.body.publisher_id;
        }
        if (req.body.advertiser_id) {
            filter['advertiser_id'] = mongooseObjectId(req.body.advertiser_id);
        }
        if (req.user_category == 'publisher' || req.loginType == 'publisher') {
            filter['publisher_id'] = +req.accountid;
        }
        else if (req.user_category == 'advertiser' || req.loginType == 'advertiser') {
            filter['advertiser_id'] = mongooseObjectId(req.loginId) || mongooseObjectId(req.parentId);
        }
        filter['network_id'] = network_id;
        filter['publisher_conversion'] = { $gt: 0 };

        groupProjection['offer_name'] = { $first: "$offer_name" };
        projection['offer_name'] = 1;
        groupProjection['conversion'] = totalGroupProjection['grossConversion'] = { $sum: "$conversion" };
        projection['conversion'] = 1;
        groupProjection['optimized_conversion'] = totalGroupProjection['grossOptimizedConversion'] = { $sum: { $subtract: ["$conversion", "$publisher_conversion"] } };
        projection['optimized_conversion'] = 1;
        groupProjection['publisher_conversion'] = totalGroupProjection['grossPublisherConversion'] = { $sum: "$publisher_conversion" };
        projection['publisher_conversion'] = 1;
        groupProjection['publisher_confirm_conversion'] = totalGroupProjection['grossPublisherConfirmConversion'] = { $sum: "$publisher_confirm_conversion" };
        projection['publisher_confirm_conversion'] = 1;
        groupProjection['publisher_payout'] = totalGroupProjection['grossPublisherPayout'] = { $sum: "$publisher_payout" };
        projection['publisher_payout'] = 1;
        groupProjection['is_verified'] = { $first: "$is_verified" };
        projection['is_verified'] = 1;

        if (req.body.limit) {
            options['limit'] = +req.body.limit;
        }
        if (req.body.page) {
            options['skip'] = +req.body.limit * (+req.body.page - 1);
        }

        if (req.body['getClientData']) {
            if (filter['advertiser_id']) {
                clientDetails = await AdvertiserModel.searchOneAdvertiser(
                    { network_id: network_id, _id: filter['advertiser_id'] },
                    { name: 1, company: 1, company_logo: 1, address: 1, account_manager: 1 }
                );
            } else if (filter['publisher_id']) {
                clientDetails = await PublisherModel.searchOnePublisher(
                    { network_id: network_id, pid: filter['publisher_id'] },
                    { pid: 1, name: 1, company: 1, company_logo: 1, address: 1, account_manager: 1 }
                );
            }
        }

        let count = await MonthlyAdvertiserOfferPublisherSummaryModel.countMonthlyAdvertiserOfferPublisherSummary(filter, groupBy);
        let data = await MonthlyAdvertiserOfferPublisherSummaryModel.getMonthlyAdvertiserOfferPublisherSummaryByLookup(filter, groupProjection, projection, options);
        let total = await MonthlyAdvertiserOfferPublisherSummaryModel.totalMonthlyAdvertiserOfferPublisherSummary(filter, totalGroupProjection);

        let result = {};
        result['data'] = data;
        result['totalCount'] = count[0];
        result['networkData'] = networkDetails;
        if (clientDetails['_id']) {
            result['clientData'] = clientDetails;
        }

        if (total) {
            result['grossTotal'] = total[0];
        }
        let response = Response.success();
        response.payloadType = payloadType.array;
        response.payload = result;
        response.msg = "success";
        return res.status(200).send(response);
    } catch (err) {
        debug(err);
        let response = Response.error();
        response.error = err.message;
        response.msg = 'Something went wrong!';
        return res.status(200).json(response);
    }
}

exports.getBillingGroupByAdvertiser = async (req, res) => {
    try {
        let network_id = mongooseObjectId(req.user.userDetail.network[0]);
        let timezone = 'Asia/Kolkata';
        let networkDetails = await NetworkModel.getOneNetwork({ _id: network_id }, { current_timezone: 1 });
        if (networkDetails && networkDetails['current_timezone']) {
            timezone = networkDetails['current_timezone'];
        }
        let result = [];
        let filter = {
            network_id: network_id,
            timeSlot: Moment().startOf('month').subtract(1, 'months').tz(timezone)._d
        };
        let group = {
            '_id': {}
        };

        if (req.body.filter) {
            if (req.body.filter.advertiser_id) {
                filter['advertiser_id'] = mongooseObjectId(req.body.filter.advertiser_id);
            }
            if (req.body.filter.start_date && req.body.filter.end_date) {
                filter['timeSlot'] = {
                    $gte: Moment(req.body.filter.start_date).tz(timezone)._d,
                    $lte: Moment(req.body.filter.end_date).tz(timezone)._d
                };
            }
        }

        if (req.body.group && req.body.group.length) {
            if (req.body.group.includes('advertiser')) {
                group['_id']['advertiser_id'] = '$advertiser_id';
            }
            if (req.body.group.includes('month')) {
                group['_id']["year"] = { $year: { "date": "$timeSlot" } };
                group['_id']["month"] = { $month: { "date": "$timeSlot" } };
            }
        }

        group['optimized_conversion'] = { $sum: { $subtract: ["$conversion", "$publisher_conversion"] } };
        group['conversion'] = { $sum: "$publisher_conversion" };
        group['confirm_conversion'] = { $sum: "$publisher_confirm_conversion" };
        group['payout'] = { $sum: "$publisher_payout" };

        result = await MonthlyAdvertiserOfferPublisherSummaryModel.totalMonthlyAdvertiserOfferPublisherSummary(filter, group);

        let response = Response.success();
        response.payloadType = payloadType.array;
        response.payload = result;
        response.msg = "success";
        return res.status(200).send(response);
    } catch (error) {
        debug(error);
        let response = Response.error();
        response.error = error.message;
        response.msg = 'Something went wrong!';
        return res.status(200).json(response);
    }
}
exports.getBillingGroupByAdvertisers = async (req, res) => {
    try {
        let network_id = mongooseObjectId(req.user.userDetail.network[0]);
        let timezone = 'Asia/Kolkata';
        let networkDetails = await NetworkModel.getOneNetwork({ _id: network_id }, { current_timezone: 1 });
        if (networkDetails && networkDetails['current_timezone']) {
            timezone = networkDetails['current_timezone'];
        }
        let result = [];
        let filter = {
            N_id: network_id,
            slot: Moment().startOf('month').subtract(1, 'months').tz(timezone)._d
        };
        let group = {
            '_id': {}
        };
         filter['conv']={$gt:0}

        if (req.body.filter) {
            if (req.body.filter.advertiser_id) {
                filter['aid'] = parseInt(req.body.filter.advertiser_id);
            }
            if (req.body.filter.start_date && req.body.filter.end_date) {
                filter['slot'] = {
                    $gte: Moment(req.body.filter.start_date).tz(timezone)._d,
                    $lte: Moment(req.body.filter.end_date).tz(timezone)._d
                };
            }
        }

        if (req.body.group && req.body.group.length) {
            if (req.body.group.includes('advertiser')) {
                group['_id']['aid'] = '$aid';
            }
        }

        group['optimized_conversion'] = { $sum: { $subtract: ["$conv", "$pConv"] } };
        group['conversion'] = { $sum: "$conv" };
        group['payout'] = { $sum: "$pay" };

        result = await MonthlySourceOfferAdvertiserPublisherSummaryModel.totalMonthlyAdvertiserOfferPublisherSummary(filter, group);

        let response = Response.success();
        response.payloadType = payloadType.array;
        response.payload = result;
        response.msg = "success";
        return res.status(200).send(response);
    } catch (error) {
        debug(error);
        let response = Response.error();
        response.error = error.message;
        response.msg = 'Something went wrong!';
        return res.status(200).json(response);
    }
}

exports.getInvoiceByAdvertiserId=async(req,res)=>{
    try {
        // console.log("req.body",req.body);
        let result=[];
        let network_id= mongooseObjectId(req.user.userDetail.network[0]);
        let timezone = 'Asia/Kolkata';  
        let networkDetails = await NetworkModel.getOneNetwork({ _id: network_id }, { current_timezone: 1 });
        if (networkDetails && networkDetails['current_timezone']) {
            timezone = networkDetails['current_timezone'];
        }
        let filter = {
            N_id: network_id,
            // slot: Moment().startOf('month').subtract(1, 'months').tz(timezone)._d
        };
        let group = {
            '_id': {}
        };
        if (req.body) {
            if (req.body && req.body.aid) {
                filter['aid'] = parseInt(req.body.aid);
                // group['_id']['aid'] = "$aid";
            }
            if (req.body.startDate && req.body.endDate) {
                filter['slot'] = {
                    $gte: Moment(req.body.startDate).tz(timezone)._d,
                    $lte: Moment(req.body.endDate).tz(timezone)._d
                };
            }
        }
        filter['conv']={ $gt:0}
        group['_id']['oId'] ="$oId";
        // group['_id']['slot']="$slot"
        group['conversion'] = { $sum: "$conv" };
        group['amount'] = { $sum: "$pay" };
        group['pendingConv']={$sum:"$conv"};
        group['pendingAmount']={$sum:"$pay"};
        // group['publisher_conversion'] = { $sum: "$pConv" };
        group['oName']= { $first: "$oName" };
        group['advOfferId'] = { $first: "$AdOId" };
        group['advertiser_id'] = { $first: "$aid" };
        group['offer_id']={$first:"$oId"}
        group['slot']={$first:'$slot'}
        // console.log("group",group);
        // console.log("filter",filter);   
        result=await MonthlySourceOfferAdvertiserPublisherSummaryModel.totalMonthlyAdvertiserOfferPublisherSummary(filter, group);
        let response = Response.success();
        response.payloadType = payloadType.array;
        response.payload = result;
        response.msg = "success";
        return res.status(200).send(response);

    } catch (error) {
        
        debug(error);
        let response = Response.error();
        response.error = error.message;
        response.msg = 'Something went wrong!';
        return res.status(200).json(response);
    }
}

 exports.getDraftInvoiceByAdvertiserId=async(req,res)=>{

    try {
          if(!req.body){
            let response = Response.error();
            response.error = 'empty request body';
            response.msg = 'empty request body';
            return res.status(200).json(response);
        }
        let network_id= mongooseObjectId(req.user.userDetail.network[0]);
       let filter={N_id:network_id};
       let timezone = 'Asia/Kolkata';  
       let networkDetails = await NetworkModel.getOneNetwork({ _id: network_id }, { current_timezone: 1 });
       if (networkDetails && networkDetails['current_timezone']) {
           timezone = networkDetails['current_timezone'];
       }
     if(req.body.aid){
        filter['aid']=parseInt(req.body.aid);
      }
      if (req.body.startDate && req.body.endDate) {
        filter['slot'] = {
            $gte: Moment(req.body.startDate).tz(timezone)._d,
            $lte: Moment(req.body.endDate).tz(timezone)._d
        };
    }
        let result = await InvoiceDroft.getDraftInvoice(filter);
        console.log("result--",result)
        let response = Response.success();
        response.msg = 'Successfully fetched in drafts';
        response.payloadType = payloadType.object;
        response.payload = result;
        console.log("Draft fetched successfully:", response);
        return res.status(200).json(response);
    } catch (error) {
        debug(error);
        let response = Response.error();
        response.error = error.message;
        response.msg = 'Something went wrong!';
        return res.status(200).json(response);
        
    }
 }



exports.saveInvoiceInDrafts=async(req,res)=>{ 

    try {
        // console.log("req.body--",req.body)
        if(!req.body){
            let response = Response.error();
            response.error = 'empty request body';
            response.msg = 'empty request body';
            return res.status(200).json(response);
        }

        let N_id= mongooseObjectId(req.user.userDetail.network[0]);
         let filter={N_id:N_id};
        if(req.body.aid){
            filter['aid']=parseInt(req.body.aid);
        }
        if(req.body.oId){
            filter['oId']=mongooseObjectId(req.body.oId);
        }

        let timezone = 'Asia/Kolkata';  
        let networkDetails = await NetworkModel.getOneNetwork({ _id: N_id }, { current_timezone: 1 });
        if (networkDetails && networkDetails['current_timezone']) {
            timezone = networkDetails['current_timezone'];
        }
        if (req.body.date) {
            filter['slot'] =Moment(req.body.date).tz(timezone)._d;
        }
      let update={}
      let finalUpdate={}
      let addTosetField={};
      if(req.body.tconv){
        update['tconv']=parseInt(req.body.tconv);
      }
      if(req.body.tAmount){
        update['tAmount']=parseInt(req.body.tAmount);
      }
      if(req.body.pendingConv){
        update['pendingConv']=parseInt(req.body.pendingConv);
      }
        if(req.body.pendingAmount){
            update['pendingAmount']=parseInt(req.body.pendingAmount);
        }
        if(req.body.dDconv){
            update['dDconv']=parseInt(req.body.dDconv);
        }
        if(req.body.dDAmount){
            update['dDAmount']=parseInt(req.body.dDAmount);
        }
        if(req.body.approvedConv){
            update['approvedConv']=parseInt(req.body.approvedConv);
        }
        if(req.body.approvedAmount){
            update['approvedAmount']=parseInt(req.body.approvedAmount);
        }
        if(req.body.oName){
            update['oName']=req.body.oName;
        }
        if(req.body.oId){
            update['oId']=mongooseObjectId(req.body.oId);
        }
        if(req.body.AdOId){
            update['AdOId']=req.body.AdOId;
        }
        if (req.body.comment) {
            addTosetField["comment"] = req.body.comment;
        }
        if(Object.keys(addTosetField).length>0){
            finalUpdate['$addToSet']=addTosetField
        }
        if(Object.keys(update).length>0){
            finalUpdate['$set']=update
        }
    let options = { upsert: true};
    // console.log("filter--",filter)
    // console.log("final--",finalUpdate)
    let result = await InvoiceDroft.InsetUpdateDraft({...filter},finalUpdate,options);
     console.log("result save in draft--",result)
    if(result && result.ok){
        let response = Response.success();
        response.msg = 'Successfully saved in drafts';
        response.payloadType = payloadType.object;
        response.payload = result
        console.log("Draft saved successfully:", response);
        return res.status(200).json(response);  
    }
    else{
        let response = Response.error();
        response.error = 'unable to save in drafts';
        response.msg = 'Something went wrong!';
        return res.status(200).json(response);
    }
    } catch (error) {
        debug(error);
        let response = Response.error();
        response.error = error.message;
        response.msg = 'Something went wrong!';
        return res.status(200).json(response);
        
    }
 }


exports.generateInvoice=async(req,res)=>{

    try {
        // console.log("req.body--",req.body)
        let timezone = 'Asia/Kolkata';
        let network_id = mongooseObjectId(req.user.userDetail.network[0]);
        let networkDetails = await NetworkModel.getOneNetwork(
            { _id: network_id },
            {
                current_timezone: 1,
                company_name: 1,
                owner: 1,
                address: 1,
                networklogo_Url: 1,
                sac: 1
            });
        let clientDetails = {};
        if (networkDetails && networkDetails['current_timezone']) {
            timezone = networkDetails['current_timezone'];
        }

        let filter = {};
        let groupBy = {slot:"$slot"};
        let groupProjection = { _id: groupBy };
        let projection = { '_id': 1 };
        let totalGroupProjection = { _id: null };
        let options = { sort: {conv: -1 }, limit: 100, skip: 0 };

        // if (req.body.date) {
        //     filter['slot'] = Moment(req.body.date).tz(timezone)._d;
        // }

        if(req.body.startDate && req.body.endDate){
            filter['slot']={ $gte:Moment(req.body.startDate).tz(timezone)._d,
                             $lte:Moment(req.body.endDate).tz(timezone)._d 
                            }
        }
        if (req.body.aid) {
            filter['aid'] =+req.body.aid;
        }
        // if (req.user_category == 'publisher' || req.loginType == 'publisher') {
        //     filter['pid'] = +req.accountid;
        // }
        // else if (req.user_category == 'advertiser' || req.loginType == 'advertiser') {
        //     filter['advertiser_id'] = mongooseObjectId(req.loginId) || mongooseObjectId(req.parentId);
        // }
        filter['N_id'] = network_id;
        // filter['conv'] = { $gt: 0 };
         filter['confirm']=true

        groupProjection['oName'] = { $first: "$oName" };
        projection['oName'] = 1;
        groupProjection['slot']={$first:"$slot"}
        projection['slot']=1
        groupProjection['oId']={$first:"$oId"}
        projection['oId']=1
        groupProjection['advertiser_offer_id']={$first:"$AdOId"}
        projection['advertiser_offer_id']=1
        groupProjection['conv'] = totalGroupProjection['grossConversion'] = { $sum: "$conv" };
        projection['conv'] = 1;
        groupProjection['optimized_conversion'] = totalGroupProjection['grossOptimizedConversion'] = { $sum: { $subtract: ["$conv", "$pConv"] } };
        projection['optimized_conversion'] = 1;
        projection['pay']=1;
        groupProjection['pay']=totalGroupProjection['grossPayout']={$sum:"$pay"};

        if (req.body.limit) {
            options['limit'] = +req.body.limit;
        }
        if (req.body.page) {
            options['skip'] = +req.body.limit * (+req.body.page - 1);
        }

        if (req.body['getClientData']) {
            if (filter['aid']) {
                clientDetails = await AdvertiserModel.searchOneAdvertiser(
                    { network_id: network_id, aid: filter['aid'] },
                    { name: 1, company: 1, company_logo: 1, address: 1, account_manager: 1 }
                );
            } 
        }
    //    console.log("filter--",filter)
    //    console.log("groupBy--",groupBy)
    //    console.log("groupProjection",groupProjection)
    //    console.log("projection--",projection)
    //    console.log("totalGroupProjection--",totalGroupProjection)
        // let count = await MonthlySourceOfferAdvertiserPublisherSummaryModel.countMonthlyAdvertiserOfferPublisherSummary(filter, groupBy);
        // let data = await MonthlySourceOfferAdvertiserPublisherSummaryModel.getMonthlyAdvertiserOfferPublisherSummaryByLookup2(filter, groupProjection, projection, options);
        // let total = await MonthlySourceOfferAdvertiserPublisherSummaryModel.totalMonthlyAdvertiserOfferPublisherSummary(filter, totalGroupProjection);
        let data=  await InvoiceDroft.aggregate([{$match:filter},{ $group: groupProjection },{ $project: projection },{ $sort: option['sort'] },{ $skip: option['skip'] },{ $limit: option['limit'] }]).allowDiskUse(true);

        let result = {};
        result['data'] = data;
        // result['totalCount'] = count[0];
        result['networkData'] = networkDetails;
        if (clientDetails['_id']) {
            result['clientData'] = clientDetails;
        }

        if (total) {
            result['grossTotal'] = total[0];
        }
        let response = Response.success();
        response.payloadType = payloadType.array;
        response.payload = result;
        response.msg = "success";
        return res.status(200).send(response);
    } catch (err) {
        debug(err);
        let response = Response.error();
        response.error = err.message;
        response.msg = 'Something went wrong!';
        return res.status(200).json(response);
    }
    

}

exports.generateInvoice2=async(req,res)=>{

    try {
        // console.log("req.body--",req.body)
        let timezone = 'Asia/Kolkata';
        let network_id = mongooseObjectId(req.user.userDetail.network[0]);
        let networkDetails = await NetworkModel.getOneNetwork(
            { _id: network_id },
            {
                current_timezone: 1,
                company_name: 1,
                owner: 1,
                address: 1,
                networklogo_Url: 1,
                sac:1
            });
        let clientDetails = {};
        if (networkDetails && networkDetails['current_timezone']) {
            timezone = networkDetails['current_timezone'];
        }

        let filter = {};
        let groupBy = {slot:"$slot"};
        let groupProjection = { _id: groupBy };
        let projection = { '_id': 1 };
        let totalGroupProjection = { _id: null };
        let option = { limit: 100, skip: 0 };
        if(req.body.startDate && req.body.endDate){
            filter['slot']={ $gte:Moment(req.body.startDate).tz(timezone)._d,
                             $lte:Moment(req.body.endDate).tz(timezone)._d 
                            }
        }
        if (req.body.aid) {
            filter['aid'] =+req.body.aid;
        }
        
        filter['N_id'] = network_id;
        
         filter['confirm']=true

        groupProjection['oName'] = { $first: "$oName" };
        projection['oName'] = 1;
        groupProjection['slot']={$first:"$slot"}
        projection['slot']=1
        groupProjection['oId']={$first:"$oId"}
        projection['oId']=1
        groupProjection['advertiser_offer_id']={$first:"$AdOId"}
        projection['advertiser_offer_id']=1
        groupProjection['approvedConv']={$sum:"$approvedConv"};
        projection['approvedConv']=1
        groupProjection['approvedAmount']={$sum:"$approvedAmount"}
        projection['approvedAmount']=1;
        groupProjection['pendingAmount']={$sum:"$pendingAmount"};
        projection['pendingAmount']=1;
        groupProjection['pendingConv']={$sum:"$pendingConv"};
        projection['pendingConv']=1;



        if (req.body.limit) {
            options['limit'] = +req.body.limit;
        }
        if (req.body.page) {
            options['skip'] = +req.body.limit * (+req.body.page - 1);
        }

        if (req.body['getClientData']) {
            if (filter['aid']) {
                clientDetails = await AdvertiserModel.searchOneAdvertiser(
                    { network_id: network_id, aid: filter['aid'] },
                    { name: 1, company: 1, company_logo: 1, address: 1, account_manager: 1 }
                );
            } 
        }
    //    console.log("filter--",filter)
    //    console.log("groupBy--",groupBy)
    //    console.log("groupProjection",groupProjection)
    //    console.log("projection--",projection)
    //    console.log("totalGroupProjection--",totalGroupProjection)
        let data=  await InvoiceDroft.MonthlyInvoiceReport(filter, groupProjection, projection ,option)
        let result = {};
        result['data'] = data;
        // result['totalCount'] = count[0];
        result['networkData'] = networkDetails;
        if (clientDetails['_id']) {
            result['clientData'] = clientDetails;
        }

        let response = Response.success();
        response.payloadType = payloadType.array;
        response.payload = result;
        response.msg = "success";
        return res.status(200).send(response);
    } catch (err) {
        debug(err);
        let response = Response.error();
        response.error = err.message;
        response.msg = 'Something went wrong!';
        return res.status(200).json(response);
    }
    

}


exports.updateInvoiceDraft=async(req,res)=>{

    try {
        console.log("req.body--",req.body)
        if(!req.body){
            let response = Response.error();
            response.error = 'empty request body';
            response.msg = 'empty request body';
            return res.status(200).json(response);
        }

        let N_id= mongooseObjectId(req.user.userDetail.network[0]);
         let filter={N_id:N_id};
        if(req.body.aid){
            filter['aid']=+parseInt(req.body.aid);
        }
        if(req.body.oId){
            filter['oId']=mongooseObjectId(req.body.oId);
        }

        let timezone = 'Asia/Kolkata';  
        let networkDetails = await NetworkModel.getOneNetwork({ _id: N_id }, { current_timezone: 1 });
        if (networkDetails && networkDetails['current_timezone']) {
            timezone = networkDetails['current_timezone'];
        }
        if (req.body.date) {
            filter['slot'] =Moment(req.body.date).tz(timezone)._d;
        }

        let update={"confirm":true}
        console.log("update invoice draft filter--",filter)
        
        let result = await InvoiceDroft.UpdateOneDocs({...filter},update);
         console.log("result save in draft--",result)
    if(result && result.nModified>0){
        let response = Response.success();
        response.msg = 'Successfully update in drafts';
        response.payloadType = payloadType.object;
        response.payload = result
        console.log("Draft update successfully:", response);
        return res.status(200).json(response);  
    }
    else{
        let response = Response.error();
        response.error = 'unable to save in drafts';
        response.msg = 'Something went wrong!';
        return res.status(200).json(response);
    }

    } catch (error) {
        debug(error);
        let response = Response.error();
        response.error = error.message;
        response.msg = 'Something went wrong!';
        return res.status(200).json(response);
    }
}