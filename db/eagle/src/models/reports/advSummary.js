const Mongoose = require("mongoose");
const debug = require("debug")("eagle:models:AdvertiserSummary");
const objectIdType = Mongoose.Schema.Types.ObjectId;
require("mongoose-double")(Mongoose);
const DoubleType = Mongoose.Schema.Types.Double;

const AdvertiserSummary = Mongoose.Schema(
    {
        network_id: {
            type: objectIdType,
            required: true,
        },
        nid: {
            type: Number
        },
        advertiser_name: {
            type: String,
        },
        advertiser_id: {
            type: objectIdType,
            required: true,
        },
        aid: {
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

AdvertiserSummary.index(
    { network_id: 1, timeSlot: 1, advertiser_id: 1 },
    { unique: true }
);

module.exports = AdvertiserSummary;
