const Mongoose = require("mongoose");
const debug = require("debug")("eagle:models:Platform");
const objectIdType = Mongoose.Schema.Types.ObjectId;
const { config } = require("../../constants/index");


const PublisherOfferRequest = Mongoose.Schema({
    network_id:{
        type:objectIdType,
        required:true,
    },
    offer_id:{
        type:objectIdType,
        required:true,
    },
    publisher_id:{
        type:Number,
        required:true,
    },
    offerName:{
        type:String,
        required:true,
    },
    request_status:{
        type: String,
        default: 'pending',
        enum: config.PUBLISHER_Offer_STATUS,
        required: true,
    }
    
},{
  timestamps: true,
});

PublisherOfferRequest.index({ offer_id :1 }, { unique: true})

module.exports = PublisherOfferRequest;
