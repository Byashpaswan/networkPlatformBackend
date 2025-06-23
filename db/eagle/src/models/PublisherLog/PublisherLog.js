const Mongoose = require("mongoose");
const debug = require("debug")("eagle:models:Integration");
const objectIdType = Mongoose.Schema.Types.ObjectId;

const PublisherLog = Mongoose.Schema({
    N_id: {
        type: objectIdType,
        required: true
    },
    pid : {
        type: Number,
        required: true
    },
    S_key : {
        type : String ,

    },
    A_key : {
        type : String ,

    },
    offer_type : {
        type : String ,

    },
    page : {
        type : Number  
    },
    limit : {
        type : Number 
    },
    data_transfer: {
        type: String,
        // require: true,
    },
    time : {
        type : Date
    },
    ofr_length : {
        type : Number  // how many offers fetched by publishers 
    }
}, {
    timestamps: true
});


module.exports = PublisherLog;