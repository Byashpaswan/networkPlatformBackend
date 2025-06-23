const Mongoose = require("mongoose");
const debug = require("debug")("eagle:models:ApplicationDetails");
const objectIdType = Mongoose.Schema.Types.ObjectId;

const ApplicationDetails = Mongoose.Schema({
    app_id: {
        type: String,
        required: true,
    },
    country: {
        type: String,
    },
    name: {
        type: String,
    },
    description: {
        type: String,
    },
    img: {
        type: String,
    },
    last_update: {
        type: Date,
    },
    app_size: {
        type: String,
    },
    installs: {
        type: String,
    },
    version: {
        type: String,
    },
    required_os: {
        type: String,
    },
    rating: {
        type: String,
    },
    rating_count: {
        type: String,
    },
    offered_by: {
        type: String,
    },
    device: {
        type: String,
    },
    category: {
        type: String,
    },
    is_published: {
        type: Boolean,
        default: false
    },
    not_found: {
        type: Boolean,
        default: false
    },
    not_found_count: {
        type: Number,
        default: 0
    },
    count : {
        type : Number , 
        default : 0 
    },
    is_incorrect_app_id: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

ApplicationDetails.index({ app_id: 1 }, { unique: true });

module.exports = ApplicationDetails;