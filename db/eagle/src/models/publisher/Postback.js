const Mongoose = require("mongoose");
const debug = require("debug")("eagle:models:Postback");
const objectIdType = Mongoose.Schema.Types.ObjectId;
const mongooseObjectId = Mongoose.Types.ObjectId;
const { getConstLabel, getConstValue } = require('../../helper/Util');

const Postback = Mongoose.Schema({
  network_id :{
    type:objectIdType,
    required:true,
  },
  publisher_id:{
    type:Number,
    required: true,
  },
  publisher_name:{
    type:String,
    required: true,
  },
  endpoint:{
    type:String,
    required: true,
  },
  parm:{
    type:String,
    required:true,
  },
  token:{
    type:String,
  },
  status:{
    type:String,
  }

},{
  timestamps:true,
});

Postback.index({ network_id: 1, publisher_id :1, status :1 })

//module.exports = Mongoose.model('postback', Postback);
module.exports = Postback;
