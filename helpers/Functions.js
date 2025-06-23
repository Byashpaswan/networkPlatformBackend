const crypto = require("crypto");
const key = 'hhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh';
var CryptoJS = require("crypto-js");
var multer = require('multer');
const fs = require('fs');
const debug = require("debug")("darwin:Helpers:functions");
const Mongoose = require('mongoose');
const OffersAuditLogModel = require('../db/offer/offersAuditLog');
const OfferModel = require('../db/offer/Offer');
const UserActivityLog = require('../db/userActivityLog');
const { PlatformModel, PlatformTypeModel } = require('../db/platform/Platform');
const PublisherModel = require('../db/publisher/Publisher');
const AdvertiserModel = require('../db/advertiser/Advertiser');
const mongooseObjectId = Mongoose.Types.ObjectId;
const urlModule = require('url');
const matchAll = require("match-all");
const wishlistModel = require('../db/wishlist');
const NetworkModel = require('../db/network/Network');
const Redis = require('./Redis');
const moment = require('moment');
const { config } = require("../constants/Global")


const webhookModel = require('../db/webhook')
const rabbitMq = require('../helpers/rabbitMQ');
const priorityRabbitMQ = require('../helpers/priorityRabbitMQ');
const webhook_queue = "webhook_queue";

exports.getCacheData = async (hash, key) => {
    try {
        let offerData = await Redis.getRedisHashData(hash, key);
        if (offerData.data) {
            return offerData.data;
        } else {
            return null;
        }
    } catch (err) {
        return null;
    }
}


function isValidUrl(inputUrl) {
  const urlRegex = /^(https?:\/\/[a-z0-9A-Z.-]*)(:[0-9]*)?((\/.*)|(\/?))$/
  return urlRegex.test(inputUrl);
}

exports.parseUrl = (url)=>{

  try{
    if(!url){
      return null;

    }else if(isValidUrl(url)){
           let domain = "";
          try{
            const newUrl = new URL(url);
            domain = newUrl.hostname;
            if(newUrl.port){
              domain = newUrl.hostname+":"+newUrl.port
            }

          }catch{
            domain = null ;

          }
          return domain ;

        }
        else{

          return null ;
        }

  }catch(e){
    return null ;
  }
}

exports.encodeData = (data) => {
    let buff = new Buffer(JSON.stringify(data));
    return buff.toString('base64');
}

exports.decodeData = (data) => {
    let buff = new Buffer(data, 'base64');
    return JSON.parse(buff.toString('ascii'));
}

exports.Ecryption = (text) => {
    var Salt = this.Salt(10);
    text['salt'] = Salt;
    var ciphertext = CryptoJS.AES.encrypt(JSON.stringify(text), key);
    return { salt: Salt, ciphertext: ciphertext.toString() };
}

exports.Decryption = (text) => {
    var bytes = CryptoJS.AES.decrypt(text.toString(), key);
    try {
        var decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    } catch (e) {
        var decryptedData = false;
    }
    return decryptedData;
}
exports.trimArray = (data) => {
    if (!Array.isArray(data) && typeof data != 'object') return data;
    data.forEach((element, index) => {
        Object.keys(element).forEach((a, i) => {
            element[a] = element[a].trim();
        })
    });
    return data;
}

exports.Salt = (length) => {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

exports.hashFunction = (string) => {
    var hash = crypto.createHash('md5').update(string).digest('hex');
    return hash;
}

exports.obsKeysToString = (obj, keys, sep) => {
    data = keys.map(key => obj[key]).filter(v => v).join(sep);
    return data + "}&";
}

exports.objectKeyToStringTrimmed = (obj, keys, sep) => {
    data = keys.map(key => obj[key]).filter(v => v).join(sep);
    return data + "&";
}
const Storage = multer.diskStorage({
    destination: function (req, file, callback) {
        const dir = "public/uploads/platform/"
        // const dir = path.join(__dirname, '/public/images');

        fs.exists(dir, exist => {
            if (!exist) {
                return fs.mkdir(dir, { recursive: true }, error => callback(error, dir))
            }
            callback(null, dir);
        })
    },
    filename: function (req, file, callback) {
        callback(null, file.originalname);
    }
});



const networkLogoStorage = multer.diskStorage({
    destination: function (req, file, callback) {
        let networkId = req.user.userDetail.network[0]
        const dir = "public/uploads/network/" + networkId;

        fs.exists(dir, exist => {
            if (!exist) {

                return fs.mkdir(dir, { recursive: true }, error => callback(error, dir))

            }
            callback(null, dir);

        })

    },
    filename: function (req, file, callback) {
        let companyName = req.user.userDetail.company_name;
        file.originalname = companyName.toLowerCase().replace(/ /g, '') + "." + file.originalname.split('.').slice(-1).pop()
        callback(null, file.originalname);
    },

});

const networkLogoStorageMedium = multer.diskStorage({
    destination: function (req, file, callback) {
        let networkId = req.user.userDetail.network[0]
        const dir = "public/uploads/network/" + networkId;

        fs.exists(dir, exist => {
            if (!exist) {

                return fs.mkdir(dir, { recursive: true }, error => callback(error, dir))

            }
            callback(null, dir);

        })

    },
    filename: function (req, file, callback) {
        let companyName = req.user.userDetail.company_name + "medium";
        file.originalname = companyName.toLowerCase().replace(/ /g, '') + "." + file.originalname.split('.').slice(-1).pop()
        callback(null, file.originalname);
    },

});

const networkLogoStorageSmall = multer.diskStorage({
    destination: function (req, file, callback) {
        let networkId = req.user.userDetail.network[0]
        const dir = "public/uploads/network/" + networkId;

        fs.exists(dir, exist => {
            if (!exist) {

                return fs.mkdir(dir, { recursive: true }, error => callback(error, dir))

            }
            callback(null, dir);

        })

    },
    filename: function (req, file, callback) {
        let companyName = req.user.userDetail.company_name + "small";
        file.originalname = companyName.toLowerCase().replace(/ /g, '') + "." + file.originalname.split('.').slice(-1).pop()
        callback(null, file.originalname);
    },

});

const userProfileImageStorage = multer.diskStorage({
    destination: function (req, file, callback) {
        let networkId = req.user.userDetail.network[0];
        const dir = "public/uploads/users/" + networkId + "/";
        fs.exists(dir, exist => {
            if (!exist) {
                return fs.mkdir(dir, { recursive: true }, error => callback(error, dir))
            }
            callback(null, dir);
        })
    },
    filename: function (req, file, callback) {
        file.originalname = req.body.email + '.jpg';
        callback(null, file.originalname);
    },

});

const fileFilter = function (req, file, callback) {
    let fileExts = ['png', 'jpg', 'jpeg', 'gif'];   // Define the allowed extension
    let name = file.originalname.split('.');
    let isAllowedExt = '';
    if (name[1]) {
        isAllowedExt = fileExts.includes(name[1].toLowerCase());  // Check allowed extensions
    }
    let isAllowedMimeType = file.mimetype.startsWith("image/"); // Mime type must be an image
    if (isAllowedExt && isAllowedMimeType) {
        return callback(null, true) // no errors
    }
    else {
        return callback(new Error('Only image files are allowed!'), false); // pass error msg to callback, which can be displaye in frontend
    }
};

const CSVfileFilter = function (req, file, callback) {
    let fileExts = ['csv'];   // Define the allowed extension
    let name = file.originalname.split('.');
    let isAllowedExt = '';
    if (name[1]) {
        isAllowedExt = fileExts.includes(name[1].toLowerCase());  // Check allowed extensions
    }
    let isAllowedMimeType = file.mimetype.startsWith("text/") || file.mimetype.includes("vnd.ms-excel"); // Mime type must be an image
    if (isAllowedExt && isAllowedMimeType) {
        return callback(null, true) // no errors
    }
    else {
        return callback(new Error('Only CSV files ( comma seperated format ) are allowed!'), false); // pass error msg to callback, which can be displaye in frontend
    }
};

exports.upload = multer({
    storage: Storage, fileFilter: fileFilter, limits: { fileSize: 1000000 },
});

exports.uploadNetworkLogo = multer({
    storage: networkLogoStorage, fileFilter: fileFilter, limits: { fileSize: 1000000 },
})
exports.uploadNetworkLogoMedium = multer({
    storage: networkLogoStorageMedium, fileFilter: fileFilter, limits: { fileSize: 1000000 },
})
exports.uploadNetworkLogoSmall = multer({
    storage: networkLogoStorageSmall, fileFilter: fileFilter, limits: { fileSize: 1000000 },
})
exports.uploadUserProfileImage = multer({
    storage: userProfileImageStorage, fileFilter: fileFilter, limits: { fileSize: 1000000 },
})


exports.uploadCSV = multer({
    storage: Storage, fileFilter: CSVfileFilter
});
exports.filterHash = (data) => {
    let hash = crypto.createHash("md5").update(JSON.stringify(data)).digest("hex");
    return hash;
}
exports.generateHash = (ImportantFields, offer) => {
    let newOfferhash = {};
    ImportantFields.map((field) => {
        newOfferhash[field] = offer[field];
    });
    let hash = crypto.createHash("md5").update(JSON.stringify(newOfferhash)).digest("hex");
    return hash;
}

exports.offersAuditLog = (fields, oldOffer, updated_by, username, user_id, version) => {
    let offerAudit = {};
    let update_fields = {};
    offerAudit['network_id'] = oldOffer.network_id;
    offerAudit['offer_id'] = oldOffer._id;
    offerAudit['updated_by'] = updated_by;
    offerAudit['username'] = username;
    offerAudit['user_id'] = user_id;
    fields.map(key => {
        update_fields[key] = oldOffer[key];
    })
    offerAudit['offer_change'] = JSON.stringify(update_fields);
    let new_version = version || 0;
    offerAudit['version'] = parseInt(new_version) + 1;
    let OffersAuditLog = new OffersAuditLogModel(offerAudit);
    OffersAuditLog.save().then(result => {
        // debug(result,"audit log");
    })
        .catch(err => {
            console.error(err);
        });
}

exports.UpdateOldOffer = (fields, updated_field, oldoffer) => {
    // debug(oldoffer._id);
    let event = 'offer_update'
    if (oldoffer.network_id && oldoffer._id) {
        OffersAuditLogModel.getSearchOfferLog({ network_id: oldoffer.network_id, offer_id: oldoffer._id }, { updated_by: 1, offer_change: 1, version: 1 }).then(res => {
            if (res) {
                if (res.updated_by && res.updated_by == "script") {
                    updated_field['$inc'] = { version: 1 };
                    OfferModel.updateOffer({ _id: oldoffer._id, network_id: oldoffer.network_id }, updated_field, { returnNewDocument: true, multi: false, timestamps: true }).then(async result => {
                        if (result) {
                            // debug('live offer updated');
                            if (result.status == 1) {
                                this.publishJobForWebhook(result.network_id, [result._id], event);
                            }
                            this.offersAuditLog(fields, oldoffer, 'script', '', '', result.version);
                            Redis.delRedisData('OFFER:' + oldoffer._id.toString());
                        }
                    })
                        .catch(err => {
                            console.error(err);
                        })
                }
            }
            else {
                updated_field['$inc'] = { version: 1 };
                OfferModel.updateOffer({ _id: oldoffer._id, network_id: oldoffer.network_id }, updated_field, { returnNewDocument: true, multi: false, timestamps: true }).then(async result => {
                    if (result) {
                        // debug('live offer updated');
                        this.offersAuditLog(fields, oldoffer, 'script', '', '', 0);
                        if (result.status == 1) {
                            this.publishJobForWebhook(result.network_id, [result._id], event);
                        }
                        Redis.delRedisData('OFFER:' + oldoffer._id.toString());
                    }
                })
                    .catch(err => {
                        console.error(err);
                    })
            }
        })
            .catch(err => {
                console.error(err);
            })
    }
};

exports.saveUpdatedOffer = async (newOffer) => {

    try {
        let search = { network_id: mongooseObjectId(newOffer.network_id), advertiser_platform_id: mongooseObjectId(newOffer.advertiser_platform_id), advertiser_offer_id: newOffer.advertiser_offer_id };
        OfferModel.updateOffer(search, { $set: newOffer }, { returnNewDocument: true, multi: false, timestamps: true })
            .then(result => {
                if (result) {
                    if (result.status == 1) {
                        this.publishJobForWebhook(result.network_id, [result._id], 'offer_update', "From Api Update");
                    }
                    Redis.delRedisData('OFFER:' + result._id.toString());
                }
            })
            .catch(err => {
                debug(err);
            })
    } catch (error) {
        debug(error)
    }
}
exports.updatedOfferSyncTime = async (newOffer) =>{
    try{
        let search = { network_id: mongooseObjectId(newOffer.network_id), advertiser_platform_id: mongooseObjectId(newOffer.advertiser_platform_id), advertiser_offer_id: newOffer.advertiser_offer_id }
        await OfferModel.updateOffer(search, { $set: {'syncTime' : moment(Date.now()), 'adv_status' : newOffer.adv_status } }, { returnNewDocument: true, multi: false, timestamps: true })
    }catch(err){
        console.log(" err ", err);
        debug(err)
    }
}

exports.InactiveApi = async (content) => {
    if (content) {
        return new Promise(async (resolve, reject) => {
            try {
                let redisData = await Redis.incrbyRedisData('APIST:' + content['advertiser_platform_id'], 1, 86400);
                if (!redisData.error && redisData.data >= 5) {
                    let result = await PlatformModel.updatePlatform({ advertiser_id: mongooseObjectId(content.advertiser_id), network_id: mongooseObjectId(content.network_id), platform_id: mongooseObjectId(content.platform_id) }, { apiStatus: 'api_marked_to_check' });
                }
                resolve(true);
            }
            catch (err) {
                console.error(err);
                resolve(false);
            }
        })
    }
}

exports.ActiveApi = async (content) => {
    if (content) {
        return new Promise(async (resolve, reject) => {
            try {
                Redis.delRedisData('APIST:' + content['advertiser_platform_id']);
                let result = await PlatformModel.updatePlatform({ advertiser_id: mongooseObjectId(content.advertiser_id), network_id: mongooseObjectId(content.network_id), platform_id: mongooseObjectId(content.platform_id) }, { apiStatus: 'active' });
                resolve(true);
            }
            catch (err) {
                console.error(err);
                resolve(false);
            }
        })
    }
}

exports.getDeviceAppId = (url) => {
    let response = { app_id: '', os: '' };
    try {
        if (url) {
            url = url.trim();
            url = encodeURI(url);
            let parsedUrl = urlModule.parse(url, true);
            if (parsedUrl && parsedUrl.protocol && parsedUrl.host) {
                let androidRegex = /^[a-z][a-z0-9_]*(\.[a-z0-9_-]+)+[0-9a-z_]$/i;
                if (parsedUrl.host == 'play.google.com' || parsedUrl.host == 'details') {
                    response.os = 'android';
                    if (parsedUrl.query && parsedUrl.query.id) {
                        response.app_id = androidRegex.test(parsedUrl.query.id) ? parsedUrl.query.id : '';
                    } else if (parsedUrl.query && parsedUrl.query.d) {
                        response.app_id = androidRegex.test(parsedUrl.query.d) ? parsedUrl.query.d : '';
                    }
                } else if (parsedUrl.host.indexOf('www.onestore') >= 0) {
                    response.os = 'android';
                    if (parsedUrl.query && parsedUrl.query.pid) {
                        response.app_id = androidRegex.test(parsedUrl.query.pid) ? parsedUrl.query.pid : '';
                    }
                } else if (parsedUrl.host == 'itunes.apple.com' || parsedUrl.host == 'apps.apple.com') {
                    response.os = 'ios';
                    let arr = parsedUrl.pathname.split('/');
                    for (let e of arr) {
                        if (e.indexOf('id') == 0) {
                            let app_id = e.replace(/id/g, '');
                            response.app_id = isNaN(app_id) ? '' : app_id;
                        }
                    }
                }
                else if (parsedUrl.host == 'mobile') {
                    response.os = 'android';
                    let str = url.split('package=');
                    if (str && str.length && str[1]) {
                        if (str[1].indexOf(';') >= 0) {
                            let app_str = str[1].split(';');
                            if (app_str && app_str.length && app_str[0]) {
                                response.app_id = androidRegex.test(app_str[0]) ? app_str[0] : '';
                            }
                        } else {
                            response.app_id = androidRegex.test(str[1]) ? str[1] : '';
                        }
                    }
                }
                else if (url.indexOf("android-app://") >= 0) {
                    response.os = 'android';
                    let str = url.split('://');
                    if (str && str.length && str[1]) {
                        if (str[1].indexOf('/') >= 0) {
                            let app_str = str[1].split('/');
                            if (app_str && app_str.length && app_str[0]) {
                                response.app_id = androidRegex.test(app_str[0]) ? app_str[0] : '';
                            }
                        } else {
                            response.app_id = androidRegex.test(str[1]) ? str[1] : '';
                        }
                    }
                }
                else if (parsedUrl.hostname == 'app.appsflyer.com') {
                    if (parsedUrl.path.includes('/id')) {
                        response.os = 'ios';
                        let app_id = parsedUrl.pathname.replace('/id', '');
                        response.app_id = isNaN(app_id) ? '' : app_id;
                    } else {
                        response.os = 'android';
                        let app_id = parsedUrl.path.replace('/', '');
                        response.app_id = androidRegex.test(app_id) ? app_id : '';
                    }
                }
            }
        }
    }
    catch (e) {
        console.error(e);
    }
    return response;
}

exports.checkMyOffer = async (app_id, network_id) => {
    return new Promise(async (resolve, reject) => {
        let myOffer = false;
        if (app_id && network_id) {
            try {
                // let wishlist_data = await Redis.getRedisHashData('wishlist', network_id);
                let wishlist_data = await Redis.getRedisSetData('WISHLIST:' + network_id.toString());
                if (!(!wishlist_data['error'] && wishlist_data['data'] && wishlist_data['data'].length)) {
                    let search = { network_id: mongooseObjectId(network_id), test: false };
                    wishlistModel.searchAppId(search, { app_id: 1 }, {}).then(async res => {
                        if (res) {
                            // debug('data from db');

                            let oldAppIds = [];
                            for (let obj of res) {
                                oldAppIds.push(obj.app_id);
                            }
                            // Redis.setRedisHashData('wishlist', network_id, oldAppIds, process.env.REDIS_Exp);
                            Redis.setRedisSetData('WISHLIST:' + network_id.toString(), oldAppIds, process.env.REDIS_Exp);
                            if (oldAppIds.includes(app_id)) {
                                myOffer = true;
                            }

                        }
                        // debug(myOffer)
                        return resolve(myOffer);
                    })
                        .catch(e => {
                            console.error(e);
                            return resolve(myOffer);
                        });
                } else {
                    let wishlist = wishlist_data.data;
                    if (wishlist.includes(app_id)) {
                        myOffer = true;
                    }
                    // debug(myOffer)

                    return resolve(myOffer);
                }

            }
            catch (e) {
                console.error(e);

                return resolve(myOffer);
            }
        }
    })
}

exports.getWishlistList = async (network_id) => {
    return new Promise(async (resolve, reject) => {
        if (network_id) {
            try {
                let wishlist = await Redis.getRedisSetData('WISHLIST:' + network_id.toString());
                if (wishlist && wishlist.data && wishlist.data.length > 0) {
                    return resolve(wishlist.data)
                }

                let search = { network_id: mongooseObjectId(network_id), test: false };
                wishlistModel.searchAppId(search, { app_id: 1 }, {})
                    .then(res => {
                        if (res) {
                            let wishlistAppIds = res.map((obj) => obj.app_id);
                            Redis.setRedisSetData('WISHLIST:' + network_id.toString(), wishlistAppIds, process.env.REDIS_Exp);
                            return resolve(wishlistAppIds);
                        }
                        return resolve([]);
                    })
                    .catch(e => {
                        debug(e);
                        return resolve([]);
                    });
            }
            catch (e) {
                debug(e);
                return resolve([]);
            }
        }
    })
}

exports.chunkArrayInGroups = async (arr, size) => {
    return new Promise((resolve, reject) => {
        var result = [];
        var pos = 0;
        while (pos < arr.length) {
            result.push(arr.slice(pos, pos + size));
            pos += size;
        }
        if (pos >= arr.length) {
            return resolve(result);
        }
    })
}

exports.generateTrackingLink = (networkData, offer_id, aff_id, advertiser_id, network_setting) => {

    let tracking_link = '';
    if (networkData.network_unique_id) {
        let linkDomain = `${networkData.network_unique_id}.${process.env.TRACKING_DOMAIN}`;
        if (networkData['domain'] && networkData['domain']['tracker']) {
            linkDomain = networkData['domain']['tracker']
        }
        tracking_link = "http://" + linkDomain + "/" + process.env.TRACKING_PATH + "?offer_id=" + offer_id + "&aff_id=" + aff_id + "&adv_id=" + advertiser_id + "&" + network_setting;
        tracking_link = tracking_link.replace(/&adv_id=true/g, '')
    }
    return tracking_link;
}

exports.findDeviceVersion = (version_arr) => {
    let ios_version = '';
    let android_version = '';
    try {
        version_arr.map(obj => {
            obj = obj.toLowerCase();
            let ver = obj.split(' ');
            let version = '';
            if (ver[1]) {
                version = ver[1];
            }
            else if (ver[0]) {
                version = ver[0];
            }
            if (version.includes('.x')) {
                version = version.split('.x')[0];
            }
            if (obj.includes('ios')) {
                if (ios_version && !isNaN(version)) {
                    if (ios_version > version) {
                        ios_version = version;
                    }
                }
                else if (!isNaN(version)) {
                    ios_version = version;
                }
            }
            else if (obj.includes('android')) {
                if (android_version && !isNaN(version)) {
                    if (android_version > version) {
                        android_version = version;
                    }
                }
                else if (!isNaN(version)) {
                    android_version = version;
                }
            }
        })
    }
    catch {

    }
    return { ios: ios_version, android: android_version };
}


exports.publishJobForWebhook = async (network_id, offersIds, event, source = "", priority = 1) => {

    let pushedOfferCount = 0;

    let webhookSetting = await Redis.getRedisHashData("webhooksetting:", network_id).data;
    if (!webhookSetting || !webhookSetting.length) {
        webhookSetting = await webhookModel.findwebhookSetting({ network_id: mongooseObjectId(network_id) })
        Redis.setRedisHashData("webhooksetting:", network_id, webhookSetting, 3600)
    }
    if (webhookSetting && webhookSetting.length && (webhookSetting[0].event == event || webhookSetting[0].event == 'both') && webhookSetting[0].pause == false) {
        if (offersIds.length > 50) {
            let batchesIds = await this.chunkArrayInGroups(offersIds, 50);
            for (let idArray of batchesIds) {
                let webHookJobData = { offersId: idArray, network_id: webhookSetting[0]['network_id'], event: webhookSetting[0].event, source: source, ver: 1 }
                let pubRes = await priorityRabbitMQ.publish_Content(isMultipleContent = false, webhook_queue, webHookJobData, true, true, priority);
                if (pubRes) { pushedOfferCount += idArray.length }
            }
        } else {
            let webHookJobData = { offersId: offersIds, network_id: webhookSetting[0]['network_id'], event: webhookSetting[0].event, source: source, ver: 1 }
            let pubRes = await priorityRabbitMQ.publish_Content(isMultipleContent = false, webhook_queue, webHookJobData, true, true, priority);
            if (pubRes) { pushedOfferCount += offersIds.length }
        }
    }

    return pushedOfferCount;

    // let webhookSetting = await Redis.getRedisHashData("webhooksetting:", network_id);
    // if (webhookSetting.data && webhookSetting.data.length) {
    //     if ((webhookSetting.data[0].event == event || webhookSetting.data[0].event == "both") && webhookSetting.data[0].pause == false) {
    //         if (offersIds.length > 50) {
    //             let batchesIds = await this.chunkArrayInGroups(offersIds, 50);
    //             for (let idArray of batchesIds) {
    //                 let webHookJobData = { offersId: idArray, network_id: webhookSetting.data[0].network_id, event: webhookSetting.data[0].event, source: source, ver: 1 }
    //                 // await rabbitMq.publish_Persistent_Content(isMultipleContent = false, webhook_queue, webHookJobData, true, true);
    //                 await priorityRabbitMQ.publish_Content(isMultipleContent = false, webhook_queue, webHookJobData, true, true, priority);
    //             }
    //         } else {
    //             let webHookJobData = { offersId: offersIds, network_id: webhookSetting.data[0].network_id, event: webhookSetting.data[0].event, source: source, ver: 1 }
    //             // await rabbitMq.publish_Persistent_Content(isMultipleContent = false, webhook_queue, webHookJobData, true, true);
    //             await priorityRabbitMQ.publish_Content(isMultipleContent = false, webhook_queue, webHookJobData, true, true, priority);
    //         }
    //     }
    // }
    // else {
    //     let WebhookData = await webhookModel.findwebhookSetting({ network_id: mongooseObjectId(network_id) })
    //     if (WebhookData && WebhookData.length) {
    //         if ((WebhookData[0].event == event || WebhookData[0].event == 'both') && WebhookData[0].pause == false) {
    //             if (offersIds.length > 50) {
    //                 let batchesIds = await this.chunkArrayInGroups(offersIds, 50);
    //                 for (let idArray of batchesIds) {
    //                     let webHookJobData = { offersId: idArray, network_id: WebhookData[0]['network_id'], event: WebhookData[0].event, source: source, ver: 1 }
    //                     // await rabbitMq.publish_Persistent_Content(isMultipleContent = false, webhook_queue, webHookJobData, true, true);
    //                     await priorityRabbitMQ.publish_Content(isMultipleContent = false, webhook_queue, webHookJobData, true, true, priority);
    //                 }
    //             } else {
    //                 let webHookJobData = { offersId: offersIds, network_id: WebhookData[0]['network_id'], event: WebhookData[0].event, source: source, ver: 1 }
    //                 // await rabbitMq.publish_Persistent_Content(isMultipleContent = false, webhook_queue, webHookJobData, true, true);
    //                 await priorityRabbitMQ.publish_Content(isMultipleContent = false, webhook_queue, webHookJobData, true, true, priority);
    //             }
    //         }
    //         Redis.setRedisHashData("webhooksetting:", network_id, WebhookData, 3600)
    //     }
    // }
}

exports.publishJobForWebhookV2 = async (offerIdsWithNetwork, event, source = "", priority = 1) => {

    let pushedOfferCount = 0;

    for (const network_id in offerIdsWithNetwork) {
        if (Object.hasOwnProperty.call(offerIdsWithNetwork, network_id)) {
            let webhookSetting = await Redis.getRedisHashData("webhooksetting:", network_id).data;
            if (!webhookSetting || !webhookSetting.length) {
                webhookSetting = await webhookModel.findwebhookSetting({ network_id: mongooseObjectId(network_id) })
                Redis.setRedisHashData("webhooksetting:", network_id, webhookSetting, 3600)
            }
            if (webhookSetting && webhookSetting.length && (webhookSetting[0].event == event || webhookSetting[0].event == 'both') && webhookSetting[0].pause == false) {

                const offersIds = offerIdsWithNetwork[network_id];

                if (offersIds.length > 50) {
                    let batchesIds = await this.chunkArrayInGroups(offersIds, 50);
                    for (let idArray of batchesIds) {
                        let webHookJobData = { offersId: idArray, network_id: webhookSetting[0]['network_id'], event: webhookSetting[0].event, source: source, ver: 1 }
                        let pubRes = await priorityRabbitMQ.publish_Content(isMultipleContent = false, webhook_queue, webHookJobData, true, true, priority);
                        if (pubRes) { pushedOfferCount += idArray.length }
                    }
                } else {
                    let webHookJobData = { offersId: offersIds, network_id: webhookSetting[0]['network_id'], event: webhookSetting[0].event, source: source, ver: 1 }
                    let pubRes = await priorityRabbitMQ.publish_Content(isMultipleContent = false, webhook_queue, webHookJobData, true, true, priority);
                    if (pubRes) { pushedOfferCount += offersIds.length }
                }
            }
        }
    }

    return pushedOfferCount;
}

exports.sendJobToGenericWorker = async (content, priority = 10) => {
    try {
        let publishResult = await priorityRabbitMQ.publish_Content(isMultipleContent = false, 'Generic_Worker_Queue', content, true, true, priority);
        return publishResult;
    } catch (error) {
        console.log("darwin:Helpers:Functions:publishJobForMainWorker", error)
        return false;
    }
}
exports.sendJobForApply = async (content, priority = 15) => {
    try {
        let publishResult = await priorityRabbitMQ.publish_Content(isMultipleContent = false, 'ApplyOfferFromUi', content, true, true, priority);
        return publishResult;
    } catch (error) {
        console.log("darwin:Helpers:Functions:applyOfferFromUi", error);
        return false;
    }
}

exports.formatMongooseIdArray = (arrayList) => {
    let objectIdList = [];
    arrayList.forEach(element => {
        if (element && mongooseObjectId.isValid(element)) {
            let id = mongooseObjectId(element);
            objectIdList.push(id);
        }
    });
    return objectIdList;
}

exports.payoutPercentFallback = async (offer_id, pid = null) => {

    let payout_percent = 0;

    if (offer_id) {
        let result = await OfferModel.getOneOffer({ _id: mongooseObjectId(offer_id) }, { _id: 0, publisher_offers: 1, advertiser_platform_id: 1 });
        if (result && result.publisher_offers && result.publisher_offers.length && pid) {
            for (const publisherData of result.publisher_offers) {
                if (publisherData.publisher_id == pid) {
                    payout_percent = publisherData.publisher_payout_percent;
                    break
                }
            }
            if (payout_percent) {
                return +payout_percent
            }
        }
        result = await PlatformModel.getOnePlatform({ _id: mongooseObjectId(result.advertiser_platform_id) }, { payout_percent: 1 });
        if (result && result.payout_percent) {
            return +result.payout_percent
        }
    }
    return 100
}

exports.seprateCommaIntoArray = (stringValue) => {
    let arrayList = stringValue.split(',');
    // search max value 10
    if (arrayList.length > 10) {
        arrayList = arrayList.splice(0, 10);
    }
    return arrayList;
}

exports.convertStringIntoIntArray = (stringArray) => {
    let intArrayList = [];
    if (stringArray.length) {
        stringArray.forEach(element => {
            intArrayList.push(+element);
        });
    }
    return intArrayList;
}

exports.formatMongooseIdArray = (arrayList) => {
    let objectIdList = [];
    arrayList.forEach(element => {
        if (element && mongooseObjectId.isValid(element)) {
            let id = mongooseObjectId(element);
            objectIdList.push(id);
        }
    });
    return objectIdList;
}

exports.saveUserActivity = async (req, res, next) => {

    try {
        let userData = req.user.userDetail
        let activityData = {
            "network_id": mongooseObjectId(userData.network[0]),
            "user_id": mongooseObjectId(userData.id),
            "name": userData.name,
            "email": userData.email,
            "url_path": req.path
        }
        if (req.body.log_status) {
            activityData['log'] = req.body.log_status
        }
        await UserActivityLog.saveUserActivityLog(activityData)
        next()
    } catch (error) {
        console.log("file: Auth.js ~ line 267 ~ saveUserActivity ~ error", error)
    }
}

exports.validateMongooseObjectIdArray = (arrayList) => {
    let result = { validMongooseObjectIdArray: [], invalidMongooseObjectIdArray: [] };
    arrayList.forEach(element => {
        let id = element ? element.trim() : '';
        if (id) {
            if (mongooseObjectId.isValid(id)) {
                result['validMongooseObjectIdArray'].push(mongooseObjectId(id));
            } else {
                result['invalidMongooseObjectIdArray'].push(id);
            }
        }
    });
    return result;
}

exports.getPublisherOffer = async (advertiser_id, pay, pubList) => {
    return new Promise(async (resolve, reject) => {
        let pubOff = [];
        try {
            for (let pub of pubList) {
                if (pub['appr_adv_opt'] == 105) {
                    // Pre Approve All
                    pubOff.push({
                        id: pub['pid'],
                        // pay: pay,
                        pubOffSt: 1
                    });
                } else if (pub['appr_adv'] && pub['appr_adv'].length) {
                    if (pub['appr_adv_opt'] == 104) {
                        // Pre Approve Selected
                        if (pub['appr_adv'].toString().split(',').includes(advertiser_id)) {
                            pubOff.push({
                                id: pub['pid'],
                                // pay: pay,
                                pubOffSt: 1
                            });
                        }
                    } else if (pub['appr_adv_opt'] == 106) {
                        // Pre Approve Other Than Selected
                        if (!pub['appr_adv'].toString().split(',').includes(advertiser_id)) {
                            pubOff.push({
                                id: pub['pid'],
                                // pay: pay,
                                pubOffSt: 1
                            });
                        }
                    }
                }
            }
            resolve(pubOff);
        } catch (error) {
            debug(error);
            resolve(pubOff);
        }
    });
}

exports.getNetworkData = async (networkId) => {

    try {
        let redisRes = await Redis.getRedisHashData('networks', networkId);
        if (redisRes && redisRes.data) {
            return redisRes.data;
        }
        let filter = { _id: mongooseObjectId(networkId) };
        let projection = { network_unique_id: 1, network_publisher_setting_string: 1, country: 1, status: 1, company_name: 1, domain: 1 };
        let networkData = await NetworkModel.findOneNetwork(filter, projection);
        if (networkData.length) {
            Redis.setRedisHashData('networks', networkId, networkData[0], 36000);
            return networkData[0];
        }
    }
    catch (error) {
        console.log("File: Functions.js ~ line 861 ~ error ~ ", error)
        let filter = { _id: mongooseObjectId(networkId) };
        let projection = { network_unique_id: 1, network_publisher_setting_string: 1, country: 1, status: 1, company_name: 1, domain: 1 };
        let networkData = await NetworkModel.findOneNetwork(filter, projection);
        if (networkData.length) {
            Redis.setRedisHashData('networks', networkId, networkData[0], 36000);
            return networkData[0];
        }
    }
}

exports.getNid = async (network_id) => {
    try {
        let redisData = await Redis.getRedisData(`NID:${network_id.toString()}`);
        if (redisData.data) {
            return +redisData.data;
        } else {
            let docs = await NetworkModel.getOneNetwork({ _id: mongooseObjectId(network_id) }, { _id: 0, nid: 1 }) || {};
            if(docs.nid){
                Redis.setRedisData(`NID:${network_id.toString()}`, docs.nid);
                Redis.setRedisData(`NID2:${network_id.toString()}`, docs.nid);
                return docs.nid;
            }else{
                return null;
            }
        }
    } catch(err) {
        console.log(" error ", err )
        return null;
    }
}

exports.getAid = async (advertiser_id) => {
    try {
        let redisData = await Redis.getRedisData(`AID:${advertiser_id.toString()}`);
        if (redisData.data) {
            return +redisData.data;
        } else {
            let docs = await AdvertiserModel.searchOneAdvertiser({ _id: mongooseObjectId(advertiser_id) }, { _id: 0, aid: 1 }) || {};
            if(docs.aid){
                Redis.setRedisData(`AID:${advertiser_id.toString()}`, docs.aid);
                Redis.setRedisData(`AID2:${advertiser_id.toString()}`, docs.aid);
                return docs.aid;
            }else{
                return null;
            }
        }
    } catch(err) {
        console.log("err ", err);
        return null
    }
}

exports.getPlty = async (platform_id) => {
    try {
        let redisData = await Redis.getRedisData(`PLTY:${platform_id.toString()}`);
        if (redisData.data) {
            return +redisData.data;
        } else {
            let docs = await PlatformTypeModel.getPlatformTypesOne({ _id: mongooseObjectId(platform_id) }, { _id: 0, plty: 1 }) || {};
            if(docs.plty){
                Redis.setRedisData(`PLTY:${platform_id.toString()}`, docs.plty);
                Redis.setRedisData(`PLTY2:${platform_id.toString()}`, docs.plty);
                return docs.plty;
            }else{
                return null;
            }
        }
    } catch(err) {
        console.log(" err ", err);
        return null
    }
}

exports.getPlid = async (advertiser_platform_id) => {
    try {
        let redisData = await Redis.getRedisData(`PLID:${advertiser_platform_id.toString()}`);
        if (redisData.data) {
            return +redisData.data;
        } else {
            let docs = await PlatformModel.getOnePlatform({ _id: mongooseObjectId(advertiser_platform_id) }, { _id: 0, plid: 1 })|| {};
            if(docs.plid){
                Redis.setRedisData(`PLID:${advertiser_platform_id.toString()}`, docs.plid);
                Redis.setRedisData(`PLID2:${advertiser_platform_id.toString()}`, docs.plid);
                return docs.plid;
            }else{
                return null;
            }
        }
    } catch(err) {
        console.log(" err ", err);
        return null
    }
}
exports.getCountryCode = (countryName) => {
    let countryCode = ''
    for (const doc of config.country) {
        if (doc.value.toLowerCase() == countryName.toLowerCase()) {
            countryCode = doc.key;
            break;
        }
    }
    return countryCode;
}
exports.getAllCountryList = () => {
    return config.country.map(ele => ({ key: ele.key, value: ele.key }))
}


// const { OpenAI } = require('openai');

// exports.openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY, // use .env for safety
// });

