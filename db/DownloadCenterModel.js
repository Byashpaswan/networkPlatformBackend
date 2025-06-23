const Mongoose = require('mongoose');
const MongooseAutoIncrement = require('mongoose-auto-increment');
const { DownloadCenter } = require("./Model");
MongooseAutoIncrement.initialize(Mongoose.connection);
DownloadCenter.plugin(MongooseAutoIncrement.plugin, { model: 'DownloadCenter', field: 'downloadId', startAt: 1 });

DownloadCenter.statics.findOneDoc = async function (filter, projection, options) {
    return await this.findOne(filter, projection, options);
}

DownloadCenter.statics.findDocs = async function (filter, projection, options) {
    return await this.find(filter, projection, options);
}

DownloadCenter.statics.updateOneDoc = async function (filter, update, options) {
    return await this.updateOne(filter, update, options);
}

DownloadCenter.statics.deleteOneDoc = async function (filter) {
    return await this.deleteOne(filter);
}

module.exports = Mongoose.model('download_center', DownloadCenter);