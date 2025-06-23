const Mongoose = require('mongoose');
const userModel = require("../../db/user/User");
const userActivityLogModel = require("../../db/userActivityLog");
var Moment = require('moment');
const requestIp = require('request-ip');
const debug = require("debug")("darwin:Controller:User");
const mongooseObjectId = Mongoose.Types.ObjectId;
const Response = require('../../helpers/Response');
const { payloadType } = require('../../constants/config');
const bcrypt = require('bcryptjs');
const { config } = require('../../constants/Global');
const Redis = require('../../helpers/Redis');
// const PermissionModel = require("../../db/Roles");
const NetworkModel = require("../../db/network/Network");
const PublisherModel = require('../../db/publisher/Publisher');
const Functions = require("../../helpers/Functions");
const redis = require("../../helpers/Redis");
const jwt = require('jsonwebtoken');
const { fileLoader } = require('ejs');
const handlingDomain = require('../../db/handlingDomain/handlingDomain');
// code for listing all users present in database
const loginLimit=4;

findUserByfilter = async (filter, projection) => {
  data = await userModel.getUsers(filter, projection);
  if (data.length) {
    return data;
  } else {
    return null;
  }
}
exports.getSingleUser = async (req, res) => {
  if (!req.params.id) {
    let response = Response.error();
    response.msg = "No User Found...!!";
    response.error = ["no user found"];
    return res.status(200).json(response);
  }
  
  if(req.user.userDetail.category = 'system'){
    filter = { _id: mongooseObjectId(req.params.id) }  // When superadmin login . 
  }else{
    filter = { _id: mongooseObjectId(req.params.id), network: req.user.userDetail.network } // when network login 
  }
  projection = { createdAt: 0, updatedAt: 0, reset_password_token: 0, last_login_ip: 0, first_login_ip: 0, reset_password_required: 0, rest_password_at: 0, reset_password_ip: 0, last_login: 0 };
  userData = await findUserByfilter(filter, projection);
  if (userData && userData.length > 0) {

    const userlogs = await userActivityLogModel.getUserLogs({ user_id: mongooseObjectId(req.params.id), network_id: req.user.userDetail.network }, { "user_id": 1, "name": 1, "email": 1, "url_path": 1, "createdAt": 1, "log": 1, "_id": 0 }, { sort: { createdAt: -1 }, limit: 100 })
    if (userlogs) {
      userData[0]['userlogs'] = userlogs
    }

    let response = Response.success();
    response.payloadType = payloadType.array;
    response.payload = userData;
    response.msg = "success";
    return res.status(200).send(response)
  } else {
    let response = Response.error();
    response.msg = "No User Found...!!";
    response.error = ["no user found"];
    return res.status(200).json(response);
  }
}

exports.getUser = async (req, res) => {
    console.log("req.user---",req.user)
  let filter = {};
  let projection = {};
  let filterStatus = true;
  if (req.user_category == 'publisher' || req.user_category == 'advertiser' || req.user_category == 'system') {
    if (req.user.userDetail.parentId.length) {
      filter = { parent_id: req.user.userDetail.parent_id };
    } else {
      filterStatus = false;
    }
  } else if (req.user_category == 'network') {
    if (req.loginType == 'publisher' || req.loginType == 'advertiser') {
      filter = { "parent_id": { $in: req.loginId } };
    }
    else {
      if(!req.user.userDetail.userType.includes('network_owner')){
        filter = { user_type: 'network_user' };
      }
    }
  } else {
    filterStatus = false;
  }

  if (!filterStatus) {
    let response = Response.error();
    response.msg = "No User Found";
    response.error = ["no user found"];
    return res.status(200).json(response);
  }
  filter['network'] = req.user.userDetail.network[0];
  console.log("filter-->", filter);
  projection = { createdAt: 0, updatedAt: 0, reset_password_token: 0, last_login_ip: 0, first_login_ip: 0, reset_password_required: 0, rest_password_at: 0, reset_password_ip: 0, last_login: 0 };
  let userData = await findUserByfilter(filter, projection);
  if (userData) {
    let response = Response.success();
    response.payloadType = payloadType.object;
    response.payload = {};
    response.payload = userData;
    if (userData.length == 0) {
      let response = Response.error();
      response.msg = "No User Found";
      response.error = ["no user found"];
      return res.status(200).json(response);
    }
    response.msg = "success";
    return res.status(200).send(response)
  } else {
    let response = Response.error();
    response.msg = "No User Found";
    response.error = ["no user found"];
    return res.status(200).json(response);
  }
}

exports.getNetworkOwner = async (req, res) => {

  let filter = {};
  let projection = {};
  
  filter['roles.role']= 'network_owner' ;

  projection = { createdAt: 0, updatedAt: 0, reset_password_token: 0, last_login_ip: 0, first_login_ip: 0, reset_password_required: 0, rest_password_at: 0, reset_password_ip: 0, last_login: 0 };
  let userData = await findUserByfilter(filter, projection);
  if (userData) {
    let response = Response.success();
    response.payloadType = payloadType.object;
    response.payload = {};
    response.payload = userData;
    if (userData.length == 0) {
      let response = Response.error();
      response.msg = "No User Found";
      response.error = ["no user found"];
      return res.status(200).json(response);
    }
    response.msg = "success";
    return res.status(200).send(response)
  } else {
    let response = Response.error();
    response.msg = "No User Found";
    response.error = ["no user found"];
    return res.status(200).json(response);
  }
}


// code for adding new user
exports.addUser = (req, res) => {
  let parent_id = [];
  if (req.user.userDetail && req.user.userDetail.parentId && req.user.userDetail.parentId.length > 0) {
    parent_id = req.user.userDetail.parentId;
  }
  else if (req.loginId) {
    parent_id[0] = req.loginId;
  }
  else if (req.body.assigned_user) {
    parent_id = req.body.assigned_user;
  }

  let filter = { email: req.body.email, network: req.user.userDetail.network };
  let projection = { email: 1, network: 1 };
  userModel.getUsers(filter, projection).then(result => {
    if (result.length) {
      let response = Response.success();
      response.payloadType = payloadType.array;
      response.msg = "user already exist";
      return res.status(200).send(response)
    }
    const clientIp = requestIp.getClientIp(req);
    const salt = bcrypt.genSaltSync(10);
    let hash = bcrypt.hashSync(req.body.password, salt);
    category = "";
    if (req.body.user_type == 'network_user') {
      category = "network";
    } else if (req.body.user_type == 'publisher') {
      category = "publisher";
    } else if (req.body.user_type == 'advertiser') {
      category = "advertiser";
    } else {
      category = 'system';
    }
    let profile_image = '';
    if (req.files && req.files.length) {
      profile_image = req.files[0].path;
    }
    let usermodel = new userModel({
      first_name: req.body.first_name,
      last_name: req.body.last_name,
      gender: req.body.gender,
      email: req.body.email,
      network: req.user.userDetail.network,  // id of network in which user is
      nid: req.user.userDetail.nid,
      phone: req.body.phone,
      password: hash,  // hashed value of password
      status_label: req.body.status_label,
      status: req.body.status,
      profile_image: profile_image,///////
      user_category_label: category,
      user_category: config['USER_CATEGORY'][category]['value'],

      user_type: req.body.user_type,
      parent_id: parent_id,

      country: req.body.country,
      skype_id: req.body.skype_id,
      roles: {
        network_id: req.user.userDetail.network,// id of network in which user is
        role: req.body.role,
        role_id: req.body.role_id,
        permissions: JSON.parse(req.body.permission)
      },
      first_login_ip: clientIp,
      last_login_ip: clientIp,
      reset_password_token: '',
      reset_password_required: '',//
      rest_password_at: '',//date
      reset_password_ip: '',
      last_login: Moment().format(),

    });
    usermodel.save().then(result => {
      let response = Response.success();
      response.payloadType = payloadType.array;
      response.payload = result._id
      response.msg = "successfully save user";
      return res.status(200).json(response);
    }).catch(err => {
      let response = Response.error();
      response.msg = "unable to execute query";
      response.error = [err.message];
      return res.status(400).send(response)
    });
  }).catch(err => {
    let response = Response.error();
    response.error = [err.message];
    response.msg = "unable to execute getUser query";
    return res.status(400).send(response)
  })
}

exports.deleteUser = (req, res) => {
  let filter = { _id: req.params.id }
  let projection = { _id: 1 };
  Redis.delRedisHashData('users', req.params.email).then(data => {
    userModel.deleteUser(filter, projection)
      .then(result => {
        let response = Response.success();
        response.payloadType = payloadType.object;
        response.payload = {};
        response.payload = result;
        response.msg = "success";
        return res.status(200).send(response)
      })
      .catch(err => {
        let response = Response.error();
        response.msg = "error";
        response.error = [err.message];
        return res.status(400).send(response)
      })
  })
    .catch(err => {
      let response = Response.error();
      response.msg = "error";
      response.error = [err.message];
      return res.status(400).send(response)
    })


}

exports.updatePassword = (req, res) => {
  try {
    const salt = bcrypt.genSaltSync(10);
    let hash = bcrypt.hashSync(req.body.password, salt);
    if (req.params.id) {
      let filter = { _id: req.params.id }
      update = { password: hash, network: req.user.userDetail.network, };
      userModel.updateUser(filter, update)
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
    } else {
      let response = Response.error();
      response.error = [err.message];
      response.msg = "user id missing";
      return res.status(400).send(response)
    }
  } catch (err) {
    let response = Response.error();
    response.error = [err.message];
    response.msg = "something went wrong";
    return res.status(400).send(response)
  }
}

exports.updateUser = (req, res) => {
  if (req.params.id) {
    let filter = { _id: req.params.id }
    category = "";
    if (req.body.user_type == 'network_user') {
      category = "network";
    } else if (req.body.user_type == 'publisher') {
      category = "publisher";
    } else if (req.body.user_type == 'advertiser') {
      category = "advertiser";
    } else {
      category = 'system';
    }
    let update = {
      first_name: req.body.first_name,
      email: req.body.email,
      // network: req.user.userDetail.network,
      phone: req.body.phone,
      // status_label: req.body.status_label,
      // status: req.body.status,
      // user_category_label: category,
      // user_category: config['USER_CATEGORY'][category]['value'],
      skype_id: req.body.skype_id,
      roles: {
        // network_id: req.user.userDetail.network,
        role: req.body.role,
        role_id: req.body.role_id,
        permissions: JSON.parse(req.body.permission)
      },
    };
    if(req.user.userDetail.network && req.user.userDetail.network.length){
      update['network'] = req.user.userDetail.network ;
    }
    if (req.body.last_name) {
      update['last_name'] = req.body.last_name;
    }
    if (req.body.gender) {
      update['gender'] = req.body.gender;
    }
    if (req.body.country) {
      update['country'] = req.body.country;
    }
    if (req.files && req.files.length) {
      update['profile_image'] = req.files[0].path;
    }
    if (req.body.password && req.body.password.trim()) {
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(req.body.password.trim(), salt);
      update['password'] = hash;
    }
    userModel.updateUser(filter, update)
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

exports.Users = (req, res) => {
  filter = {}
  projection = {}
  filter = { network: req.user.userDetail.network, 'parent_id': { $in: req.params.id } }
  userModel.getUsers(filter, projection).then(result => {
    let response = Response.success();
    response.payloadType = payloadType.array;
    response.payload = result
    response.msg = "success";
    return res.status(200).send(response)
  })
    .catch(err => {
      let response = Response.error();
      response.error = [err.message];
      response.msg = "unable to execute query";
      return res.status(400).send(response)

    })
}

// getting user based on specific publisher / advertiser id
exports.addTypeUser = async (req, res) => {
  let filter = { email: req.body.email, network: req.user.userDetail.network }
  let projection = { email: 1, network: 1 };
  userModel.getUsers(filter, projection).then(result => {
    if (result.length) {
      let response = Response.success();
      response.payloadType = payloadType.array;
      response.msg = "user already exist";
      return res.status(200).send(response)
    }
    const clientIp = requestIp.getClientIp(req);
    const salt = bcrypt.genSaltSync(10);
    let hash = bcrypt.hashSync(req.body.password, salt);
    // category = "";
    // if(req.body.user_type == 'publisher'){
    //   category = "publisher";
    // }else if(req.body.user_type == 'advertiser'){
    //   category = "advertiser";
    // }
    let usermodel = new userModel({
      first_name: req.body.first_name,
      last_name: req.body.last_name,
      gender: req.body.gender,
      email: req.body.email,
      network: req.user.userDetail.network,  // id of network in which user is
      phone: req.body.phone,
      password: hash,  // hashed value of password
      status_label: req.body.status_label,
      status: req.body.status,
      user_category_label: req.body.user_type,
      user_category: config['USER_CATEGORY'][req.body.user_type]['value'],

      user_type: req.body.user_type,
      parent_id: req.body.assigned_user,

      country: req.body.country,
      skype_id: req.body.skype_id,
      roles: {
        network_id: req.user.userDetail.network,// id of network in which user is
        role: req.body.role,
        role_id: req.body.role_id,
        permissions: req.body.permission
      },
      first_login_ip: clientIp,
      last_login_ip: clientIp,
      reset_password_token: '',
      reset_password_required: '',//
      rest_password_at: '',//date
      reset_password_ip: '',
      last_login: Moment().format(),

    });
    usermodel.save().then(result => {
      let response = Response.success();
      response.payloadType = payloadType.array;
      response.payload = result._id
      response.msg = "successfully save user";
      return res.status(200).json(response);
    }).catch(err => {
      let response = Response.error();
      response.error = [err.message];
      response.msg = "unable to execute query";
      return res.status(400).send(response)
    });
  }).catch(err => {
    let response = Response.error();
    response.error = [err.message];
    response.msg = "unable to execute getUser query";
    return res.status(400).send(response)
  })
}

exports.addSystemUser = (req, res) => {
  let parent_id = [];
  let category = 'system';
  let filter = { email: req.body.email.trim(), network: null };
  let projection = { email: 1, network: 1 };
  userModel.getUsers(filter, projection).then(result => {
    if (result.length) {
      let response = Response.success();
      response.payloadType = payloadType.array;
      response.msg = "user already exist";
      return res.status(200).send(response)
    }
    const clientIp = requestIp.getClientIp(req);
    const salt = bcrypt.genSaltSync(10);
    let hash = bcrypt.hashSync(req.body.password, salt);
    let usermodel = new userModel({
      first_name: req.body.first_name,
      last_name: req.body.last_name,
      gender: req.body.gender,
      email: req.body.email,
      network: null,
      phone: req.body.phone,
      password: hash,  // hashed value of password
      status_label: req.body.status_label,
      status: req.body.status,
      user_category_label: category,
      user_category: config['USER_CATEGORY'][category]['value'],
      user_type: 'system_user',
      parent_id: parent_id,
      country: req.body.country,
      skype_id: req.body.skype_id,
      roles: {
        network_id: null,// id of network in which user is
        role: req.body.role,
        role_id: req.body.role_id,
        permissions: req.body.permission
      },
      first_login_ip: clientIp,
      last_login_ip: clientIp,
      reset_password_token: '',
      reset_password_required: '',//
      rest_password_at: '',//date
      reset_password_ip: '',
      last_login: Moment().format(),

    });
    usermodel.save().then(result => {
      let response = Response.success();
      response.payloadType = payloadType.array;
      response.payload = result._id
      response.msg = "Successfully save user";
      return res.status(200).json(response);
    }).catch(err => {
      let response = Response.error();
      response.msg = "Something went wrong (1)";
      response.error = [err.message];
      return res.status(400).send(response)
    });
  }).catch(err => {
    let response = Response.error();
    response.error = [err.message];
    response.msg = "Try again Later (1)";
    return res.status(400).send(response)
  })
}

///////////////////////////////////////new functions
exports.getManagers = async (req, res) => {
  try {
    let filter = {
      'network': mongooseObjectId(req.user.userDetail.network[0]),
      'user_type': 'network_user',
      'roles.role': { $in: ['affiliate_admin', 'affiliate_manager', 'network_owner', 'network_admin', 'network_manager'] }
    };
    let result = await userModel.getUsers(filter, {}, {});
    if (result && result.length) {
      let response = Response.success();
      response.msg = "Success";
      response.payloadType = payloadType.array;
      response.payload = result;
      return res.status(200).json(response);
    } else {
      let response = Response.error();
      response.error = ["no manager found"];
      response.msg = "No manager found.";
      return res.status(200).json(response);
    }
  } catch (error) {
    let response = Response.error();
    response.error = [error.message];
    response.msg = "Something went wrong. Please try again later.";
    return res.status(200).json(response);
  }
}

// getPermissions = async (filter, projection) => {
//   data = await PermissionModel.checkRole(filter, projection);
//   if (data) {
//     return data[0]['permissions'];
//   } else {
//     return null;
//   }
// }

function getLoginExpireTimeInSeconds(expireTime) {
  if (expireTime.includes('d') || expireTime.includes('D')) {
    expireTime = expireTime.replace('d', '').replace('D', '')
    expireTime = parseInt(expireTime) * 24 * 60 * 60
  }
  else if (expireTime.includes('h') || expireTime.includes('H')) {
    expireTime = expireTime.replace('h', '').replace('H', '')
    expireTime = parseInt(expireTime) * 60 * 60
  }
  return expireTime
}

exports.getPublisherLoginToken = async (req, res) => {
  try {
    
    let domain = Functions.parseUrl(req.headers.origin);
    let domainfilter={'domain':domain,}
    let handlingDomanData= await handlingDomain.findOneDomainData(domainfilter)
  
      if(!( handlingDomanData && handlingDomanData['_id'])){
          let response=Response.error();
          response.msg='domain does not exist or not allowed';
          response.error='domain does not exist';
          return res.status(200).json(response);

      }
    // let networkFilter = { 'domain.dashboard': domain };
     let networkFilter={_id:mongooseObjectId(handlingDomanData['N_id'])}
    let networkProjection = { '_id': 1, 'company_name': 1, 'network_unique_id': 1, 'current_timezone': 1, 'network_publisher_setting_string': 1 };
    let networkData = await NetworkModel.findOneDoc(networkFilter, networkProjection, {});
    if (!(networkData && networkData['_id'])) {
      let response = Response.error();
      response.error = 'domain does not exist';
      response.msg = 'Something went wrong. Please try again.';
      return res.status(200).json(response);
    }

    let filter = { network: mongooseObjectId(req.user.userDetail.network[0]), parent_id: mongooseObjectId(req.params.id) };
    let projection = { '_id': 1, 'email': 1, 'user_type': 1, 'first_name': 1, 'last_name': 1, 'roles.role': 1, 'roles.permissions.name': 1, 'user_category_label': 1, 'isPublisher': 1, 'isAdvertiser': 1, 'publisher': 1, 'advertiser': 1, 'parent_id': 1 };

    let userData = await userModel.getUser(filter, projection);
    if (!(userData && userData['_id'])) {
      let response = Response.error();
      response.error = 'user does not exist';
      response.msg = 'Publisher does not exist.';
      return res.status(200).json(response);
    }
    if (!userData['user_type'].includes('publisher')) {
      let response = Response.error();
      response.error = 'user does not exist';
      response.msg = 'User does not exist.';
      return res.status(400).send(response);
    }

    let loginType = 'publisher';
    let permissions = [];
    // if (userData['user_type'].includes('network_owner')) {
    //   let permissionsData = await getPermissions({ name: 'affiliate_admin' }, { permissions: 1 });
    //   if (permissionsData) {
    //     for (let item of permissionsData) {
    //       permissions.push(item['name']);
    //     }
    //   }
    //   permissions.push(loginType);
    // } else {
    if (userData['roles']['permissions']) {
      for (let item of userData['roles']['permissions']) {
        permissions.push(item['name']);
      }
    }
    permissions.push(userData['user_category_label']);
    // }

    let accountId = await PublisherModel.getPublisher({ _id: mongooseObjectId(req.params.id) }, { pid: 1, _id: 0 });

    let salt = Functions.Salt(10);
    let tokenData = { userDetail: {}, permissions: '' };
    let setRedis = {};
    tokenData['userDetail']['name'] = (userData['first_name'] + ' ' + userData['last_name']).trim();
    tokenData['userDetail']['email'] = userData['email'];
    tokenData['userDetail']['id'] = userData['_id'];
    tokenData['userDetail']['network'] = [networkData['_id']]; // to do replace network array to string
    tokenData['userDetail']['salt']  = salt;
    tokenData['userDetail']['userType'] = userData['user_type'];
    tokenData['userDetail']['category'] = userData['user_category_label'];
    tokenData['userDetail']['domain'] = setRedis['domain'] = { 'dashboard': domain.toString().replace('.admin', '') };
    tokenData['userDetail']['company_name'] = networkData['company_name']
    tokenData['permissions'] = permissions;
    tokenData['loginType'] = loginType;
    tokenData['userDetail']['parentId'] = (userData['parent_id'] && userData['parent_id'].length) ? userData['parent_id'] : [];
    tokenData['userDetail']['network_unique_id'] = setRedis['network_unique_id'] = networkData['network_unique_id'];
    tokenData['userDetail']['timezone'] = networkData['current_timezone'] || 'Asia/Kolkata';
    tokenData['userDetail']['pid'] = accountId['pid'];

    setRedis['timezone'] = networkData['current_timezone'] || 'Asia/Kolkata';
    setRedis['network_setting'] = networkData['network_publisher_setting_string'] || '';
    setRedis['role'] = userData['roles']['role'];
    setRedis['permission'] = permissions;
    setRedis['isPublisher'] = userData['isPublisher'];
    setRedis['isAdvertiser'] = userData['isAdvertiser'];
    setRedis['publisher'] = userData['publisher'];
    setRedis['advertiser'] = userData['advertiser'];
    setRedis['user_category'] = userData['user_category_label'];
    setRedis['accountid'] = accountId['pid'];
    setRedis['loginType'] = '';
    setRedis['loginId'] = '';
    let currTime = Date.now(); // Get the current time in milliseconds
		let redisKey=`user:${networkData['_id']}:${userData['_id']}`;
		let saltKey=`userSalt:${networkData['_id']}:${userData['_id']}`
        // Get all members of the sorted set
        let SaltLength = (await redis.getLengthFromRedisSortedSet(saltKey)).data;
        // Check if the number of items exceeds the login limit
        if (+SaltLength>= loginLimit) {
			let detetelength=(+SaltLength)-loginLimit+1;
			if(detetelength>0)
				await redis.popMemberFromSortedSetWithLowestScore(saltKey,detetelength)
		}
        // Add the new member with the current timestamp
        await redis.setDataInRedisSortedSet([saltKey, currTime,salt],getLoginExpireTimeInSeconds(process.env.TOKENLIFE));

		let redisData = await redis.setRedisData(redisKey, setRedis, getLoginExpireTimeInSeconds(process.env.TOKENLIFE));
    // let redisData = await redis.setRedisHashData('users', userData['email'], setRedis, getLoginExpireTimeInSeconds(process.env.TOKENLIFE));
    if (!redisData || redisData['error']) {
      let response = Response.error();
      response.error = 'unable to store data in redis';
      response.msg = 'Something went wrong. Please try again.';
      return res.status(200).json(response);
    }

    const token = jwt.sign(tokenData, process.env.SECREAT_KEY, { expiresIn: process.env.TOKENLIFE });
    const refreshToken = jwt.sign(tokenData, process.env.refreshTokenSecret, { expiresIn: process.env.REFRESHTOKENLIFE });

    let response = Response.success();
    response.payload.push({ 'token': token, 'refreshtoken': refreshToken });
    response.payloadType = payloadType.array;
    response.msg = "success";
    return res.status(200).send(response);
  } catch (error) {
    debug(error);
    let response = Response.error();
    response.error = [error.message];
    response.msg = 'Something went wrong. Please try again later.';
    return res.status(200).json(response);
  }
}

exports.getPublisherTokenLoginToken2=async(req,res)=>{
try{
  let Host_domain='https://'+req.headers.host
   Host_domain = Functions.parseUrl(Host_domain); 

  const Origin_domain = Functions.parseUrl(req.headers.origin);
  console.log("Host_domain--",Host_domain)
  console.log("OriginDomain--",Origin_domain);
  
  let first_sub_Domain = Origin_domain.split('.')[0];
  console.log("first_domain--",first_sub_Domain)
   
  
  if (!Host_domain.includes(first_sub_Domain)) {
    // Prefix Host_domain with the first subdomain from Origin_domain if not present
    Host_domain = `${first_sub_Domain}.${Host_domain}`;
  }
  
  // Remove '.api' if it exists in Host_domain
  if (Host_domain.includes('.api')) {
    Host_domain = Host_domain.replace('.api', '');
  }
  
  let domainfilter={'domain':Origin_domain,}
  let handlingDomanData= await handlingDomain.findOneDomainData(domainfilter)

    if(!( handlingDomanData && handlingDomanData['_id'])){
        let response=Response.error();
        response.msg='domain does not exist or not allowed';
        response.error='domain does not exist';
        return res.status(200).json(response);

    }
  // let networkFilter = { 'domain.dashboard': domain };
   let networkFilter={_id:mongooseObjectId(handlingDomanData['N_id'])}
  let networkProjection = { '_id': 1, 'company_name': 1, 'network_unique_id': 1, 'current_timezone': 1, 'network_publisher_setting_string': 1 };
  let networkData = await NetworkModel.findOneDoc(networkFilter, networkProjection, {});
  if (!(networkData && networkData['_id'])) {
    let response = Response.error();
    response.error = 'domain does not exist';
    response.msg = 'Something went wrong. Please try again.';
    return res.status(200).json(response);
  }

  let filter = { network: mongooseObjectId(req.user.userDetail.network[0]), parent_id: mongooseObjectId(req.params.id) };
  let projection = { '_id': 1, 'email': 1, 'user_type': 1, 'first_name': 1, 'last_name': 1, 'roles.role': 1, 'roles.permissions.name': 1, 'user_category_label': 1, 'isPublisher': 1, 'isAdvertiser': 1, 'publisher': 1, 'advertiser': 1, 'parent_id': 1 };

  let userData = await userModel.getUser(filter, projection);
  if (!(userData && userData['_id'])) {
    let response = Response.error();
    response.error = 'user does not exist';
    response.msg = 'Publisher does not exist.';
    return res.status(200).json(response);
  }
  if (!userData['user_type'].includes('publisher')) {
    let response = Response.error();
    response.error = 'user does not exist';
    response.msg = 'User does not exist.';
    return res.status(400).send(response);
  }

  let loginType = 'publisher';
  let permissions = [];
 
  if (userData['roles']['permissions']) {
    for (let item of userData['roles']['permissions']) {
      permissions.push(item['name']);
    }
  }
  permissions.push(userData['user_category_label']);


  let accountId = await PublisherModel.getPublisher({ _id: mongooseObjectId(req.params.id) }, { pid: 1, _id: 0 });

  let salt = Functions.Salt(10);
  let tokenData = { userDetail: {}, permissions: '' };
  let setRedis = {};
  tokenData['userDetail']['name'] = (userData['first_name'] + ' ' + userData['last_name']).trim();
  tokenData['userDetail']['email'] = userData['email'];
  tokenData['userDetail']['id'] = userData['_id'];
  tokenData['userDetail']['network'] = [networkData['_id']]; // to do replace network array to string
  tokenData['userDetail']['salt'] = setRedis['salt'] = salt;
  tokenData['userDetail']['userType'] = userData['user_type'];
  tokenData['userDetail']['category'] = userData['user_category_label'];
  tokenData['userDetail']['domain'] = setRedis['domain'] = { 'dashboard': Host_domain.toString() };
  tokenData['userDetail']['company_name'] = networkData['company_name']
  tokenData['permissions'] = permissions;
  tokenData['loginType'] = loginType;
  tokenData['userDetail']['parentId'] = (userData['parent_id'] && userData['parent_id'].length) ? userData['parent_id'] : [];
  tokenData['userDetail']['network_unique_id'] = setRedis['network_unique_id'] = networkData['network_unique_id'];
  tokenData['userDetail']['timezone'] = networkData['current_timezone'] || 'Asia/Kolkata';
  tokenData['userDetail']['pid'] = accountId['pid'];

  setRedis['timezone'] = networkData['current_timezone'] || 'Asia/Kolkata';
  setRedis['network_setting'] = networkData['network_publisher_setting_string'] || '';
  setRedis['role'] = userData['roles']['role'];
  setRedis['permission'] = permissions;
  setRedis['isPublisher'] = userData['isPublisher'];
  setRedis['isAdvertiser'] = userData['isAdvertiser'];
  setRedis['publisher'] = userData['publisher'];
  setRedis['advertiser'] = userData['advertiser'];
  setRedis['user_category'] = userData['user_category_label'];
  setRedis['accountid'] = accountId['pid'];
  setRedis['loginType'] = '';
  setRedis['loginId'] = '';
  let redisKey=`user:${networkData['_id']}:${userData['_id']}`;
  let saltKey=`userSalt:${networkData['_id']}:${userData['_id']}`
  let currTime = Date.now();
      // Get all members of the sorted set
  let SaltLength = (await redis.getLengthFromRedisSortedSet(saltKey)).data;
      // Check if the number of items exceeds the login limit
  if (+SaltLength>= loginLimit) {
    let detetelength=(+SaltLength)-loginLimit+1;
    if(detetelength>0)
      await redis.popMemberFromSortedSetWithLowestScore(saltKey,detetelength)
  }
      // Add the new member with the current timestamp
      await redis.setDataInRedisSortedSet([saltKey, currTime,salt],getLoginExpireTimeInSeconds(process.env.TOKENLIFE));

  let redisData = await redis.setRedisData(redisKey, setRedis, getLoginExpireTimeInSeconds(process.env.TOKENLIFE));
  // let redisData = await redis.setRedisHashData('users', userData['email'], setRedis, getLoginExpireTimeInSeconds(process.env.TOKENLIFE));
  if (!redisData || redisData['error']) {
    let response = Response.error();
    response.error = 'unable to store data in redis';
    response.msg = 'Something went wrong. Please try again.';
    return res.status(200).json(response);
  }

  const token = jwt.sign(tokenData, process.env.SECREAT_KEY, { expiresIn: process.env.TOKENLIFE });
  const refreshToken = jwt.sign(tokenData, process.env.refreshTokenSecret, { expiresIn: process.env.REFRESHTOKENLIFE });

  let response = Response.success();
  response.payload.push({ 'token': token, 'refreshtoken': refreshToken });
  response.payloadType = payloadType.array;
  response.msg = "success";
  return res.status(200).send(response);
 } catch (error) {
  debug(error);
  let response = Response.error();
  response.error = [error.message];
  response.msg = 'Something went wrong. Please try again later.';
  return res.status(200).json(response);
}
}

function getLoginExpireTimeInSeconds(expireTime) {

	if (expireTime.includes('d') || expireTime.includes('D')) {
		expireTime = expireTime.replace('d', '').replace('D', '')
		expireTime = parseInt(expireTime) * 24 * 60 * 60
	}
	else if (expireTime.includes('h') || expireTime.includes('H')) {
		expireTime = expireTime.replace('h', '').replace('H', '')
		expireTime = parseInt(expireTime) * 60 * 60
	}

	return expireTime
}