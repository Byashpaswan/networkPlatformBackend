const Mongoose = require('mongoose');
const { HandlingDomain } = require('../Model');

HandlingDomain.statics.getNetwork = async function (search, projection) {
    return await this.find(search, projection);
}


HandlingDomain.statics.deleteNetworkDomain = async function(search, projection) {
      return await this.deleteOne(search, projection);
  };

HandlingDomain.statics.findAllDomainData  = async function ( search  , projection ) {
  return await this.find( search ,  projection ) ;
  
} 

HandlingDomain.statics.findOneDomainData = async function (search ) {
  return await this.findOne(search );
}

HandlingDomain.statics.getAggregatedData = async function (filter) {
  return await this.aggregate([
    {$match:filter},
    { 
      $group: {
        _id: "$type",
        items: { $push: { _id: "$_id", domain: "$domain", status: "$status" } }
      }
    }
  ]);

}


module.exports = Mongoose.model('handling_domain', HandlingDomain);
