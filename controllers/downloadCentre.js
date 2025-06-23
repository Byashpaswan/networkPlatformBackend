const Mongoose = require('mongoose');
const debug = require("debug")("darwin:Controller:downloadCentre");
const mongooseObjectId = Mongoose.Types.ObjectId;
const DownloadCenter = require('../db/downloadCenter');
const Response = require('../helpers/Response');
const { payloadType } = require('../constants/config');
const { generateHash, offersAuditLog, filterHash, getCacheData, encodeData, decodeData, chunkArrayInGroups, checkMyOffer} = require('../helpers/Functions');
const { response } = require('express');

exports.getallData = (req,res)=>{

    let networkId = req.user.userDetail.network[0];
    let category = req.user.userDetail.category;
    let filter={'NetworkId':networkId, "User_Category":category};
    let projection={UserDetails:1,reportName:1,format:1,createdAt:1,status:1,DownloadId:1,filepath:1,Filter:1,IsScheduler:1};
    DownloadCenter.findDownloadCenterData(filter,projection).then(result=>{
        if(result.length<1){
            let response = Response.error();
            response.payloadType = payloadType.array;
            response.msg = "No Download Added";
            return res.status(200).send( response )
        }
        else if (result.length>=1)
        {
            //console.log(result);
            res.status(200).json(result);
        }
    }).catch(err=>{
        let response=Response.error();
        response.err=payloadType.array;
        response.msg="Something Wents Wrong";
        return res.status(400).json(response);
        
    })
}