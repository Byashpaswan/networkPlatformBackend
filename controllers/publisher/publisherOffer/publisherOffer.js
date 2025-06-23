const Mongoose = require('mongoose');
const debug = require("debug")("darwin:Controller:PublisherOffer");
const mongooseObjectId = Mongoose.Types.ObjectId;
const PublisherOffersModel = require('../../../db/publisher/publisherOffer/publisherOffer');
const Response = require('../../../helpers/Response');
const { payloadType } = require('../../../constants/config');
const {config} = require('../../../constants/Global');

exports.insertPublisherOffer = (req, res, next) => {
    let pOffers = {};
    if (req.body.publisherOffers && req.body.publisherOffers.publisher_id && req.body.publisherOffers.offer_id && req.body.publisherOffers.publisher_offer_status) {
        pOffers = req.body.publisherOffers;
    }

    for (let i = 0; i < pOffers.offer_id.length; i++) {
        pOffers.publisher_id.map(publisher => {
            reflect = { network_id: mongooseObjectId(req.user.userDetail.network[0]), offer_id: mongooseObjectId(pOffers.offer_id[i]), publisher_id: publisher.pid, publisher_offer_status_label: pOffers.publisher_offer_status, publisher_offer_status: config.OFFERS_STATUS[pOffers.publisher_offer_status]['value'], publisher_payout_percent: +pOffers.publisher_payout }
            PublisherOffersModel.insertOrUpdatePublisherOffer({ network_id: mongooseObjectId(req.user.userDetail.network[0]), offer_id: mongooseObjectId(pOffers.offer_id[i]), publisher_id: publisher.pid }, reflect).then(result => {
            })
            .catch(err => {
            })
        });
        
        
    }
    // let response = Response.success();
    // response.payloadType = payloadType.array;
    // response.payload = [];
    // response.msg = " successfully saved all ";
    // debug(response);
    // return res.status(200).json(response);
    next();
}