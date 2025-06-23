const Mongoose = require("mongoose");
const ObjectId = Mongoose.Schema.Types.ObjectId;
require("mongoose-double")(Mongoose);
const Double = Mongoose.Schema.Types.Double;

const AdvertiserOfferPublisherSourceSummary = Mongoose.Schema(
  {
    network_id: {
      type: ObjectId,
      required: true,
    },
    advertiser_id: {
      type: ObjectId,
      required: true,
    },
    advertiser_name: {
      type: String,
    },
    offer_id: {
      type: ObjectId,
      required: true,
    },
    offer_name: {
      type: String,
    },
    publisher_id: {
      type: Number,
      required: true,
    },
    publisher_name: {
      type: String,
    },
    source: {
      type: String,
      required: true,
    },
    advertiser_offer_id: {
      type: String,
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
    },
    pre_conversion: {
      type: Number,
      default: 0,
    },
    conversion: {
      type: Number,
      default: 0,
    },
    unique_conversion: {
      type: Number,
    },
    publisher_conversion: {
      type: Number,
      default: 0,
    },
    revenue: {
      type: Double,
      default: 0,
    },
    hold_revenue: {
      type: Double,
      default: 0,
    },
    payout: {
      type: Double,
      default: 0,
    },
    currency: {
      type: String
    },
    publisher_payout: {
      type: Double,
      default: 0,
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
    app_id: {
      type: String
    },
    aid: {
      type: Number
    },
    plid: {
      type: Number
    },
    plty:{
      type: Number
    },
    nid: {
      type: Number
    },
    aPlId: {
      type: ObjectId
    },
  },
  {
    timestamps: true,
  }
);

AdvertiserOfferPublisherSourceSummary.index(
  {
    network_id: 1,
    offer_id: 1,
    publisher_id: 1,
    timeSlot: 1,
    source: 1,
  },
  {
    unique: true
  }
);

module.exports = AdvertiserOfferPublisherSourceSummary;