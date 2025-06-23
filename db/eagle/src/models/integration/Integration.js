const Mongoose = require("mongoose");
const debug = require("debug")("eagle:models:Integration");
const objectIdType = Mongoose.Schema.Types.ObjectId;

const Integration = Mongoose.Schema({
    network_id: {
        type: objectIdType,
        required: true
    },
    integration_name: {
        type: String,
        required: true,
    },
    token: {
        type: String,
        require: true,
    },
    expiry_date: {
        type: Date,
        require: true,
    },
    status: {
        type: String,
        default: 'paused',
        enum: ['active', 'paused', 'deleted'],
    }
}, {
    timestamps: true
});

Integration.index({ integration_name: 1 }, { unique: true });

module.exports = Integration;