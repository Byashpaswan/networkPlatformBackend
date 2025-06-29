const Mongoose = require("mongoose");
const debug = require("debug")("eagle:models:PublisherOffers");
const objectIdType = Mongoose.Schema.Types.ObjectId;
const mongooseObjectId = Mongoose.Types.ObjectId;
// require('mongoose-double')(Mongoose);
const SchemaDouble = Mongoose.Schema.Types.Double;
const OfferCapping = require('./Capping');
const { DeviceTargeting, GeoTargeting } = require('./Targeting');
const { getConstLabel, getConstValue } = require('../../helper/Util');
const PublisherOffers = Mongoose.Schema({
  network_id: {
    type: objectIdType,
    required: true,
  },
  offer_id:{
    type: objectIdType,
    required:true,
  },
  publisher_id:{
    type:Number
  },
    publisher_offer_status:{
    type:Number,
  },
  publisher_offer_status_label:{
    type:String,
    },
    publisher_payout_percent: {
      type:Number
  }


})

PublisherOffers.index({ network_id: 1, offer_id: 1, publisher_id :1, status:1   });

//module.exports = Mongoose.model('publisher_offers', PublisherOffers );
module.exports = PublisherOffers;
