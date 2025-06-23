const Mongoose = require('mongoose');
const MongooseAutoIncrement = require('mongoose-auto-increment');
const { Advertiser } = require("../Model");
MongooseAutoIncrement.initialize(Mongoose.connection);

Advertiser.plugin(MongooseAutoIncrement.plugin,
  {
    model: 'advertiser',
    field: 'aid',
    startAt: 1
  });


Advertiser.statics.getAdvertiser = async function (search, projection, options) {
  return await this.find(search, projection, options).lean();
}
Advertiser.statics.saveAdvertiser = async function (data) {
  return await this.create(data);
}
Advertiser.statics.updateAdvertiser = async function (filter, data) {
  return await this.findOneAndUpdate(filter, data, { upsert: true });
}
Advertiser.statics.getTotalPagesCount = async function (search) {
  return await this.countDocuments(search);
}
Advertiser.statics.getAdvertiserName = async function (search, projection) {
  return await this.find(search, projection).lean().sort({"company":1});
}
Advertiser.statics.updateAdvertiserData = async function (filter, update, options) {
  return await this.findOneAndUpdate(filter, update, options);
}
Advertiser.statics.getAdvertisersByAggregate = async function (match, group) {
  return await this.aggregate([{ $match: match }, { $group: group }]);
}
Advertiser.statics.searchOneAdvertiser = async function (filter, projection) {
  return await this.findOne(filter, projection).lean();
}
module.exports = Mongoose.model('advertiser', Advertiser);