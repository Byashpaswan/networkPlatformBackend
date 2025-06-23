const debug = require("debug")("darwin:Script:AllAppIdReport");
const Response = require('../helpers/Response');
const { payloadType } = require('../constants/config');
const { AppSummaryModel, ConversionModel } = require("../db/appIdReport/AppIdReport");
var { AppidPublisherSummaryModel } = require("../db/appidPublisherSummary");
const ApplicationDetailsModel = require("../db/applicationDetails/ApplicationDetails");
const  {LiveDaily_AdvertiserOfferPublisherSourceSummary, LiveAdvOffPubSouSummaryModel} = require('../db/click/sourceSummary/sourceSummary')
const Moment = require('moment');
const Redis = require('../helpers/Redis');
const NetworkModel = require('../db/network/Network');
const OfferModel = require("../db/offer/Offer")

exports.getAppIdReport = async (req, res, next) => {
    try {
        let filter = {};
        let groupBy = {};
        let sort = { conversion: -1 };
        let options = { sort: sort, limit: 100, skip: 0 };
        let groupProjection = {};
        let totalGroupProjection = {};
        if (req.body.search) {
            if (req.body.search.start_date && req.body.search.end_date) {
                filter['timeSlot'] = { $gte: Moment(req.body.search.start_date).toDate(), $lte: Moment(req.body.search.end_date).toDate() };
            }
            if (req.body.search.app_id) {
                filter['app_id'] = req.body.search.app_id;
            }
            if (req.body.search.limit) {
                options['limit'] = +req.body.search.limit;
            }
            if (req.body.search.page) {
                options['skip'] = +req.body.search.limit * (+req.body.search.page - 1);
            }
        }

        groupBy['app_id'] = "$app_id";

        if (req.body.sort && Object.keys(req.body.sort).length > 0 && req.body.sort.constructor === Object) {
            options['sort'] = req.body.sort;
        }
        if (req.body['userDetail'] && req.body['userDetail']['userType'] === "admin") {
            groupProjection = { _id: groupBy, click: { $sum: "$click" }, conversion: { $sum: "$conversion" }, pre_conversion: { $sum: "$pre_conversion" }, revenue: { $sum: "$revenue" }, payout: { $sum: "$payout" }, network_id: { $addToSet: "$network_id" } }
            totalGroupProjection = { _id: null, grossClick: { $sum: "$click" }, grossConversion: { $sum: "$conversion" }, grossPreConversion: { $sum: "$pre_conversion" }, grossRevenue: { $sum: "$revenue" }, grossPayout: { $sum: "$payout" } }
        } else if (req.body['userDetail'] && req.body['userDetail']['email'] === "ashok@proffcus.com") {
            groupProjection = { _id: groupBy, click: { $sum: "$click" }, conversion: { $sum: "$conversion" }, pre_conversion: { $sum: "$pre_conversion" }, payout: { $sum: "$payout" }, network_id: { $addToSet: "$network_id" } }
            totalGroupProjection = { _id: null, grossClick: { $sum: "$click" }, grossConversion: { $sum: "$conversion" }, grossPreConversion: { $sum: "$pre_conversion" }, grossPayout: { $sum: "$payout" } }
        } else {
            groupProjection = { _id: groupBy, click: { $sum: "$click" }, conversion: { $sum: "$conversion" }, pre_conversion: { $sum: "$pre_conversion" }, network_id: { $addToSet: "$network_id" } }
            totalGroupProjection = { _id: null, grossClick: { $sum: "$click" }, grossConversion: { $sum: "$conversion" }, grossPreConversion: { $sum: "$pre_conversion" } }
        }

        count = await AppSummaryModel.countAppSummary(filter, groupBy);
        data = await AppSummaryModel.getAppSummary(filter, groupProjection, options);
        total = await AppSummaryModel.totalAppSummary(filter, totalGroupProjection);
        let result = { data: "", totalCount: "", grossTotal: "" };
        if (data && count) {
            result['data'] = data;
            result['totalCount'] = count[0];
            if (total) {
                result['grossTotal'] = total[0];
            }
            let response = Response.success();
            response.payloadType = payloadType.array;
            response.payload = result;
            response.msg = "success";
            return res.status(200).send(response)
        }

    } catch (e) {
        let response = Response.error();
        response.payloadType = payloadType.array;
        response.error = [e.message];
        response.msg = "something went wrong!";
        return res.status(200).send(response)
    }
}

exports.getConversions = async (req, res, next) => {
    try {
        let filter = {};
        let sort = { conversion: -1 };
        let options = { sort: sort, limit: 100, skip: 0 };
        let groupProjection = {};
        let totalGroupProjection = {};
        if (req.body.search) {
            if (req.body.search.start_date && req.body.search.end_date) {
                filter['createdAt'] = { $gte: Moment(req.body.search.start_date).toDate(), $lte: Moment(req.body.search.end_date).toDate() };
            }
            if (req.body.search.app_id) {
                filter['app_id'] = req.body.search.app_id;
            }
            if (req.body.search.limit) {
                options['limit'] = +req.body.search.limit;
            }
            if (req.body.search.page) {
                options['skip'] = +req.body.search.limit * (+req.body.search.page - 1);
            }
        }
        if (req.body.sort && Object.keys(req.body.sort).length > 0 && req.body.sort.constructor === Object) {
            options['sort'] = req.body.sort;
        }

        groupProjection = { _id: { "app_id": "$app_id" }, conversion: { $sum: 1 }, createdAt: { $max: "$createdAt" }, network_id: { $addToSet: "$network_id" } };
        totalGroupProjection = { _id: null, grossConversion: { $sum: 1 } }

        count = await ConversionModel.countConversionSummary(filter, { "app_id": "$app_id" });
        data = await ConversionModel.getConversionSummary(filter, groupProjection, options);
        total = await ConversionModel.totalConversionSummary(filter, totalGroupProjection);

        let result = { data: "", totalCount: "", grossTotal: "" };
        if (data && count) {
            result['data'] = data;
            result['totalCount'] = count[0];
            if (total) {
                result['grossTotal'] = total[0];
            }
            result['todayRedisData'] = [];
            result['yesterdayRedisData'] = [];
            result['dayBeforeYesterdayRedisData'] = [];
            try {
                let networks = await NetworkModel.findAllNetwork({}, { _id: 1 });
                let setKeysForToday = networks.map(x => "AppIdSetForConversion:" + Moment().format('MM/DD/YYYY').toString() + ":" + x._id);
                setKeysForToday.push("AppIdSetForConversion:" + Moment().format('MM/DD/YYYY').toString());
                let todayRedisData = await Redis.getRedisSetsDataByUnion(setKeysForToday);
                if (!todayRedisData['error'] && todayRedisData['data']) {
                    result['todayRedisData'] = todayRedisData['data'];
                }

                let setKeysForYesterday = networks.map(x => "AppIdSetForConversion:" + Moment().subtract(1, 'days').format('MM/DD/YYYY').toString() + ":" + x._id);
                setKeysForYesterday.push("AppIdSetForConversion:" + Moment().subtract(1, 'days').format('MM/DD/YYYY').toString());
                let yesterdayRedisData = await Redis.getRedisSetsDataByUnion(setKeysForYesterday);
                if (!yesterdayRedisData['error'] && yesterdayRedisData['data']) {
                    result['yesterdayRedisData'] = yesterdayRedisData['data'];
                }

                let setKeysForDayBeforeYesterday = networks.map(x => "AppIdSetForConversion:" + Moment().subtract(2, 'days').format('MM/DD/YYYY').toString() + ":" + x._id);
                setKeysForDayBeforeYesterday.push("AppIdSetForConversion:" + Moment().subtract(2, 'days').format('MM/DD/YYYY').toString());
                let dayBeforeYesterdayRedisData = await Redis.getRedisSetsDataByUnion(setKeysForDayBeforeYesterday);
                if (!dayBeforeYesterdayRedisData['error'] && dayBeforeYesterdayRedisData['data']) {
                    result['dayBeforeYesterdayRedisData'] = dayBeforeYesterdayRedisData['data'];
                }
            } catch (error) {
                debug(error);
            }
            let response = Response.success();
            response.payloadType = payloadType.array;
            response.payload = result;
            response.msg = "success";
            return res.status(200).send(response)
        }
    } catch (e) {
        let response = Response.error();
        response.payloadType = payloadType.array;
        response.error = [e.message];
        response.msg = "something went wrong!";
        return res.status(200).send(response)
    }
}

exports.getAppIdPublisherReport = async (req, res) => {
    try {        
        let filter = {};
        let live = false;
        let project = {};
        let groupBy = {};
        let grossTotalProjection = { _id: null};
        let options = { };
        const givenDate = new Date(req.body.search['start_date']); // Convert timestamp to Date
        const currentDate = new Date();
        currentDate.setDate(currentDate.getDate() - 15);
        // Extract hours to check if time is not midnight
        const givenHours = givenDate.getUTCHours() || givenDate.getHours();
        if (givenHours !== 0 && givenDate > currentDate) {
            live = true;
        }

        if(live){
            project = { app_id: 1 };
            groupBy = { _id: { app_id: "$app_id" } };
            grossTotalProjection = { _id: null };
            options = { sort: { conversion: -1 } };
        }else{
            project = { app: 1 };
            groupBy = { _id: { app_id: "$app" } };
            grossTotalProjection = { _id: null };
            options = { sort: { conv: -1 } };
        }
        // let options = { sort: { conversion: -1 }, limit: 100, skip: 0 };
        

        if (req.body.search) {
            if (req.body.search.publishers) {
                if(live){
                    filter['publisher_id'] = { $in: req.body.search.publishers };
                }else{
                    filter['pid'] = { $in: req.body.search.publishers };
                }
            }
            // if(req.body.search.nid && req.body.search.nid.length > 0 ){
            //     filter['nid'] = { $in : req.body.search.nid };
            // }
            if (req.body.search.app_id) {
                if(live){
                    filter['app_id'] = req.body.search.app_id;
                }else{
                    filter['app'] = req.body.search.app_id;
                }
            }

            if(live){
                filter['timeSlot'] = { $gte: Moment().startOf("D").toDate(), $lte: Moment().toDate() };
            }else{
                filter['slot'] = { $gte: Moment().startOf("D").toDate(), $lte: Moment().toDate() };
            }
            if (req.body.search.start_date && req.body.search.end_date) {
                if(live){
                    filter['timeSlot'] = { $gte: Moment(req.body.search.start_date).toDate(), $lte: Moment(req.body.search.end_date).endOf('minute').toDate() };
                }else{
                    filter['slot'] = { $gte: Moment(req.body.search.start_date).toDate(), $lte: Moment(req.body.search.end_date).endOf('minute').toDate() };
                }
            }

            // options['limit'] = 100;
            if (req.body.search.limit) {
                options['limit'] = +req.body.search.limit;
            }

            // options['skip'] = 0;
            if (req.body.search.page && req.body.search.limit) {
                options['skip'] = +req.body.search.limit * (+req.body.search.page - 1);
            }

            if (req.body.search.projection) {
                if (req.body.search.projection.hasOwnProperty('click')) {
                   if(live){
                    groupBy['click'] = { $sum: "$click" };
                    grossTotalProjection['grossClick'] = { $sum: "$click" };
                    project['click'] = 1;
                   }else{
                    groupBy['click'] = { $sum: "$click" };
                    grossTotalProjection['grossClick'] = { $sum: "$click" };
                    project['click'] = 1;
                   }
                }
                // if (req.body.search.projection.hasOwnProperty('test_click')) {
                //     groupBy['test_click'] = { $sum: 0 };
                // } no need to add in group
                if (req.body.search.projection.hasOwnProperty('conversion')) {
                    if(live){
                        groupBy['conversion'] = { $sum: "$conversion" };
                        grossTotalProjection['grossConversion'] = { $sum: "$conversion" };
                        project['conversion'] = 1;
                    }else{
                        groupBy['conversion'] = { $sum: "$conv" };
                        grossTotalProjection['grossConversion'] = { $sum: "$conv" };
                        project['conv'] = 1;
                    }
                }
                if (req.body.search.projection.hasOwnProperty('pre_conversion')) {
                   if(live){
                    groupBy['pre_conversion'] = { $sum: "$pre_conversion" };
                    grossTotalProjection['grossPreConversion'] = { $sum: "$pre_conversion" };
                    project['pre_conversion'] = 1;
                   }else{
                    groupBy['pre_conversion'] = { $sum: "$lead" };
                    grossTotalProjection['grossPreConversion'] = { $sum: "$lead" };
                    project['lead'] = 1;
                   }
                }

                if (req.body['userDetail'] && req.body['userDetail']['userType'] === "Admin") {
                    if (req.body.search.projection.hasOwnProperty('revenue')) {
                       if(live){
                        groupBy['revenue'] = { $sum: "$revenue" };
                        grossTotalProjection['grossRevenue'] = { $sum: "$revenue" };
                        project['revenue'] = 1;
                       }else{
                        groupBy['revenue'] = { $sum: "$rev" };
                        grossTotalProjection['grossRevenue'] = { $sum: "$rev" };
                        project['rev'] = 1;
                       }
                    }
                    if (req.body.search.projection.hasOwnProperty('payout')) {
                        if(live){
                            groupBy['payout'] = { $sum: "$payout" };
                            grossTotalProjection['grossPayout'] = { $sum: "$payout" };
                            project['payout'] = 1;
                        }else{
                            groupBy['payout'] = { $sum: "$pay" };
                            grossTotalProjection['grossPayout'] = { $sum: "$pay" };
                            project['pay'] = 1;
                        }
                    }
                }
            }
        }
        else {
            if(live){
                filter['timeSlot'] = { $gte: Moment().startOf("D").toDate(), $lte: Moment().toDate() };
            }else{
                filter['slot'] = { $gte: Moment().startOf("D").toDate(), $lte: Moment().toDate() };
            }
        }

        if(live){
            groupBy['network_id'] = { $addToSet: "$network_id" };
        }else{
            groupBy['network_id'] = { $addToSet: "$N_id" };
        }
        project['network_id'] = 1
        if(live){
            groupBy['publisher_id'] = { $addToSet: "$publisher_id" };
        }else{
            groupBy['publisher_id'] = { $addToSet: "$pid" };
        }
        project['publisher_id'] = 1

        if (req.body.sort && Object.keys(req.body.sort).length > 0 && req.body.sort.constructor === Object) {
            options['sort'] = req.body.sort;
        }


        if(live){           
            data = await LiveAdvOffPubSouSummaryModel.getAppidPublisherSummary(filter, groupBy, options);             
        }else{            
            data = await LiveDaily_AdvertiserOfferPublisherSourceSummary.getAppidPublisherSummary(filter, groupBy, options);            
        }
        let result = { data: [], totalCount: 0 };
        if (data && data.length) {
            if (data[0].data && data[0].data.length) {
                result['data'] = data[0].data
            }
            if (data[0].metadata && data[0].metadata.length) {
                result['totalCount'] = data[0].metadata[0].total
            }
        }

        try {
            if (req.body.search.projection.hasOwnProperty('test_click')) {
                let appIds = [];
                if (req.body.search.app_id) {
                    appIds = [req.body.search.app_id];
                } else {
                    let redisAppIds = await Redis.getRedisSetData('TESCLKAPPID');
                    if (!redisAppIds['error'] && redisAppIds['data'] && redisAppIds['data'].length) {
                        appIds = redisAppIds['data'];
                    } else {
                        let redisKeys = await Redis.getRedisKeys('TESTCLICK:D*');
                        if (!redisKeys['error'] && redisKeys['data'] && redisKeys['data'].length) {
                            for (let item of redisKeys['data']) {
                                let appId = item.split(':')[2];
                                if (!appIds.includes(appId)) {
                                    appIds.push(appId);
                                }
                            }
                            await Redis.setRedisSetData('TESCLKAPPID', appIds, 300);
                        }
                    }
                }
                let keys = [];
                
                let startDate = Moment(req.body.search.start_date) // live ? Moment(filter['timeSlot']['$gte']) : Moment(filter['slot']['$gte']);
                let endDate = Moment(req.body.search.end_date) // live ? Moment(filter['timeSlot']['$lte']) : Moment(filter['slot']['$lte']) ;
                let date = startDate.date();
                let hourBlockList = [];
                while(endDate.isAfter(startDate)){
                	if(startDate.isAfter(Moment().subtract(52, 'hours'))){
                		hourBlockList.push(`D${parseInt(startDate.date())}_H${parseInt(startDate.hours()/4)}`);
                	}
                    startDate.add(4, 'hours');
                }
                for(let appId of  appIds){
                    for(let hourBlock of  hourBlockList){
                        keys.push(`TESTCLICK:${hourBlock}:${appId}`);
                    }
                }
                let testClickResult = {};
                let redisData = await Redis.getMultipleRedisData(keys);
                if (!redisData['error'] && redisData['data'] && redisData['data'].length) {
                    for (let i in keys) {
                        let appId = keys[i].split(':')[2];
                        if(testClickResult[appId]){
                            testClickResult[appId] += redisData['data'][i] ? parseInt(redisData['data'][i]) : 0;
                        }else{
                            testClickResult[appId] = redisData['data'][i] ? parseInt(redisData['data'][i]) : 0;
                        }
                    }
                }                                
                for(i = 0; i < result['data'].length; i++){
                    let res = result['data'][i];
                    if(res['_id']['app_id']){
                        result['data'][i]['test_click'] = parseInt(+testClickResult[res['_id']['app_id']]);
                        delete testClickResult[res['_id']['app_id']];
                    }
                }

                if(testClickResult && Object.keys(testClickResult).length > 0 ){
                    let doc = {
                        click : 0 ,
                        conversion :  0 ,
                        pre_conversion  : 0,
                        revenue :  0 ,
                        payout :  0 , 
                        network_id :  [],
                        publisher_id : []                       
                    }
                    if(!result['data']){
                        result['data'] = [];
                    }
                    for(let [key, value] of Object.entries(testClickResult)){
                        result['data'].push({
                            ...doc,
                            _id  : { app_id : key },
                            test_click  : value
                        })
                    }
                }                                       
            }
        } catch (error) {
            debug(error);
        }

        // let grossTotal = await AppidPublisherSummaryModel.totalAppidPublisherSummary(filter, grossTotalProjection);
        // if (grossTotal && grossTotal.length) {
        //     result['grossTotal'] = grossTotal[0]
        // }
        let response = Response.success();
        response.payloadType = payloadType.array;
        response.payload = result;
        response.msg = "success";
        return res.status(200).send(response)

    } catch (e) {
        console.log("file: allAppIdReport.js ~ line 255 ~ exports.getAppIdPublisherReport= ~ e", e)
        let response = Response.error();
        response.payloadType = payloadType.array;
        response.error = [e.message];
        response.msg = "something went wrong!";
        return res.status(200).send(response)
    }
}

exports.getAppIdPublisherGrossReport = async (req, res, next) => {
    try {
        let filter = {};
        let grossTotalProjection = { _id: null };

        let live = false;
        // let project = {};
        // let groupBy = {};
        // let options = { };
        const givenDate = new Date(req.body.search['start_date']); // Convert timestamp to Date
        const currentDate = new Date();
        currentDate.setDate(currentDate.getDate() - 15);
        // Extract hours to check if time is not midnight
        const givenHours = givenDate.getUTCHours() || givenDate.getHours();
        if (givenHours !== 0 && givenDate > currentDate) {
            live = true;
        }
        if (req.body.search) {
            if (req.body.search.publishers) {
                if(live){
                    filter['publisher_id'] = { $in: req.body.search.publishers };
                }else{
                    filter['pid'] = { $in: req.body.search.publishers };
                }
            }
            if (req.body.search.app_id) {
                if(live){
                    filter['app_id'] = req.body.search.app_id;
                }else{
                    filter['app'] = req.body.search.app_id;
                }
            }

            if(live){
                filter['timeSlot'] = { $gte: Moment().startOf("D").toDate(), $lte: Moment().toDate() };
            }else{
                filter['slot'] = { $gte: Moment().startOf("D").toDate(), $lte: Moment().toDate() };
            }
            if (req.body.search.start_date && req.body.search.end_date) {
                if(live){
                    filter['timeSlot'] = { $gte: Moment(req.body.search.start_date).toDate(), $lte: Moment(req.body.search.end_date).endOf('minute').toDate() };
                }else{
                    filter['slot'] = { $gte: Moment(req.body.search.start_date).toDate(), $lte: Moment(req.body.search.end_date).endOf('minute').toDate() };
                }
            }

            if (req.body.search.projection) {
                if (req.body.search.projection.hasOwnProperty('click')) {
                    grossTotalProjection['grossClick'] = { $sum: "$click" };
                }
                if (req.body.search.projection.hasOwnProperty('conversion')) {
                    if(live){
                        grossTotalProjection['grossConversion'] = { $sum: "$conversion" };
                    }else{
                        grossTotalProjection['grossConversion'] = { $sum: "$conv" };
                    }
                }
                if (req.body.search.projection.hasOwnProperty('pre_conversion')) {
                    if(live){
                        grossTotalProjection['grossPreConversion'] = { $sum: "$pre_conversion" };
                    }else{
                        grossTotalProjection['grossPreConversion'] = { $sum: "$lead" };
                    }
                }

                if (req.body['userDetail'] && req.body['userDetail']['userType'] === "Admin") {
                    if (req.body.search.projection.hasOwnProperty('revenue')) {
                        if(live){
                            grossTotalProjection['grossRevenue'] = { $sum: "$revenue" };
                        }else{
                            grossTotalProjection['grossRevenue'] = { $sum: "$rev" };
                        }
                    }
                    if (req.body.search.projection.hasOwnProperty('payout')) {
                        if(live){
                            grossTotalProjection['grossPayout'] = { $sum: "$payout" };
                        }else{
                            grossTotalProjection['grossPayout'] = { $sum: "$pay" };
                        }
                    }
                }
            }
        }
        else {
            if(live){
                filter['timeSlot'] = { $gte: Moment().startOf("D").toDate(), $lte: Moment().toDate() };
            }else{
                filter['slot'] = { $gte: Moment().startOf("D").toDate(), $lte: Moment().toDate() };
            }
        }

        let result = {};
        let grossTotal = [];
        if(live){
            grossTotal = await LiveAdvOffPubSouSummaryModel.totalAppidPublisherSummary(filter, grossTotalProjection);
        }else{
            grossTotal = await LiveDaily_AdvertiserOfferPublisherSourceSummary.totalAppidPublisherSummary(filter, grossTotalProjection);
        }
        if (grossTotal && grossTotal.length) {
            result = grossTotal[0]
        }
        let response = Response.success();
        response.payloadType = payloadType.array;
        response.payload = result;
        response.msg = "success";
        return res.status(200).send(response)

    } catch (e) {
        console.log("file: allAppIdReport.js ~ line 331 ~ exports.getAppIdPublisherReport= ~ e", e)
        let response = Response.error();
        response.payloadType = payloadType.array;
        response.error = [e.message];
        response.msg = "something went wrong!";
        return res.status(200).send(response)
    }
}

exports.getAppSources = async (req, res) => {
    try {
        let appId = '';
        let network = [];
        let publisher = [];
        if (req.body.search) {
            appId = req.body.search.appId;
            network = req.body.search.network;
            publisher = req.body.search.publisher
        } else {
            let response = Response.error();
            response.error = ["something went wrong!"];
            response.msg = "something went wrong!";
            return res.status(200).send(response)
        }
        let keys = [];
        for (let id of network) {
            let keyOld =  'CNSOURCE:' + id + ':' + appId;
            keys.push(keyOld);
            for(let pub of publisher){
                // let key = 'CNSOURCE:' + id + ':' +  pub +':' + appId;
                let key = `CNSOURCE:${id}:${pub}:${appId}`;
                keys.push(key);
            }
        }
        let redisData = await Redis.getMultipleSortedSetData(keys, 0, -1);
        let source = {};
        if (!redisData['error'] && redisData['data']) {
            for (let i in redisData['data']) {
                if (redisData['data'][i] && redisData['data'][i].length) {
                    let splitKey = keys[i].split(':');
                    source[splitKey[1]] = redisData['data'][i];
                }
            }
        }
        let response = Response.success();
        response.payloadType = payloadType.object;
        response.payload = source;
        response.msg = "success";
        return res.status(200).send(response)
    } catch (error) {
        debug(error);
        let response = Response.error();
        response.error = [error.message];
        response.msg = "something went wrong!";
        return res.status(200).send(response)
    }
}

exports.getConversionsForJumbo = async (req, res, next) => {
    try {
        let filter = { 'createdAt': { $gte: Moment().startOf("D").toDate(), $lte: Moment().toDate() } };
        let groupBy = {};
        // let options = { sort: { conversion: -1 }, limit: 100, skip: 0 };
        let options = { sort: { conversion: -1 } };
        let groupProjection = {};
        let totalGroupProjection = {};
        if (req.body.search) {
            if (req.body.search.start_date && req.body.search.end_date) {
                filter['createdAt'] = { $gte: Moment(req.body.search.start_date).toDate(), $lte: Moment(req.body.search.end_date).toDate() };
            }
            if (req.body.search.app_id) {
                filter['app_id'] = req.body.search.app_id;
            }
            if (req.body.search.publishers) {
                filter['publisher_id'] = { $in: req.body.search.publishers };
            }
            if (req.body.search.limit) {
                options['limit'] = +req.body.search.limit;
            }
            if (req.body.search.page) {
                options['skip'] = +req.body.search.limit * (+req.body.search.page - 1);
            }
        }
        if (req.body.sort && Object.keys(req.body.sort).length > 0 && req.body.sort.constructor === Object) {
            options['sort'] = req.body.sort;
        }

        groupBy['app_id'] = "$app_id";

        // groupBy['publisher_id'] = "$publisher_id";
        //  App_name: { $last: "$offer_name" }, 
        groupProjection = { _id: groupBy, conversion: { $sum: 1 }, createdAt: { $max: "$createdAt" }, network_id: { $addToSet: "$network_id" }, publisher_id: { $addToSet: "$publisher_id" } };
        totalGroupProjection = { _id: null, grossConversion: { $sum: 1 } }
        count = await ConversionModel.countConversionSummary(filter, { "app_id": "$app_id" });
        data = await ConversionModel.getConversionSummary(filter, groupProjection, options);
        total = await ConversionModel.totalConversionSummary(filter, totalGroupProjection);

        let result = { data: "", totalCount: "", grossTotal: "" };
        if (data && count) {
            result['data'] = data;
            result['totalCount'] = count[0];
            if (total) {
                result['grossTotal'] = total[0];
            }
            result['todayRedisData'] = [];
            result['yesterdayRedisData'] = [];
            result['dayBeforeYesterdayRedisData'] = [];
            try {
                let networks = await NetworkModel.findAllNetwork({}, { _id: 1 });
                let setKeysForToday = networks.map(x => "AppIdSetForConversion:" + Moment().format('MM/DD/YYYY').toString() + ":" + x._id);
                setKeysForToday.push("AppIdSetForConversion:" + Moment().format('MM/DD/YYYY').toString());
                let todayRedisData = await Redis.getRedisSetsDataByUnion(setKeysForToday);
                if (!todayRedisData['error'] && todayRedisData['data']) {
                    result['todayRedisData'] = todayRedisData['data'];
                }
                let setKeysForYesterday = networks.map(x => "AppIdSetForConversion:" + Moment().subtract(1, 'days').format('MM/DD/YYYY').toString() + ":" + x._id);
                setKeysForYesterday.push("AppIdSetForConversion:" + Moment().subtract(1, 'days').format('MM/DD/YYYY').toString());
                let yesterdayRedisData = await Redis.getRedisSetsDataByUnion(setKeysForYesterday);
                if (!yesterdayRedisData['error'] && yesterdayRedisData['data']) {
                    result['yesterdayRedisData'] = yesterdayRedisData['data'];
                }

                let setKeysForDayBeforeYesterday = networks.map(x => "AppIdSetForConversion:" + Moment().subtract(2, 'days').format('MM/DD/YYYY').toString() + ":" + x._id);
                setKeysForDayBeforeYesterday.push("AppIdSetForConversion:" + Moment().subtract(2, 'days').format('MM/DD/YYYY').toString());
                let dayBeforeYesterdayRedisData = await Redis.getRedisSetsDataByUnion(setKeysForDayBeforeYesterday);
                if (!dayBeforeYesterdayRedisData['error'] && dayBeforeYesterdayRedisData['data']) {
                    result['dayBeforeYesterdayRedisData'] = dayBeforeYesterdayRedisData['data'];
                }
            } catch (error) {
                debug(error);
            }
            result.data =  await checkAppId( result.data );
            let response = Response.success();
            response.payloadType = payloadType.array;
            response.payload = result;
            response.msg = "success";
            return res.status(200).send(response)
        }
    } catch (e) {
        let response = Response.error();
        response.payloadType = payloadType.array;
        response.error = [e.message];
        response.msg = "something went wrong!";
        return res.status(200).send(response)
    }
}

const checkAppId = async( data ) => {
    let app_id_array = [];
    data.map( ele => {
        app_id_array.push(ele._id['app_id']) ;
    })
    let filter = {
       app_id : { $in :  app_id_array }
    };    
    const result = await ApplicationDetailsModel.getApplicationDetails( filter , { name : 1 , app_id : 1 , _id : 0   } , {} ); 
    let appDetailsMap = new Map() ;
    result.map(ele=>{
        appDetailsMap.set(ele.app_id , ele.name );
    })
    for(let i = 0 ; i < data.length ; i++ ){
        let appData = appDetailsMap.get(data[i]._id['app_id'] );
        if(appData){
            data[i]._id['App_name']  = appData ;
        }else{
            data[i]._id['App_name']  = '' ;
        }


    }

  return data ; 
}
exports.getAppIdPublisher = async (req, res, next) => {
    try {
         let filter = { 'createdAt': { $gte: Moment().startOf("D").toDate(), $lte: Moment().toDate() } };
         let filter2 = { 'createdAt': { $gte: Moment().startOf("D").toDate(), $lte: Moment().toDate() } };

        let groupBy = {};
        // let options = { sort: { conversion: -1 }, limit: 100, skip: 0 };
        let options = { sort: { conversion: -1 } };
        let groupProjection = {};
        let totalGroupProjection = {};
        if (req.body.search) {
            if (req.body.search.start_date && req.body.search.end_date) {
                 filter['createdAt'] = { $gte: Moment(req.body.search.start_date).toDate(), $lte: Moment(req.body.search.end_date).toDate() };
                 filter2['createdAt'] = { $gte: Moment(req.body.search.start_date).toDate(), $lte: Moment(req.body.search.end_date).toDate() };

            }
            if (req.body.search.app_id) {
                filter['app_id'] = req.body.search.app_id;
            }
            if (req.body.search.publishers) {
                filter['publisher_id'] = { $in: req.body.search.publishers };
            }
             if (req.body.search.selectPub_Id) {
                filter2['publisher_id'] = { $in: req.body.search.selectPub_Id};
            }
            if (req.body.search.limit) {
                options['limit'] = +req.body.search.limit;
            }
            if (req.body.search.page) {
                options['skip'] = +req.body.search.limit * (+req.body.search.page - 1);
            }
        }

        groupBy['app_id'] = "$app_id";
        groupProjection = { _id: groupBy, conversion: { $sum: 1 }, createdAt: { $max: "$createdAt" }, network_id: { $addToSet: "$network_id" }, publisher_id: { $addToSet: "$publisher_id" } };
        totalGroupProjection = { _id: null, grossConversion: { $sum: 1 } }
        data = await ConversionModel.getConversionSummary(filter, groupProjection, options);
        data2 = await ConversionModel.getConversionSummary(filter2, groupProjection, options);
            
        // 1 filter app_id  only from data2
         const appIdsData2 = data2.map(item => item._id.app_id);
         //2: filter app_id from data those which is not in data2' app_id
         data = data.filter(item => !appIdsData2.includes(item._id.app_id));

        let result = { data: ""};
        if (data.length>0) {
            result['data'] = data;
            let response = Response.success();
            response.payloadType = payloadType.array;
            response.payload = result;
            response.msg = "success";
            return res.status(200).send(response)
        }
        else{
            const response=Response.success();
            response.payloadType=payloadTyp.array;
            response.payload=[];
            response.msg="No data found";
            return res.status(200).send(response)
        }
    } catch (e) {
        let response = Response.error();
        response.payloadType = payloadType.array;
        response.error = [e.message];
        response.msg = "something went wrong!";
        return res.status(200).send(response)
    }
}

exports.getConversionsForJumboDashboard = async (req, res, next) => {
    try {
        let result = { data: [], todayRedisData: [], yesterdayRedisData: [], dayBeforeYesterdayRedisData: [] };

        let filter = { 'createdAt': { $gte: Moment().subtract(3, 'days').startOf("D").toDate() }, 'publisher_id': { $in: [1, 3, 4, 5, 45, 62] } };
        let data = await ConversionModel.getAllConversion(filter, { app_id: 1, _id: 0 }, {});
        if (data && data.length) {

            result['data'] = data.filter(x => x.app_id != undefined)

            try {
                let networks = await NetworkModel.findAllNetwork({}, { _id: 1 });
                let setKeysForToday = networks.map(x => "AppIdSetForConversion:" + Moment().format('MM/DD/YYYY').toString() + ":" + x._id);
                setKeysForToday.push("AppIdSetForConversion:" + Moment().format('MM/DD/YYYY').toString());
                let todayRedisData = await Redis.getRedisSetsDataByUnion(setKeysForToday);
                if (!todayRedisData['error'] && todayRedisData['data']) {
                    result['todayRedisData'] = todayRedisData['data'];
                }

                let setKeysForYesterday = networks.map(x => "AppIdSetForConversion:" + Moment().subtract(1, 'days').format('MM/DD/YYYY').toString() + ":" + x._id);
                setKeysForYesterday.push("AppIdSetForConversion:" + Moment().subtract(1, 'days').format('MM/DD/YYYY').toString());
                let yesterdayRedisData = await Redis.getRedisSetsDataByUnion(setKeysForYesterday);
                if (!yesterdayRedisData['error'] && yesterdayRedisData['data']) {
                    result['yesterdayRedisData'] = yesterdayRedisData['data'];
                }

                let setKeysForDayBeforeYesterday = networks.map(x => "AppIdSetForConversion:" + Moment().subtract(2, 'days').format('MM/DD/YYYY').toString() + ":" + x._id);
                setKeysForDayBeforeYesterday.push("AppIdSetForConversion:" + Moment().subtract(2, 'days').format('MM/DD/YYYY').toString());
                let dayBeforeYesterdayRedisData = await Redis.getRedisSetsDataByUnion(setKeysForDayBeforeYesterday);
                if (!dayBeforeYesterdayRedisData['error'] && dayBeforeYesterdayRedisData['data']) {
                    result['dayBeforeYesterdayRedisData'] = dayBeforeYesterdayRedisData['data'];
                }
            } catch (error) {
                debug(error);
            }
        }
        let response = Response.success();
        response.payloadType = payloadType.array;
        response.payload = result;
        response.msg = "success";
        return res.status(200).send(response)
    } catch (e) {
        console.log("file: allAppIdReport.js ~ line 462 ~ exports.getConversionsForJumboDashboard= ~ e", e)
        let response = Response.error();
        response.payloadType = payloadType.array;
        response.error = [e.message];
        response.msg = "something went wrong!";
        return res.status(200).send(response)
    }
}

exports.webhookPushedOfferCount = async (req, res) => {
    try {

        let networkList = await NetworkModel.findAllNetwork({}, { _id: 1 });
        // console.log("file: Offer.js ~ line 2241 ~ exports.webhookCount= ~ networkList", networkList)

        let reqResult = {}
        let maxRedisExpireTime = +(process.env.MAX_WEBHOOK_PUSHED_OFFER_TIME || 86400) / 3600;
        for (let redisHour = 0; redisHour < maxRedisExpireTime; redisHour++) {

            let pushTime = Moment.utc(Moment().subtract(redisHour, 'h').toDate()).format('DD/MM/YY:HH');
            reqResult[pushTime] = {}

            for (const networkObj of networkList) {
                let pushCount = (await Redis.getRedisData("WPCNT:" + networkObj._id + ":" + pushTime)).data;
                reqResult[pushTime][networkObj._id] = pushCount || 0;
            }
        }
        // console.log("file: Offer.js ~ line 2255 ~ exports.webhookPushedOfferCount= ~ reqResult", reqResult)

        let response = Response.success();
        response.payload = reqResult;
        response.msg = "success";
        return res.status(200).json(response);
    } catch (error) {
        console.log("file: allAppIdReport.js ~ line 496 ~ exports.webhookPushedOfferCount= ~ error", error)
        let response = Response.error();
        response.error = [error];
        response.msg = " error while getting "
        return res.status(200).json(response);
    }
}

exports.getAppDetails = async (req, res) => {
    try {
        let result = await ApplicationDetailsModel.getApplicationDetails({}, { last_update: 1, category: 1, app_id: 1, _id: 1 , count : 1  });
        let response = Response.success();
        response.payload = result;
        response.msg = "success";
        return res.status(200).json(response);
    } catch (error) {
        console.log("file: allAppIdReport.js ~ line 496 ~ exports.webhookPushedOfferCount= ~ error", error)
        let response = Response.error();
        response.error = [error];
        response.msg = " error while getting "
        return res.status(200).json(response);
    }
}