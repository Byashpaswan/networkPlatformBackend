const Mongoose = require("mongoose");
const objectIdType = Mongoose.Schema.Types.ObjectId;

const SummaryLogSchema = Mongoose.Schema(
  {
    network_id: {
      type: objectIdType,
      required: true,
    },
    report_name: {
      type: String,
    },
    timeSlot: {
      type: Date,
    },
    summary_count: {
      type: Number,
    },
    timezone: {
      type: String,
    },
    timezone_offset: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = SummaryLogSchema;
