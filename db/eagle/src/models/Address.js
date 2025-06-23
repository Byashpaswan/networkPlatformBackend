const Mongoose = require("mongoose");
const debug = require("debug")("eagle:models:Organization");
const objectIdType = Mongoose.Schema.Types.ObjectId;
const mongooseObjectId = Mongoose.Types.ObjectId;

const Address = Mongoose.Schema({
  address: {
    type: String,
    required: false,
  },
  locality: {
    type: String,
    required: false,//changed
  },
  city: {
    type: String,
    required: false,
  },
  state: {
    type: String,
    required: false,
    default: ""
  },
  pincode: {
    type: Number,
    required: false,
    default: null,
  },
  country: {
    type: String,
    required: true,
    default: ""
  }
}, {
  _id: false
});


module.exports = Address;
