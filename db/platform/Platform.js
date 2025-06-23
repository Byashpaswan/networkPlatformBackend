const Mongoose = require('mongoose');
const MongooseAutoIncrement = require('mongoose-auto-increment');
MongooseAutoIncrement.initialize(Mongoose.connection);

const { Platform, PlatformAccount } = require("../Model");

Platform.plugin(MongooseAutoIncrement.plugin, {
  model: 'platformtypes',
  field: 'plty',
  startAt: 1
});
Platform.statics.getPlatformTypes = async function (filter, projection, options) {
  return await this.find(filter, projection, options).lean();
}
Platform.statics.getPlatformTypesOne = async function (filter, projection) {
  return await this.findOne(filter, projection).lean();
}
Platform.statics.updatePlatformTypes = async function (filter, option) {
  return await this.findOneAndUpdate(filter, option);
}
Platform.statics.insertCsvPlatform = async function (filter, option) {
  return await this.findOneAndUpdate(filter, option, { upsert: true });
}
Platform.statics.deletePlatformTypes = async function (filter, option) {
  return await this.findOneAndDelete(filter, option);
}
Platform.statics.getPlatformTypes_Name = async function (filter, projection) {
  return await this.find(filter, projection).lean();
}
Platform.statics.getPlatform_Name = async function (filter, projection) {
  return await this.findOne(filter, projection).lean();
}

PlatformAccount.plugin(MongooseAutoIncrement.plugin, {
  model: 'platform',
  field: 'plid',
  startAt: 1
});
PlatformAccount.statics.deletePlatform = async function (filter, option) {
  return await this.findOneAndDelete(filter, option);
}
PlatformAccount.statics.updatePlatform = async function (filter, reflect, option) {
  return await this.findOneAndUpdate(filter, reflect, option);
}
PlatformAccount.statics.updateMultiplePlatform = async function (filter, option) {
  return await this.update(filter, { $set: option }, { multi: true });
}
PlatformAccount.statics.getPlatform = async function (filter, projection, options) {
  return await this.find(filter, projection, options).lean();
}
PlatformAccount.statics.getOnePlatform = async function (filter, projection) {
  return await this.findOne(filter, projection);
}
PlatformAccount.statics.getPlatformAccountCount = async function (filter, groupBy) {
  return await this.aggregate([{ "$match": filter }, { "$group": groupBy }]);
}
PlatformAccount.statics.updatePlatforms = async function (filter, update, options) {
  return await this.updateMany(filter, update, options);
}
PlatformAccount.statics.getAllPlatforms=async function(filter,group,sort,options){
  return await this.aggregate([{ "$match": filter },group,options,sort]);
}
module.exports.PlatformModel = Mongoose.model('platform', PlatformAccount);
module.exports.PlatformTypeModel = Mongoose.model('platformtypes', Platform);