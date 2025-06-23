const Mongoose = require('mongoose');
const MongooseAutoIncrement = require('mongoose-auto-increment');
const { Currency } = require("./Model");

Currency.statics.updateCurrency = async function (search, reflect) {
    return await this.findOneAndUpdate(search, reflect);
}
Currency.statics.getCurrency = async function (search, projection, options) {
    return await this.find(search, projection, options).lean();
}
Currency.statics.getOneCurrency = async function (search, projection) {
    return await this.findOne(search, projection).lean();
}

module.exports = Mongoose.model('currency', Currency);
