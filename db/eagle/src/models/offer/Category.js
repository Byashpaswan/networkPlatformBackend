const Mongoose = require("mongoose");
const debug = require("debug")("eagle:models:Category");
const objectIdType = Mongoose.Schema.Types.ObjectId;
const mongooseObjectId = Mongoose.Types.ObjectId;
const { getConstLabel, getConstValue } = require('../../helper/Util');
const Category = Mongoose.Schema({
  network:{
    type:objectIdType,
    required:true,
  },
  name:{
    type:String,
    required:true,
  },
  description:{
    type: String,
    required:true,
  },
  type:{
    type:String,
  },
  status:{
    type: Number,
    required:true,
  }
},{
  timestamps:true
});

Category.index({ network :1, name:1 },{ unique: true});
Category.index({  network :1,type :1, status :1 });

// module.exports = Mongoose.model('category',Category);
module.exports = Category;
