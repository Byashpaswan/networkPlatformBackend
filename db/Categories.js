const Mongoose = require('mongoose');
const { Categories } = require("./Model");

Categories.statics.getCategory = async function (filter, projection, options) {
    return await this.findOne(filter, projection, options);
}

Categories.statics.getCategories = async function (filter, projection, options) {
    return await this.find(filter, projection, options).lean();
}

Categories.statics.getDistinctCategories = async function (filter, key) {
    return await this.distinct(key, filter);
}

Categories.statics.insertCategories = async function (docs) {
    return await this.insertMany(docs);
}

Categories.statics.findAndUpdateCategory = async function (filter, update, options) {
    return await this.findOneAndUpdate(filter, update, options);
}

module.exports = Mongoose.model('category', Categories);