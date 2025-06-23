const Mongoose = require("mongoose");
const debug = require("debug")("eagle:models:Advertiser");
const objectIdType = Mongoose.Schema.Types.ObjectId;
const mongooseObjectId = Mongoose.Types.ObjectId;
const { getConstLabel, getConstValue } = require('../../helper/Util');
const Creative = Mongoose.Schema({
  creative_id: {
    type: String,
    default:'',
    },
    name: {
    type: String,
        default: '',
  },
  description: {
      type: String,
      default: '',
  },
  creative_type: {
      type: String,
      default: '',
  },
  width: {
      type: Number,
      default: 0,
  },
  height: {
      type: Number,
      default: 0,
  },
  landing_page_url: {
      type: String,
      default: '',
  },
  tracking_link:{
      type: String,
      default: '',
  },
  creative_file: {
      type: String,
      default: '',
  },
  status: {
      type: String,
      default: '',
  }

});
module.exports=Creative;