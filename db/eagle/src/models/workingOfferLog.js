const Mongoose = require("mongoose");
const objectIdType = Mongoose.Schema.Types.ObjectId;
const mongooseObjectId = Mongoose.Types.ObjectId;
const mongooseAutoIncrement = require('mongoose-auto-increment');
// require('mongoose-double')(Mongoose);
const DoubleType = Mongoose.Schema.Types.Decimal128;

const WorkingOfferLog = Mongoose.Schema({

    network_id: {
        type: objectIdType,
    },
    offer_id: {
        type: objectIdType,
        required: true,
    },
    tracking_link: {
        type: String,
        required: true,
    },
    preview_url: {
        type: String,
        required: true,
    },
    country: {
        type: String,
        required: true,
    },
    total_redirection: {
        type: Number,
        default:0
    },
    last_redirection: {
        type:String
    },
    second_last_redirection: {
        type:String
    },
    all_redirections: {
        type:String
    },
    apiStatus: {
        type:Number
    },
    message: {
        type:String
    },
    workingStatus: {
        type: Boolean,
        required: true,
        default: false
    }

}, {
        timestamps: true
    });

WorkingOfferLog.index({ network_id: 1, offer_id: 1, tracking_link: 1, workingStatus:1 })

module.exports = WorkingOfferLog;

