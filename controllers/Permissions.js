//imports
var Mongoose = require('mongoose');
const debug = require("debug")("darwin:Controller:Permissions");
const mongooseObjectId = Mongoose.Types.ObjectId;
const PermissionModel = require('../db/Permissions');
const UserModel = require('../db/user/User');
const Response = require('../helpers/Response');
const { payloadType } = require('../constants/config');
const PermissionObj = Mongoose.model('permission');

// function for saving permission
exports.permission=function(req,res){
  //making request to check whether permission exists or not
  let filter = { "name" : req.body.name };
  let projection = { _id: 1 };

  PermissionModel.isPermissionExist(filter, projection)
    .then( (result) => {
      //if result doesn't exists
      if( !result ){
        // debug('no result exist');
        let response = Response.error();
          response.msg = " error while saving permission "
        //   debug(response);
          return res.status(404).json(response);
      }//if closed
      //when we got some id in result i.e. permission exists
      else if(result && result.length>0){
        // debug(result)
        let response = Response.success();
          response.msg = "exists"
        //   debug(response);
          return res.status(200).json(response);
      }//else if closed
      //when we doesn't get any id in result
      else{
          let permission = new PermissionModel({
          name: req.body.name,
          description: req.body.description,
          category: req.body.category,
          status: req.body.status
        });
        //saving permission
        permission.save().then(result=>{
          let response = Response.success();
          response.payloadType = payloadType.array;
          response.msg = "success"
        //   debug(response);
          return res.status(200).json(response);
        })//permission saved
        .catch(err=>{
          debug( err);
            let response = Response.error();
            response.error = [err.message];
          response.msg = " error while saving permission "
        //   debug(response);
          return res.status(404).json(response);
        })//error in saving permission
      }//else closed
    })//then closed,isPermissionExist executed
    .catch(err=>{
      debug( err);
        let response = Response.error();
        response.error = [err.message];
      response.msg = "error occurred"
    //   debug(response);
      return res.status(200).json(response);
    })//error in isPermissionExist
}//permission function closed

// function for getting all  permissions name from database
exports.gettingPermissionDb=function(req,res){
  //selecting all categories and names where status is 1 i.e. active

  let filter = {$match:{'status':true}};
  let projection = {$group : { _id:"$category",data:{$addToSet:{"id":"$_id","name":"$name"}},id:{$addToSet:"$_id"}, name : {$push:'$name'}}} ;
  // let projection ={$group : { _id:"$category",data:{$addToSet:{"id":"$_id","name":"$name"}}}}

  PermissionObj.checkPermission(filter, projection)
    .then(result => {
    // if result doesn't exists
      if( !result ){
        // debug('no result exist');
        return res.send("error");
      }//if closed
      // when we got some id in result i.e. permission exists
      else if(result && result.length>0){
        return res.send(result);
      }//else if closed
      //when we doesn't get any id in result
      else{
        // debug("database empty");
          }
  })
  .catch(err=>{
    debug( err);
      let response = Response.error();
      response.error = [err.message];
    response.msg = " error while getting permissions "
    // debug(response);
    return res.status(200).json(response);
  })
}
