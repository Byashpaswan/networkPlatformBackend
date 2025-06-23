const Mongoose = require("mongoose");
const objectIdType = Mongoose.Schema.Types.ObjectId;
const PConversion = Mongoose.Schema(
    {
        url: {
            type: String,
            required: true
        },
        network_id: {
            type: objectIdType,
            required: true
        },
        ip_address: {
            type: String,
            required: true
        },
        aff_sub1: {
            type: String,
            required: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = PConversion;