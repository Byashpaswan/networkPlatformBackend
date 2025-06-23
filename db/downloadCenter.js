const Mongoose = require('mongoose');
const MongooseAutoIncrement = require('mongoose-auto-increment');
const { DownloadCentre } = require("../db/Model");
MongooseAutoIncrement.initialize(Mongoose.connection);
DownloadCentre.plugin(MongooseAutoIncrement.plugin,
  {
    model: 'DownloadCentre',
    field: 'DownloadId',
    startAt: 1
  });

DownloadCentre.statics.findDownloadCenterData = async function (filter,projection) {
    return await this.find(filter,projection,{sort:{_id:-1}});
}
DownloadCentre.statics.updateDownloadCenterData = async function (filter,projection) {
    return await this.update(filter,projection);
}
DownloadCentre.statics.findDownloadCenterDataById = async function (filter) {
    
    return await this.findById(filter);
}
DownloadCentre.statics.deleteData = async function (filter) {
    return await this.remove(filter);
}
module.exports = Mongoose.model('DownloadCentre',DownloadCentre );