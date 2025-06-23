const Mongoose = require('mongoose');
const debug = require("debug")("darwin:Controller:Publisher");
const mongooseObjectId = Mongoose.Types.ObjectId;
const PublisherModel = require('../../db/publisher/Publisher');
const NetworkModel = require('../../db/network/Network');
const InviteModel = require('../../db/Invite/InviteLink')
const User = require('../../db/user/User');
const Response = require('../../helpers/Response');
const Function = require('../../helpers/Functions');
const { payloadType } = require('../../constants/config');
const UserModel = require("../../db/user/User");
const { SourceAdvertiserAffiliateSummaryModel } = require('../../db/click/sourceSummary/sourceSummary');
const Redis = require('../../helpers/Redis');
const rolesObj = require('../../db/Roles');
const requestIp = require('request-ip');
const { config } = require('../../constants/Global');
var Moment = require('moment');
const bcrypt = require("bcryptjs");
const { isInteger } = require('lodash');
const Publisherv2=require('../../db/publisher/publisherV2');
const handelingDomainModel = require('../../db/handlingDomain/handlingDomain')


function getDateRange(option) {
  let date = {};
  if (option == 1) {
    date['startDate'] = Moment().startOf('day');
    date['endDate'] = Moment();
  } else if (option == 2) {
    date['startDate'] = Moment().subtract(1, 'day').startOf('day');
    date['endDate'] = Moment().subtract(1, 'day').endOf('day');
  } else if (option == 3) {
    date['startDate'] = Moment().startOf('week');
    date['endDate'] = Moment();
  } else if (option == 4) {
    date['startDate'] = Moment().subtract(1, 'week').startOf('week');
    date['endDate'] = Moment().subtract(1, 'week').endOf('week');
  } else if (option == 5) {
    date['startDate'] = Moment().startOf('month');
    date['endDate'] = Moment();
  } else if (option == 6) {
    date['startDate'] = Moment().subtract(1, 'month').startOf('month');
    date['endDate'] = Moment().subtract(1, 'month').endOf('month');
  } else if (option == 7) {
    date['startDate'] = Moment().subtract(1, 'day').startOf('day');
    date['endDate'] = Moment();
  } else if (option == 8) {
    date['startDate'] = Moment().subtract(14, 'day').startOf('day');
    date['endDate'] = Moment().subtract(1, 'day').endOf('day');
  } else if (option == 9) {
    date['startDate'] = Moment().subtract(1, 'month').startOf('month');
    date['endDate'] = Moment();
  }
  return { $gte: date['startDate'].toDate(), $lte: date['endDate'].toDate() };
}

exports.roles = async () => {
  let roles = await rolesObj.isRoleExists({ name: 'affiliate_admin' }, {});
  if (roles) return roles
  else return null
}

exports.saveUser = (user) => {
  user.save();
}

exports.getAllPublishers = async (req, res) => {
  try {
    let search = { 'network_id': mongooseObjectId(req.user.userDetail.network[0]) };
    let projection = {};
    let options = { limit: 10, updatedAt: -1 };

    if (req.user_category == 'publisher') {
      search["_id"] = req.user.userDetail.parentId;
    } else if (req.user_category == 'network') {
      if (req.loginType == 'publisher') {
        search["_id"] = req.loginId;
      } else {
        if (!req.permissions.includes("aff.list")) {
          let publisherId = req.publisher.map(data => data.id);
          search["_id"] = { $in: publisherId };
        }
      }
    } else {
      let response = Response.error();
      response.msg = "Not authorized";
      return res.status(401).send(response)
    }

    if (req.body.search.company) search['company'] = { $regex: req.body.search.company.trim(), $options: 'i' };
    if(req.body.search.pid) search['pid']=+req.body.search.pid
    if (req.body.search.account_manager) search['account_manager.name'] = { $regex: req.body.search.account_manager.trim(), $options: 'i' };
    if (req.body.search.status) search['status'] = req.body.search.status;
    if (req.body.search.status == 'Live' && req.body.search.dateRange) {
      let filteredData = await SourceAdvertiserAffiliateSummaryModel.fetchDailySummary(
        { 'network_id': mongooseObjectId(req.user.userDetail.network[0]), 'timeSlot': getDateRange(req.body.search.dateRange) },    // filter
        { _id: null, publisher_id: { $addToSet: '$publisher_id' } }   // group
      );
      if (!filteredData || !filteredData[0] || !filteredData[0]['publisher_id'].length) {
        let response = Response.error();
        response.msg = "No Publisher Found";
        return res.status(204).json(response);
      }
      delete search['status'];
      search['pid'] = { $in: filteredData[0]['publisher_id'] };
    }
    if (req.body.options) {
      if (req.body.options.limit && req.body.options.limit != 0) options['limit'] = req.body.options.limit;
      if (req.body.options.page && req.body.options.page != 0) options['skip'] = (req.body.options.page - 1) * req.body.options.limit;
    }

    let publisherData = await PublisherModel.getPublisherList(search, projection, options);
    if (!publisherData || !publisherData.length) {
      let response = Response.error();
      response.msg = "No Publisher Found";
      return res.status(204).json(response);
    }

    let response = Response.success();
    response.msg = "success";
    response.payloadType = payloadType.object;
    response.payload = {
      'totalpublisher': publisherData.length,
      'result': publisherData,
      'pageSize': req.body.options.limit,
      'page': req.body.options.page
    };

    if (publisherData.length == options.limit) {
      try {
        let publisherCount = await PublisherModel.getTotalPagesCount(search);
        if (publisherCount) response.payload['totalpublisher'] = publisherCount;
      } catch (error) { }
    }
    return res.status(200).json(response);
  } catch (error) {
    console.log(error);
    let response = Response.error();
    response.msg = "Server internal error!"
    return res.status(500).json(response);
  }
}

exports.saveExternalPublisher = async (req, res) => {
  try {
    let invalidReq = "";
    if (!req.query.token) invalidReq = "Send Valid Token";
    if (!req.body.name) invalidReq = "Name is required";
    if (!req.body.company) invalidReq = "Company name is required";
    if (!req.body.phone) invalidReq = "Phone is required";
    if (!req.body.skypeId) invalidReq = "Skype id is required";
    if (!req.body.country) invalidReq = "country is required";
    if (!req.body.email) invalidReq = "Email is required";
    if (!req.body.password) invalidReq = "Password is required";
    if (invalidReq) {
      let response = Response.error();
      response.msg = invalidReq;
      return res.status(400).json(response);
    }

    // validate token
    let dbResult = await InviteModel.matchHash(
      { "hash": encodeURIComponent(req.query.token) }
    );
    if (!dbResult) {
      let response = Response.error();
      response.msg = "Invalid Token!"
      return res.status(400).json(response);
    }

    // validate domain and get network
    let domain = Function.parseUrl(req.headers.origin);
    let netDbResult = await NetworkModel.isNetworkExist(
      { network_unique_id: domain ? domain.split('.')[0] : "" },
      { _id: 1 }
    )
    if (!domain || !netDbResult || !netDbResult.length) {
      let response = Response.error();
      response.msg = "Your domain is invalid!"
      return res.status(400).json(response);
    }
    let networkId = netDbResult[0]['_id']

    // check publisher already exits or not
    let pubResult = await PublisherModel.isPublisherExists(
      { company: req.body.company, network_id: networkId }
    );
    if (!pubResult || pubResult.length) {
      let response = Response.error();
      response.msg = "Publisher exits, change company name."
      return res.status(400).json(response);
    }

    // check user email is exits or not 
    let usrResult = await UserModel.getUsers(
      { network: mongooseObjectId(networkId), email: req.body.email }
    );
    if (usrResult && usrResult.length) {
      let response = Response.error();
      response.msg = "User exits, change email."
      return res.status(400).json(response);
    }

    // Only available field in inserted for new publisher
    const tempAddress = { "country": req.body.country };
    if (req.body.address) tempAddress['address'] = req.body.address;
    if (req.body.locality) tempAddress['locality'] = req.body.locality;
    if (req.body.city) tempAddress['city'] = req.body.city;
    if (req.body.pincode) tempAddress['pincode'] = req.body.pincode;
    if (req.body.state) tempAddress['state'] = req.body.state;

    const pubData = {
      network_id: mongooseObjectId(networkId),
      company: req.body.company,
      name: req.body.name,
      address: tempAddress,
      status: "InActive",
      phone: req.body.phone,
      skype_id: req.body.skypeId,
    }
    if (req.body.website) pubData['website'] = req.body.website;

    // create new publisher
    let result = await new PublisherModel(pubData).save();
    if (!result) {
      let response = Response.error();
      response.msg = "Server internal error!";
      return res.status(500).json(response);
    }

    // getting permissions for publisher admin
    let roles = await rolesObj.getRole(
      { name: 'affiliate_admin' },
      { _id: 1, permissions: 1 },
      {}
    );
    if (!roles || !roles['_id']) {
      let response = Response.error();
      response.msg = "Server internal error!";
      return res.status(500).json(response);
    }

    // Only available field in inserted for new user
    const userData = {
      first_name: req.body.name,
      email: req.body.email,
      network: [mongooseObjectId(networkId)],
      phone: req.body.phone,
      skype_id: req.body.skypeId,
      password: bcrypt.hashSync(req.body.password, bcrypt.genSaltSync(10)),
      status_label: 'inactive',
      status: '3',
      roles: {
        network_id: mongooseObjectId(networkId),
        role: 'affiliate_admin',
        role_id: mongooseObjectId(roles['_id']),
        permissions: roles['permissions']
      },
      user_category_label: 'publisher',
      user_category: config['USER_CATEGORY']['publisher']['value'],
      user_type: ['publisher'],
      parent_id: mongooseObjectId(result._id),
      country: req.body.country,
      first_login_ip: requestIp.getClientIp(req),
      last_login_ip: requestIp.getClientIp(req),
      isPublisher: true,
      publisher: [{ id: mongooseObjectId(result._id), name: req.body.company }],
      last_login: Moment().format()
    }

    // create new user
    await new UserModel(userData).save();

    //remove token hash
    await InviteModel.deleteData(
      { "hash": encodeURIComponent(req.query.token) }
    );

    let response = Response.success();
    response.msg = "Wait for approval!";
    return res.status(200).json(response);
  } catch (error) {
    console.log(error);
    let response = Response.error();
    response.msg = "Server internal error!";
    return res.status(200).json(response);
  }
}

findUserByfilter = async (filter, projection) => {
  data = await UserModel.getUsers(filter, projection);
  if (data.length) {
    return data;
  } else {
    return null;
  }
}

findPubliserData = async (filter, projection) => {
  data = await PublisherModel.findPublisher(filter, projection);
  if (data.length) {
    return data;
  } else {
    return null;
  }
}

// getting list of all publishers
exports.findAllPublisher = async (req, res) => {
  try {
    var filter = {};
    var projection = {};
    if (req.params.pubId) {
      if (mongooseObjectId.isValid(req.params.pubId)) {
        filter = {
          _id: req.params.pubId
        };
      }
      else if (isInteger(+req.params.pubId)) {
        // console.log("req.params.pubId",req.params.pubId);
        filter = {
          pid: req.params.pubId
        };
      }
      else {
        let response = Response.error();
        response.msg = "Invalid Request";
        response.error = ["Invalid Request"];
        return res.status(200).json(response);
      }
    } else {
      if (req.user_category == 'publisher') {
        filter = {
          _id: req.user.userDetail.parentId
        }
      } else if (req.user_category == 'network') {
        if (req.loginType == 'publisher') {
          filter = {
            _id: req.loginId
          }
        } else {
          if (!req.permissions.includes("aff.list")) {
            // if (req.user.userDetail.parentId.length && req.publisher.length) {
            publisher = req.publisher.map(data => data.id);
            filter = {
              "_id": {
                $in: publisher
              }
            }
          }
        }
      } else {
        let response = Response.success();
        response.payloadType = payloadType.array;
        response.payload = [];
        response.msg = "No record found";
        return res.status(200).send(response)
      }
    }

    projection = {};
    filter['network_id'] = mongooseObjectId(req.user.userDetail.network[0]);
    userData = await findPubliserData(filter, projection);
    if (userData && userData.length) {
      let userLogs = await UserModel.getUsers(
        { parent_id: mongooseObjectId(userData[0]._id) },
        { first_name: 1, last_name: 1, last_login: 1, last_login_ip: 1, email: 1 },
        {}
      );
      userData[0]['user_logs'] = userLogs;
      let response = Response.success();
      response.payloadType = payloadType.array;
      response.payload = [];
      response.payload = userData;
      response.msg = "success";
      return res.status(200).send(response)
    } else {
      let response = Response.success();
      response.payloadType = payloadType.array;
      response.payload = [];
      response.msg = "No record found";
      return res.status(200).send(response)
    }
  } catch (err) {
    let response = Response.error();
    response.msg = "Something Went Wrong!!";
    response.error = [err.message];
    return res.status(200).json(response);
  }
}

// Delete a Publisher with the specified pubId in the request
exports.deletePublisher = async (req, res) => {
  try {
    if (!req.params.pubId) {
      let response = Response.error();
      response.msg = "Publisher id not correct!";
      return res.status(400).json(response);
    }

    await UserModel.deleteManyUser({ parent_id: mongooseObjectId(req.params.pubId) });
    await PublisherModel.findByIdAndRemove(req.params.pubId);

    let response = Response.success();
    response.msg = "Publisher deleted successfully!"
    return res.status(200).json(response);
  } catch (error) {
    let response = Response.error();
    response.msg = "Server internal error!";
    return res.status(500).json(response);
  }
};
// Update a Publisher with the specified pubId in the request
exports.findPublisher = async (req, res) => {
  let filter = {};
  let projection = {};
  if (req.user_category == 'publisher') {
    filter = {
      _id: req.user.userDetail.parentId
    }
  } else if (req.user_category == 'network') {

    if (req.loginType == 'publisher') {
      filter = {
        _id: req.loginId
      }
    } else {
      if (!req.permissions.includes("aff.list")) {
        // if (req.user.userDetail.parentId.length && req.publisher.length) {
        publisher = req.publisher.map(data => data.id);
        filter = {
          "_id": {
            $in: publisher
          }
        }
      }
    }
  }
  filter['network_id'] = mongooseObjectId(req.user.userDetail.network[0]);
  
  // fetch publisher where status active 
  filter['status'] = "Active";
  projection = {
    name: 1,
    company: 1,
    pid: 1,
    network_id: 1,
    _id: 1
  };
  PublisherModel.findPublisher(filter, projection)
    .then(result => {
      let response = Response.success();
      response.payloadType = payloadType.array;
      response.payload = result;
      response.msg = "success";
      return res.status(200).json(response);
    })
    .catch(err => {
      let response = Response.error();
      response.error = [err.message];
      response.msg = "Something Went Wrong";
      return res.status(200).json(response);
    })
}
exports.createCredentials = (req, res) => {
  let filter = {};
  if (req.params.id && req.params.id != 'undefined') {
    id = req.params.id;
  } else {
    id = req.loginId;
  }
  if (id && mongooseObjectId.isValid(id.trim())) {
    filter = {
      _id: mongooseObjectId(id)
    }
    filter['network_id'] = mongooseObjectId(req.user.userDetail.network[0]);
    projection = {
      name: 1,
      company: 1,
      api_details: 1
    };
    PublisherModel.findPublisher(filter, projection).then(result => {
      if (!result[0]) {
        let response = Response.success();
        response.payloadType = payloadType.object;
        response.payload = {};
        response.msg = "no publisher found";
        return res.status(200).send(response)
      }
      if (!result[0].api_details || !result[0].api_details.secret_key) {
        apiKey = Function.Salt(40);
        secreatKey = Function.hashFunction(req.user.userDetail.id);
        query = {
          "api_details": {
            api_key: apiKey,
            secret_key: secreatKey
          }
        }
        PublisherModel.updateCredentials(filter, query).then(data => {
          let response = Response.success();
          response.payloadType = payloadType.object;
          response.payload = {};
          response.payload = data;
          response.msg = "successfully updated publisher";
          return res.status(200).send(response)
        }).catch(err => {
          let response = Response.error();
          response.error = [err.message];
          response.msg = "error while updating publisher "
          return res.status(400).json(response);
        })
      } else {
        let response = Response.success();
        response.payloadType = payloadType.object;
        response.payload = {};
        response.payload = result[0];
        response.msg = "successfully find publisher";
        return res.status(200).send(response)
      }
    }).catch(err => {
      let response = Response.error();
      response.error = [err.message];
      response.msg = "error while getting publisher "
      return res.status(400).json(response);
    })
  } else {
    let response = Response.error();
    response.error = [];
    response.msg = "Invalid Request"
    return res.status(400).json(response);
  }
}
exports.updateCredentials = (req, res) => {
  let filter = {};
  if (req.params.id && mongooseObjectId.isValid(req.params.id.trim())) {
    filter = {
      _id: req.params.id
    };
    filter['network_id'] = mongooseObjectId(req.user.userDetail.network[0]);
    apiKey = Function.Salt(40);
    query = {
      "api_details.api_key": apiKey
    }
    PublisherModel.findAndUpdatePublisher(filter, query).then(data => {
      let response = Response.success();
      response.payloadType = payloadType.object;
      response.payload = {};
      data.api_details['api_key'] = apiKey;
      response.payload = data;
      response.msg = "successfully updated credentials";
      return res.status(200).send(response)
    }).catch(err => {
      let response = Response.error();
      response.error = [err.message];
      response.msg = "error while updating publisher "
      return res.status(400).json(response);
    })
  } else {
    let response = Response.error();
    response.error = [];
    response.msg = "Invalid Request"
    return res.status(400).json(response);
  }
}
exports.getAccount = async (req, res) => {
  try {
    let filter = {
      network_id: mongooseObjectId(req.user.userDetail.network[0]),
      status: 'Active'
    };
    let projection = {
      _id: 1,
      company: 1
    };
    projection = {};

    account = await findPubliserData(filter, projection);
    if (account) {
      let response = Response.success();
      response.payloadType = payloadType.object;
      response.payload = {};
      response.payload = account;
      response.msg = "success";
      return res.status(200).send(response)
    } else {
      let response = Response.success();
      response.payloadType = payloadType.object;
      response.payload = {};
      response.msg = "No record found";
      return res.status(200).send(response)
    }
  } catch (err) {
    let response = Response.success();
    response.payloadType = payloadType.object;
    response.payload = {};
    response.msg = "something went wrong!!!";
    return res.status(200).send(response)
  }
}
exports.getAllPublisherName = (req, res) => {
  filter = {
    'network_id': mongooseObjectId(req.user.userDetail.network[0])
  }
  projection = {
    pid: 1,
    company: 1
  }
  PublisherModel.getPublisherName(filter, projection)
    .then(result => {
      let response = Response.success();
      response.payloadType = payloadType.array;
      response.payload = result
      if (result.length == 0) {
        let response = Response.error();
        response.msg = "No Publisher List Found...!!";
        response.error = ["no Publisher List found"];
        return res.status(200).json(response);
      } else if (result.length > 0) {
        response.msg = " Data Found "
      } else {
        response.msg = " Data Not Found "
      }
      return res.status(200).json(response);
    })
    .catch(err => {
      let response = Response.error();
      response.error = [err.message];
      response.msg = " error while  saving "
      return res.status(200).json(response);
    })
}

exports.updatePublisherCutback = (req, res) => {
  try {
    if (req.body.cut_percentage < 0 || req.body.cut_percentage > 100) {
      let response = Response.error();
      response.error = ["Cut Back Percentage should be 0 to 100"];
      response.msg = "Cut Back Percentage should be 0 to 100!"
      return res.status(200).json(response);
    }
    let filter = {
      "_id": mongooseObjectId(req.params.pubId),
      'network_id': mongooseObjectId(req.user.userDetail.network[0])
    };
    let data = {
      "cut_percentage": req.body.cut_percentage
    };
    PublisherModel.updateCredentials(filter, data)
      .then(result => {
        if (result) {
          Redis.delRedisHashData('publisher', result.pid.toString());
          let response = Response.success();
          response.payloadType = payloadType.array;
          response.payload = result;
          response.msg = "Publisher Cut Back Updated Successfully!!";
          return res.status(200).json(response);
        } else {
          let response = Response.error();
          response.msg = "No Publisher Found!!";
          response.error = ["no Publisher found"];
          return res.status(200).json(response);
        }
      })
      .catch(err => {
        let response = Response.error();
        response.error = [err.message];
        response.msg = " error while updating cut back!"
        return res.status(200).json(response);
      })
  } catch (err) {
    let response = Response.error();
    response.error = [err.message];
    response.msg = " error while updating cut back!"
    return res.status(200).json(response);
  }
}

exports.getLoginPublisher = (req, res) => {
  search = {
    pid: +req.accountid,
    network_id: mongooseObjectId(req.user.userDetail.network[0])
  };
  projection = {
    company_logo: 1,
    account_manager: 1
  }

  PublisherModel.searchOnePublisher(search, projection).then(result => {
    if (result && result['_id']) {
      let response = Response.success();
      response.payloadType = payloadType.object;
      response.payload = result;
      response.msg = "success";
      return res.status(200).json(response);
    } else {
      let response = Response.error();
      response.msg = "No Publisher Found";
      response.error = ["no publisher found"];
      return res.status(200).json(response);
    }
  })
    .catch(err => {
      let response = Response.error();
      response.error = [err.message];
      response.msg = "Error while fetching publisher data!"
      return res.status(200).json(response);
    })
}

exports.getAllPublisherByNetwork = async (req, res) => {
  try {

    console.log("file: Publisher.js ~ line 977 ~ exports.getAllPublisherByNetwork= ~ req.body.search", req.body)
    if (req.body.search && req.body.search.network_id && mongooseObjectId.isValid(req.body.search.network_id)) {

      let filter = { "network_id": mongooseObjectId(req.body.search.network_id), status: "Active" };
      let projection = { "company": 1, "pid": 1, "_id": 1 }
      // let networkId = mongooseObjectId(req.body.search.network_id);

      console.log("file: Publisher.js ~ line 984 ~ exports.getAllPublisherByNetwork= ~ filter, projection", filter, projection)
      let dbResult = await findPubliserData(filter, projection)
      console.log("file: Publisher.js ~ line 984 ~ exports.getAllPublisherByNetwork= ~ dbResult", dbResult)
      if (dbResult && dbResult.length) {
        let response = Response.success();
        response.payloadType = payloadType.array;
        response.payload = dbResult;
        response.msg = "success";
        return res.status(200).json(response);
      }
    }

    let response = Response.error();
    response.msg = "Provide proper Network id. darwin"
    return res.status(200).json(response);

  } catch (error) {
    debug(error)
    let response = Response.error();
    response.error = [error.message];
    response.msg = "Error while fetching publisher data!"
    return res.status(200).json(response);
  }
}

///////////////////////////new functions//////////////////////////
exports.getPublisher = async (req, res) => {
  try {
    let publisherId = req.params.id.trim();
    let filter = {};
    if (mongooseObjectId.isValid(publisherId)) {
      filter = { _id: mongooseObjectId(publisherId) };
    } else if (+publisherId > 0) {
      filter = { pid: +publisherId };
    } else {
      let response = Response.error();
      response.error = ['publisher not found'];
      response.msg = 'Publisher not found.';
      return res.status(200).json(response);
    }
    let resultPublisher = await PublisherModel.getPublisher(filter, {}, {});
    if (resultPublisher && resultPublisher['_id']) {
      if (resultPublisher.account_manager && resultPublisher.account_manager.userId) {
        let resultUser = await UserModel.getUser({ _id: mongooseObjectId(resultPublisher.account_manager.userId) }, { profile_image: 1 }, {});
        if (resultUser && resultUser.profile_image) {
          resultPublisher['account_manager']['profile_image'] = resultUser.profile_image;
        }
      }
      let resultUser = await UserModel.getUser({ parent_id: mongooseObjectId(resultPublisher._id) }, { email: 1 }, {});
      if (resultUser) {
        resultPublisher['email'] = resultUser.email;
      }
      let response = Response.success();
      response.msg = 'Success';
      response.payload = resultPublisher;
      return res.status(200).json(response);
    } else {
      let response = Response.error();
      response.error = ['publisher not found'];
      response.msg = 'Publisher not found.';
      return res.status(200).json(response);
    }
  } catch (error) {
    debug(error);
    let response = Response.error();
    response.error = [error.message];
    response.msg = 'Something went wrong. Please try again later.';
    return res.status(200).json(response);
  }
}

exports.addPublisher = async (req, res) => {
  try {
    // check required field send by user or not
    let reqValidMsg = "";
    if (!req.body) reqValidMsg = "Send valid body.";
    if (!req.body.name) reqValidMsg = "Send valid name.";
    if (!req.body.company) reqValidMsg = "Send valid company name.";
    if (!req.body.email) reqValidMsg = "Send valid email.";
    if (!req.body.country) reqValidMsg = "Send valid country name.";
    if (!req.body.status) reqValidMsg = "Send valid status.";
    if (!req.body.phone) reqValidMsg = "Send valid phone number.";
    if (!req.body.accountManagerUserId) reqValidMsg = "Send valid Account manager user id.";
    if (!req.body.accountManagerEmail) reqValidMsg = "Send valid Account manager email.";
    if (!req.body.accountManagerName) reqValidMsg = "Send valid Account manager name.";

    if (reqValidMsg) {
      let response = Response.error();
      response.msg = reqValidMsg;
      return res.status(400).json(response);
    }

    // Check publisher company name exits or not
    let dbPubResult = await PublisherModel.getPublisher(
      { network_id: mongooseObjectId(req.user.userDetail.network[0]), company: req.body.company },
      { _id: 1 },
      {}
    );
    if (dbPubResult && dbPubResult['_id']) {
      let response = Response.error();
      response.msg = 'Company name already exists, try another.';
      return res.status(200).json(response);
    }

    // Check user email exits or not
    let dbUserResult = await UserModel.getUser(
      { network: mongooseObjectId(req.user.userDetail.network[0]), email: req.body.email },
      { _id: 1 },
      {}
    );
    if (dbUserResult && dbUserResult['_id']) {
      let response = Response.error();
      response.msg = 'Email already exists, try another.';
      return res.status(200).json(response);
    }

    // Only available field in inserted for new publisher
    const tempAddress = { "country": req.body.country };
    if (req.body.address) tempAddress['address'] = req.body.address;
    if (req.body.locality) tempAddress['locality'] = req.body.locality;
    if (req.body.city) tempAddress['city'] = req.body.city;
    if (req.body.pincode) tempAddress['pincode'] = req.body.pincode;
    if (req.body.state) tempAddress['state'] = req.body.state;

    const pubData = {
      network_id: mongooseObjectId(req.user.userDetail.network[0]),
      company: req.body.company,
      name: req.body.name,
      address: tempAddress,
      status: req.body.status,
      phone: req.body.phone,
      skype_id: req.body.skypeId,
      account_manager: {
        'userId': req.body.accountManagerUserId,
        'email': req.body.accountManagerEmail,
        'name': req.body.accountManagerName,
        'phone': req.body.accountManagerPhone,
        'skypeId': req.body.accountManagerSkypeId
      },
      // fD:{
      //     'aN':req.body.financeDetailsAccountN ||'',
      //     'aNumber':req.body.financeDetailsAccountNumber ||'',
      //     'bN':req.body.financeDetailsBN ||'',
      //     'ifcs':req.body.financeDetailsIfcs|| '',
      //     'ppId':req.body.financeDetailsPPId||'',
      //     'payoneerId':req.body.financeDetailspayoneerId||'',
      //     'wc':req.body.financeWiredCode||'',
      //     "rT":req.body.financeDetailsRouting||'',
      //     "aType":req.body.financeDetailsAccountType||'',
      //     'addr':req.body.financeDetailsAddress||'',
      //     'mob':req.body.financeDetailsContact ||'',

      // }
    }
    if (req.files && req.files.length) pubData['company_logo'] = req.files[0].path;
    if (req.body.website) pubData['website'] = req.body.website;
    if (req.body.cutPercentage) pubData['cut_percentage'] = req.body.cutPercentage;
    if(req.body.payCal) pubData['payCal']=req.body.payCal
     // create new publisher
    let newPubData = await new PublisherModel(pubData).save();
    if (!newPubData || !newPubData['_id']) {
      let response = Response.error();
      response.msg = 'Something went wrong. Please try again later1.';
      return res.status(500).json(response);
    }

    // getting permissions for publisher admin
    let pubAdminRole = await rolesObj.getRole(
      { name: 'affiliate_admin' },
      { _id: 1, permissions: 1 },
      {}
    );
    if (!pubAdminRole || !pubAdminRole['_id']) {
      let response = Response.error();
      response.msg = 'Something went wrong. Please try again later2.';
      return res.status(500).json(response);
    }

    // Only available field in inserted for new user
    const userData = {
      first_name: req.body.name,
      email: req.body.email,
      network: [mongooseObjectId(req.user.userDetail.network[0])],
      phone: req.body.phone,
      skype_id: req.body.skypeId,
      password: bcrypt.hashSync(req.body.password, bcrypt.genSaltSync(10)),
      status_label: 'active',
      status: '2',
      roles: {
        network_id: mongooseObjectId(req.user.userDetail.network[0]),
        role: 'affiliate_admin',
        role_id: mongooseObjectId(pubAdminRole['_id']),
        permissions: pubAdminRole['permissions']
      },
      user_category_label: 'publisher',
      user_category: +config['USER_CATEGORY']['publisher']['value'],
      user_type: ['publisher'],
      parent_id: mongooseObjectId(newPubData['_id']),
      country: req.body.country,
      first_login_ip: requestIp.getClientIp(req),
      last_login_ip: requestIp.getClientIp(req),
      isPublisher: true,
      publisher: [{ id: mongooseObjectId(newPubData['_id']), name: req.body.company }],
      last_login: Moment().format()
    }

    // create new user
    await new UserModel(userData).save();

    // assign new publisher to exiting account manager in redis
    try {
      let redisData = await Redis.getRedisHashData('users', req.body.accountManagerEmail);
      if (!redisData['error'] && redisData['data']) {
        let index = redisData['data']['publisher'].findIndex(x => x.id === req.body.accountManagerUserId);
        if (index == -1) {
          redisData['data']['publisher'].push({
            name: newPubData['company'],
            id: newPubData['account_manager']['userId']
          });
          redisData['data']['isPublisher'] = true
        }
        Redis.setRedisHashData('users', req.body.accountManagerEmail, redisData['data'], process.env.REDIS_Exp);
      }
    } catch (error) {
      debug(error);
    }

    let response = Response.success();
    response.msg = "New publisher added successfully.";
    response.payload = { _id: newPubData['_id'], name: newPubData['name'] };
    return res.status(200).json(response);
  } catch (error) {
    debug(error);
    let response = Response.error();
    response.msg = 'Something went wrong. Please try again later3.';
    return res.status(500).json(response);
  }
}

exports.updatePublisher = async (req, res) => {
  try {
    // check required data
    let reqInvalidMsg = "";
    if (!req.params.id || !mongooseObjectId.isValid(req.params.id)) reqInvalidMsg = 'Send valid publisher id';
    if (req.body.accountManagerUserId) {
      if (!mongooseObjectId(req.body.accountManagerUserId)) reqInvalidMsg = 'Send valid account manager user id';
      if (!req.body.accountManagerEmail) reqInvalidMsg = 'Send valid account manager email';
      if (!req.body.accountManagerName) reqInvalidMsg = 'Send valid account manager name';
    }
    if (reqInvalidMsg) {
      let response = Response.error();
      response.msg = 'Send valid publisher id';
      return res.status(400).json(response);
    }

    let publisherId = req.params.id.trim();

    // Only available field in inserted for update publisher
    let pubData = {};
    if (req.files && req.files.length) pubData['company_logo'] = req.files[0].path;
    if (req.body.name) pubData['name'] = req.body.name;
    if (req.body.company) pubData['company'] = req.body.company;
    if (req.body.phone) pubData['phone'] = req.body.phone;
    if (req.body.cutPercentage) pubData['cut_percentage'] = +req.body.cutPercentage;
    if (req.body.status) pubData['status'] = req.body.status;
    if (req.body.website) pubData['website'] = req.body.website;
    if (req.body.skypeId) pubData['skype_id'] = req.body.skypeId;
    if (req.body.address) pubData['address.address'] = req.body.address;
    if (req.body.locality) pubData['address.locality'] = req.body.locality;
    if (req.body.city) pubData['address.city'] = req.body.city;
    if (req.body.pincode) pubData['address.pincode'] = req.body.pincode;
    if (req.body.state) pubData['address.state'] = req.body.state;
    if (req.body.country) pubData['address.country'] = req.body.country;
    if(req.body.pol) pubData['pol'] = +req.body.pol ;
    if(req.body.ofr_type) pubData['ofr_type'] = req.body.ofr_type ; 
    if (req.body.accountManagerUserId) {
      pubData['account_manager'] = {
        userId: mongooseObjectId(req.body.accountManagerUserId),
        email: req.body.accountManagerEmail,
        name: req.body.accountManagerName,
        phone: req.body.accountManagerPhone || "",
        skypeId: req.body.accountManagerSkypeId || ""
      };
    }

    if(req.body.payCal)
      {
       pubData['payCal']= req.body.payCal ;
      }
    // update exiting publisher data
    let dbPubResult = await PublisherModel.findAndUpdatePublisher(
      { _id: mongooseObjectId(publisherId) },
      pubData,
      { new: true }
    );

    if (!dbPubResult) {
      let response = Response.error();
      response.msg = "Publisher not found.";
      return res.status(200).json(response);
    }
    Redis.delRedisHashData('publisher', dbPubResult['pid'].toString());

    // Only available field in inserted for update user
    let userData = {};
    if (req.body.password) userData['password'] = bcrypt.hashSync(req.body.password, bcrypt.genSaltSync(10));
    if (req.body.name) userData['first_name'] = req.body.name;
    if (req.body.phone) userData['phone'] = req.body.phone;
    if (req.body.skypeId) userData['skype_id'] = req.body.skypeId;
    if (req.body.email) userData['email'] = req.body.email;

    // update user
    if (Object.keys(userData).length) {
      await UserModel.updateUser(
        { parent_id: mongooseObjectId(publisherId) },
        userData,
        {}
      );
    }

    // remove publisher from prev account manager
    try {
      let currentAccountManager = req.body.currentAccountManager ? JSON.parse(req.body.currentAccountManager) : {};
      if (currentAccountManager['id'] && mongooseObjectId.isValid(currentAccountManager['id'])) {
        await UserModel.updateUser(
          { _id: mongooseObjectId(currentAccountManager['id']) },
          { $pull: { publisher: { id: dbPubResult['_id'] } } },
          {}
        );
      }
      if (currentAccountManager['email'] && currentAccountManager['email'].trim()) {
        let redisData = await Redis.getRedisHashData('users', currentAccountManager['email'].trim());
        if (!redisData['error'] && redisData['data'] && redisData['data']['publisher']) {
          let index = redisData['data']['publisher'].findIndex(x => x.id == dbPubResult['_id']);
          if (index >= 0) redisData['data']['publisher'].splice(index, 1);
          if (redisData['data']['publisher'].length == 0) redisData['data']['isPublisher'] = false;
          Redis.setRedisHashData('users', currentAccountManager['email'].trim(), redisData['data'], process.env.REDIS_Exp);
        }
      }
    } catch (error) {
      debug(error);
    }

    // add publisher into new account manager and also add in redis
    try {
      if (pubData['account_manager'] && pubData['account_manager']['userId'] && pubData['account_manager']['email']) {
        await UserModel.updateUser(
          { _id: pubData['account_manager']['userId'] },
          { isPublisher: true, $push: { publisher: { id: mongooseObjectId(dbPubResult['_id']), name: dbPubResult['company'] } } },
          {}
        );
        let redisData = await Redis.getRedisHashData('users', pubData['account_manager']['email']);
        if (!redisData['error'] && redisData['data'] && redisData['data']['publisher']) {
          let index = redisData['data']['publisher'].findIndex(x => x.id == dbPubResult['_id']);
          if (index < 0) redisData['data']['publisher'].push({ id: dbPubResult['_id'], name: dbPubResult['company'] });
          if (redisData['data']['publisher'].length > 0) redisData['data']['isPublisher'] = true;
          Redis.setRedisHashData('users', pubData['account_manager']['email'], redisData['data'], process.env.REDIS_Exp);
        }
      }
    } catch (error) {
      debug(error);
    }

    if (pubData['company']) {
      await UserModel.updateUsers(
        { "publisher.id": mongooseObjectId(publisherId) },
        { '$set': { 'publisher.$.name': pubData['company'] } },
        {}
      );
    }

    let response = Response.success();
    response.msg = "Publisher updated successfully.";
    response.payload = { _id: dbPubResult['_id'], name: dbPubResult['name'] };
    return res.status(200).json(response);
  } catch (error) {
    debug(error);
    let response = Response.error();
    response.error = [error.message];
    response.msg = 'Something went wrong. Please try again later.';
    return res.status(200).json(response);
  }
};

exports.updatePublisherAutoApprove = async (req, res) => {
  try {
    let publisherId = req.params.id.trim();
    let filterPublisher = {};
    let updatePublisher = {
      appr_adv_opt: '',
      appr_adv: []
    };
    if (publisherId && mongooseObjectId.isValid(publisherId)) {
      filterPublisher['_id'] = mongooseObjectId(publisherId);
    } else {
      let response = Response.error();
      response.error = ["publisher not found."];
      response.msg = "Publisher not found.";
      return res.status(200).json(response);
    }

    if (req.body.option) {
      let apprAdvOpt = Object.keys(config.APPROVE_ADVERTISER_OPTIONS);
      if (apprAdvOpt.includes(req.body.option)) {
        updatePublisher['appr_adv_opt'] = +req.body.option;
      } else {
        let response = Response.error();
        response.error = ['invalid auto approve option'];
        response.msg = 'Invalid auto approve option.';
        return res.status(200).json(response);
      }
    }

    if (req.body.advertisers && req.body.advertisers.length) {
      updatePublisher['appr_adv'] = req.body.advertisers;
    }

    let result = await PublisherModel.findAndUpdatePublisher(filterPublisher, updatePublisher, {});

    let response = Response.success();
    response.msg = "Publisher updated successfully.";
    response.payload = result;
    return res.status(200).json(response);
  } catch (error) {
    debug(error);
    let response = Response.error();
    response.error = [error.message];
    response.msg = 'Something went wrong. Please try again later.';
    return res.status(200).json(response);
  }
}

exports.deActivatePublisher=async(req,res)=>{
  try {
    console.log("req.params--",req.params)
    if(!req.params.id || !mongooseObjectId.isValid(req.params.id)) {
          let response = Response.error();
          response.msg = "Invalid advertiser id.";
          return res.status(400).json(response);
    }
  
    let respub=await PublisherModel.findAndUpdatePublisher({_id:mongooseObjectId(req.params.id)},{status:'InActive'})
    if(respub){
      let response = Response.success();
      response.msg = "Publisher deactivated success.";
      return res.status(200).json(response);
    }
    let response=Response.error();
     response.message='Publisher not found';
     return res.status(201).json(response);

  } catch (error) {
     console.log(error);
        let response = Response.error();
        response.msg = "Server internal error!";
        return res.status(500).json(response);
  }
}

exports.register=async(req,res)=>{
  try {
    // console.log("req.body--",req.body)
    // check required field send by user or not
    let reqValidMsg = "";
    if (!req.body) reqValidMsg = "Send valid body.";
    if (!req.body.name) reqValidMsg = "Send valid name.";
    if (!req.body.company) reqValidMsg = "Send valid company name.";
    if (!req.body.email) reqValidMsg = "Send valid email.";
    if (!req.body.country) reqValidMsg = "Send valid country name.";
    if (!req.body.phone) reqValidMsg = "Send valid phone number.";
    if (reqValidMsg) {
      let response = Response.error();
      response.msg = reqValidMsg;
      return res.status(400).json(response);
    }

    // Check publisher company name exits or not
    let dbPubResult = await Publisherv2.getPublisher(
      {company: req.body.company },
      { _id: 1 },
      {}
    );
    if (dbPubResult && dbPubResult['_id']) {
      let response = Response.error();
      response.msg = 'Company name already exists, try another.';
      return res.status(200).json(response);
    }
     // validate domain and get network
    //  console.log("req.header.origin",req.headers.origin)
     let domain = Function.parseUrl(req.headers.origin);
    //  console.log("aomain--",domain)
     let netDbResult = await handelingDomainModel.findOneDomainData({ domain:domain},{N_id: 1 } )
     if (!netDbResult) {
       let response = Response.error();
       response.msg = "Your domain is invalid!"
       return res.status(400).json(response);
     }
     let networkId = netDbResult['N_id'];
 

    // Only available field in inserted for new publisher
    const tempAddress = { };
     if(req.body.country) tempAddress["country"] = req.body.country
    if (req.body.address) tempAddress['address'] = req.body.address;
    if (req.body.locality) tempAddress['locality'] = req.body.locality;
    if (req.body.city) tempAddress['city'] = req.body.city;
    if (req.body.pincode) tempAddress['pincode'] = req.body.pincode;
    if (req.body.state) tempAddress['state'] = req.body.state;

    const pubData = {
      network_id: mongooseObjectId(networkId),
      company: req.body.company,
      name: req.body.name,
      address: tempAddress,
      status: req.body.status,
      phone: req.body.phone,
      // skype_id: req.body.skypeId,
    }
    if (req.files && req.files.length) pubData['company_logo'] = req.files[0].path;
    if (req.body.website) pubData['website'] = req.body.website;
     // create new publisher
    let newPubData = await new Publisherv2(pubData).save();
    if (!newPubData || !newPubData['_id']) {
      let response = Response.error();
      response.msg = 'Something went wrong. Please try again later1.';
      return res.status(500).json(response);
    }

    let response = Response.success();
    response.msg = "registered successfully, waiting for Approval";
    response.payload = { _id: newPubData['_id'], name: newPubData['name'] };
    return res.status(200).json(response);
  } catch (error) {
    debug(error);
    let response = Response.error();
    response.msg = 'Something went wrong. Please try again later3.';
    return res.status(500).json(response);
  }
}
exports.activatePublisher=async(req,res)=>{
  try {
    console.log("req.params--",req.params)
    if(!req.params.id || !mongooseObjectId.isValid(req.params.id)) {
          let response = Response.error();
          response.msg = "Invalid advertiser id.";
          return res.status(400).json(response);
    }
  
    let respub=await PublisherModel.findAndUpdatePublisher({_id:mongooseObjectId(req.params.id)},{status:'Active'})
    if(respub){
      let response = Response.success();
      response.msg = "Publisher activated success.";
      return res.status(200).json(response);
    }
    let response=Response.error();
     response.message='Publisher not found';
     return res.status(201).json(response);

  } catch (error) {
     console.log(error);
        let response = Response.error();
        response.msg = "Server internal error!";
        return res.status(500).json(response);
  }
}


exports.UpdateFinancial=async(req,res)=>{

  try {
     console.log("req.body--",req.body)
      let reqInvalidMsg = "";
    if (!req.params.id || !mongooseObjectId.isValid(req.params.id)) reqInvalidMsg = 'Send valid publisher id';

 if (reqInvalidMsg) {
      let response = Response.error();
      response.msg = 'Send valid publisher id';
      return res.status(400).json(response);
    }

    let publisherId = req.params.id.trim();
    let pubData={};

    if(req.body.financeDetailsAccountN) pubData['fD.aN']=req.body.financeDetailsAccountN;
    if(req.body.financeDetailsBN) pubData['fD.bN']=req.body.financeDetailsBN;
    if(req.body.financeDetailsIfcs) pubData['fD.ifcs']=req.body.financeDetailsIfcs;
    if(req.body.financeDetailsPPId) pubData['fD.ppId']=req.body.financeDetailsPPId;
    if(req.body.financeDetailspayoneerId) pubData['fD.payoneerId']=req.body.financeDetailspayoneerId;
    if(req.body.financeDetailsRouting) pubData['fD.rT']=req.body.financeDetailsRouting;
    if(req.body.financeDetailsAccountType) pubData['fD.aType']=req.body.financeDetailsAccountType;
    if(req.body.financeDetailsContact) pubData['fD.mob']=req.body.financeDetailsContact;
    if(req.body.financeDetailsAddress) pubData['fD.addr']=req.body.financeDetailsAddress;
    if(req.body.financeDetailsAccountNumber) pubData['fD.aNumber']=req.body.financeDetailsAccountNumber;
     if(req.body.financeWiredCode) pubData['fD.wc']=req.body.financeWiredCode;
   
   let dbPubResult = await PublisherModel.findAndUpdatePublisher(
      { _id: mongooseObjectId(publisherId) },
      pubData,
      { new: true }
    );

    if (!dbPubResult) {
      let response = Response.error();
      response.msg = "Publisher not found.";
      return res.status(200).json(response);
    }

     let response = Response.success();
    response.msg = "Publisher updated successfully.";
    response.payload = { _id: dbPubResult['_id'], name: dbPubResult['name'] };
    return res.status(200).json(response);
    
  } catch (error) {
    console.log("err==>",error)

    let response=Response.error();
    response.msg='Internal server error';
    response.error=[error.message];
    return res.status(200).json(response);
  }
}