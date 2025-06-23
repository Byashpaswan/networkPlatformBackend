const Mongoose = require('mongoose');
const MongooseAutoIncrement = require('mongoose-auto-increment');
MongooseAutoIncrement.initialize(Mongoose.connection);
const { User } = require("../Model");


User.plugin(MongooseAutoIncrement.plugin, {
  model: 'user',
  field: 'uid',
  startAt: 1
});

User.statics.deleteUser = async function (filter, query) {
  return await this.findOneAndDelete(filter, query);
}
User.statics.deleteManyUser = async function (filter) {
  return await this.deleteMany(filter);
}

////////new functions/////////////
User.statics.getUser = async function (filter, projection, options) {
  return await this.findOne(filter, projection, options);
}

User.statics.getUsers = async function (filter, projection, options) {
  return await this.find(filter, projection, options).lean();
}

User.statics.updateUser = async function (filter, update, options) {
  return await this.updateOne(filter, update, options);
}

User.statics.findAndUpdateUser = async function (filter, update, options) {
  return await this.findOneAndUpdate(filter, update, options);
}

User.statics.findAndUpdateUsersPermissions = async function (filter, update, options) {
  return await this.updateMany(filter, update, options);
}
User.statics.updateUsers = async function (filter, update, options) {
  return await this.updateMany(filter, update, options);
}

module.exports = Mongoose.model('user', User);
