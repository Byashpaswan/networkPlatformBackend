const Mongoose = require("mongoose");
const debug = require("debug")("eagle:models:sourceOfferPublisherSummary");
const objectIdType = Mongoose.Schema.Types.ObjectId;
require("mongoose-double")(Mongoose);
const DoubleType = Mongoose.Schema.Types.Double;

const SourceOfferPublisherSummary = Mongoose.Schema(
  {
    network_id: {
      type: objectIdType,
      required: true,
    },
    nid: {
      type: Number
    },
    offer_name: {
      type: String,
    },
    publisher_name: {
      type: String,
    },
    offer_id: {
      type: objectIdType,
      required: true,
    },
    advertiser_offer_id: {
      type: String,
    },
    source: {
      type: String,
      required: true,
    },
    publisher_id: {
      type: Number,
      required: true,
    },
    pid: {
      type: Number
    },
    impressions: {
      type: Number,
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
    revenue: {
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
    timeSlot: {
      type: Date,
    },
    timezone: {
      type: String,
    },
    timezone_offset: {
      type: String,
    },
    pre_conversion: {
      type: Number,
      default: 0,
    },
    publisher_conversion: {
      type: Number,
      default: 0,
    },
    publisher_payout: {
      type: DoubleType,
      default: 0,
    },
    hold_revenue: {
      type: DoubleType,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

SourceOfferPublisherSummary.index(
  {
    network_id: 1,
    timeSlot: 1,
    offer_id: 1,
    publisher_id: 1,
    source: 1,
  },
  { unique: true }
);
module.exports = SourceOfferPublisherSummary;
