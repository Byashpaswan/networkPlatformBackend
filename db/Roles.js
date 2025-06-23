const Mongoose = require('mongoose');
const { Role } = require("../db/Model");

//checking whether network exists or not
Role.statics.isRoleExists = async function (filter, projection, Option) {
    return await this.find(filter, projection, Option);
}
Role.statics.checkRole = async function (filter, projection) {
    return await this.find(filter, projection).lean();
}

Role.statics.updateRoles = async function (filter, query) {
    return await this.findOneAndUpdate(filter, query);
}

Role.statics.deleteRoles = async function (filter, options) {
    return await this.findOneAndDelete(filter, options);
}

Role.statics.getRole = async function (filter, projection, options) {
    return await this.findOne(filter, projection, options);
}

Role.statics.getRoles = async function (filter, projection, options) {
    return await this.find(filter, projection, options).lean();
}

module.exports = Mongoose.model('role', Role);



