const Mongoose = require('mongoose');
const { sendbox_clicklogs } = require("./Model");


sendbox_clicklogs.statics.save_logs = async function(data){
    return await this.create(data);
}
sendbox_clicklogs.statics.getTestClickLogs = async function (search, projection, options) {
    return await this.find(search, projection, options).lean();
}
sendbox_clicklogs.statics.getTotalPagesCount = async function (search) {
    return await this.find(search).count();
}
module.exports = Mongoose.model('sendbox_clicklogs', sendbox_clicklogs);
