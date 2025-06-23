const Mongoose = require("mongoose");
const objectIdType = Mongoose.Schema.Types.ObjectId;

const offerImportStat = Mongoose.Schema({
    
    userId:{
        type:objectIdType,
        required : true
    },
    userName:{
        type:String,
        required : true
    },
    network_id:{
        type:objectIdType,
        required : true
    },
    advertiser_id:{
        type:String,
        required : false
    },
    advertiser_name:{
        type:String,
        required:false
    },
    valid_offers_count:{
        type:Number,
        required:true
    },
    invalid_offers_count:{
        type:Number,
        required:true
    }

},{
    timestamps: true
  });

module.exports= offerImportStat; 