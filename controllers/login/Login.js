const Mongoose = require('mongoose');
const debug = require("debug")("darwin:Controller:Publisher");
const mongooseObjectId = Mongoose.Types.ObjectId;
const UserModel = require('../../db/user/User');
const Response = require('../../helpers/Response');
const AdvertiserModel = require('../../db//advertiser/Advertiser');
const PublisherModel = require('../../db/publisher/Publisher');
const NetworkModel = require("../../db/network/Network");
const jwt = require('jsonwebtoken');
const { payloadType } = require('../../constants/config');
const bcrypt = require('bcryptjs');
var Functions = require("../../helpers/Functions");
var redis = require("../../helpers/Redis");
var PermissionModel = require("../../db/Roles");
// const User = require('../../db/user/User');
const Network = require('../../db/network/Network');
const { functions } = require('lodash');
var Moment = require('moment');
const handelingDomainModel = require('../../db/handlingDomain/handlingDomain')
const requestIp = require('request-ip');
// const { result } = require('lodash');
const loginLimit=4;
exports.adminlogin = function (req, res) {
	const domain = process.env.SUPERADMIN_DOMAIN;

	//console.log(domain);
	// filter = { 'domain.dashboard': domain };
	// projection={_id:1,domain:1};
	// networkDomain=await Network.domainExist(filter,projection);
	// if(!networkDomain.length){
	// 	let response = Response.error();
	// 	response.payloadType = payloadType.array;
	// 	response.msg = "Invalid Credentials";
	// 	return res.status(400).send( response )
	// }
	//console.log(networkDomain[0]['_id'],"ll");
	let logedIn='';
	login_auth(req).then(resToken=>{
        if(resToken){
			logedIn=resToken;
		}
	})
	if(logedIn){
		let response = Response.success();
		response.payload.push({ 'token': logedIn, 'refreshtoken': logedIn });
		response.payloadType = payloadType.array;
		response.msg = "success";
		return res.status(200).send(response);
	}
	filter = { email: req.body.userDetails.email, network: null };
	projection = { password: 1, network: 1, user_type: 1, first_name: 1, last_name: 1, email: 1, 'roles.role': 1, 'roles.permissions.name': 1, user_category_label: 1, isPublisher: 1, isAdvertiser: 1, publisher: 1, advertiser: 1, parent_id: 1, nid: 1 };
	tokenData = { userDetail: {}, permissions: "" };
	setRedis = {};
	UserModel.getUsers(filter, projection).then(result => {
		if (!result.length) {
			let response = Response.error();
			response.payloadType = payloadType.array;
			response.msg = "Email  doesn't exist!!!";
			return res.status(400).send(response)
		} else if (!bcrypt.compareSync(req.body.userDetails.password, result[0].password)) {
			let response = Response.error();
			response.payloadType = payloadType.array;
			response.msg = "Incorrect Password";
			return res.status(400).send(response)
		}
		permissions = [];
		if (result[0]['roles']['permissions']) {
			for (let i of result[0]['roles']['permissions']) {
				permissions.push(i.name);
			}
		}
		let salt=Functions.Salt(10)
		tokenData['userDetail']['name'] = (result[0]['first_name'] + " " + result[0]['last_name']).trim();
		tokenData['userDetail']['email'] = result[0]['email'];
		tokenData['userDetail']['id'] = result[0]['_id'];
		tokenData['userDetail']['network'] = result[0]['network'];
		tokenData['userDetail']['nid'] = result[0]['nid'];
		tokenData['userDetail']['salt'] = salt;
		tokenData['userDetail']['userType'] = result[0]['user_type'];
		tokenData['userDetail']['category'] = result[0]['user_category_label'];
		tokenData['permissions'] = permissions;
		tokenData['loginType'] = 'system';
		tokenData['userDetail']['parentId'] = [];
		if (result[0]['parent_id'].length) {
			tokenData['userDetail']['parentId'] = result[0]['parent_id'];
		}
		setRedis['salt'] = tokenData['userDetail']['salt'];
		setRedis['role'] = result[0]['roles']['role'];
		setRedis['permission'] = permissions;
		setRedis['isPublisher'] = result[0]['isPublisher'];
		setRedis['isAdvertiser'] = result[0]['isAdvertiser'];
		setRedis['publisher'] = result[0]['publisher'];
		setRedis['advertiser'] = result[0]['advertiser'];
		setRedis['user_category'] = result[0]['user_category_label'];
		tokenData['userDetail']['domain'] = { "dashboard": domain };
		setRedis['domain'] = { "dashboard": domain };
		setRedis['loginType'] = '';
		permissions.push(result[0]['user_category_label']);
		let currTime=Date.now()
		let redisKey=`user:${result[0]['_id']}`;
		let saltKey=`userSalt:${result[0]['_id']}`
		let SaltLength =0
		 redis.getLengthFromRedisSortedSet(saltKey).then(res=>{
           if(res.data){
				SaltLength=res.data
			}
		}).catch(err=>{
			let response = Response.error();
			response.payloadType = payloadType.array;
			response.msg = "unable to get data in redis";
			response.error = [err.message];
			return res.status(400).send(response)

		})
        // Check if the number of items exceeds the login limit
        if (+SaltLength>= loginLimit) {
			let detetelength=(+SaltLength)-loginLimit+1;
			if(detetelength>0)
				redis.popMemberFromSortedSetWithLowestScore(saltKey,detetelength).then(res=>{
			      if(res.data){
					 console.log("remove member succesFully")
				  }
				}).catch(err=>{
					let response = Response.error();
					response.payloadType = payloadType.array;
					response.msg = "unable to remove data in redis";
					response.error = [err.message];
					return res.status(400).send(response)
				})
		}
        // Add the new member with the current timestamp
         redis.setDataInRedisSortedSet([saltKey, currTime,salt],getLoginExpireTimeInSeconds(process.env.TOKENLIFE)).then(res=>{
			if(res.data){
				console.log("save Data member in sorted Set")
			}
			}).catch(err=>{
				let response = Response.error();
				response.payloadType = payloadType.array;
				response.msg = "unable to store data in redis Sorted Set";
				response.error = [err.message];
				return res.status(400).send(response)
	
			});

		// redis.setRedisHashData('users', result[0]['email'], setRedis, getLoginExpireTimeInSeconds(process.env.TOKENLIFE)).then(reply => {
		  redis.setRedisData(redisKey, setRedis, getLoginExpireTimeInSeconds(process.env.TOKENLIFE)).then(reply=>{
			if (reply) {
				const token = jwt.sign(tokenData, process.env.SECREAT_KEY, { expiresIn: process.env.TOKENLIFE });
				const refreshToken = jwt.sign(tokenData, process.env.refreshTokenSecret, { expiresIn: process.env.REFRESHTOKENLIFE });
				let response = Response.success();
				response.payloadType = payloadType.array;
				response.msg = "successfully loged in ";
				response.payload.push({ token: token, refreshtoken: refreshToken });
				return res.status(200).send(response)
			}
		}).catch(err => {
			let response = Response.error();
			response.payloadType = payloadType.array;
			response.msg = "unable to store data in redis";
			response.error = [err.message];
			return res.status(400).send(response)
		});
	}).catch(err => {
		let response = Response.error();
		response.payloadType = payloadType.array;
		response.msg = "Incorrect Email or Password";
		response.error = [err.message];
		return res.status(400).send(response)
	})
}

exports.login = async function (req, res) {
	let passwordHash = bcrypt.hashSync(req.body.userDetails.password, 10);
	try {

		let domain = Functions.parseUrl(req.headers.origin);
		if (domain.indexOf('admin.') == 0) {
			domain = domain.slice(6)
		}
		filter = { 'domain.dashboard': domain };

		let handlingDomainData = await handelingDomainModel.findOneDomainData({ "domain" : domain });

		projection = { _id: 1, domain: 1 };
		
		// networkDomain = await Network.domainExist(filter, projection);

		networkDomain = await Network.domainExist({ _id : mongooseObjectId(handlingDomainData['N_id'])} , projection);
		if (!networkDomain.length) {
			let response = Response.error();
			response.payloadType = payloadType.array;
			response.msg = "Invalid Credentials";
			return res.status(400).send(response)
		}
		//console.log(networkDomain[0]['_id'],"ll");

		filter = { email: req.body.userDetails.email, network: networkDomain[0]['_id'] };
		projection = { password: 1, network: 1, user_type: 1, first_name: 1, last_name: 1, email: 1, 'roles.role': 1, 'roles.permissions.name': 1, user_category_label: 1, isPublisher: 1, isAdvertiser: 1, publisher: 1, advertiser: 1, parent_id: 1, nid: 1 };
		tokenData = { userDetail: {}, permissions: "" };
		setRedis = {};
		let netFilter = { _id: networkDomain[0]['_id'] }
		let netProjection = { company_name: 1, nid: 1, current_timezone: 1 }
		let netData = await NetworkModel.findOneNetwork(netFilter, netProjection)
		let loginType = null;
		result = await UserModel.getUsers(filter, projection)
		if (result) {
			if (!result.length) {
				let response = Response.error();
				response.payloadType = payloadType.array;
				response.msg = "Invalid Email ";
				return res.status(400).send(response)
			} else {
				if (!bcrypt.compareSync(req.body.userDetails.password, result[0].password)) {
					let response = Response.error();
					response.payloadType = payloadType.array;
					response.msg = "Incorrect Password";
					return res.status(400).send(response)
				}
				else if (req.body.userDetails.user_type == 'network') {
					if (!result[0].user_type.includes('network_user') && !result[0].user_type.includes('network_owner')) {
						let response = Response.error();
						response.payloadType = payloadType.array;
						response.msg = "Invalid User / User dosen't Exists";
						return res.status(400).send(response)
					}
				} else if (!result[0].user_type.includes(req.body.userDetails.user_type)) {
					let response = Response.error();
					response.payloadType = payloadType.array;
					response.msg = "Invalid User / User dosen't Exists";
					return res.status(400).send(response)
				}
				var permissions = [];
				if (result[0].user_type.includes('network_owner') && (req.body.userDetails.user_type == 'publisher' || req.body.userDetails.user_type == 'advertiser')) {
					var filter = {};
					if (req.body.userDetails.user_type == 'publisher') {
						loginType = 'publisher';
						filter = { name: 'affiliate_admin' };
					} else if (req.body.userDetails.user_type == 'advertiser') {
						filter = { name: 'advertiser_admin' };
						loginType = 'advertiser';
					}
					projection = { permissions: 1 };
					getPermission = await Permissions(filter, projection);
					if (getPermission) {
						for (let i of getPermission) {
							permissions.push(i['name']);
						}
					}
					permissions.push(loginType);
				} else {
					if (result[0]['roles']['permissions']) {
						for (let i of result[0]['roles']['permissions']) {
							permissions.push(i.name);
						}
					}
					permissions.push(result[0]['user_category_label']);
				}
				let accountid = "";
				if (result[0]['user_category_label'] == 'publisher' || result[0]['user_category_label'] == 'advertiser') {
					filter = { _id: result[0]['parent_id'] }
					accountid = await findAccountId(result[0]['user_category_label'], filter);
				}
				tokenData['userDetail']['name'] = (result[0]['first_name'] + " " + result[0]['last_name']).trim();
				tokenData['userDetail']['email'] = result[0]['email'];
				tokenData['userDetail']['id'] = result[0]['_id'];
				tokenData['userDetail']['network'] = result[0]['network'];
				tokenData['userDetail']['nid'] = result[0]['nid'];
				tokenData['userDetail']['salt'] = Functions.Salt(10);
				tokenData['userDetail']['userType'] = result[0]['user_type'];
				tokenData['userDetail']['category'] = result[0]['user_category_label'];
				tokenData['userDetail']['domain'] = networkDomain[0]['domain'];
				tokenData['userDetail']['company_name'] = netData[0]['company_name']
				tokenData['userDetail']['timezone'] = netData[0]['current_timezone'] || 'Asia/Kolkata';
				tokenData['userDetail']['parentId'] = (result[0] && result[0]['parent_id'].length) ? result[0]['parent_id'] : [];
				if (Functions.parseUrl(req.headers.origin).indexOf('admin.') == 0) {
					let tempDomain = { ...networkDomain[0]['domain'] };
					tempDomain['dashboard'] = 'admin.' + tempDomain['dashboard']
					tokenData['userDetail']['domain'] = tempDomain
				}
				tokenData['permissions'] = permissions;
				tokenData['loginType'] = loginType;
				networkUniqueId = await getNetworkUniqueIds(result[0]['network']);
				tokenData['userDetail']['network_unique_id'] = networkUniqueId[0]['network_unique_id'];

				if (!networkUniqueId) {
					let response = Response.error();
					response.payloadType = payloadType.array;
					response.msg = "Unable to find your network details";
					return res.status(200).send(response)
				}
				if (networkUniqueId[0] && networkUniqueId[0]['current_timezone']) {
					setRedis['timezone'] = networkUniqueId[0]['current_timezone'];
				} else {
					setRedis['timezone'] = "Asia/Kolkata";
				}
				setRedis['network_unique_id'] = networkUniqueId[0]['network_unique_id'];
				setRedis['network_setting'] = networkUniqueId[0]['network_publisher_setting_string'] || "";
				setRedis['salt'] = tokenData['userDetail']['salt'];
				setRedis['role'] = result[0]['roles']['role'];
				setRedis['permission'] = permissions;
				setRedis['isPublisher'] = result[0]['isPublisher'];
				setRedis['isAdvertiser'] = result[0]['isAdvertiser'];
				setRedis['publisher'] = result[0]['publisher'];
				setRedis['advertiser'] = result[0]['advertiser'];
				setRedis['user_category'] = result[0]['user_category_label'];
				setRedis['accountid'] = accountid;
				setRedis['loginType'] = '';
				setRedis['loginId'] = '';
				setRedis['domain'] = networkDomain[0]['domain'];
				if (Functions.parseUrl(req.headers.origin).indexOf('admin.') == 0) {
					// let tempDomain = Object.assign(networkDomain[0]['domain']);
					let tempDomain = { ...networkDomain[0]['domain'] };
					tempDomain['dashboard'] = 'admin.' + tempDomain['dashboard']
					setRedis['domain'] = tempDomain
				}
				redis.setRedisHashData('users', result[0]['email'], setRedis, getLoginExpireTimeInSeconds(process.env.TOKENLIFE)).then(reply => {
					if (reply) {
						const token = jwt.sign(tokenData, process.env.SECREAT_KEY, { expiresIn: process.env.TOKENLIFE });
						const refreshToken = jwt.sign(tokenData, process.env.refreshTokenSecret, { expiresIn: process.env.REFRESHTOKENLIFE });
						let response = Response.success();
						response.payloadType = payloadType.array;
						response.msg = "successfully loged in ";
						response.payload.push({ token: token, refreshtoken: refreshToken });
						return res.status(200).send(response)
					}
				}).catch(err => {
					let response = Response.error();
					response.payloadType = payloadType.array;
					response.error = [err.message];
					response.msg = "unable to store data in redis";
					return res.status(400).send(response)
				});
			}
		}
	}
	catch (err) {
		console.log(err)
		let response = Response.error();
		response.payloadType = payloadType.array;
		response.error = [err.message];
		response.msg = "Unable to execute find query";
		return res.status(400).send(response)
	};
}

exports.mainLogin = async function (req, res) {
    try {

        let domain = String(Functions.parseUrl(req.headers.origin));
        if (!domain) {
            let response = Response.error();
            response.error = 'Domain does not exist';
            response.msg = 'Something went wrong. Please try again.';
            return res.status(400).json(response); // Changed status to 400 for bad request
        }

        let handlingData = await handelingDomainModel.findAllDomainData({ type: "api" }, { domain: 1, _id: 0 });
        let dm = '';

        for (let ele of handlingData) { // Use `for..of` instead of `map` for looping
            if (domain.includes(ele.domain)) {
                dm = ele.domain;
                let response = Response.success();
                response.payload.push(dm);
                response.payloadType = [];
                response.msg = "success";
                return res.status(200).send(response);
            }
        }

        // Send error response if no matching domain is found
        let response = Response.error();
        response.error = 'Domain does not exist';
        response.msg = 'Something went wrong. Please try again.';
        return res.status(400).json(response); // Changed status to 400 for consistency with error responses
    } catch (error) {
        console.error('Error in mainLogin:', error);
        let response = Response.error();
        response.error = 'Internal server error';
        response.msg = 'An unexpected error occurred.';
        return res.status(500).json(response); // Return 500 for server errors
    }
};

exports.userLogin = async function (req, res) {
	try {
		let domain = Functions.parseUrl(req.headers.origin);
		// if (!domain.includes('.admin.')) {
		// 	let arr = domain.split('.');
		// 	arr.splice(1, 0, "admin");
		// 	domain = arr.join('.');
		// }
		// else if (domain.indexOf('staging.') == 0) {
		// 	domain = domain.slice(8);
		// }
		let reauthenticate = await login_auth(req)
		// console.log("reauthenticate---",reauthenticate)
		if(reauthenticate){
			let response = Response.success();
			response.payload.push({ 'token': reauthenticate, 'refreshtoken': reauthenticate });
			response.payloadType = payloadType.array;
			response.msg = "success";
			return res.status(200).send(response);
		}

		let handlingDomainData = await handelingDomainModel.findOneDomainData({ "domain" : domain });
		// let networkFilter = { 'domain.dashboard': domain };
		let networkFilter  = {  _id : mongooseObjectId('688cec59aa23cd007b883612') } ; 
		
		let networkProjection = { '_id': 1, 'company_name': 1, 'network_unique_id': 1, 'current_timezone': 1, 'network_publisher_setting_string': 1, 'domain': 1, 'nid': 1 };
		let networkData = await NetworkModel.findOneDoc(networkFilter, networkProjection, {});
    console.log("networkData---",networkData)
		if (!(networkData && networkData['_id'])) {
			let response = Response.error();
			response.error = 'domain does not exist';
			response.msg = 'Something went wrong. Please try again.';
			return res.status(200).json(response);
		}

		let userFilter = { 'email': req.body.userDetails.email, 'network': mongooseObjectId(networkData['_id']) };
		let userProjection = { '_id': 1, 'password': 1, 'user_type': 1, 'first_name': 1, 'last_name': 1, 'roles.role': 1, 'roles.permissions.name': 1, 'user_category_label': 1, 'isPublisher': 1, 'isAdvertiser': 1, 'publisher': 1, 'advertiser': 1, 'parent_id': 1 };
		let userData = await UserModel.getUser(userFilter, userProjection, {});
    console.log("userData--",userData);
		if (!(userData && userData['_id'])) {
			let response = Response.error();
			response.error = 'email does not exist';
			response.msg = 'Email does not exist.';
			return res.status(200).json(response);
		}

		let pub_account = await findPublisherData(userData['user_category_label'], { '_id': mongooseObjectId(userData['parent_id'][0] ) });
			if (pub_account && pub_account['status'] == 'InActive') {
				let response = Response.error();
				response.err = true ;
				response.msg = 'user Inactive!';
				return res.status(400).send(response);
		}

		if (!bcrypt.compareSync(req.body.userDetails.password, userData['password'])) {
			let response = Response.error();
			response.error = 'invalid password';
			response.msg = 'Invalid password.';
			return res.status(200).json(response);
		}

		if (req.body.userDetails.user_type == 'network') {
			if (!userData['user_type'].includes('network_user') && !userData['user_type'].includes('network_owner')) {
				let response = Response.error();
				response.error = 'invalid user';
				response.msg = 'User does not exist.';
				return res.status(400).send(response);
			}
		} else if (!userData['user_type'].includes(req.body.userDetails.user_type)) {
			let response = Response.error();
			response.error = 'invalid user';
			response.msg = 'User does not exist.';
			return res.status(400).send(response);
		}

		let loginType = null; // to do // loginType should be network/publisher/advertiser
		let permissions = [];
		if (userData['user_type'].includes('network_owner') && (req.body.userDetails.user_type == 'publisher' || req.body.userDetails.user_type == 'advertiser')) {
			let filter = {};
			if (req.body.userDetails.user_type == 'publisher') {
				loginType = 'publisher';
				filter = { name: 'affiliate_admin' };
			} else if (req.body.userDetails.user_type == 'advertiser') {
				filter = { name: 'advertiser_admin' };
				loginType = 'advertiser';
			}
			let permissionsData = await Permissions(filter, { permissions: 1 });
			if (permissionsData) {
				for (let item of permissionsData) {
					permissions.push(item['name']);
				}
			}
			permissions.push(loginType);
		} else {
			if (userData['roles']['permissions']) {
				for (let item of userData['roles']['permissions']) {
					permissions.push(item['name']);
				}
			}
			permissions.push(userData['user_category_label']);
		}

		let accountId = '';
		if (userData['user_category_label'] == 'publisher' || userData['user_category_label'] == 'advertiser') {
			accountId = await findAccountId(userData['user_category_label'], { '_id': userData['parent_id'] });

		}

		let salt = Functions.Salt(10);
		let tokenData = { userDetail: {}, permissions: '' };
		let setRedis = {};
		tokenData['userDetail']['name'] = (userData['first_name'] + ' ' + userData['last_name']).trim();
		tokenData['userDetail']['email'] = req.body.userDetails.email;
		tokenData['userDetail']['id'] = userData['_id'];
		tokenData['userDetail']['network'] = [networkData['_id']]; // to do replace network array to string
		tokenData['userDetail']['nid'] = networkData['nid'];
		tokenData['userDetail']['salt']  = salt;
		tokenData['userDetail']['userType'] = userData['user_type'];
		tokenData['userDetail']['category'] = userData['user_category_label'];
		tokenData['userDetail']['domain'] = setRedis['domain'] = { 'dashboard': Functions.parseUrl(req.headers.origin), 'tracker': networkData['domain']['tracker'] };
		tokenData['userDetail']['company_name'] = networkData['company_name']
		tokenData['permissions'] = permissions;
		tokenData['loginType'] = loginType;
		tokenData['userDetail']['parentId'] = (userData['parent_id'] && userData['parent_id'].length) ? userData['parent_id'] : [];
		if (userData['user_category_label'] == 'publisher') tokenData['userDetail']['pid'] = accountId;
		if (userData['user_category_label'] == 'advertiser') tokenData['userDetail']['aid'] = accountId;
		tokenData['userDetail']['network_unique_id'] = setRedis['network_unique_id'] = networkData['network_unique_id'];
		tokenData['userDetail']['timezone'] = networkData['current_timezone'] || 'Asia/Kolkata';

		setRedis['timezone'] = networkData['current_timezone'] || 'Asia/Kolkata';
		setRedis['network_setting'] = networkData['network_publisher_setting_string'] || '';
		setRedis['role'] = userData['roles']['role'];
		setRedis['permission'] = permissions;
		setRedis['isPublisher'] = userData['isPublisher'];
		setRedis['isAdvertiser'] = userData['isAdvertiser'];
		setRedis['publisher'] = userData['publisher'];
		setRedis['advertiser'] = userData['advertiser'];
		setRedis['user_category'] = userData['user_category_label'];
		setRedis['accountid'] = accountId;
		setRedis['loginType'] = '';
		setRedis['loginId'] = '';
		let currTime = Date.now(); // Get the current time in milliseconds
		let redisKey=`user:${networkData['_id']}:${userData['_id']}`;
		let saltKey=`userSalt:${networkData['_id']}:${userData['_id']}`
        // Get all members of the sorted set
        let SaltLength = (await redis.getLengthFromRedisSortedSet(saltKey)).data;
        console.log("SaltLength----",SaltLength)
        // Check if the number of items exceeds the login limit
        if (+SaltLength>= loginLimit) {
			let detetelength=(+SaltLength)-loginLimit+1;
			if(detetelength>0)
				await redis.popMemberFromSortedSetWithLowestScore(saltKey,detetelength)
		}
        // Add the new member with the current timestamp
        await redis.setDataInRedisSortedSet([saltKey, currTime,salt],getLoginExpireTimeInSeconds(process.env.TOKENLIFE));

		// let redisData = await redis.setRedisHashData(redisKey, setRedis, getLoginExpireTimeInSeconds(process.env.TOKENLIFE));
		let redisData = await redis.setRedisData(redisKey, setRedis, getLoginExpireTimeInSeconds(process.env.TOKENLIFE));

		if (!redisData || redisData['error']) {
			let response = Response.error();
			response.error = 'unable to store data in redis';
			response.msg = 'Something went wrong. Please try again.';
			return res.status(200).json(response);
		}

		const token = jwt.sign(tokenData, process.env.SECREAT_KEY, { expiresIn: process.env.TOKENLIFE });
		const refreshToken = jwt.sign(tokenData, process.env.refreshTokenSecret, { expiresIn: process.env.REFRESHTOKENLIFE });

		await UserModel.updateUser(
			{ _id: userData['_id'] },
			{ 'last_login_ip': requestIp.getClientIp(req), "last_login": Moment().format() },
			{}
		)
		let response = Response.success();
		response.payload.push({ 'token': token, 'refreshtoken': refreshToken });
		response.payloadType = payloadType.array;
		response.msg = "success";
		return res.status(200).send(response);
	} catch (error) {
		debug(error);
		let response = Response.error();
		response.error = error.message;
		response.msg = 'Something went wrong. Please try again.';
		return res.status(200).json(response);
	}
}

Permissions = async (filter, projection) => {
	data = await PermissionModel.checkRole(filter, projection);
	if (data) {
		return data[0]['permissions'];
	} else {
		return null;
	}
}

exports.networkLogin = async (req, res) => {
	try {
		if (req.body.email && req.body.selectedId && req.body.selectType) {
			let setRedis = await redis.getRedisHashData('users', req.body.email.trim());
			if (!setRedis.error && setRedis.data) {
				let tempRedis = setRedis.data;
				tempRedis['loginType'] = req.body.selectType.trim();
				tempRedis['loginId'] = req.body.selectedId.trim();
				filter = { _id: tempRedis['loginId'] }
				let accountid = await findAccountId(tempRedis['loginType'], filter);
				if (accountid) {
					tempRedis['accountid'] = accountid;
				}
				let reply = await redis.setRedisHashData('users', req.body.email.trim(), tempRedis, getLoginExpireTimeInSeconds(process.env.TOKENLIFE))
				if (reply) {
					let response = Response.success();
					response.payloadType = payloadType.array;
					response.msg = "successfully loged in ";
					response.payload = [];
					return res.status(200).send(response);
				}
			}


		}

		let response = Response.error();
		response.payloadType = payloadType.array;
		response.msg = "Invalid Login";
		return res.status(400).send(response)
	}
	catch (err) {
		let response = Response.error();
		response.payloadType = payloadType.array;
		response.error = [err.message];
		response.msg = "Invalid Login";
		return res.status(400).send(response)
	}
}

findAccountId = async (account, filter) => {
	if (account == 'advertiser') {
		data = await AdvertiserModel.getAdvertiserName(filter, { aid: 1 });
		if (data.length && data[0]['aid']) {
			return data[0]['aid'];
		} else {
			return "";
		}
	} else {
		data = await PublisherModel.getPublisherName(filter, { pid: 1 });
		if (data.length && data[0]['pid']) {
			return data[0]['pid'];
		} else {
			return "";
		}
	}
}

//find publisher data  
findPublisherData = async (account, filter) => {
	if ( account == 'publisher') {
		let data = await PublisherModel.getPublisherName(filter, { pid: 1, status: 1 });
		if (data.length && data[0]['pid'] && data[0]['status']) {
			return data[0];
		}else{
			return '' ;
		}
	} else {
		return '';
	}
}


getNetworkUniqueIds = async (networkId) => {
	filter = { _id: networkId };
	projection = { network_unique_id: 1, network_publisher_setting_string: 1, current_timezone: 1 };
	networkUniqueId = await NetworkModel.findOneNetwork(filter, projection);
	if (networkUniqueId.length) {
		return networkUniqueId;
	} else {
		return null;
	}
}


exports.logout = async (req, res) => {
	if(req.user.loginType=='system'){
		let redisKey=`user:${req.user.userDetail.id}`;
		let saltKey=`userSalt:${req.user.userDetail.id}`
		let salt=req.user.userDetail.salt
		await redis.removeDataFromRedisSortedSet(saltKey,salt);
		let memberLength=await redis.getLengthFromRedisSortedSet(saltKey);
		//  console.log("member--Length",memberLength,"+memberLength==0",+memberLength.data==0)
		if(+memberLength.data==0){
			delStatus = await redis.delRedisData(redisKey);
			if (delStatus) {
				let response = Response.success();
				response.payloadType = payloadType.array;
				response.msg = "successfully log out ";
				response.payload = [];
				return res.status(200).send(response);
			} else {
				let response = Response.error();
				response.payloadType = payloadType.array;
				response.msg = "Unable to log out";
				return res.status(400).send(response)
			}
		}else{
			let response = Response.success();
			response.payloadType = payloadType.array;
			response.msg = "successfully log out ";
			response.payload = [];
			return res.status(200).send(response);
		}
	}
	else{
		let redisKey=`user:${req.user.userDetail.network[0]}:${req.user.userDetail.id}`;
		let saltKey=`userSalt:${req.user.userDetail.network[0]}:${req.user.userDetail.id}`
    	let salt=req.user.userDetail.salt
		await redis.removeDataFromRedisSortedSet(saltKey,salt);
		let memberLength=await redis.getLengthFromRedisSortedSet(saltKey);
		if(+memberLength.data==0){
			delStatus = await redis.delRedisData(redisKey);
			if (delStatus) {
				let response = Response.success();
				response.payloadType = payloadType.array;
				response.msg = "successfully log out ";
				response.payload = [];
				return res.status(200).send(response);
			} 
			else {
				let response = Response.error();
				response.payloadType = payloadType.array;
				response.msg = "Unable to log out";
				return res.status(400).send(response)
			}
		}
		else{
			let response = Response.success();
			response.payloadType = payloadType.array;
			response.msg = "successfully log out ";
			response.payload = [];
			return res.status(200).send(response);
		}
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

const login_auth = async (req) => {
    const token = req.body.token || req.query.token || req.headers.authorization; // GET TOKEN
    if (!token) {
        return false;
    }

    try {
        const decoded = await jwt.verify(token, process.env.SECREAT_KEY);
		if(decoded.loginType=='system'){
			const redisKey = `user:${decoded.userDetail.id}`;
        	const saltKey = `userSalt:${decoded.userDetail.id}`;
        	const salt = decoded.userDetail.salt;
			if (!req.body.userDetails || req.body.userDetails.email !== decoded.userDetail.email) {
				const remRes = await redis.removeDataFromRedisSortedSet(saltKey, salt);
				const memberLength = await redis.getLengthFromRedisSortedSet(saltKey);
				if (+memberLength.data === 0) {
					await redis.delRedisData(redisKey);
				}
				return false;
			}
	
			const result = await redis.getRedisData(redisKey);
			const parsedResult = result.data ? JSON.parse(result.data) : null;
			if (!parsedResult || Object.keys(parsedResult).length < 1) {
				return false;
			}
	
			const scoreData = await redis.getScoreOfMemberFromSortedSet(saltKey, salt);
			if (scoreData.data && +scoreData.data > 0) {
				const currTime = Date.now();
				await redis.setDataInRedisSortedSet([saltKey, currTime, decoded.userDetail.salt], getLoginExpireTimeInSeconds(process.env.TOKENLIFE));
	
				const saltLength = (await redis.getLengthFromRedisSortedSet(saltKey)).data;
				if (+saltLength > loginLimit) {
					const deleteLength = +saltLength - loginLimit;
					if (deleteLength > 0) {
						await redis.popMemberFromSortedSetWithLowestScore(saltKey, deleteLength);
					}
				}
				return token;
			} else {
				return false;
			}

		}
		else{
        	const redisKey = `user:${decoded.userDetail.network[0]}:${decoded.userDetail.id}`;
        	const saltKey = `userSalt:${decoded.userDetail.network[0]}:${decoded.userDetail.id}`;
        	const salt = decoded.userDetail.salt;

        	if (!req.body.userDetails || req.body.userDetails.email !== decoded.userDetail.email) {
            const remRes = await redis.removeDataFromRedisSortedSet(saltKey, salt);
            const memberLength = await redis.getLengthFromRedisSortedSet(saltKey);
            if (+memberLength.data === 0) {
                await redis.delRedisData(redisKey);
            }
            return false;
        	}

        	const result = await redis.getRedisData(redisKey);
        	const parsedResult = result.data ? JSON.parse(result.data) : null;
        	if (!parsedResult || Object.keys(parsedResult).length < 1) {
            return false;
        	}

        	const scoreData = await redis.getScoreOfMemberFromSortedSet(saltKey, salt);
        	if (scoreData.data && +scoreData.data > 0) {
            const currTime = Date.now();
            await redis.setDataInRedisSortedSet([saltKey, currTime, decoded.userDetail.salt], getLoginExpireTimeInSeconds(process.env.TOKENLIFE));

            const saltLength = (await redis.getLengthFromRedisSortedSet(saltKey)).data;
            if (+saltLength > loginLimit) {
                const deleteLength = +saltLength - loginLimit;
                if (deleteLength > 0) {
                    await redis.popMemberFromSortedSetWithLowestScore(saltKey, deleteLength);
                }
            }
            return token;
        	} else {
            return false;
        	}
		}
    } catch (err) {
        return false;
    }
};
