const Mongoose=require('mongoose')
const {Publisher_v2}=require('../Model');


Publisher_v2.statics.getPublisher=async function(filter,projection,options){
    return await this.findOne(filter,projection,options).lean()
}


module.exports=Mongoose.model('publisher_v2',Publisher_v2);
