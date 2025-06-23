//imports
var Mongoose = require('mongoose');
const debug = require("debug")("darwin:Controller:Roles");
const mongooseObjectId = Mongoose.Types.ObjectId;
const RoleModel = require('../db/Roles');
const Response = require('../helpers/Response');
const {payloadType} = require('../constants/config');
const userModel = require('../db/user/User') ;

exports.AddCustomRole = async function (req, res) {
  let isCustomRole = true;
  let networkId = null;
  if (req.user.userDetail.category != 'system') {
    networkId = req.user.userDetail.network[0];
  } else {
    isCustomRole = false;
  }
  let filter = { $or: [{ "name": req.body.role.trim()}, { "permissions": req.body.permissions } ]};
  let projection = {
    _id: 1,
    name: 1
  };
  let result = await RoleModel.isRoleExists(filter, projection);
  if (result.length) {
    let response = Response.error();
    response.payloadType = payloadType.object;
    response.error = ["role  exists"];
    response.msg = " role is already exist"
    return res.status(200).json(response);
  } else {
    let role = new RoleModel({
      network_id: networkId,
      name: req.body.role.trim(),
      permissions: req.body.permissions,
      category: req.user.userDetail.category,
      is_custom_role: isCustomRole,
      description: req.body.description.trim(),
      status: true
    });
    role.save().then(result => {
        let response = Response.success();
        response.payloadType = payloadType.array;
        response.msg = "Successfully saved role";
        return res.status(200).json(response);
      })
      .catch(err => {
        let response = Response.error();
        response.msg = "Error while saving role, Try Later ";
        response.error = [err.message];
        return res.status(200).json(response);
      });
  }


}

exports.getAllRoles = function (req, res) {
  // getting roles and their permissions
  // let filter = { $or: [{ network_id: req.user.userDetail.network[0] }, { category: { $nin: ['system'] } }] };
  let filter = {
    $or: [
      {
        $or: [
          { network_id : !(req.user.userDetail.network) || req.user.userDetail.network[0] },
          { network_id : null }
        ]
      },
      { category: { $nin: ['system'] } }
    ]
  };
    let projection = { _id: 1, name: 1, permissions: 1, category: 1 , network_id:1 };
  RoleModel.checkRole(filter, projection)
    .then(result => {
      if (result.length) {

    // this filter when network_id is null or = User's network_id
    result =  result.filter(ele=>{
          return ele.network_id == null || ele.network_id == req.user.userDetail.network[0];
        })

        let response = Response.success();
        response.payloadType = payloadType.array;
        response.payload = result;
        response.msg = "success";
        return res.status(200).json(response);
      } else {
        let response = Response.error();
        response.error = ['No roles available'];
        response.msg = "No roles available";
        return res.status(200).json(response);
      }
    })
    .catch(err => {
      let response = Response.error();
      response.error = [err.message];
      response.msg = " error while getting roles ";
      return res.status(200).json(response);
    });
}


exports.getRole = async function (req, res) {
  try {


    let result = await RoleModel.findById(req.params.id)
    if (result) {
      let response = Response.success();
      response.payloadType = payloadType.array;
      response.payload = result;
      response.msg = "success";
      return res.status(200).json(response);
    } else {
      let response = Response.error();
      response.error = ['No roles available'];
      response.msg = "No roles available";
      return res.status(200).json(response);
    }
  } catch (err) {
    let response = Response.error();
    response.msg = "Unable to fetch Roles";
    response.error = [err.message];
    return res.status(200).json(response);
  }
}

exports.getSystemRoles = function (req, res) {
  let filter = {
    category: "system"
  };
  let projection = {
    _id: 1,
    name: 1,
    "permissions": 1,
    "category": 1
  };
  RoleModel.checkRole(filter, projection)
    .then(result => {
      if (result.length) {
        let response = Response.success();
        response.payloadType = payloadType.array;
        response.payload = result;
        response.msg = "success";
        return res.status(200).json(response);
      } else {
        let response = Response.error();
        response.error = ['No roles available'];
        response.msg = "No roles available";
        return res.status(200).json(response);
      }
    })
    .catch(err => {
      let response = Response.error();
      response.error = [err.message];
      response.msg = " error while getting roles ";
      return res.status(200).json(response);
    });
}


exports.getListRoles = async function (req, res) {
  try {
    let limit = parseInt(req.query.limit);
    let page = parseInt(req.query.page);
    let search = req.query.search.trim().toLowerCase();
    let skip = limit * (page - 1);
    let result = {};
    let filter = { $or: [{ network_id: req.user.userDetail.network[0] }, { category: { $nin: ['system'] } }] };


    if (search) {
      filter = { $and: [{ $or: [{ network_id: req.user.userDetail.network[0] }, { category: { $nin: ['system'] } }] }, {"name": { $regex: search }}]}
    }
    let projection = {
      name: 1,
      permissions: 1,
      category: 1,
      description: 1,
      status: 1,
      is_custom_role: 1,
      network_id: 1
    };
    let Options = {
      limit: limit,
      skip: skip
    }
    let records = await RoleModel.getRoles(filter, projection, Options)
    let TotalCount = await RoleModel.find(filter, {}).count();
    result.records = records;
    result.TotalCount = TotalCount;

    // this filter when network_id is null or = User's network_id
    if (result) {
      result.records = result.records.filter(ele=>{
        return  ele.network_id == null || ele.network_id == req.user.userDetail.network[0] ;
      })
      let response = Response.success();
      response.payloadType = payloadType.object;
      response.payload = result;
      response.msg = "fetch Records successfully";
      return res.status(200).json(response);
    } else {
      let response = Response.error();
      response.error = ['No roles available'];
      response.msg = "unable to fetch List of Roles ";
      return res.status(200).json(response);
    }
  } catch (err) {
    let response = Response.error();
    response.msg = "Unable to fetch Roles";
    response.error = [err.message];
    return res.status(200).json(response);
  }
}

exports.updateListRoles = async function (req, res) {
   
  let query = req.query.status; 
  let roleStatus = true;
  if (query == 'Active') {
    roleStatus = true;
  } else {
    roleStatus = false;
  }
  let roleId=req.params.id
  let filter = {
    "permissions": req.body.permissions
  };
  let projection = {
    _id: 1,
    name: 1
  };
  let result = await RoleModel.isRoleExists(filter, projection);
  if (result.length) {
    let response = Response.error();
    response.payloadType = payloadType.object;
    response.error = ["permission already exists"];
    response.msg = "These permissions already exist in " + result[0]['name'] + " Role";
    return res.status(200).json(response);
  } else {
    let role = {
      name: req.body.role,
      permissions: req.body.permissions,
      description: req.body.description,
      status: roleStatus
    };
    await userModel.updateUsers({ 'roles.role_id' : roleId } , { $set: {'roles.permissions': req.body.permissions }}) ; 
    RoleModel.findByIdAndUpdate(roleId, {$set: role},{new:true})
      .then(result => {
        let response = Response.success();
        response.payloadType = payloadType.object;
        response.payload = {};
        response.msg = "successfully updated";
        return res.status(200).send(response)
      },
        err => {
          let response = Response.error();
          response.error = [err.message];
          response.msg = "unable to execute query";
          return res.status(400).send(response)
        })
  }
}


exports.deleteListRoles = async function (req, res) {
  try {
    let filter = {
      network_id: mongooseObjectId(req.user.userDetail.network[0]),
      _id: req.params.id
    };
    let Options = {
      _id: 1
    }
    let result = await RoleModel.deleteRoles(filter, Options)
    if (result) {
      let response = Response.success();
      response.payloadType = payloadType.object;
      response.payload = result;
      response.msg = "successfully deleted";
      return res.status(200).send(response)
    } else {
      let response = Response.error();
      response.error = [];
      response.msg = "unable to execute query";
      return res.status(400).send(response)
    }
  } catch (err) {
    let response = Response.error();
    response.msg = "Error while deleting role, Try Later ";
    response.error = [err.message];
    return res.status(200).json(response);
  }
}
