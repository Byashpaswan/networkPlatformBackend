const Mongoose = require('mongoose');
const { SchedulerData } = require("./Model");

SchedulerData.statics.saveJob = async function (data) {
    return await this.create(data);
}

SchedulerData.statics.findAndUpdate = async function (search, reflect) {
    return await this.findOneAndUpdate(search, reflect);
}

module.exports = Mongoose.model('scheduler_data', SchedulerData);
