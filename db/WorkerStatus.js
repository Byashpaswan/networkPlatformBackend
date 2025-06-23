const Mongoose = require('mongoose');
const { WorkerStatus } = require("./Model");

WorkerStatus.statics.saveStatus = async function (data) {
    return await this.create(data);
}

WorkerStatus.statics.getAllData = async function (search, projection, options) {
    return await this.find(search, projection, options);
}

WorkerStatus.statics.updateStatus = async function (search, reflect) {
    return await this.updateOne(search, reflect);
}

WorkerStatus.statics.updateManyStatus = async function (search, reflect) {
    return await this.updateMany(search, reflect);
}

module.exports = Mongoose.model('worker_log', WorkerStatus);
