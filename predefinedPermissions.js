const csv = require('csv-parser')
const fs = require('fs')
const results = [];
const PermissionModel = require('../darwin/db/Permissions');
var Mongoose = require('mongoose');
const PermissionObj = Mongoose.model('permission');
const debug = require("debug")("darwin:Controller:Permissions");

exports.abc= ()=>{
    fs.createReadStream('admin_permissions.csv')
  .pipe(csv())
  .on('data', (data) => results.push(data))
  .on('end', () => {
    results.forEach(element => {
        let filter = { "name" : element.permission };
        let projection = { _id :1 };
        PermissionModel.isPermissionExist(filter, projection)
        .then( (result) => {
            if( !result )
            {
                debug('no permissions retrieved')
            }
            else if(result && result.length>0)
            {
                debug('exists')
            }
            else{
                let permission_object = new PermissionModel({
                    name: element.permission,
                    description: element.Description,
                    category: element.type,
                    status:true
                });
                permission_object.save().then(result=>{
                    debug(result)
                })
                .catch(err=>{
                    debug( err);
                    })
                }
        })
        .catch(err=>{
        debug( err);
        })
    });    
});
}