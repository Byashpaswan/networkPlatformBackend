const Mongoose = require('mongoose');
const MongooseAutoIncrement = require('mongoose-auto-increment');
const { rejectedAppId } = require("./Model");


rejectedAppId.statics.insertOne = async function (item) {
    return await this.create(item);
}
rejectedAppId.statics.searchAppId = async function (search, projection, options) {
    return await this.find(search, projection, options).lean().read('secondary');
}
rejectedAppId.statics.deleteManyAppId = async function (search) {
    return await this.deleteMany(search);
}

rejectedAppId.statics.insertManyAppId = async function (data) {
    return await this.insertMany(data);
}

module.exports = Mongoose.model('rejectedAppId', rejectedAppId);
