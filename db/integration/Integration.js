const Mongoose = require('mongoose');
const MongooseAutoIncrement = require('mongoose-auto-increment');
const { Integration } = require("../Model");
MongooseAutoIncrement.initialize(Mongoose.connection);

Integration.statics.getIntegrations = async function (filter, projection, options) {
    return await this.find(filter, projection, options).lean();
}

Integration.statics.saveIntegration = async function (data) {
    return await this.create(data);
}

Integration.statics.updateIntegration = async function (filter, data) {
    return await this.findOneAndUpdate(filter, data);
}

Integration.statics.deleteIntegration = async function (filter) {
    return await this.findOneAndRemove(filter);
}

module.exports = Mongoose.model('integration', Integration);