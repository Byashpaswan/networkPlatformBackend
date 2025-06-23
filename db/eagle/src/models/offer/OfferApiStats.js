const Mongoose = require("mongoose");
const debug = require("debug")("eagle:models:OfferApiStats");
const objectIdType = Mongoose.Schema.Types.ObjectId;

const StatsSchema = Mongoose.Schema({
    approved_offers: {
        type: Number,
        required: true,
        default: 0,
    },
    no_link_offers: {
        type: Number,
        required: true,
        default: 0,
    },
    new_offers: {
        type: Number,
        required: true,
        default: 0,
    },
    apply_offers: {
        type: Number,
        required: true,
        default: 0,
    },
    updated_offers: {
        type: Number,
        required: true,
        default: 0,
    },
    up_to_date_offers: {
        type: Number,
        required: true,
        default: 0,
    },
    total_offers:{
        type:Number,
        required: true,
        default:0,
    }
});

const OfferApiStats = Mongoose.Schema({

    network_id: {
        type: objectIdType,
        required: true,
    },
    advertiser_id: {
        type: objectIdType,
        required: true,
    },
    advertiser_name: {
        type: String,
        required: true,
    },
    advertiser_platform_id: {
        type: objectIdType,
        required: true,
    },
    platform_id: {
        type: objectIdType,
        required: true,
    },
    platform_name: {
        type: String,
        required: true,
    },
    stats: {
        type: StatsSchema,
    },
    remarks: {
        type: String,
        default: ''
    },
    time_taken: {
        type: Number,
    },
}, {
        timestamps: true
    });

OfferApiStats.index({ network_id: 1, advertiser_id: 1, })

module.exports = OfferApiStats;

