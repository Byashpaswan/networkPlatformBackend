const Mongoose = require('mongoose');
const MongooseAutoIncrement = require('mongoose-auto-increment');
const { WorkingOfferLog } = require("./Model");

WorkingOfferLog.statics.getSearchOfferLog = async function (search, projection, options) {
    return await this.findOne(search, projection, options).lean();
}
WorkingOfferLog.statics.getCompleteOfferLog = async function (search, projection, options) {
    return await this.find(search, projection, options).lean();
}

module.exports = Mongoose.model('workingOfferLog', WorkingOfferLog);
