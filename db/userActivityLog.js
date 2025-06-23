const Mongoose = require('mongoose');
const { UserActivityLog } = require("./Model");

UserActivityLog.statics.saveUserActivityLog = async function (data) {
    return await this.create(data);
}
UserActivityLog.statics.getUserLogs = async function (filter, projection, options) {
    return await this.find(filter, projection, options);
}

module.exports = Mongoose.model('user_activity_log', UserActivityLog);
