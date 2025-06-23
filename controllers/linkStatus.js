const mongoose = require('mongoose');
const mongoObjectId = mongoose.Types.ObjectId;

const Redis = require('../helpers/Redis');
const Response = require('../helpers/Response');
const OfferModel = require('../db/offer/Offer');
const moment = require('moment');


exports.saveLinkRedirectionCount = async (req, res) => {

    try {
        const networkid = mongoObjectId(req['integration']['network_id']);
        const offerid = req.body.offerid ? mongoObjectId(req.body.offerid) : null;
        const appid = req.body.appid || null;
        const jumps = req.body.jumps || null;

        if (!networkid || !offerid || !appid || !jumps || !mongoObjectId.isValid(offerid) || !mongoObjectId.isValid(networkid)) {
            let response = Response.error();
            response.msg = "send proper offerid, networkid, appid, jumps";
            return res.status(400).send(response)
        }

        // let result = await Redis.getRedisHashDataByKeys("OFFER:" + offerid.toString(), ["app_id", "network_id"])
        // if (result.data.includes(null)) {
        //     await OfferModel.getOneOffer({ _id: mongoObjectId(offerid) }, { _id: 0, network_id: 1, app_id: 1 }).then((offerData) => {
        //         if (!offerData) {
        //             let response = Response.error();
        //             response.msg = "offerid not found";
        //             return res.status(400).send(response)
        //         }

        //         networkid = offerData['network_id'];
        //         // console.log("offerData", offerData)
        //         appid = offerData['app_id'];

        //     }).catch(err => {
        //         console.log(err);
        //         let response = Response.error();
        //         response.error = err.message;
        //         response.msg = "Internal Error";
        //         return res.status(400).send(response)
        //     });
        // }
        // else {
        //     appid = result.data[0];
        //     networkid = result.data[1];
        // }

        try {
            let offerResult = await OfferModel.updateOffer({ "_id": offerid }, { "wTime": moment().toDate(), "jumps": jumps }, { "timestamps": false })
            // console.log("file: linkStatus.js ~ line 53 ~ exports.saveLinkRedirectionCount= ~ offerResult", offerResult)
        } catch (error) {
            // console.log("file: linkStatus.js ~ line 54 ~ exports.saveLinkRedirectionCount= ~ error", error);
            mongoose.connection.collection('errors').insertOne({ "offerId": offerid, "identifier": 'redirection count save', "error": error.stack, "createdAt": moment().toDate() });
        }

        let key = "LINKSTATUS:" + networkid.toString() + ":" + moment().date() + ":" + moment().hours()
        let value = appid + ":" + offerid.toString()
        let args = [key, jumps, value]

        result = await Redis.setDataInRedisSortedSet(args, 36 * 60 * 60);
        if (result.err) {
            let response = Response.error();
            response.msg = result.data;
            return res.status(400).send(response)
        }
        else {
            let response = Response.success();
            response.msg = "link jumps updated";
            return res.status(200).send(response)
        }
    }
    catch (err) {
        console.log(err);
        let response = Response.error();
        response.error = err.message;
        response.msg = "Internal Error";
        return res.status(400).send(response)
    }
}