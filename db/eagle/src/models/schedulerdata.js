const Mongoose = require("mongoose");
const mixed = Mongoose.Schema.Types.Mixed;
const  objectIdType= Mongoose.Schema.Types.ObjectId;

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

SchedulerData = Mongoose.Schema({

    jobName: {
        type: String,
        required:true
    },
    jobId: {
        type : objectIdType,
        required : false
    },
    NetworkId:{
        type : objectIdType,
        required : true
    },
    userCategory:{
        type:String,
        required:true
    },
    userDetails:{
        type:UserDetails,
    },
    filter :{
        type : Filter
    },
    metaData:{
        type : mixed,
        required : false
    },
    reportName:{
        type: String,
        required : true
    },
    filterTag: {
        type: String,
        required: true
    },
    scheduleTag: {
        type: String,
        required: true
    },
    scheduleDate: {
        type: Number,
        required: false
    },
    scheduleTime: {
        type: String,
        required: true
    },
    scheduleDay: {
        type: Number,
        required: false
    }
},{
  timestamps: true
})

module.exports = SchedulerData;