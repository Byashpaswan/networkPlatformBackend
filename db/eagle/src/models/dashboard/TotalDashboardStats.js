const Mongoose = require("mongoose");
const debug = require("debug")("eagle:models:TotalDashboardStats");
const ObjectIdType = Mongoose.Schema.Types.ObjectId;

const TotalDashboardStats = Mongoose.Schema({
    network_id: {
        type: ObjectIdType,
        required: true
    },
    click: {
        type: Number,
        default: 0
    },
    conversion: {
        type: Number,
        default: 0
    },
    payout: {
        type: Number,
        default: 0
    },
    revenue: {
        type: Number,
        default: 0
    },
    clickFailed: {
        type: Number,
        default: 0
    },
    conversionFailed: {
        type: Number,
        default: 0
    },
    offers: {
        type: Number,
        default: 0
    },
    newOffers: {
        type: Number,
        default: 0
    },
    timeSlot: {
        type: Date,
        required: true,
    }
}, {
    timestamps: true
});

TotalDashboardStats.index({ network_id: 1, timeSlot: 1 }, { unique: true });

module.exports = TotalDashboardStats;