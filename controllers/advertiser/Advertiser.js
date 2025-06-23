const Mongoose = require('mongoose');
const debug = require("debug")("darwin:Controller:Advertiser");
const mongooseObjectId = Mongoose.Types.ObjectId;
const AdvertiserModel = require('../../db//advertiser/Advertiser');
const User = require('../../db/user/User');
const Response = require('../../helpers/Response');
const NetworkModel = require('../../db/network/Network');
const InviteModel = require('../../db/Invite/InviteLink')
const { payloadType } = require('../../constants/config');
const UserModel = require("../../db/user/User");
const { SourceAdvertiserAffiliateSummaryModel } = require('../../db/click/sourceSummary/sourceSummary');
const Functions = require("../../helpers/Functions");
const Redis = require('../../helpers/Redis')
const rolesObj = require('../../db/Roles');
const requestIp = require('request-ip');
const { config } = require('../../constants/Global');
const { PlatformModel } = require('../../db/platform/Platform');
var Moment = require('moment');
const bcrypt = require("bcryptjs");

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

exports.getAllAdvertiser = async (req, res) => {
  try {
    let search = { 'network_id': mongooseObjectId(req.user.userDetail.network[0]) };
    let projection = {};
    let options = { limit: 10, updatedAt: -1 };

    if (req.user_category == 'advertiser') {
      search["_id"] = req.user.userDetail.parentId;
    } else if (req.user_category == 'network') {
      if (req.loginType == 'advertiser') {
        search["_id"] = req.loginId;
      } else {
        if (!req.permissions.includes("adv.list")) {
          let advId = req.advertiser.map(data => data.id);
          search["_id"] = { $in: advId };
        }
      }
    }

    if (req.body.search.company !== undefined && req.body.search.company !== '') search['company'] = { $regex: req.body.search.company.trim(), $options: 'i' };
    if(req.body.search.aid!== undefined && req.body.search.aid !== '') search['aid'] =  +req.body.search.aid;
    if (req.body.search.account_manager !== undefined && req.body.search.account_manager !== '') search['account_manager.name'] = { $regex: req.body.search.account_manager.trim(), $options: 'i' };
    if (req.body.search.status) search['status'] = req.body.search.status;
    if (req.body.search.status == 'Live' && req.body.search.dateRange) {
      let filteredData = await SourceAdvertiserAffiliateSummaryModel.fetchDailySummary(
        { 'network_id': mongooseObjectId(req.user.userDetail.network[0]), 'timeSlot': getDateRange(req.body.search.dateRange) },    // filter
        { _id: null, advertiser_id: { $addToSet: '$advertiser_id' } }   // group
      );
      if (!filteredData || !filteredData[0] || !filteredData[0]['advertiser_id'].length) {
        let response = Response.error();
        response.msg = "No Advertiser Found";
        return res.status(204).json(response);
      }
      delete search['status'];
      search['_id'] = { $in: filteredData[0]['advertiser_id'] };
    }
    if (req.body.options !== undefined && req.body.options != {}) {
      if (req.body.options.limit !== undefined && req.body.options.limit != 0) {
        options['limit'] = req.body.options.limit;
        if (req.body.options.page !== undefined && req.body.options.page != 0)
          options['skip'] = (req.body.options.page - 1) * req.body.options.limit;
      }
    }

    let advData = await AdvertiserModel.getAdvertiser(search, projection, options);
    if (!advData || !advData.length) {
      let response = Response.error();
      response.msg = "No Advertiser Found";
      return res.status(204).json(response);
    }

    let response = Response.success();
    response.msg = "success";
    response.payloadType = payloadType.object;
    response.payload = {
      'totaladvertiser': advData.length,
      'result': advData,
      'pageSize': req.body.options.limit,
      'page': req.body.options.page,
    }

    if (req.body.options.limit == advData.length) {
      try {
        let advCount = await AdvertiserModel.getTotalPagesCount(search);
        if (advCount) response.payload['totaladvertiser'] = advCount;
      } catch (error) { }
    }
    return res.status(200).json(response);
  } catch (error) {
    console.log(error);
    let response = Response.error();
    response.msg = "Server internal error!"
    return res.status(200).json(response);
  }
}

exports.getAllAdvertiserName = (req, res) => {
  filter = {
    network_id: mongooseObjectId(req.user.userDetail.network[0])
  }
  projection = {
    _id: 1,
    company: 1,
    aid: 1
  }

  AdvertiserModel.getAdvertiserName(filter, projection)
    .then(result => {
      let response = Response.success();
      response.payloadType = payloadType.array;
      response.payload = result
      if (result.length == 0) {
        let response = Response.error();
        response.msg = "No Advertiser List Found...!!";
        response.error = ["no Advertiser List found"];
        response.payloadType = {}
        response.payload = result
        return res.status(200).json(response);
      } else if (result.length > 0) {
        response.msg = " Data Found "
      } else {
        response.msg = " Data Not Found "
      }
      // debug(response);
      return res.status(200).json(response);
    })
    .catch(err => {
      let response = Response.error();
      response.error = [err.message];
      response.msg = " error while  saving "
      // debug(response);
      return res.status(200).json(response);
    })
}

exports.getActiveAdvertiserName = async (req, res) => {
  try {
    let filter = { network_id: mongooseObjectId(req.user.userDetail.network[0]), status: "Active" };
    let projection = { _id: 1, company: 1, aid: 1 };
    let result = await AdvertiserModel.getAdvertiserName(filter, projection);
    let response = Response.success();
    response.payload = result;
    response.payloadType = payloadType.array;
    response.msg = "success";
    return res.status(200).send(response);
  } catch (error) {
    debug(error);
    let response = Response.error();
    response.error = error.message;
    response.msg = 'No Record Found!';
    return res.status(200).json(response);
  }
}

exports.getAllManager = async (req, res) => {

  try {

    let resResult = { 'advertiserList': null, 'managerList': null }

    filter = {
      'network': req.user.userDetail.network,
      'user_type': 'network_user',
      'roles.role': {
        $in: ['advertiser_admin', 'advertiser_manager', 'network_owner', 'network_admin', 'network_manager']
      }
    }
    projection = { 'first_name': 1, 'last_name': 1, 'email': 1, 'phone': 1, 'skype_id': 1, '_id': 1 }

    let result = await User.getUsers(filter, projection)
    if (result) {
      resResult['managerList'] = result;
    }

    result = await AdvertiserModel.getAdvertiser({ 'network_id': req.user.userDetail.network }, { slug: 1, _id: 1 })
    if (result) {
      resResult['advertiserList'] = result;
    }


    let response = Response.success();
    response.payloadType = payloadType.object;
    response.payload = resResult
    return res.status(200).json(response);

  } catch (err) {
    let response = Response.error();
    response.error = [err.message];
    response.msg = "Error Occurred"
    return res.status(200).json(response);
  }
}
exports.roles = async () => {
  query = {
    name: 'advertiser_admin'
  };
  data = {};
  roles = await rolesObj.isRoleExists(query, data);
  if (roles) {
    return roles;
  } else {
    return null;
  }
}

exports.saveUser = (user) => {
  user.save();
}


exports.saveAdvertiser = async (req, res) => {
  const clientIp = requestIp.getClientIp(req);
  let parameters = [];
  if (req.body.parameters) {
    parameters = Functions.trimArray(JSON.parse(req.body.parameters));
  }
  let keys = ['param', 'value'];
  let queryParams = '';
  for (let key of parameters) {
    test = Functions.obsKeysToString(key, keys, '={')
    queryParams = queryParams + test
  }
  parameters = queryParams.substring(0, queryParams.length - 1);
  if (parameters == "}") {
    parameters = "";
  }
  let advFilter = {
    company: req.body.company,
    network_id: req.user.userDetail.network[0]
  }
  let usrFilter = {
    email: req.body.email,
    network: req.user.userDetail.network[0]
  }

  advResult = await AdvertiserModel.getAdvertiser(advFilter);
  usrResult = await UserModel.getUsers(usrFilter);
  if ((advResult && advResult.length) || (usrResult && usrResult.length)) {
    let response = Response.error();
    response.msg = "exists"
    return res.status(200).json(response);
  }
  let companyLogo = '';
  if (req.files && req.files.length) {
    companyLogo = req.files[0].path;
  }
  let Advertisers = {
    'billing_address': "",
    'email': req.body.email,
    'skypeId': req.body.skypeId || '',
    'network_id': req.user.userDetail.network[0],
    'name': req.body.name,
    'company': req.body.company,
    'company_logo': companyLogo,
    'address': {
      'address': req.body.address || '',
      'locality': req.body.locality || '',
      'city': req.body.city || '',
      'state': req.body.state || '',
      'pincode': req.body.pincode || '',
      'country': req.body.country || ''
    },
    'phone': req.body.phone,
    'status': req.body.status,
    'account_manager': {
      'name': req.body.accountManagerName || '',
      'email': req.body.accountManagerEmail || '',
      'userId': mongooseObjectId(req.body.accountManagerUserId),
      'phone': req.body.accountManagerPhone || '',
      'skypeId': req.body.accountManagerSkypeId || ''
    },
    'parameters': parameters,
    'slug': req.body.company.trim().replace(/\s/g, ''),
    'financeDetails': {
      'firstName': req.body.financeDetailsFirstName || '',
      'lastName': req.body.financeDetailsLastName || '',
      'email': req.body.financeDetailsEmail || '',
      'phone': req.body.financeDetailsPhone || '',
      'skypeId': req.body.financeDetailsSkypeId || '',
      'address': req.body.financeDetailsAddress || '',
      'locality': req.body.financeDetailsLocality || '',
      'city': req.body.financeDetailsCity || '',
      'pincode': req.body.financeDetailsPincode || '',
      'state': req.body.financeDetailsState || '',
      'country': req.body.financeDetailsCountry || '',
      'gstin':req.body.gstin ||'',
    },
    'payCal':req.body.payCal,
    'comments' :  req.body.comments
  }

  AdvertiserModel.saveAdvertiser(Advertisers).then(async result => {
    roles = await this.roles();
    if (!roles) {
      let response = Response.error();
      response.msg = " error while  getting roles "
      response.error = ["Roles not available"];
      return res.status(200).json(response);
    }
    var salt = bcrypt.genSaltSync(10);
    let hash = bcrypt.hashSync(req.body.password, salt);
    let user = new User({
      first_name: req.body.name,
      last_name: "",
      gender: '',
      email: req.body.email,
      network: [Mongoose.Types.ObjectId(req.user.userDetail.network[0])],
      phone: req.body.phone,
      password: hash,
      status_label: 'default',
      status: '0',
      user_category_label: 'advertiser',
      user_category: config['USER_CATEGORY']['advertiser']['value'],
      user_type: ['advertiser'],
      parent_id: result._id,
      country: req.body.country,
      skype_id: '',
      roles: {
        network_id: Mongoose.Types.ObjectId(req.user.userDetail.network[0]),
        role: 'advertiser_admin',
        role_id: Mongoose.Types.ObjectId(roles[0]._id),
        permissions: roles[0].permissions
      },
      first_login_ip: clientIp,
      last_login_ip: clientIp,
      reset_password_token: '',
      reset_password_required: '',//number   
      rest_password_at: '',//date           
      reset_password_ip: '',
      last_login: Moment().format(),//date  
    });
    this.saveUser(user);
    // let response = Response.success();
    // response.payloadType = payloadType.array;
    // response.msg = "success"
    // debug(response);
    // return res.status(200).json(response);
    filter = { _id: req.body.accountManagerUserId, network: mongooseObjectId(req.user.userDetail.network[0]) }
    query = { isAdvertiser: true, $push: { advertiser: { id: result._id, name: req.body.company } } };
    User.updateUser(filter, query).then(results => {
      let response = Response.success();
      response.payloadType = payloadType.object;
      response.msg = "success"
      response.payload = { id: result._id, name: result.name };
      // debug(response);
      return res.status(200).json(response);
    }).catch(err => {
      let response = Response.error();
      response.msg = " error while  saving "
      response.error = [err.message];
      return res.status(200).json(response);
    })
  })
    .catch(err => {
      console.log(err);
      let response = Response.error();
      response.msg = " error while  saving "
      response.error = [err.message];
      return res.status(200).json(response);
    })
}

exports.saveExternalAdvertiser = async (req, res) => {
  let networkId = null;
  let account_manager = {}
  let AdvertiserStatus = 'InActive'
  let filter = { hash: encodeURIComponent(req.query.token) };
  let domain_filter = { network_unique_id: req.query.token };
  try {
    result = await InviteModel.matchHash(filter);
    if (result.length == 0) {
      result = await NetworkModel.isNetworkExist(domain_filter, { _id: 1 })
      networkId = result[0]._id
    }
    if (!result.length) {
      let response = Response.error();
      response.msg = " Network Id not Found "
      return res.status(200).json(response);
    }
    if (networkId == null) {
      networkId = result[0].network_id
    }
  } catch (err) {
    let response = Response.error();
    response.msg = " something went wrong "
    response.error = [err.message]
    return res.status(200).json(response);
  }
  let advFilter = {
    network_id: networkId,
    company: req.body.companyName
  }
  let usrFilter = {
    network: networkId,
    email: req.body.email
  }
  let advResult = await AdvertiserModel.getAdvertiser(advFilter);
  let usrResult = await UserModel.getUsers(usrFilter);
  if ((advResult && advResult.length) || (usrResult && usrResult.length)) {
    let response = Response.error();
    response.msg = "exits"
    return res.status(200).json(response);
  }
  let Advertisers = {
    'billing_address': "",
    'email': req.body.email,
    'skypeId': req.body.skypeId,
    'network_id': networkId,
    'name': req.body.advertiserName,
    'company': req.body.companyName,
    'address': {
      'address': req.body.address,
      'locality': req.body.locality,
      'city': req.body.city,
      'state': req.body.state,
      'pincode': req.body.pincode,
      'country': req.body.country
    },
    'phone': req.body.advertiserPhone,
    'status': AdvertiserStatus,
    'account_manager': account_manager,
    'slug': req.body.companyName.trim().replace(/\s/g, '')
    // 'parameters': parameters,
  }
  AdvertiserModel.saveAdvertiser(Advertisers).then(async result => {
    roles = await this.roles();
    if (!roles) {
      let response = Response.error();
      response.msg = " error while  getting roles "
      response.error = ["Roles not available"];
      return res.status(200).json(response);
    }
    var salt = bcrypt.genSaltSync(10);
    let hash = bcrypt.hashSync(req.body.password, salt);
    let user = new User({
      first_name: req.body.advertiserName,
      last_name: "",
      gender: '',
      email: req.body.email,
      network: networkId,
      phone: req.body.advertiserPhone,
      password: hash,
      status_label: 'default',
      status: '0',
      user_category_label: 'advertiser',
      user_category: config['USER_CATEGORY']['advertiser']['value'],
      user_type: ['advertiser'],
      parent_id: result._id,
      country: req.body.country,
      skype_id: '',
      roles: {
        network_id: Mongoose.Types.ObjectId(networkId),
        role: 'advertiser_admin',
        role_id: Mongoose.Types.ObjectId(roles[0]._id),
        permissions: roles[0].permissions
      },
      first_login_ip: clientIp,
      last_login_ip: clientIp,
      reset_password_token: '',
      reset_password_required: '', //number   
      rest_password_at: '', //date           
      reset_password_ip: '',
      last_login: Moment().format(), //date  
    });
    this.saveUser(user);

    let response = Response.success();
    response.payloadType = payloadType.object;
    response.msg = "success";
    response.payload = []
    await InviteModel.deleteData(filter);
    return res.status(200).json(response);
  })
    .catch(err => {
      let response = Response.error();
      response.msg = " error while  saving "
      response.error = [err.message];
      return res.status(200).json(response);
    })

  const clientIp = requestIp.getClientIp(req);
  parameters = Functions.trimArray(JSON.parse(req.body.parameters));
  var keys = ['parameter', 'val'];
  queryParams = '';
  for (let key of parameters) {
    test = Functions.obsKeysToString(key, keys, '={')
    queryParams = queryParams + test
  }
  parameters = queryParams.substring(0, queryParams.length - 1);
  if (parameters == "}") {
    parameters = "";
  }

}


exports.getAdvertiserDetails = async (req, res) => {

  try {
    if (!req.params.id || !mongooseObjectId.isValid(req.params.id)) {
      let response = Response.error();
      response.msg = "Advertiser id is not correct.";
      return res.status(400).json(response);
    }

    let resAdv = await AdvertiserModel.getAdvertiser(
      { _id: mongooseObjectId(req.params.id), network_id: mongooseObjectId(req.user.userDetail.network[0]) },
      {}
    );

    if (resAdv && resAdv.length) {
      let resultUser = await UserModel.getUser({ parent_id: mongooseObjectId(resAdv[0]._id) }, { email: 1 }, {});
      if (resultUser) {
        resAdv['email'] = resultUser.email;
      }
      let response = Response.success();
      response.payloadType = payloadType.array;
      response.payload = resAdv;
      response.msg = "success"
      return res.status(200).json(response);
    } else {
      let response = Response.error();
      response.msg = " Data Not Found "
      return res.status(200).json(response);
    }
  } catch (error) {
    let response = Response.error();
    response.msg = "Something went wrong!"
    return res.status(500).json(response);
  }
}

exports.updateAdvertiser = async (req, res) => {

  try {
    if (!req.params.id || !mongooseObjectId.isValid(req.params.id)) {
      let response = Response.error();
      response.msg = "Advertiser id is not correct.";
      return res.status(400).json(response);
    }

    let reqData = {};
    console.log(req.body);
    if (req.body.skypeId) reqData['skypeId'] = req.body.skypeId;
    if (req.body.name) reqData['name'] = req.body.name;
    if (req.body.phone) reqData['phone'] = req.body.phone;
    if (req.body.status) reqData['status'] = req.body.status;
    if (req.files && req.files.length) reqData['company_logo'] = req.files[0].path;
    if (req.body.password) reqData['password'] = bcrypt.hashSync(req.body.password, bcrypt.genSaltSync(10));

    if (req.body.address) reqData['address.address'] = req.body.address;
    if (req.body.locality) reqData['address.locality'] = req.body.locality;
    if (req.body.city) reqData['address.city'] = req.body.city;
    if (req.body.state) reqData['address.state'] = req.body.state;
    if (req.body.pincode) reqData['address.pincode'] = req.body.pincode;
    if (req.body.country) reqData['address.country'] = req.body.country;

    if (req.body.accountManagerName) reqData['account_manager.name'] = req.body.accountManagerName;
    if (req.body.accountManagerEmail) reqData['account_manager.email'] = req.body.accountManagerEmail;
    if (req.body.accountManagerUserId) reqData['account_manager.userId'] = mongooseObjectId(req.body.accountManagerUserId);
    if (req.body.accountManagerPhone) reqData['account_manager.phone'] = req.body.accountManagerPhone;
    if (req.body.accountManagerSkypeId) reqData['account_manager.skypeId'] = req.body.accountManagerSkypeId;

    if (req.body.financeDetailsFirstName) reqData['financeDetails.firstName'] = req.body.financeDetailsFirstName;
    if (req.body.financeDetailsLastName) reqData['financeDetails.lastName'] = req.body.financeDetailsLastName;
    if (req.body.financeDetailsEmail) reqData['financeDetails.email'] = req.body.financeDetailsEmail;
    if (req.body.financeDetailsPhone) reqData['financeDetails.phone'] = req.body.financeDetailsPhone;
    if (req.body.financeDetailsSkypeId) reqData['financeDetails.skypeId'] = req.body.financeDetailsSkypeId;
    if (req.body.financeDetailsAddress) reqData['financeDetails.address'] = req.body.financeDetailsAddress;
    if (req.body.financeDetailsLocality) reqData['financeDetails.locality'] = req.body.financeDetailsLocality;
    if (req.body.financeDetailsCity) reqData['financeDetails.city'] = req.body.financeDetailsCity;
    if (req.body.financeDetailsPincode) reqData['financeDetails.pincode'] = req.body.financeDetailsPincode;
    if (req.body.financeDetailsState) reqData['financeDetails.state'] = req.body.financeDetailsState;
    if (req.body.financeDetailsCountry) reqData['financeDetails.country'] = req.body.financeDetailsCountry;
    if(req.body.gstin) reqData['financeDetails.gstin']=req.body.gstin
    if (req.body.email && (req.user.userDetail.userType.includes('network_owner') || req.user.userDetail.userType.includes('network_admin'))) {
      reqData['email'] = req.body.email;
    }
    if (req.body.company) {
      reqData['company'] = req.body.company;
      reqData['slug'] = req.body.company.trim().replace(/\s/g, '');
    }
   if(req.body.payCal) reqData['payCal']=req.body.payCal;
   if(req.body.comments){
    reqData['comments'] = req.body.comments;
   }
    // update advertiser
    let advUpdateRes = await AdvertiserModel.updateAdvertiserData(
      { _id: mongooseObjectId(req.params.id) },
      { $set: reqData },
      { upsert: true, new: true }
    );
  console.log("Updated-Adertsiter--",advUpdateRes)
    if (!advUpdateRes) {
      let response = Response.error();
      response.msg = "Advertiser not updated!";
      return res.status(500).json(response);
    }

    // make user active or inactive
    if (req.body.status == "Active") {
      await UserModel.updateUser(
        { 'network': mongooseObjectId(req.user.userDetail.network[0]), 'parent_id': advUpdateRes._id },
        { 'status_label': req.body.status, 'status': 2 }
      );
      // remove this advertiser from inactive advertiser field in redis
      await Redis.removeRedisSetMember(`INACTIVEADVERTISER:${req.user.userDetail.network[0].toString()}`, req.params.id.toString());
    } else if (req.body.status == "InActive") {
      await UserModel.updateUser(
        { 'network': mongooseObjectId(req.user.userDetail.network[0]), 'parent_id': advUpdateRes._id },
        { 'status_label': req.body.status, 'status': 3 }
      );
      // update platform domain status in redis
      if (advUpdateRes && advUpdateRes['platforms']) {
        let tempPlatforms = []
        for (let platform of advUpdateRes['platforms']) {
          platform['status'] = '0'
          tempPlatforms.push(platform)
          if (platform['domain'] && platform['domain'].length) {
            for (let domain of platform['domain']) {
              try {
                let redisData = await Redis.getRedisHashData('advertiser', `${req.user.userDetail.network[0]}:${domain}`);
                if (!redisData['error'] && redisData['data']) {
                  redisData['data']['status'] = advUpdateRes['status'];
                  Redis.setRedisHashData('advertiser', `${req.user.userDetail.network[0]}:${domain}`, redisData['data'], 86400);
                }
              } catch (error) { }
            }
          }
        }
        if (tempPlatforms.length) {
          // make platforms
          await AdvertiserModel.updateAdvertiserData(
            { _id: mongooseObjectId(req.params.id) },
            { $set: { platforms: tempPlatforms } },
            {}
          );
        }
      }
      // Add this advertiser to inactive advertiser field in redis
      await Redis.setRedisSetData(`INACTIVEADVERTISER:${req.user.userDetail.network[0].toString()}`, req.params.id.toString());
      // make all platform inactive of this advertiser
      await PlatformModel.updatePlatforms(
        { advertiser_id: mongooseObjectId(req.params.id), network_id: mongooseObjectId(req.user.userDetail.network[0]) },
        { advertiser_name: advUpdateRes.company, status: 0 },
        {}
      );
    }

    // remove previous assigned account manager
    if (req.body.prevData) {
      let prevData = JSON.parse(req.body.prevData);
      if (Object.keys(prevData).length) {
        try {
          await User.updateUser(
            { _id: mongooseObjectId(prevData.id) },
            { $pull: { advertiser: { id: advUpdateRes._id } } }
          );

          let redisData = await Redis.getRedisHashData('users', prevData.email.trim());
          if (redisData.error == false && redisData.data) {
            var index = redisData.data.advertiser.findIndex(x => x.id === advUpdateRes._id);
            if (index >= 0) redisData.data.advertiser.splice(index, 1);
            if (redisData.data.advertiser.length == 0) redisData.data.isAdvertiser = false;
            Redis.setRedisHashData('users', prevData.email.trim(), redisData.data, process.env.REDIS_Exp);
          }
        } catch (error) { }
      }
    }

    // assign new account manager
    if (req.body.accountManagerUserId) {
      try {
        await User.updateUser(
          { _id: mongooseObjectId(req.body.accountManagerUserId) },
          { $push: { advertiser: { id: advUpdateRes._id, name: advUpdateRes.company } } }
        )
        let redisData = await Redis.getRedisHashData('users', req.body.accountManagerEmail.trim());
        if (redisData.error == false && redisData.data) {
          let index = redisData.data.advertiser.findIndex(x => x.id === advUpdateRes._id);
          if (index == -1) redisData.data.advertiser.push({ name: advUpdateRes.company, id: advUpdateRes._id })
          redisData.data.isAdvertiser = true;
          Redis.setRedisHashData('users', req.body.accountManagerEmail, redisData.data, process.env.REDIS_Exp)
        }
      } catch (error) { }
    }

    let response = Response.success();
    response.msg = "success"
    return res.status(200).json(response);
  } catch (error) {
    let response = Response.error();
    response.msg = "Server internal error!";
    return res.status(500).json(response);
  }
};

exports.deleteAdvertiser = async (req, res) => {
  try {
    if (!req.params.id || !mongooseObjectId.isValid(req.params.id)) {
      let response = Response.error();
      response.msg = "Advertiser id not correct!";
      return res.status(400).json(response);
    }

    await UserModel.deleteManyUser({ parent_id: mongooseObjectId(req.params.id) });
    await AdvertiserModel.findByIdAndRemove(req.params.id);

    let response = Response.success();
    response.msg = "Advertiser deleted successfully!"
    return res.status(200).json(response);
  } catch (error) {
    let response = Response.error();
    response.msg = "Server internal error!";
    return res.status(500).json(response);
  }
};

exports.deActivateAdvertiser = async (req, res) => {
  try {
    if (!req.params.id || !mongooseObjectId.isValid(req.params.id)) {
      let response = Response.error();
      response.msg = "Invalid advertiser id.";
      return res.status(400).json(response);
    }

    let dbRes = await AdvertiserModel.updateAdvertiserData(
      { _id: mongooseObjectId(req.params.id) },
      { status: "InActive" }
    );
    if (dbRes) {
      if (dbRes['platforms']) {
        let platList = [];
        let advPlatList = [];
        for (const tmpObj of dbRes['platforms']) {
          platList.push(mongooseObjectId(tmpObj.platform_id))
          tmpObj['status'] = '0';
          advPlatList.push(tmpObj);
        }
        await PlatformModel.updatePlatforms(
          { _id: { $in: platList } },
          { status: "0" }
        );
        await AdvertiserModel.updateAdvertiserData(
          { _id: mongooseObjectId(req.params.id) },
          { $set: { platforms: advPlatList } },
          {}
        );
      }
      let response = Response.success();
      response.msg = "Advertiser deactivated success.";
      return res.status(200).json(response);
    }
    let response = Response.error();
    response.msg = "Advertiser not found";
    return res.status(201).json(response);
  } catch (error) {
    console.log(error);
    let response = Response.error();
    response.msg = "Server internal error!";
    return res.status(500).json(response);
  }
}

exports.doActiveAdvertiser=async(req,res)=>{
  try {
    if(!req.params.id || !mongooseObjectId.isValid(req.params.id)) {
      let response = Response.error();
      response.msg = "Invalid advertiser id.";
      return res.status(400).json(response);
    }
    let dbRes = await AdvertiserModel.updateAdvertiserData(
      { _id: mongooseObjectId(req.params.id) },
      { status: "Active" }
    );
    if (dbRes) {
      if (dbRes['platforms']) {
        let platList = [];
        let advPlatList = [];
        for (const tmpObj of dbRes['platforms']) {
          platList.push(mongooseObjectId(tmpObj.platform_id))
          tmpObj['status'] = '1';
          advPlatList.push(tmpObj);
        }
        await PlatformModel.updatePlatforms(
          { _id: { $in: platList } },
          { status: "1" }
        );
        await AdvertiserModel.updateAdvertiserData(
          { _id: mongooseObjectId(req.params.id) },
          { $set: { platforms: advPlatList } },
          {}
        );
      }
      let response = Response.success();
      response.msg = "Advertiser activated success.";
      return res.status(200).json(response);
    }
    let response = Response.error();
    response.msg = "Advertiser not found";
    return res.status(201).json(response);

  } catch (error) {
    console.log(error);
    let response = Response.error();
    response.msg = "Server internal error!";
    return res.status(500).json(response);
    
  }
}


exports.getAccount = (req, res) => {
  filter = {
    network_id: mongooseObjectId(req.user.userDetail.network[0]),
    status: 'Active'
  };
  projection = {
    _id: 1,
    company: 1
  };
  AdvertiserModel.getAdvertiser(filter, projection)
    .then(result => {
      let response = Response.success();
      response.payloadType = payloadType.array;
      response.payload = result;

      if (result.length > 0) {
        response.msg = "success"
      } else {
        response.msg = " Data Not Found "
      }
      // debug(response);
      return res.status(200).json(response);
    })
    .catch(err => {
      let response = Response.error();
      response.error = [err.message];
      response.msg = "error"
      // debug(response);
      return res.status(0).json(response);
    })
}
