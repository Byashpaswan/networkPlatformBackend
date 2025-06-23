const Mongoose = require('mongoose');
const MongooseAutoIncrement = require('mongoose-auto-increment');
const { Wishlist } = require("./Model");

Wishlist.statics.searchOneAppId = async function (search, projection, options) {
    return await this.findOne(search, projection, options).lean();
}
Wishlist.statics.searchAppId = async function (search, projection, options) {
    return await this.find(search, projection, options).lean().read('secondary');
}
Wishlist.statics.searchAppIdByGroup = async function (search, groupProjection) {
    return await this.aggregate([{ $match: search }, { $group: groupProjection }]);
}
Wishlist.statics.deleteAppId = async function (search) {
    return await this.deleteOne(search);
}
Wishlist.statics.deleteManyAppId = async function (search) {
    return await this.deleteMany(search);
}
Wishlist.statics.insertManyAppIds = async function (package_ids) {
    return await this.insertMany(package_ids, { ordered: false });
}
Wishlist.statics.searchUniqueAppId = async function (search, projection, options) {
    return await this.aggregate([{ $match: search }, { $group: { _id: "$app_id", "conversion": { $sum: "$conversion" }, "liveType": { $first: "$liveType" }, "test": { $first: "$test" }, "createdAt": { $first: "$createdAt" }, network_id: { $addToSet: "$network_id" } } }])
}
module.exports = Mongoose.model('wishlist', Wishlist);
