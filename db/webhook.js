const Mongoose = require('mongoose');
const { webhook } = require("./Model");

webhook.statics.saveSetting = async function(data){
    return await this.create(data);
}

webhook.statics.findwebhookSetting = async function(data){
    return await this.find(data);
}
webhook.statics.updateSetting = async function(filter,update,option){
    return await this.findOneAndUpdate(filter,update,option)
}

webhook.statics.deletewebhookSetting = async function(data){
    return await this.findOneAndDelete(data)
}
module.exports = Mongoose.model('Webhook_setting', webhook);
