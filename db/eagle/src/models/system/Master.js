const Mongoose = require("mongoose");
const debug = require("debug")("eagle:models:Master");
const MongooseAutoIncrement = require('mongoose-auto-increment');
const objectIdType = Mongoose.Schema.Types.ObjectId;
const mongooseObjectId = Mongoose.Types.ObjectId;
const { config } = require('../../constants/index');

const Master = Mongoose.Schema({
  platform_name:{
    type:String,
    required:true,
  },
  logo:{
    type:String,
  },


});

module.exports = Master;
