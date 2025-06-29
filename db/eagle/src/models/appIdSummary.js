const Mongoose = require("mongoose");
const debug = require("debug")("eagle:models:AppIdSummary");
const objectIdType = Mongoose.Schema.Types.ObjectId;
const DoubleType = Mongoose.Schema.Types.Decimal128;

const AppIdSummary = Mongoose.Schema({
    network_id: {
        type: objectIdType,
        required: true
    },
    app_id: {
        type: String,
        required: true
    },
    offers_avg_payout: {
        type: DoubleType,
        required: true,
        default: 0,
        description: "Average payout of all the offers having this app id"
    },
    adv_summary: {
        type: Number,
        required: true,
        description: "Count of advertisers providing this app_id offers"
    },
    ofr_summary: {
        type: Number,
        required: true,
        description: "Count of Offers having this app_id"
    },
    usd_ofr_summary: {
        type: Number,
        required: true,
        description: "Count of Offers having this app_id and Currency USD" 
    },
    date: {
        type: Date,
        description: "date for which summary is stored"
    },
    remarks: {
        type: String,
        default: ''
    }

}, {
        timestamps: true
    });

//module.exports = Mongoose.model('network', Network);
module.exports = AppIdSummary;
