const Mongoose = require('mongoose');
const MongooseAutoIncrement = require('mongoose-auto-increment');
const { Publisher } = require("../Model");
MongooseAutoIncrement.initialize(Mongoose.connection);
Publisher.plugin(MongooseAutoIncrement.plugin,
  {
    model: 'publisher',
    field: 'pid',
    startAt: 1
  });


Publisher.statics.getPublisherList = async function (search, projection, options) {
  return await this.find(search, projection, options).lean();
}
Publisher.statics.getTotalPagesCount = async function (search) {
  return await this.countDocuments(search);
}
Publisher.statics.findPublisherIdByNetworkId = async function (filter , projection ) {
  return await this.find(filter , projection );
}
Publisher.statics.updateCredentials = async function (filter, option) {
  return await this.findOneAndUpdate(filter, option, { new: true });
}

Publisher.statics.findPublisher = async function (search, projection) {
  return await this.find(search, projection).lean();
}
Publisher.statics.isPublisherExists = async function (search, projection) {
  return await this.find(search, projection).lean(); // unused
}

Publisher.statics.searchOnePublisher = async function (filter, projection) {
  return await this.findOne(filter, projection).lean(); // used only in postback and import offer
}

Publisher.statics.modifyPublisher = async function (filter, option) {
  return await this.findAndModify({ query: { filter }, update: { option } });
}
Publisher.statics.getPublisherName = async function (filter, projection) {
  return await this.find(filter, projection).lean();
}
Publisher.statics.getPublishersByAggregate = async function (match, group) {
  return await this.aggregate([{ $match: match }, { $group: group }]);
}
//////////////////new functions///////////////
Publisher.statics.getPublisher = async function (filter, projection, options) {
  return await this.findOne(filter, projection, options).lean();
}

Publisher.statics.updatePublisher = async function (filter, update, options) {
  return await this.updateOne(filter, update, options);
}

Publisher.statics.findAndUpdatePublisher = async function (filter, update, options) {
  return await this.findOneAndUpdate(filter, update, options);
}

module.exports = Mongoose.model('publisher', Publisher);



