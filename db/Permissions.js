const Mongoose = require('mongoose');
const { Permission } = require("../db/Model");

//checking whether permission exists or not
Permission.statics.isPermissionExist = async function( filter, projection ){
    return await this.find(filter, projection).lean();
  }
Permission.statics.checkPermission = async function (filter, projection) {
    return await this.aggregate([filter, projection]);
  }
module.exports = Mongoose.model('permission', Permission);


