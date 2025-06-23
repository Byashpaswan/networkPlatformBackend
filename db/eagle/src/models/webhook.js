const Mongoose = require("mongoose");
const mongooseObjectId = Mongoose.Types.ObjectId;


const webhook = Mongoose.Schema({
    network_id:{
        type:mongooseObjectId,
        required:true
    },
    method:{
        type:String,
        required:true
    },
    url:{
        type:String,
        required:true
    },
    token:{
        type:String,
        required:true
    },
    key:{
        type:String,
        required:true
    },
    event:{
        type:String,
        required:true,
        enum:['offer_create','offer_update','both']
    },
    pid:{
        type: Number,
        required: true
    },
    pause:{
        type: Boolean,
        required: true,
        default : false
    },
    offersKeys:{
        type:[String],
        required:true
    }
})

module.exports = webhook;
