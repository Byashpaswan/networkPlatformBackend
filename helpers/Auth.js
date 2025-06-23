const Mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const debug = require("debug")("darwin:helper:auth");
const mongooseObjectId = Mongoose.Types.ObjectId;
const Response = require('./Response');
const UserModel = require('../db/user/User');
var jwtDecode = require('jwt-decode');
var Moment = require('moment');
const bcrypt = require('bcryptjs');
const { payloadType } = require('../constants/config');
var crypto = require("crypto");
var Functions = require("./Functions");
var redis = require("./Redis");
let loginLimit=4;
const handlingDomain=require('../db/handlingDomain/handlingDomain');
const nodemailer=require('nodemailer')
exports.tokenAuthentication = (req, res, next) => {
    const token = req.body.token || req.query.token || req.headers.authorization // GET TOKEN
    if (token) {
        // verifies secret and checks exp
        jwt.verify(token, process.env.SECREAT_KEY, function (err, decoded) {
            if (err) {
                let response = Response.error();
                response.payloadType = payloadType.array;
                response.msg = "Unauthorized access";
                return res.status(403).json(response);
            }
            let redisKey='';
            let saltKey='';
            if(decoded.loginType=='system'){
                 redisKey=`user:${decoded.userDetail.id}`;
	             saltKey=`userSalt:${decoded.userDetail.id}`
                //  console.log("redisKey--",redisKey)
                //  console.log("saltKey--",saltKey)
                 let currTime=Date.now();
                redis.getRedisData(redisKey).then(result => {
                parsedResult=JSON.parse(result.data)
                if(!parsedResult || Object.keys(parsedResult)<1){
                    let response = Response.error();
                    response.payloadType = payloadType.array;
                    response.msg = "Unauthorized access";
                    return res.status(403).json(response);    
                }
                // console.log("pardesDecodeD---",parsedResult)
                // let loginType = decoded.loginType || decoded.userDetail.category;
                redis.getScoreOfMemberFromSortedSet(saltKey,decoded.userDetail.salt).then(result=>{
                    if(result.data && +(result.data)>0){
                        req.user = decoded;
                        req.role = parsedResult['role'];
                        req.permissions = parsedResult['permission'];
                        req.user_category = parsedResult['user_category'];
                        req.isPublisher = parsedResult['isPublisher'];
                        req.isAdvertiser = parsedResult['isAdvertiser'];
                        req.publisher = parsedResult['publisher'];
                        req.advertiser = parsedResult['advertiser'];
                        req.loginType = parsedResult['loginType'];
                        req.loginId = parsedResult['loginId'];
                        req.accountid = parsedResult['accountid'];
                        req.network_unique_id = parsedResult['network_unique_id'];
                        req.network_setting = parsedResult['network_setting'];
                        redis.setDataInRedisSortedSet([saltKey, currTime,decoded.userDetail.salt],getLoginExpireTimeInSeconds(process.env.TOKENLIFE)).then(async res=>{
                            let SaltLength = (await redis.getLengthFromRedisSortedSet(saltKey)).data;
                            if(+SaltLength>loginLimit){
                                let detetelength=(+SaltLength)-loginLimit;
                                if(detetelength>0)
			                        await redis.popMemberFromSortedSetWithLowestScore(saltKey,detetelength)
                            }
                        }).catch(err=>{
                            console.log("err being--",err)
                        });
                        next(); 
                    }
                    else{
                        let response = Response.error();
                        response.payloadType = payloadType.array;
                        response.msg = "Unauthorized access salt not match";
                        return res.status(403).json(response);
                    }
                })
                 }).catch(err => {
                    let response = Response.error();
                    response.payloadType = payloadType.array;
                    response.msg = "Unauthorized access redis error";
                    return res.status(403).json(response);
                });
            }
            else{
                let redisKey=`user:${decoded.userDetail.network[0]}:${decoded.userDetail.id}`;
	            let saltKey=`userSalt:${decoded.userDetail.network[0]}:${decoded.userDetail.id}`
                let currTime=Date.now();
                redis.getRedisData(redisKey).then(result => {
                parsedResult=JSON.parse(result.data)
                if(!parsedResult || Object.keys(parsedResult)<1){
                    let response = Response.error();
                    response.payloadType = payloadType.array;
                    response.msg = "Unauthorized access";
                    return res.status(403).json(response);    
                }
                // console.log("pardesDecodeD---",parsedResult)
                // let loginType = decoded.loginType || decoded.userDetail.category;
                redis.getScoreOfMemberFromSortedSet(saltKey,decoded.userDetail.salt).then(result=>{
                    if(result.data && +(result.data)>0){
                        console.log("messgate")
                        req.user = decoded;
                        req.role = parsedResult['role'];
                        req.permissions = parsedResult['permission'];
                        req.user_category = parsedResult['user_category'];
                        req.isPublisher = parsedResult['isPublisher'];
                        req.isAdvertiser = parsedResult['isAdvertiser'];
                        req.publisher = parsedResult['publisher'];
                        req.advertiser = parsedResult['advertiser'];
                        req.loginType = parsedResult['loginType'];
                        req.loginId = parsedResult['loginId'];
                        req.accountid = parsedResult['accountid'];
                        req.network_unique_id = parsedResult['network_unique_id'];
                        req.network_setting = parsedResult['network_setting'];
                        redis.setDataInRedisSortedSet([saltKey, currTime,decoded.userDetail.salt],getLoginExpireTimeInSeconds(process.env.TOKENLIFE)).then(async res=>{
                            let SaltLength = (await redis.getLengthFromRedisSortedSet(saltKey)).data;
                            if(+SaltLength>loginLimit){
                                let detetelength=(+SaltLength)-loginLimit;
                                if(detetelength>0)
			                        await redis.popMemberFromSortedSetWithLowestScore(saltKey,detetelength)
                            }
                        }).catch(err=>{
                            console.log("err being--",err)
                        });

                        next(); 
                    }
                    else{
                        let response = Response.error();
                        response.payloadType = payloadType.array;
                        response.msg = "Unauthorized access";
                        return res.status(403).json(response);
                    }
                })
                }).catch(err => {
                    let response = Response.error();
                    response.payloadType = payloadType.array;
                    response.msg = "Unauthorized access redis error";
                    return res.status(403).json(response);
                });
            }
        });
    } else {
        let response = Response.error();
        response.payloadType = payloadType.array;
        response.msg = "No token provided";
        return res.status(403).json(response);
    }
}

exports.tokenRegenerate = (req, res, next) => {
    const refreshtoken = req.body.refreshtoken || req.query.refreshtoken || req.headers['x-access-token']
    if (refreshtoken) {
        // verifies secret and checks exp
        jwt.verify(refreshtoken, process.env.refreshTokenSecret, function (err, decoded) {
            if (err) {
                let response = Response.error();
                response.msg = "Unauthorized access";
                return res.status(401).json(response);
            } else {
                var decoded = jwtDecode(refreshtoken);
                decoded.userDetail.salt = Functions.Salt(10);
                redis.setRedisData(decoded.userDetail.email, decoded.userDetail.salt).then(reply => {
                    tokenData = { userDetail: decoded.userDetail, permissions: decoded.permissions };
                    const token = jwt.sign(tokenData, process.env.SECREAT_KEY, { expiresIn: process.env.TOKENLIFE });
                    let response = Response.success();
                    // response.payloadType = payloadType.array;
                    response.msg = "Token Successfully Changed";
                    response.payload.push({ token: token });
                    return res.status(200).send(response)
                }).catch(err => {
                    let response = Response.error();
                    response.payloadType = payloadType.array;
                    response.msg = "unable to store data in redis";
                    return res.status(400).send(response)
                })
            }
        });
    } else {
        let response = Response.error();
        // response.payloadType = payloadType.array;
        response.msg = "No token provided";
        return res.status(401).json(response);
    }
}

exports.forgetPassowrd = async function (req, res) {
    let filter = { email: req.body.email};
    let email=''
    var ownerEmail=''
    if(req.body.email){
         email=req.body.email;
    }
    
    console.log("filter--",filter)
    console.log("req.headers.--",req.headers)
    let domain=Functions.parseUrl(req.headers.origin);
    console.log("domain--",domain)
    let hantdlingDomainData = await handlingDomain.findOneDomainData({ "domain" : domain });
    let network_id=mongooseObjectId(hantdlingDomainData['N_id']);
    if(network_id){
        filter['network']=network_id;
    }
    UserModel.getUsers(filter).then(result => {
        if (result.length > 0) {
            var setTime = Moment().add(1, 'hours').unix(); // add 1 hour in current timestamp
            const userLinkdata = { date: setTime, email: req.body.email,network:network_id };
            encrypted = Functions.Ecryption(userLinkdata);
            let query = { reset_password_token: encrypted.salt };
            let buf = Buffer.from(encrypted.ciphertext);
            let encodedData = buf.toString('base64');
            UserModel.find({network:network_id,"roles.role":"network_owner"})
            .then( obj=>{
                if(!obj){
                    let response = Response.error();
                    response.payloadType = payloadType.array;
                    response.msg = "No network owner found";
                    return res.status(200).send(response);
                }
               ownerEmail = obj[0].email;
               console.log("ownerEmail--",ownerEmail)
            })
            .catch(error=>{
                console.error("Error finding email:", error);
                let response = Response.error();
                response.payloadType = payloadType.array;
                response.msg = "Unable to find network owner email";
                return res.status(200).send(response);
            })
            console.log("email--",ownerEmail)
            let url = domain + '/resetPassword/' + encodedData;
            // email code goes here
            UserModel.updateUser(filter, query)
                .then(result => {
                      let transporter = nodemailer.createTransport({
                        sendmail: true,
                        newline: 'unix',
                        path: '/usr/sbin/sendmail'
                      })

                      console.log("Using sendmail transporter:", transporter);
                      
                       
                      let mailOptions = {
                            from: `${domain}`,//`${ownerEmail}`, // sender address
                            to: email,
                            subject: 'Reset your password',
                            html: `
                                <p>You requested a password reset.</p>
                                <p>Click <a href="${url}">here</a> to reset your password.</p>
                            `
                        };

                    transporter.sendMail(mailOptions, function (error, info) {
                        if (error) {
                            console.error("Error sending email:", error);
                            let response = Response.error();
                            response.msg = "Failed to send email";
                            return res.status(200).send(response); 
                        } else {
                            console.log('Email sent: ' + info.response);
                            let response = Response.success();
                            response.msg = "Reset link sent to your email";
                            return res.status(200).send(response);
                        }
                    });

                    // let response = Response.success();
                    // response.payloadType = payloadType.array;
                    // response.payload.push({ url: encodedData });
                    // response.msg = "email id exist";
                    // return res.status(200).send(response)
                })
                .catch(err => {
                    let response = Response.error();
                    response.payloadType = payloadType.array;
                    response.msg = "Unable to execute find and update query";
                    return res.status(400).send(response)
                })

        } else {
            let response = Response.error();
            response.payloadType = payloadType.array;
            response.msg = "No record found on this Email id! pls enter valid email";
            return res.status(200).send(response)
        }

    })
        .catch(err => {
            let response = Response.error();
            response.payloadType = payloadType.array;
            response.msg = "unable to execute find query";
            return res.status(400).send(response)
        })
}

exports.resetPassword = function (req, res) {
    let ciphertext = req.body.link;
    let buff = Buffer.from(ciphertext, 'base64');
    let text = buff.toString('ascii');
    decryptedData = Functions.Decryption(text);
    if (!decryptedData) {
        let response = Response.error();
        response.payloadType = payloadType.array;
        response.msg = "Link is not a valid link";
        return res.status(400).send(response)
    }
    let filter = { email: decryptedData.email,network:decryptedData.network};
    // console.log("filter resetPassword--",filter)
    let salt = decryptedData.salt;
    let endTime = decryptedData.date;
    let currentTime = Moment().unix();
    if (endTime < currentTime) {
        let response = Response.error();
        response.payloadType = payloadType.array;
        response.msg = "Link has been expired";
        return res.status(400).send(response)
    }
    UserModel.getUsers(filter)
        .then(result => {
            let storedSalt = result[0].reset_password_token;
            if (storedSalt != salt) {
                let response = Response.error();
                response.payloadType = payloadType.array;
                response.msg = "Link is not a valid link";
                return res.status(400).send(response)
            } else {
                let randomNO = Functions.Salt(10);
                var token = crypto.createHash('md5').update(randomNO + decryptedData.email + decryptedData.network).digest('hex');
                let filter = { reset_password_token: salt };
                let query = { token: token, reset_password_token: '' };
                UserModel.updateUser(filter, query)
                    .then(result => {
                        let response = Response.success();
                        response.payloadType = payloadType.array;
                        response.payload.push({ token: token });
                        response.msg = "email id exist";
                        return res.status(200).send(response)
                    })
                    .catch(err => {
                        let response = Response.error();
                        response.payloadType = payloadType.array;
                        response.msg = "Unable to execute find and update query";
                        return res.status(400).send(response)
                    })
            }
        })
        .catch(err => {
            debug(err);
        })
}

exports.setPassword = (req, res) => {
    // console.log("req.body--setpassword-",req.body)
    const salt = bcrypt.genSaltSync(10);
    let hash = bcrypt.hashSync(req.body.password, salt);
    // console.log("password hash==",hash)
    // debug(bcrypt.compareSync('myPassword', hash));
    const filter = { token: req.body.token };
    // const update = { password: hash, token: '' };
    const update = { password: hash, token: req.body.token  };

    UserModel.updateUser(filter, update)
        .then(result => {
            let response = Response.success();
            response.payloadType = payloadType.array;
            response.msg = "successfully updated password";
            return res.status(200).send(response)
        })
        .catch(err => {
            debug(err);
            let response = Response.error();
            response.payloadType = payloadType.array;
            response.msg = "Unable to execute find and update query";
            return res.status(400).send(response)
        })
}

exports.authenticationToken = (req, res, next) => {
    const token = req.body.token || req.query.token || req.headers.authorization;
    if (token) {
        jwt.verify(token, process.env.SECREAT_KEY, function (err, decoded) {
            if (err) {
                let response = Response.error();
                response.msg = "Unauthorized access, PROFFCUS Token doesn't match!";
                response.error = [err.message];
                return res.status(200).json(response);
            } else {
                req.integration = decoded;
                next();
            }
        });
    } else {
        let response = Response.error();
        response.msg = "PROFFCUS Token not provided!";
        return res.status(200).json(response);
    }
}

exports.authenticationApiToken = (req, res, next) => {
    const token = req.body.token || req.query.token || req.headers.authorization;
    if (token) {
        jwt.verify(token, process.env.SECREAT_KEY, function (err, decoded) {
            if (err) {
                let response = Response.error();
                response.msg = "Unauthorized access, Token doesn't match!";
                response.error = [err.message];
                return res.status(200).json(response);
            } else {
                next();
            }
        });
    } else {
        let response = Response.error();
        response.msg = "Token not provided!";
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