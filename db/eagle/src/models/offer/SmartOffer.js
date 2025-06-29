const Mongoose = require("mongoose");
const objectIdType = Mongoose.Schema.Types.ObjectId;
const DoubleType = Mongoose.Schema.Types.Decimal128;

const { config } = require("../../constants/index");
const { getConstLabel, getConstValue } = require("../../helper/Util");
const { DeviceTargeting, GeoTargeting } = require("./Targeting");

const PUBLISHER_OFFER = Mongoose.Schema({
    id: {
        type: Number,
        required: true
    },
    pay: {
        type: Number
    },
    pubOffSt: {
        type: Number,
        enum: getConstValue(config.PUBLISHER_OFFERS_STATUS),
    }
}, {
    _id: false,
    versionKey: false
});

const ChildOffer = Mongoose.Schema(
    {
        offId: {
            type: objectIdType,
            required: true
        },
        name: {
            type: String
        },
        priority: {
            type: Number,
            default: 1,
            enum: [1, 2, 3, 4, 5]
        },
        stTime: {
            type: Number
        },
        endTime: {
            type: Number
        }
    },
    {
        _id: false,
        versionKey: false
    }
)

const SmartOffer = Mongoose.Schema(
    {
        network_id: {
            type: objectIdType,
            required: true
        },
        name: {
            type: String,
            required: true
        },
        offer_visible: {
            type: String,
            enum: getConstLabel(config.OFFER_VISIBILITY),
            default: config.OFFER_VISIBILITY.approval_required.label
        },
        category: {
            type: [String],
            default: undefined
        },
        kpi: {
            type: String
        },
        description: {
            type: String
        },
        pubOff: {
            type: [PUBLISHER_OFFER],
            default: undefined
        },
        payout: {
            type: DoubleType
        },
        revenue: {
            type: DoubleType
        },
        currency: {
            type: String
        },
        geo_targeting: {
            type: GeoTargeting
        },
        device_targeting: {
            type: DeviceTargeting
        },
        chOffer: {
            type: [ChildOffer],
            required: true
        },
        status: {
            type: Number,
            enum: getConstValue(config.OFFERS_STATUS),
            default: 1
        }
    },
    {
        timestamps: true,
        versionKey: false
    }
);

module.exports = SmartOffer;