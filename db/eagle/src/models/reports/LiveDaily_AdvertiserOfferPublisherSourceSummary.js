const Mongoose = require("mongoose");
const ObjectId = Mongoose.Schema.Types.ObjectId;
// require("mongoose-double")(Mongoose);
const Double = Mongoose.Schema.Types.Decimal128;


const LiveDaily_AdvertiserOfferPublisherSourceSummary = Mongoose.Schema(
    {
        N_id: {
            type: ObjectId,
            require: true
        },
        A_id: {
            type: ObjectId,
            require: true
        },
        oId: {
            type: ObjectId,
            required: true,
        },
        oName: {
            type: String,
        },
        pid: {
            type: Number,
            required: true,
        },
        source: {
            type: String,
            required: true,
        },
        AdOId: {
            type: String,
        },
        view: {
            type: Number,
        },
        click: {
            type: Number,
            default: 0,
        },
        uClick: {
            type: Number,
        },
        lead: {
            type: Number,
            default: 0,
        },
        conv: {
            type: Number,
            default: 0,
        },
        uConv: {
            type: Number,
        },
        pConv: {
            type: Number,
            default: 0,
        },
        rev: {
            type: Double,
            default: 0,
        },
        hRev: {
            type: Double,
            default: 0,
        },
        pay: {
            type: Double,
            default: 0,
        },
        coin: {
            type: String
        },
        pPay: {
            type: Double,
            default: 0,
        },
        slot: {
            type: Date,
        },
        tz: {
            type: String,
        },
        tzo: {
            type: String,
        },
        app: {
            type: String
        },
        aid: {
            type: Number
        },
        plid: {
            type: Number
        },
        plty:{
            type : Number,
        }, 
        nid: {
            type: Number
        },
        aPlId: {
            type: ObjectId
        },
    },
    { timestamps: true }
);

LiveDaily_AdvertiserOfferPublisherSourceSummary.index(
    {
        N_id: 1,
        oId: 1,
        pid: 1,
        Slot: 1,
        source: 1,
    },
    { unique: true }
);

module.exports = LiveDaily_AdvertiserOfferPublisherSourceSummary;
