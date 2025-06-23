const Mongoose = require("mongoose");
const objectIdType = Mongoose.Schema.Types.ObjectId;

const AdvertiserOfferStats = Mongoose.Schema({

    advertiser_name: {
        type: String,
        required: true,
    },
    advertiser_id: {
        type: objectIdType,
        required: true,
    },

    network_id: {
        type: objectIdType,
        require: true,
    },
    active: {
        type: Number,
        require: true,
        dfault: 0
    },
    no_link_offers: {
        type: Number,
        required: true,
        default: 0,
    },
    applied: {
        type: Number,
        require: true,
        default: 0

    },
    waitingForApproval: {
        type: Number,
        require: true,
        default: 0
    },
    waiting_in_apply: {
        type: Number,
        require: true,
        default: 0
    },
    paused: {
        type: Number,
        require: true,
        default: 0
    },
    deleted: {
        type: Number,
        require: true,
        default: 0
    },
    unmanaged: {
        type: Number,
        require: true,
        default: 0

    },
    rejected: {
        type: Number,
        require: true,
        default: 0,

    },
    totalOffers: {
        type: Number,
        require: true,
        default: 0
    },
    status: {
        type: String,
        required: true,
        default: 'InActive'
    
      }
}, {
    timestamps: true
});

module.exports = AdvertiserOfferStats
