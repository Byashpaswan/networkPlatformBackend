const Mongoose = require("mongoose");

const PackageSummary = Mongoose.Schema({
    network_id: {
        type: Mongoose.Schema.Types.ObjectId,
        required: true
    },
    app_id: {
        type: String,
        required: true
    },
    advId: {
        type: Mongoose.Schema.Types.ObjectId,
        required: true
    },
    advPlatId: {
        type: Mongoose.Schema.Types.ObjectId,
        required: true
    },
    ofr_summary: {
        type: Number,
        default: 0,
    },
}, {
    timestamps: true,
    versionKey: false
});

module.exports = PackageSummary;
