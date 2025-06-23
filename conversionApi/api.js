const Mongoose = require('mongoose');
const debug = require("debug")("darwin:conversionApi:sourceApi");
const { ConversionModel } = require("../db/click/clickLog");
const Response = require('../helpers/Response');
const { payloadType } = require('../constants/config');
const { chunkArrayInGroups } = require('../helpers/Functions');
var moment = require('moment');

exports.getDateWiseSourceReport = async (req, res) => {
    let filter = {};
    let projection = {aff_sub1:1, aff_source:1, _id:0};
    let response = {};
    let fromdate;
    let todate;
    try {
        if (!req.query.source)
        {
            response = this.respondError('Parameter source is missing', ['Parameter source is missing']);
            return res.status(200).json(response);
        }
        if (!req.query.fromdate) {
            response = this.respondError('Parameter fromdate is missing', ['Parameter fromdate is missing']);
            return res.status(200).json(response);
        }
        try {
            fromdate = moment(req.query.fromdate.trim());
        }
        catch{
            response = this.respondError('Invalid Value fromdate', ['Invalid Value fromdate']);
            return res.status(200).json(response);
        }
        if (!req.query.todate) {
            response = this.respondError('Parameter fromdate is missing', ['Parameter fromdate is missing']);
            return res.status(200).json(response);
        }
        try {
            todate = moment(req.query.todate.trim()).endOf('day');
        }
        catch{
            response = this.respondError('Invalid Value todate', ['Invalid Value todate']);
            return res.status(200).json(response);
        }
        if (!moment(fromdate).isValid() || !moment(todate).isValid() || fromdate.isAfter(todate))
        {
            response = this.respondError('Invalid Dates', ['Date range is Invalid']);
            return res.status(200).json(response);  
        }
        filter['aff_source'] = req.query.source.trim();
        filter['createdAt'] = { $gte: fromdate.toDate(), $lte: todate.toDate() };
        let result = await ConversionModel.getLogConversion(filter, projection, {});
        if (result.length)
        {
            let output = [];
            result.map(obj => {
                obj['conversion'] = true;
                output.push({ conversion: obj.conversion, source:obj.aff_source,aff_click_id:obj.aff_sub1});
            })
            response = this.respondSuccess('Success', output);
        }
        else {
            response = this.respondSuccess('No record Found', result);
        }
        return res.status(200).json(response);
    }
    catch(e){
        response = this.respondError('Error', ['Internal Server Error']);
        return res.status(200).json(response);
    }
}


exports.respondSuccess = (msg, output) => {
    let response = Response.success();
    response.msg = msg;
    response.payloadType = payloadType.array;
    response.payload = output;
    return response;
}

exports.respondError = (msg, error) => {
    let response = Response.error();
    response.msg = msg;
    response.error = error;
    return response;
}


exports.getClickWiseSourceReport = async (req, res) => {
    let filter = {};
    let projection = {  aff_sub1: 1, _id: 0 };
    let response = {};
    let output = [];
    let convertingClicks = [];
    let fromdate;
    let todate;
    // debug(req.body);
    try {
        if (!req.body.click_data || !Array.isArray(req.body.click_data) || !req.body.click_data.length) {
            response = this.respondError('Parameter click_data is Invalid', ['Parameter click_data is Invalid']);
            return res.status(200).json(response);
        }
        // debug(req.body.click_data);
        if (req.body.fromdate) {
            try {
                fromdate = moment(req.body.fromdate.trim());
            }
            catch{
                response = this.respondError('Invalid Value fromdate', ['Invalid Value fromdate']);
                return res.status(200).json(response);
            }
        }
        if (req.body.todate) {
            
            try {
                todate = moment(req.body.todate.trim()).endOf('day');
            }
            catch{
                response = this.respondError('Invalid Value todate', ['Invalid Value todate']);
                return res.status(200).json(response);
            }
        }
        if (fromdate && todate && fromdate.isAfter(todate)) {
            response = this.respondError('Invalid Dates', ['Date range is Invalid']);
            return res.status(200).json(response);
        }
        if (fromdate && todate && moment(fromdate).isValid() && moment(todate).isValid())
        {
            filter['createdAt'] = { $gte: fromdate.toDate(), $lte: todate.toDate() };
        }
        let chunkFilter = this.processChunkInFilter(req.body.click_data);
        for (let i = 0; i < chunkFilter.length; i++)
        {
            if (chunkFilter[i].length)
            {
                filter['aff_sub1'] = { "$in": chunkFilter[i] };
                try {
                    let result = await ConversionModel.getLogConversion(filter, projection, {});
                    if (result.length) {
                        result.map(click => {
                            convertingClicks.push(click.aff_sub1);
                        })
                    }
                }
                catch{

                }
            }
        }
        req.body.click_data.map(obj => {
            obj['conversion'] = false;
            if (convertingClicks.includes(obj.aff_click_id))
            {
                obj['conversion'] = true;    
            }
            output.push({ conversion: obj.conversion, source: obj.source, aff_click_id: obj.aff_click_id });
        })
        response = this.respondSuccess('Success', output);
        return res.status(200).json(response);
    }
    catch (e) {
        debug(e)
        response = this.respondError('Error', ['Internal Server Error']);
        return res.status(200).json(response);
    }
}

exports.processChunkInFilter = (data)=>
{
    let filter = [];
    if (data.length <= 50)
    {
        let chunkFilter = [];
        data.map(obj => {
            if (obj.aff_click_id && obj.source)
                chunkFilter.push(obj.aff_click_id.trim());
        })
        filter.push(chunkFilter);
    }
    else {
        let chunkClickData = chunkArrayInGroups(data, 50);
        chunkClickData.map(chunk => {
            let chunkFilter = [];
            chunk.map(obj => {
                if (obj.aff_click_id)
                    chunkFilter.push(obj.aff_click_id.trim());
            })
            filter.push(chunkFilter);
        })
    }
    return filter;
}