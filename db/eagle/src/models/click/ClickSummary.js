const Mongoose = require("mongoose");
const debug = require("debug")("eagle:models:Advertiser");
const objectIdType = Mongoose.Schema.Types.ObjectId;
const mongooseObjectId = Mongoose.Types.ObjectId;
const mongooseAutoIncrement = require('mongoose-auto-increment');
require('mongoose-double')(Mongoose);
const DoubleType = Mongoose.Schema.Types.Double;
const { config } = require('../../constants/index');
const OfferCapping = require('../offer/Capping');
//const { DeviceTargeting, GeoTargeting } = require('./DeviceTargeting,GeoTargeting');
//const Creative = require('./Creative');
//const { getConstLabel, getConstValue } = require('../helper/Util');

const ClickSummary = Mongoose.Schema({

  network_id: {
    type: objectIdType,
  },
  advertiser_id: {
    type: objectIdType,
    required: true
  },
  offer_id: {
    type: String,
    required: true,
  },
  offer_name: {
    type: String,
    required: true,
  },
  publisher_id: {
    type: Number,
    required: true,
  },
  goal_id: {
    type: Number,
  },
  creative_id: {
    type: String,
  },
  impressions: {
    type: Number,
  },
  click: {
    type: Number,
    default: 0
  },
  unique_click: {
    type: Number,
    default: 0
  },
  conversion: {
    type: Number,
    default: 0
  },
  unique_conversion: {
    type: Number,
    default: 0
  },
  revenue: {
    type: DoubleType,
    default: 0,
  },
  payout: {
    type: DoubleType,
    default: 0,
  },
  TimeSlot: {
    type: Date
  }


}, {
  timestamps: true,
});

ClickSummary.index({ network_id: 1, offer_id: 1, publisher_id: 1 });
ClickSummary.index({ network_id: -1, createdAt: -1, publisher_id: 1, advertiser_id: 1, offer_id: 1 });

module.exports = ClickSummary;
