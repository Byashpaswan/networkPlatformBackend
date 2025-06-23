const Mongoose = require('mongoose');
const { Postback } = require("../Model");

Postback.statics.savePostback = async function (data) {
  return await this.create(data);
}

Postback.statics.getPostback = async function (filter, projection) {
  return await this.find(filter, projection).lean();
}

Postback.statics.showPostback = async function (search, projection) {
  return await this.find(search, projection).lean();
}

Postback.statics.deletePostback = async function (filter, option) {
  return await this.findOneAndDelete(filter, option);
}

Postback.statics.updatePostback = async function (filter, reflect, option = {}) {
  return await this.findOneAndUpdate(filter, reflect, option);
}

module.exports = Mongoose.model('postback', Postback);
