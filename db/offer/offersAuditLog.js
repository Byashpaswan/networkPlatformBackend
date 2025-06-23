const Mongoose = require('mongoose');
const MongooseAutoIncrement = require('mongoose-auto-increment');
const { OffersAuditLog }  = require("../Model");

OffersAuditLog.statics.getSearchOfferLog = async function (search, projection, options) {
    return await this.findOne(search, projection, options).lean();
}
OffersAuditLog.statics.getCompleteOfferLog = async function (search, projection, options) {
    return await this.find(search, projection, options).lean();
}

module.exports = Mongoose.model('offersAuditLog', OffersAuditLog);
