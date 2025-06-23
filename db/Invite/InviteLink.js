const Mongoose = require('mongoose');
const { InviteLink } = require("../Model");

InviteLink.statics.saveDetails = async function (data) {
    return await this.create(data);
}
InviteLink.statics.matchHash = async function (filter) {
    return await this.findOne(filter).lean()
}
InviteLink.statics.deleteData = async function (filter) {
    return await this.findOneAndDelete(filter)
}

module.exports = Mongoose.model('inviteLink', InviteLink);
