const Mongoose = require("mongoose");
const objectIdType = Mongoose.Schema.Types.ObjectId;

const PostbackHold = Mongoose.Schema(
  {
    network_id: {
      type: objectIdType,
      required: true,
    },
    publisher_id: {
      type: Number,
      required: true,
    },
    publisher_name: {
      type: String,
      required: true,
    },
    endpoint: {
      type: String,
      required: true,
    },
    parm: {
      type: String,
      required: true,
    },
    token: {
      type: String,
    },
    status: {
      type: String,
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

module.exports = PostbackHold;