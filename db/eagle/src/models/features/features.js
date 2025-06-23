const Mongoose = require("mongoose");
const config = require("../../constants/Config");
const objectIdType = Mongoose.Schema.Types.ObjectId;

const permissions = Mongoose.Schema({
  id: {
    type: objectIdType,
  },
  name: { type: String, }

}, {
  _id: false
});


const Features = Mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },
    permissions: {
      type: [permissions],
      // required: true,
      default : []

    }
    
  },
  {
    timestamps: true
  }
);


module.exports = Features;
