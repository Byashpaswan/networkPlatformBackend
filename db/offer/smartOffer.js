const Mongoose = require('mongoose');
const { SmartOffer } = require("../Model");

SmartOffer.statics.createSmartOffer = async function (data) {
    return await this.create(data);
}
SmartOffer.statics.updateSmartOffer = async function (filter, data) {
    return await this.updateOne(filter, data);
}
SmartOffer.statics.getSmartOffer = async function (filter, projection = {}, options = {}) {
    return await this.findOne(filter, projection, options).lean();
}
SmartOffer.statics.getAllSmartOffer = async function (filter, projection = {}, options = {}) {
    return await this.find(filter, projection, options).lean();
}
SmartOffer.statics.deleteSmartOffer = async function (filter, projection = {}, options = {}) {
    return await this.deleteOne(filter);
}

module.exports = Mongoose.model('smart_offer', SmartOffer);