const Mongoose = require("mongoose");
const debug = require("debug")("eagle:models:MonthlyAdvertiserOfferPublisherSummary");
const objectIdType = Mongoose.Schema.Types.ObjectId;
// require("mongoose-double")(Mongoose);
const DoubleType = Mongoose.Schema.Types.Decimal128;

const MonthlyAdvertiserOfferPublisherSummary = Mongoose.Schema({
  network_id: {
    type: objectIdType,
    required: true,
  },
  nid: {
    type: Number
  },
  advertiser_id: {
    type: objectIdType,
    required: true,
  },
  aid: {
    type: Number
  },
  advertiser_name: {
    type: String,
  },
  offer_id: {
    type: objectIdType,
    required: true,
  },
  advertiser_offer_id: {
    type: String,
  },
  offer_name: {
    type: String,
  },
  publisher_id: {
    type: Number,
    required: true,
  },
  pid: {
    type: Number
  },
  publisher_name: {
    type: String,
  },
  click: {
    type: Number,
    default: 0,
  },
  unique_click: {
    type: Number,
    default: 0,
  },
  conversion: {
    type: Number,
    default: 0,
  },
  unique_conversion: {
    type: Number,
    default: 0,
  },
  pre_conversion: {
    type: Number,
    default: 0,
  },
  publisher_conversion: {
    type: Number,
    default: 0,
  },
  publisher_confirm_conversion: {
    type: Number,
  },
  is_verified: {
    type: Boolean,
    default: false
  },
  total_confirm_conversion: {
    type: Number,
  },
  revenue: {
    type: DoubleType,
    default: 0,
  },
  hold_revenue: {
    type: DoubleType,
    default: 0,
  },
  payout: {
    type: DoubleType,
    default: 0,
  },
  currency: {
    type: String
  },
  publisher_payout: {
    type: DoubleType,
    default: 0,
  },
  impressions: {
    type: Number,
  },
  month: {
    type: Number,
  },
  year: {
    type: Number,
  },
  timezone: {
    type: String,
    required: true,
  },
  timeSlot: {
    type: Date,
    required: true,
  },
  timezone_offset: {
    type: String,
  },
}, {
  timestamps: true,
});

MonthlyAdvertiserOfferPublisherSummary.index({
  network_id: 1,
  advertiser_id: 1,
  offer_id: 1,
  publisher_id: 1,
  timeSlot: 1,
}, {
  unique: true
});
module.exports = MonthlyAdvertiserOfferPublisherSummary;
