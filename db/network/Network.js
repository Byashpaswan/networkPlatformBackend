const Mongoose = require('mongoose');
const MongooseAutoIncrement = require('mongoose-auto-increment');
MongooseAutoIncrement.initialize(Mongoose.connection);
const { Network } = require("../Model");

Network.plugin(MongooseAutoIncrement.plugin, {
  model: 'network',
  field: 'nid',
  startAt: 1
});

//checking whether network exists or not
Network.statics.isNetworkExist = async function (filter, projection) {
  return await this.find(filter, projection).lean();
}

Network.statics.isIdExists = async function (filter, projection) {
  return await this.find(filter, projection).lean();
}
Network.statics.findAllNetwork = async function (filter, projection) {
  return await this.find(filter, projection).lean();
}
Network.statics.findOneNetwork = async function (filter, projection) {
  return await this.find(filter, projection).lean();
}
Network.statics.modifyNetwork = async function (filter, projection) {
  return await this.findByIdAndUpdate(filter, projection)
}
Network.statics.updateDomain = async function (filter, projection) {
  return await this.update(filter, projection)
}
Network.statics.domainExist = async function (filter, projection) {
  return await this.find(filter, projection).lean();
}
Network.statics.updateStatus = async function (filter, projection) {
  return await this.update(filter, projection);
}
Network.statics.updateTimeZone = async function (filter, reflect) {
  return await this.findOneAndUpdate(filter, reflect);
}
Network.statics.getOneNetwork = async function (query, projection) {
  return await this.findOne(query, projection);
}
Network.statics.findOneDoc = async function (filter, projection, options) {
  return await this.findOne(filter, projection, options);
}
Network.statics.updatePostbackStatus = async function( filter , reflect ){
  return await this.updateOne( filter  , reflect ) ; 
}

Network.statics.UpdatePublisherIdPrefix=async function(filter,reflect,option){
       return await this.updateOne(filter,reflect,option)
}

Network.statics.updateNetwork=async function(filter,update,option){
   return await this.updateOne(filter,update,option)
}

module.exports = Mongoose.model('network', Network);



