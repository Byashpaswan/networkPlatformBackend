const Mongoose = require("mongoose");
const debug = require("debug")("eagle:models:forwardPostbacks");
const objectIdType = Mongoose.Schema.Types.ObjectId;
const mongooseObjectId = Mongoose.Types.ObjectId;
const forwardPostback = Mongoose.Schema({
    network_id: {
        type: String,
        default: ''
    },
    click_id: {
        type: String,
        required: true
    },
    postback_url: {
        type: String,
        required: true
    },
    remark: {
        type: String,
        required: true
    },
    network_unique_id: {
        type: String,
        required: true
    },
    isClickIdMatched: {
        type: Boolean,
        required: true
    }

}, {
        timestamps: true
    });

//module.exports = Mongoose.model('network', Network);
module.exports = forwardPostback;
