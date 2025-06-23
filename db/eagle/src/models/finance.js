const Mongoose = require("mongoose");
const debug = require("debug")("eagle:models:Finance");

const Finance = Mongoose.Schema(
  {
    aHN: {
      type: String
    },
    ifcs: {
      type: String,
      required: true
    },
    bN: {
      type: String,
      required: true
    },
    aN: {
      type: String,
      required: true,
      default: null
    },
    call: {
      type: String
    },
    addr: {
      type: String
    },
    aType: {
      type: String,
      required: true
    },
    usd: {
      type: Boolean,
      default: false
    }
  },
  {
    _id: false
  }
);

module.exports = Finance;
