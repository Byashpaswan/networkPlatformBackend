const mongoose=require('mongoose');
const {InvoiceDroft} =require('../Model');
InvoiceDroft.statics.InsetUpdateDraft=async function(filter,update,options){
    return  await this.updateOne(filter,update,options);
}

InvoiceDroft.statics.getDraftInvoice=async function(filter){
    return await this.find(filter);
}
InvoiceDroft.statics.UpdateOneDocs=async function(filter,update){
  return await this.updateOne(filter,update);
}

InvoiceDroft.statics.MonthlyInvoiceReport=async function(filter,group,projection,option){
  return await  this.aggregate([{$match:filter},{$group:group},{$project:projection},{$skip:option['skip']},{$limit:option['limit']}]).allowDiskUse(true);
}
module.exports=mongoose.model('invoice_droft',InvoiceDroft);