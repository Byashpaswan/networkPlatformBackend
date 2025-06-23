const Mongoose = require('mongoose');
const MongooseAutoIncrement = require('mongoose-auto-increment');
const { ClickFailed } = require("../Model");
MongooseAutoIncrement.initialize(Mongoose.connection);


ClickFailed.statics.findAllFails = async function (filter, projection, options) {
  return await this.find(filter, projection, options);
}

ClickFailed.statics.getAllCount = async function (filter) {
  return await this.countDocuments(filter);
}

ClickFailed.statics.statsCount = async function (filter, group, sort) {
  return await this.aggregate([{ $match: filter }, { $group: group }]).sort(sort);
}

module.exports.ClickFailedModel = Mongoose.model('clickfaileds', ClickFailed);