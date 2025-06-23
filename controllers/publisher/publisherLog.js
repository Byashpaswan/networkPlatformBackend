const Mongoose = require('mongoose');
const debug = require("debug")("darwin:Controller:Publisher");
const mongooseObjectId = Mongoose.Types.ObjectId;
const PublisherModel = require('../../db/PublisherLog/PublisherLog');
var Moment = require('moment');
const bcrypt = require("bcryptjs");
const Response = require('../../helpers/Response');
const { isInteger } = require('lodash');
const moment = require('moment');   
const { options } = require('mongoose');


exports.getPublisherLog = async (req , res ) => {
    let filter = {} ;

    if(req.body.status){
        filter['offer_type']  = req.body.status ;
    }

    if (req.body.dateRange.startDateTime && req.body.dateRange.endDateTime) {
        filter['createdAt'] = {  
            $gte: moment(req.body.dateRange.startDateTime), 
            $lte: moment(req.body.dateRange.endDateTime) 
        };
    }
    if(req.body.publisherIds.length){
        filter['pid'] = { $in : req.body.publisherIds.map( ele => ele.pid ) } ; //  
    }
    let options = {} ;

    if (req.body.limit && req.body.page) {
        options['limit'] = +req.body.limit; // limit should be a number
        options['skip'] = +(req.body.page - 1) * (+req.body.limit); // skip should also be a number
    }

    if(req.user.userDetail.network[0] && mongooseObjectId(req.user.userDetail.network[0])){
        filter['N_id'] = mongooseObjectId(req.user.userDetail.network[0]);
    }
    const result = await PublisherModel.getPublisherLogDb( filter , {_id : 0 , N_id : 0  , createdAt : 0  , updatedAt : 0 } , options);
    if(result && result.length ){
        let response = Response.success();


        response.payloadType = [] ;
        response.payload = {
            "result" : result , 
           'pageSize': req.body.limit,
           'page': req.body.page,
           'totalpublisherLog': result.length,
        };
        // if (result.length == options.limit) {
            try {
              let publisherLogCount = await PublisherModel.getTotalPagesCount(filter);
              if (publisherLogCount) response.payload['totalpublisherLog'] = publisherLogCount.length;
            } catch (error) { }
        //   }
        
        response.msg = "success";
        return res.status(200).send(response)

    }else {
    let response = Response.success();
    response.payloadType = [];
    response.payload = result ;
    response.msg = " no record foud !";
    return res.status(200).send(response)

    }

}