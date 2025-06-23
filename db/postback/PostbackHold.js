const Mongoose = require('mongoose');
const { PostbackHold } = require("../Model");

PostbackHold.statics.saveHoldPostback = async function (data) {
  return await this.create(data);
}
PostbackHold.statics.updateHoldPostback = async function (filter, data) {
  return await this.updateOne(filter, data);
}
PostbackHold.statics.getHoldPostback = async function (filter, projection = {}) {
  return await this.findOne(filter, projection).lean();
}
PostbackHold.statics.deleteHoldPostback = async function (filter) {
  return await this.deleteOne(filter)
}
PostbackHold.statics.deleteAndGetHoldPostbackData = async function (filter, options = {}) {
  return await this.findOneAndDelete(filter, options)
}
PostbackHold.statics.getAllHoldPostback = async function (filter, projection = {}) {
  return await this.find(filter, projection).lean();
}

module.exports = Mongoose.model('postback_hold', PostbackHold);
