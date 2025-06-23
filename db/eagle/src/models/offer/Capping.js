const Mongoose = require("mongoose");
const debug = require("debug")("eagle:models:OfferCapping");
const objectIdType = Mongoose.Schema.Types.ObjectId;
const mongooseObjectId = Mongoose.Types.ObjectId;
require('mongoose-double')(Mongoose);
const DoubleType = Mongoose.Schema.Types.Double;
const { config } = require('../../constants/index');

const OfferCapping = Mongoose.Schema({

  daily_clicks: {
    type: Number,
    required: false,
    default: 0,
  },
  monthly_clicks: {
    type: Number,
    required: false,
    default: 0,
  },
  overall_click: {
    type: Number,
    required: false,
    default: 0,
  },
  daily_conv: {
    type: Number,
    required: false,
    default: 0,

  },
  monthly_conv: {
    type: Number,
    required: false,
    default: 0,
  },
  overall_conv: {
    type: Number,
    required: false,
    default: 0,
  },
  payout_daily: {
    type: DoubleType,
    required: false,
    default: 0,
  },
  monthly_payout: {
    type: DoubleType,
    required: false,
    default: 0,
  },
  overall_payout: {
    type: DoubleType,
    required: false,
    default: 0,
  },
  daily_revenue: {
    type: DoubleType,
    required: false,
    default: 0,
  },
  monthly_revenue: {
    type: DoubleType,
    required: false,
    default: 0,
  },
  overall_revenue: {
    type: DoubleType,
    required: false,
    default: 0,
  },
}, {
  _id: false,
});

module.exports = OfferCapping;
