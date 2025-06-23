const Mongoose = require("mongoose");
const BlockOffer = Mongoose.Schema(
    {
        nid: { type: Number, required: true },
        status: { type: Number }
    },
    {
        timestamps: true,
        versionKey: false
    }
);

module.exports = BlockOffer;