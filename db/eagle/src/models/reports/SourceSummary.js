const Mongoose = require("mongoose");
const debug = require("debug")("eagle:models:clickSourceSummary");
const objectIdType = Mongoose.Schema.Types.ObjectId;
// require("mongoose-double")(Mongoose);
const DoubleType = Mongoose.Schema.Types.Decimal128;

const ClickSourceSummary = Mongoose.Schema(
  {
    network_id: {
      type: objectIdType,
      required: true,
    },
    source: {
      type: String,
      required: true,
    },
    impressions: {
      type: Number,
    },
    click: {
      type: Number,
      default: 0,
    },
    unique_click: {
      type: Number,
      default: 0,
    },
    conversion: {
      type: Number,
      default: 0,
    },
    unique_conversion: {
      type: Number,
      default: 0,
    },
    revenue: {
      type: DoubleType,
      default: 0,
    },
    payout: {
      type: DoubleType,
      default: 0,
    },
    timeSlot: {
      type: Date,
    },
    timezone: {
      type: String,
    },
    timezone_offset: {
      type: String,
    },
    pre_conversion: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

ClickSourceSummary.index(
  { network_id: 1, timeSlot: 1, source: 1 },
  { unique: true }
);

module.exports = ClickSourceSummary;
