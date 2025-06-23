const Mongoose = require("mongoose");
// const debug = require("debug")("eagle:models:Organization");
const objectIdType = Mongoose.Schema.Types.ObjectId;
const mixed = Mongoose.Schema.Types.Mixed;
const mongooseObjectId = Mongoose.Types.ObjectId;
const mongooseAutoIncrement = require('mongoose-auto-increment');

const UserDetails = Mongoose.Schema({
    UserId:{
        type:objectIdType,
        required : true
    },
    name:{
        type:String,
        required : true
    }
},
{
    _id:false
});

const Filter = Mongoose.Schema({
    body :{
        type : mixed,
        required : false
    },
    params:{
        type : mixed,
        required : false
    },
    query:{ 
        type : mixed ,
        required : false
    }
},{
    _id:false
})

const DownloadCentre = Mongoose.Schema({
    NetworkId:{
        type : objectIdType,
        required : true
    },
    User_Category:{
        type:String,
        required:true
    },
    
    UserDetails:{
        type:UserDetails,
    },
    Filter :{
        type : Filter
    },
    MetaData:{
        type : mixed,
        required : false
    },
    
    hash :{
        type:String,
        required : true 
    },
    status:{
        type:String,
        required : true
    },
    reportName:{
        type:String,
        required : true
    },
    format:{
        type:String,
        required : true
    },
    filepath:{
        type:String,
        required:false
    },
    IsScheduler:{
        type:Boolean,
        default : false
    }
    

},{
    timestamps: true
  });
DownloadCentre.index({status:1});

    
  module.exports= DownloadCentre; 