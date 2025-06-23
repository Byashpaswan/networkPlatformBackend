const Mongoose = require('mongoose');
const mongooseObjectId = Mongoose.Types.ObjectId;
const OfferAuditLogModel = require('../../db/offer/offersAuditLog');
const Response = require('../../helpers/Response');
const { payloadType } = require('../../constants/config');
const { generateHash, offersAuditLog } = require('../../helpers/Functions');
const moment = require('moment');

exports.offerLogShow = (req, res) => {
    if (req.params.Offer_id && mongooseObjectId.isValid(req.params.Offer_id.trim())) {
        let Offer_id = mongooseObjectId(req.params.Offer_id.trim());
        OfferAuditLogModel.getCompleteOfferLog({ offer_id: Offer_id, network_id: mongooseObjectId(req.user.userDetail.network[0])}, {}, {}).then(result => {
            
            if (result && result.length>0)
            {
                let response = Response.success();
                response.payloadType = payloadType.array;
                response.payload = result;
                response.msg = "success";
                return res.status(200).json(response);
            }
            else {
                let response = Response.error();
                response.msg = "No Log Availabe";
                response.error = ["No Log Availabe"];
                return res.status(200).json(response);
            }

        })
            .catch(err => {
                let response = Response.error();
                response.msg = "Not found";
                response.error = [err.message];
                return res.status(200).json(response);
            })
    } else {
        let response = Response.error();
        response.msg = "Invalid Request";
        response.error = ["Invalid Request"];
        return res.status(200).json(response);
    }
}