const Mongoose = require("mongoose");
const objectIdType = Mongoose.Schema.Types.ObjectId;
require('mongoose-double')(Mongoose);

const wishList = Mongoose.Schema({

    network_id: {
        type: objectIdType,
        required: true,
    },
    app_id: {
        type: String,
        required:true,
    },
    conversion: {
        type: Number,
        default: 0,
        description: 'conversion count when this package id was included to wishlist'
    },
    liveType: {
        type: String,
        default: 'manual',
        enum: ['script','manual'], 
        description: 'livetype through which this app_id added to wishlist'
    },
    test: {
        type: Boolean,
        default: false
    }

}, {
        timestamps: true
    });

wishList.index({ network_id: 1, app_id: 1, })

module.exports = wishList;

