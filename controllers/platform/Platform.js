const Mongoose = require('mongoose');
const debug = require("debug")("darwin:Controller:platform");
const mongooseObjectId = Mongoose.Types.ObjectId;
const { PlatformTypeModel, PlatformModel } = require('../../db/platform/Platform');
const Response = require('../../helpers/Response');
const { payloadType } = require('../../constants/config');
const Functions = require("../../helpers/Functions");
const bcrypt = require('bcryptjs');
const AdvertiserModel = require('../../db//advertiser/Advertiser');
const { checkValidApi } = require('../../plugin/validApi');
const Producer = require('../../helpers/priorityRabbitMQ');
const new_platform_publish_queue = 'Offers_Api_queue';
const Redis = require('../../helpers/Redis');
const { publishOfferApiStats, defaultLog } = require("../../plugin/plugin");
const { getPostbackDomain } = require('../network/networklist');
const {apiPlugins}  = require('../../plugin/index')


exports.savePlaformType = (req, res) => {
    attr = JSON.parse(req.body.attribute);
    let PlatformType = new PlatformTypeModel({
        name: req.body.name.trim(),
        logo: req.body.logo,
        endpoint: req.body.endpoint.trim(),
        type: req.body.type.trim(),
        offer_id_type: req.body.offer_id_type.trim(),
        refresh_time: req.body.refresh_time.trim(),
        api_version: req.body.api_version.trim(),
        attribute: Functions.trimArray(JSON.parse(req.body.attribute)),
        parameter: Functions.trimArray(JSON.parse(req.body.parameter)),
        extraPara: JSON.parse(req.body.extraPara)
    });
    PlatformType.save().then(result => {
        if (!result) {
            let response = Response.error();
            response.msg = "unable to insert data";
            return res.status(400).send(response)
        } else {
            let response = Response.success();
            response.payloadType = payloadType.array;
            response.msg = "successfully save platform";
            return res.status(200).send(response)
        }
    }).catch(err => {
        let response = Response.error();
        response.msg = "unable to insert data";
        response.error = [err.message];
        return res.status(400).send(response)
    })
}

exports.updatePlatformType = async (req, res) => {
    try {
        if (req.params.id && mongooseObjectId.isValid(req.params.id.trim())) {
            let filter = { _id: mongooseObjectId(req.params.id.trim()) };
            let update = {
                name: req.body.name.trim(),
                logo: req.body.logo,
                endpoint: req.body.endpoint.trim(),
                type: req.body.type.trim(),
                offer_id_type: req.body.offer_id_type.trim(),
                refresh_time: req.body.refresh_time.trim(),
                api_version: req.body.api_version.trim(),
                attribute: Functions.trimArray(JSON.parse(req.body.attribute)),
                parameter: Functions.trimArray(JSON.parse(req.body.parameter)),
            };
            if (req.body.extraPara) {
                update['extraPara'] = JSON.parse(req.body.extraPara);
            }
            let result = await PlatformTypeModel.updatePlatformTypes(filter, update);
            if (result) {
                Redis.delRedisHashData('LINKEXTRAPARAM', req.params.id.toString());
                await PlatformModel.updatePlatform({ platform_id: req.params.id.trim() }, { credentials: [] }, {});
                // await PlatformModel.updatePlatforms({ platform_id: req.params.id.trim() }, { $set: { credentials: [] } }, {});
                let response = Response.success();
                response.payloadType = payloadType.object;
                response.payload = {};
                response.msg = "successfully updated";
                return res.status(200).send(response)
            } else {
                let response = Response.error();
                response.msg = "Invalid Request";
                return res.status(400).send(response)
            }
        }
        else {
            let response = Response.error();
            response.msg = "Invalid Request";
            return res.status(400).send(response)
        }
    } catch (err) {
        let response = Response.error();
        response.msg = "unable to execute query";
        response.error = [err.message];
        return res.status(400).send(response)
    }
}
exports.platformTypeExistance = (req, res, next) => {
    if (req.body.name) {
        let filter = { name: req.body.name.trim() };
        let projection = { name: 1 };
        PlatformTypeModel.getPlatformTypes(filter, projection).then(result => {
            if (result.length) {
                let response = Response.error();
                response.msg = "platform type already exist";
                return res.status(400).send(response)
            }
            next();
        })
            .catch(err => {
                let response = Response.error();
                response.error = [err.message];
                response.msg = "unable to execute query";
                return res.status(400).send(response)
            })
    }
    else {
        let response = Response.error();
        response.msg = "Invalid Request";
        return res.status(400).send(response)
    }

}

exports.allPlatform = (req, res) => {

    let filter = {};
    let invalidSearch = false;
    if (req.params.advertiser_id) {
        if (mongooseObjectId.isValid(req.params.advertiser_id.trim())) {
            filter = { advertiser_id: mongooseObjectId(req.params.advertiser_id) }
        }
        else {
            invalidSearch = true;
        }
    }
    else if (req.params.id) {
        if (mongooseObjectId.isValid(req.params.id.trim())) {
            filter = { _id: mongooseObjectId(req.params.id) }
        }
        else {
            invalidSearch = true;
        }
    }
    if (invalidSearch) {
        let response = Response.error();
        response.msg = "No Platform Found...!!";
        response.error = ["no platform found"];
        return res.status(200).json(response);
    }
    filter['network_id'] = mongooseObjectId(req.user.userDetail.network[0]);
    projection = { __v: 0 };
    PlatformModel.getPlatform(filter, projection).then(result => {
        if (result.length == 0) {
            let response = Response.error();
            response.msg = "No Platform Found...!!";
            response.error = ["no platform found"];
            return res.status(200).json(response);
        }
        result[0]['pidLocation'] = apiPlugins[result[0]['platform_name']].getPidLocation()
        let response = Response.success();
        response.payloadType = payloadType.object;
        response.payload = result;
        response.msg = "success";
        return res.status(200).send(response)
    }).catch(err => {
        let response = Response.error();
        response.msg = "unable to execute query";
        response.error = [err.message];
        return res.status(400).send(response)
    })
}

exports.getAdvPlatforms = (req, res, next) => {
    if (!req.params.advertiser_id || !mongooseObjectId.isValid(req.params.advertiser_id.trim())) {
        let response = Response.error();
        response.msg = "Send proper advtiser id.";
        return res.status(200).json(response);
    }

    let filter = { network_id: mongooseObjectId(req.user.userDetail.network[0]), advertiser_id: mongooseObjectId(req.params.advertiser_id) };
    projection = { _id: 1, name: 1, platform_name: 1, platform_id: 1, advertiser_id: 1, advertiser_name: 1, plid: 1, aid: 1, plty: 1 };
    PlatformModel.getPlatform(filter, projection).then(result => {
        if (result && !result.length) {
            let response = Response.error();
            response.msg = "No Platform Found...!!";
            response.error = ["no platform found"];
            return res.status(200).json(response);
        }
        let response = Response.success();
        response.payloadType = payloadType.object;
        response.payload = result;
        response.msg = "success";
        return res.status(200).send(response)
    }).catch(err => {
        let response = Response.error();
        response.msg = "unable to execute query";
        response.error = [err.message];
        return res.status(400).send(response)
    })
}

exports.getApplyPlatformType = async () => {
    let platformtypeData = {} ; 
    let redisKey = 'APPLY_PLATFORM_TYPE_DATA';
    let redisData = await Redis.getRedisSetData(redisKey);
    if(redisData && redisData.data.length ){
        let data  = []
        redisData.data.map(ele=>{
            let dt = ele.split('_');
            data.push({'_id' : dt[0], 'plty' : dt[1]})
        })
        return data;
    }else{
        platformtypeData = await PlatformTypeModel.getPlatformTypes({singleApply : true } , { plty : 1 , _id : 1 });
        if(platformtypeData && platformtypeData.length > 0 ){
            platformtypeData.map(async ele=>{
               await Redis.setRedisSetData(redisKey, ele._id+'_'+ele.plty);
            })
            return platformtypeData || [];
        }else{
            return [];
        }
    }
}
exports.getSingleSyncPlatformType = async () => {

    let platformtypeData = {} ; 
    let redisKey = 'SINGLE_SYNC_PLATFORM_SET';
    let redisData = await Redis.getRedisSetData(redisKey);

    if(redisData && redisData.data.length ){
        let data  = []
        redisData.data.map(ele=>{
            let dt = ele.split('_');
            data.push({'_id' : dt[0], 'plty' : dt[1]})

        })
        return data;
    }else{
        platformtypeData = await PlatformTypeModel.getPlatformTypes({singleSync : true } , { plty : 1 , _id : 1 });
        if(platformtypeData && platformtypeData.length > 0 ){
            platformtypeData.map(async ele=>{
               await Redis.setRedisSetData(redisKey, ele._id+'_'+ele.plty);
            })
            return platformtypeData;
        }else{
            return [];
        }
    }
}

exports.getAdvertiserPlatformData = async( advertiser_platform_id ) => {
    let redisKey = `ADV_PLT_ID:${advertiser_platform_id}`;
    let search = {_id : mongooseObjectId(advertiser_platform_id)};
    let usemongoDb = false; 
    let platformData = {};
    let projections  = {
        'payout_percent': 1,
        'credentials': 1,
        'platform_name': 1,
        'offer_visibility_status': 1,
        'autoFetch': 1,
        'autoApply':1,
        'status' : 1 
    }
    try{
        let redisData =  await Redis.getRedisData(redisKey);
        if(redisData && redisData.data){
            redisData.data  = JSON.parse(redisData.data);
           let requiredFields = [ 'payout_percent' , 'credentials',  'platform_name' , 'offer_visibility_status', 'autoFetch' , 'autoApply', 'status' ];
           let usemongoDb = requiredFields.some(field => !(field in redisData.data)); // Check if key is present, not its value

            if(!usemongoDb){
                return redisData.data || {};
            }
        }else{
            usemongoDb = true;
        }

        if(usemongoDb){
            platformData = await PlatformModel.getOnePlatform(search, projections) || {};
            if(platformData && Object.keys(platformData).length > 0 ){                
                Redis.setRedisData(redisKey, JSON.stringify(platformData), 3600);
                return platformData || {};
            }else{
                return {};
            }
        }
    }catch(err){
        console.log('err',err);
        return {};
    }
}

exports.deletePlatformTypes = (req, res, next) => {
    let filter = {};
    let invalidSearch = false;
    let option = {};
    if (req.params.id) {
        if (mongooseObjectId.isValid(req.params.id.trim())) {
            filter = { _id: mongooseObjectId(req.params.id) }
        }
        else {
            invalidSearch = true;
        }
    }
    if (invalidSearch) {
        let response = Response.error();
        response.msg = "No Platform Found...!!";
        response.error = ["no platform found"];
        return res.status(200).json(response);
    }
    PlatformTypeModel.deletePlatformTypes(filter, option).then(result => {
        let response = Response.success();
        response.payloadType = payloadType.object;
        response.payload = {};
        response.msg = "successfully deleted";
        return res.status(200).send(response)
    }).catch(err => {
        let response = Response.error();
        response.msg = "unable to execute query";
        response.error = [err.message];
        return res.status(400).send(response)
    })
}

exports.deletePlatform = (req, res, next) => {
    let option = {}
    let filter = {};
    let invalidSearch = false;
    if (req.params.id) {
        if (mongooseObjectId.isValid(req.params.id.trim())) {
            filter = { _id: mongooseObjectId(req.params.id) }
        }
        else {
            invalidSearch = true;
        }
    }
    if (invalidSearch) {
        let response = Response.error();
        response.msg = "No Platform Found...!!";
        response.error = ["no platform found"];
        return res.status(200).json(response);
    }

    filter['network_id'] = mongooseObjectId(req.user.userDetail.network[0]);
    PlatformModel.getOnePlatform({ _id: req.params.id }, { status: 1, advertiser_id: 1 }).then(async (findResult) => {
        if (findResult) {
            await deleteAdvertiserPlatforms(findResult.advertiser_id, req.params.id);
            let result = await PlatformModel.deletePlatform(filter, option);
            if (result) {
                let response = Response.success();
                response.payloadType = payloadType.object;
                response.payload = {};
                response.msg = "successfully deleted";
                return res.status(200).send(response)
            }
            let response = Response.error();
            response.msg = "unable to execute query";
            response.error = [err.message];
            return res.status(400).send(response)
        }
        else {
            let response = Response.success();
            response.payloadType = payloadType.object;
            response.payload = {};
            response.msg = "Not Found This Platform ";
            return res.status(200).send(response)
        }
    }).catch(err => {
        let response = Response.error();
        response.msg = "unable to execute query";
        response.error = [err.message];
        return res.status(400).send(response)
    })
}


exports.allPlatformTypes = (req, res, next) => {
    let filter = {};
    let invalidSearch = false;
    if (req.params.id) {
        if (mongooseObjectId.isValid(req.params.id.trim())) {
            filter = { _id: mongooseObjectId(req.params.id) }
        }
        else {
            invalidSearch = true;
        }
    }
    if (invalidSearch) {
        let response = Response.error();
        response.msg = "no platformtype found!!!";
        return res.status(400).send(response)
    }
    projection = { createdAt: 0, updatedAt: 0, __v: 0 };
    PlatformTypeModel.getPlatformTypes(filter, projection).then(result => {
        if (!result.length) {
            let response = Response.error();
            response.msg = "no platformtype found!!!";
            return res.status(400).send(response)
        }
        let response = Response.success();
        response.payloadType = payloadType.object;
        response.payload = {};
        response.payload = result;
        response.msg = "success";
        return res.status(200).send(response)
    }).catch(err => {
        let response = Response.error();
        response.msg = "unable to execute query";
        response.error = [err.message];
        return res.status(400).send(response)
    })
}

exports.getPlatformTypes = (req, res, next) => {
    let filter = {};
    let projection = { name: 1, attribute: 1, parameter: 1, _id: 1, extraPara: 1 };
    PlatformTypeModel.getPlatformTypes(filter, projection).then(async (result) => {
        if (!result.length) {
            let response = Response.error();
            response.msg = "No Platform Type Found!!!";
            return res.status(400).send(response)
        }
        let response = Response.success();
        response.payloadType = payloadType.object;
        response.payload = {
            postbackDomain: await getPostbackDomain(req.user.userDetail.network[0]),
            platformType: {}
        };
        response.msg = "success";
        for (i = 0; i < result.length; i++) {
            data = {};
            data1 = [];
            attr = result[i].attribute
            let pidLocation = apiPlugins[result[i].name] ?  apiPlugins[result[i].name].getPidLocation(): '';
            para = result[i].parameter
            for (j = 0; j < attr.length; j++) {
                data[attr[j].attr_name] = attr[j].attr_description || "";
            }
            if (response.payload.platformType[result[i].name]) {
            } else {
                response.payload.platformType[result[i].name] = {};
                response.payload.platformType[result[i].name]['attributes'] = data;
                response.payload.platformType[result[i].name]['pidLocation'] = pidLocation;
                response.payload.platformType[result[i].name]['parameter'] = para;
                if (result[i]['extraPara']) {
                    response.payload.platformType[result[i].name]['extraPara'] = result[i]['extraPara'];
                }
            }
        }
        return res.status(200).send(response)
    }).catch(err => {
        debug(err)
        let response = Response.error();
        response.error = [err.message];
        response.msg = "unable to execute query";
        return res.status(400).send(response)
    })
}

exports.updatePlatformStatus = async (req, res) => {
    if(req.body && req.body.id){
        let platformData = await PlatformModel.updateOne({ _id : mongooseObjectId(req.body.id)}, { $set : { status : `${ req.body.status }`, comments : req.body.comments } });
        if(platformData  && platformData.ok == 1 ){
            let response = Response.success();
            response.payloadType = [];
            response.payload = [];
            response.msg = "successfully upadated platform";            
            return res.status(200).send(response);
        }else{
            let response = Response.error();
            response.msg = "not update Platform status";
            return res.status(400).send(response);
        }
    }else{
        let response = Response.error();
        response.msg = "Invalid Platform";
        return res.status(400).send(response)
    }

}
exports.updatePlatform = async (req, res) => {
    if (req.params.id) {
        filter = { name: req.body.platform_name };
        projection = { name: 1, attribute: 1 };
        PlatformTypeModel.getPlatformTypes(filter, projection).then(async result => {
            if (result.length != 1) {
                let response = Response.error();
                response.msg = "Invalid Platform Type";
                return res.status(400).send(response)
            }
            // let result_api = await checkValidApi(req.body.name, req.body.credentials, req.body.sampletracking);
            // if (result_api !== true) {
            //     debug(result_api, 'check valid api');
            //     let response = Response.error();
            //     response.msg = result_api;
            //     return res.status(400).send(response);
            // }
            credentials = Functions.trimArray(JSON.parse(req.body.credentials));
            parameters = Functions.trimArray(JSON.parse(req.body.parameters));
            var keys = ['para', 'val'];
            queryParams = '';
            for (let key of parameters) {
                let test = '';
                if (key['val'] == 'custom') {
                    test = key['para'] + '=' + key['custom_val'] + '&';
                } else {
                    test = Functions.obsKeysToString(key, keys, '={')
                }
                queryParams = queryParams + test
            }
            queryParams = queryParams.substring(0, queryParams.length - 1);
            for (i = 0; i < credentials.length; i++) {
                for (j = 0; j < result[0].attribute.length; j++) {
                    if (credentials[i].key == result[0].attribute[j].attr_name) {
                        credentials[i]['used_at'] = result[0].attribute[j].attr_used_at;
                    }
                }
            }
            let filter = { network_id: mongooseObjectId(req.user.userDetail.network[0]), advertiser_id: mongooseObjectId(req.body.advertiser_id), _id: { $ne: mongooseObjectId(req.params.id) }, name: { $regex: `^${req.body.name}$`, $options: 'i' } };
            PlatformModel.getOnePlatform(filter, {}).then(platDbResult => {
                if (platDbResult) {
                    let response = Response.error();
                    response.msg = "Platform Name already exits.";
                    return res.status(400).send(response);
                }
                filter = { _id: req.params.id };
                let update = {
                    //  result[0]._id
                    name: req.body.name,
                    network_id: req.user.userDetail.network,
                    platform_name: req.body.platform_name,
                    platform_id: result[0]._id,
                    login_link: req.body.loginlink,
                    email: req.body.email,
                    status: req.body.status,
                    credentials: credentials,
                    parameters: queryParams,
                    apiStatus: 'active',
                    password: req.body.password,
                    offer_live_type: req.body.offer_live_type,
                    offer_visibility_status: req.body.offer_visibility_status,
                    visibilityUpdate: req.body.visibilityUpdate,
                    publishers: req.body.pid,
                    payout_percent: req.body.payout_percent,
                    sample_tracking: req.body.sampletracking,
                    payCal : req.body.payCal
                };

                PlatformModel.updatePlatform(filter, update).then(async (data) => {

                    let Domain = [];
                    if (req.body.domain_status) {
                        Domain.push(Functions.parseUrl(req.body.sampletracking));
                        if (!data.domain.includes(Domain[0])) {
                            Domain = data.domain.concat(Domain);
                        }
                    }
                    platformData = {
                        'platform_id': mongooseObjectId(data._id),
                        'platform_name': data.platform_name,
                        'domain': Domain,
                        'status': req.body.status,
                        'platform_type_id': result[0]._id,
                    };
                    await updateAdvertiserPlatforms(data.advertiser_id, platformData);
                    Redis.delRedisData("LINKEXTRAPARAM:" + data._id.toString())
                    try {
                        Redis.delRedisData("ADVPTVS");
                    } catch (error) {
                        debug(error);
                    }

                    let response = Response.success();
                    response.payloadType = payloadType.array;
                    response.payload = data;
                    response.msg = "successfully upadated platform";
                    return res.status(200).send(response)
                }).catch(err => {
                    debug(err)
                    let response = Response.error();
                    response.msg = "unable to save platform";
                    response.error = [err.message];
                    return res.status(400).send(response)
                });
            }).catch(err => {
                debug(err)
                let response = Response.error();
                response.msg = "unable to save platform";
                response.error = [err.message];
                return res.status(400).send(response)
            });
        }).catch(err => {
            debug(err);
            let response = Response.error();
            response.msg = "no record found";
            response.error = [err.message];
            return res.status(400).send(response)
        });
    }
}

exports.checkApidetails = async (req, res) => {
    try {
        if (req.body && req.body.platform_name && req.body.credentials && req.body.credentials.length) {
            let result_api = await checkValidApi(req.body.platform_name, req.body.credentials, req.body.sampletracking, req.body.typeSuperAdmin);
            if (result_api.success !== true) {
                // debug(result_api, 'check valid api');
                let response = Response.error();
                response.msg = result_api.msg;
                return res.status(200).send(response)
            }
            let response = Response.success();
            response.payloadType = payloadType.array;
            response.payload = [];
            response.msg = result_api.msg;
            return res.status(200).send(response)
        }
        else {
            let response = Response.error();
            response.msg = 'Invalid Request';
            return res.status(400).send(response)
        }
    }
    catch (err) {
        let response = Response.error();
        response.error = [err.message];
        response.msg = 'Internal Server Error, Try Later';
        return res.status(400).send(response)
    }
}

exports.addPlatform = async (req, res) => {
    if (!req.params.advertiser_id) {
        let response = Response.error();
        response.msg = "Send Advertiser Id!";
        return res.status(400).send(response)
    }

    AdvertiserModel.getAdvertiser({ _id: mongooseObjectId(req.params.advertiser_id) }, { company: 1, aid: 1 }).then(advDbResult => {
        if (advDbResult && !advDbResult.length) {
            let response = Response.error();
            response.msg = "no Advertiser found!!!";
            return res.status(400).send(response)
        }
        PlatformTypeModel.getPlatformTypes({ name: req.body.platform_name }, { name: 1, attribute: 1, plty: 1 }).then(platTypeDbResult => {
            if (platTypeDbResult && !platTypeDbResult.length) {
                let response = Response.error();
                response.msg = "Invalid Platform Type";
                return res.status(400).send(response)
            }

            let filter = { network_id: req.user.userDetail.network, advertiser_id: req.params.advertiser_id, name: { $regex: `^${req.body.name.trim()}$`, $options: 'i' } };
            PlatformModel.getPlatform(filter, {}).then(platDbResult => {
                let credentials = Functions.trimArray(JSON.parse(req.body.credentials));
                if (platDbResult && platDbResult.length) {
                    let credentialsVal = credentials.map(obj => obj.val);
                    let platfromExitsStatus = platDbResult[0]['credentials'].every(obj => credentialsVal.includes(obj.val))
                    if (platfromExitsStatus) {
                        let response = Response.error();
                        response.msg = "platform already exist";
                        return res.status(400).send(response)
                    }
                }

                parameters = Functions.trimArray(JSON.parse(req.body.parameters));
                var keys = ['para', 'val'];
                queryParams = '';
                for (let key of parameters) {
                    test = Functions.obsKeysToString(key, keys, '={')
                    queryParams = queryParams + test
                }
                queryParams = queryParams.substring(0, queryParams.length - 1);

                for (i = 0; i < credentials.length; i++) {
                    for (j = 0; j < platTypeDbResult[0].attribute.length; j++) {
                        if (credentials[i].key == platTypeDbResult[0].attribute[j].attr_name) {
                            credentials[i]['used_at'] = platTypeDbResult[0].attribute[j].attr_used_at;
                        }
                    }
                }

                let Platform = new PlatformModel({
                    network_id: req.user.userDetail.network,
                    nid: req.user.userDetail.nid,
                    name: req.body.name,
                    platform_name: req.body.platform_name,
                    platform_id: platTypeDbResult[0]._id,
                    plty: platTypeDbResult[0].plty,
                    login_link: req.body.loginlink,
                    email: req.body.email,
                    status: req.body.status,
                    credentials: credentials,
                    parameters: queryParams,
                    advertiser_id: req.params.advertiser_id,
                    advertiser_name: advDbResult[0].company,
                    aid: advDbResult[0].aid,
                    password: req.body.password,
                    apiStatus: 'active',
                    offer_live_type: req.body.offer_live_type,
                    offer_visibility_status: req.body.offer_visibility_status,
                    visibilityUpdate: req.body.visibilityUpdate,
                    publishers: req.body.pid,
                    payout_percent: req.body.payout_percent,
                    sample_tracking: req.body.sampletracking,
                    payCal : req.body.payCal , 
                });

                let jobCredentials = {};
                Platform.credentials.map(apiCredentials => {
                    jobCredentials[apiCredentials.key] = apiCredentials.val;
                })
                Platform.save().then(async (data) => {
                    let Domain = [];
                    if (req.body.domain_status) {
                        Domain.push(Functions.parseUrl(req.body.sampletracking));
                        if (!data.domain.includes(Domain[0])) {
                            Domain = data.domain.concat(Domain);
                        }
                    }
                    platformData = {
                        'platform_id': mongooseObjectId(data._id),
                        'platform_name': data.platform_name,
                        'domain': Domain,
                        'status': data.status,
                        'platform_type_id': platTypeDbResult[0]._id,
                    };
                    await updateAdvertiserPlatforms(req.params.advertiser_id, platformData);

                    try {
                        let jobContent = {
                            network_id: Platform.network_id,
                            nid: Platform.nid,
                            advertiser_id: Platform.advertiser_id,
                            aid: Platform.aid,
                            advertiser_name: Platform.advertiser_name,
                            platform_id: Platform.platform_id,
                            plty: Platform.plty,
                            platform_name: Platform.platform_name,
                            credentials: jobCredentials,
                            offer_live_type: Platform.offer_live_type,
                            visibility_status: Platform.offer_visibility_status,
                            publishers: Platform.publishers,
                            payout_percent: Platform.payout_percent,
                            advertiser_platform_id: Platform._id,
                            plid: Platform.plid
                        }

                        let offerLog = defaultLog();
                        let saveStatus = await publishOfferApiStats(offerLog, jobContent, remarks = "In Queue");
                        if (saveStatus) {
                            jobContent['offer_api_stats_id'] = saveStatus;
                        }
                        Producer.publish_Content(false, new_platform_publish_queue, jobContent, true, true, 20);
                        // Functions.sendJobToGenericWorker({ workerName: "newPlatformApi", workerData: jobContent });
                    }
                    catch (e) {
                        debug(e);
                    }
                    let response = Response.success();
                    response.payloadType = payloadType.array;
                    response.payload = data;
                    response.msg = "successfully save platform";
                    return res.status(200).send(response);
                }).catch(err => {
                    debug(err)
                    let response = Response.error();
                    response.msg = "unable to save platform";
                    response.error = [err.message];
                    return res.status(400).send(response)
                });
            }).catch(err => {
                debug(err)
                let response = Response.error();
                response.error = [err.message];
                response.msg = "unable to check platform exit or not";
                return res.status(400).send(response)
            });
        }).catch(err => {
            debug(err)
            let response = Response.error();
            response.error = [err.message];
            response.msg = "unable to get platform type";
            return res.status(400).send(response)
        });
    }).catch(err => {
        debug(err)
        let response = Response.error();
        response.error = [err.message];
        response.msg = "unable to find advertiser.";
        return res.status(400).send(response)
    });
}
exports.getplatformTypeName = (req, res) => {
    let filter = {};
    projection = { name: 1, _id: 1 }
    PlatformTypeModel.getPlatformTypes_Name(filter, projection)
        .then(result => {
            let response = Response.success();
            response.payloadType = payloadType.array;
            response.payload = result;

            if (result.length > 0) {
                response.msg = " Data Found "
            } else {
                response.msg = " Data Not Found "
            }
            //   debug(response);
            return res.status(200).json(response);
        }).catch(err => {
            debug(err);
            let response = Response.error();
            response.error = [err.message];
            response.msg = " error while getting "
            return res.status(200).json(response);
        });
};

async function updateAdvertiserPlatforms(advertiser_id, platformData) {
    try {
        let filter = { "_id": mongooseObjectId(advertiser_id), "platforms.platform_id": mongooseObjectId(platformData.platform_id) };
        let result = await AdvertiserModel.getAdvertiser(filter, { "platforms": 1 }, {});
        if (result && result.length > 0) {
            for (let item of result[0]['platforms']) {
                if (item['platform_id'].toString() === platformData['platform_id'].toString()) {
                    for (let domain of item['domain']) {
                        if (!platformData["domain"].includes(domain)) {
                            platformData['domain'].push(domain);
                        }
                    }
                    await AdvertiserModel.updateAdvertiserData({ "_id": mongooseObjectId(advertiser_id) }, { $pull: { "platforms": { "platform_id": mongooseObjectId(item['platform_id']) } } });
                }
            }
        }
        await AdvertiserModel.updateAdvertiserData({ "_id": mongooseObjectId(advertiser_id) }, { $push: { "platforms": platformData } });
    } catch (error) {
        console.log(error);
    }
}

async function deleteAdvertiserPlatforms(advertiser_id, platform_id) {
    try {
        let filter = { "_id": mongooseObjectId(advertiser_id) };
        let update = { $pull: { "platforms": { "platform_id": mongooseObjectId(platform_id) } } };
        await AdvertiserModel.updateAdvertiserData(filter, update);
    } catch (error) {
        console.log(error);
    }
}

exports.updatePlatformByPublisher = async (req, res) => {
    try {
        let filter = {
            'network_id': mongooseObjectId(req.user.userDetail.network[0]),
            'publishers': { $nin: [+req.params.id, 'all'] },
            'status': 1
        };
        if (req.body.advertisers.length == 1) {
            filter['advertiser_id'] = req.body.advertisers[0];
        } else {
            filter['advertiser_id'] = { $in: req.body.advertisers };
        }
        let update = {
            offer_live_type: req.body.offerLiveStatus,
            offer_visibility_status: req.body.offerStatus,
            $push: { 'publishers': +req.params.id }
        };
        await PlatformModel.updatePlatforms(filter, update, {});
        let response = Response.success();
        response.msg = "Platform updated successfully.";
        return res.status(200).json(response);
    } catch (error) {
        let response = Response.error();
        response.error = [error.message];
        response.msg = "Something went wrong. Please try again later.";
        return res.status(200).json(response);
    }
}

exports.getPlatform = async (req, res) => {
    try {
        let result = await PlatformModel.getPlatform({ status: "1" }, { _id: 1, advertiser_name: 1, apiStatus: 1, platform_name: 1 }, {});
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

exports.updatePlatformAuto = async (req, res) => {
    try {
        let update = {};
        if (req.body.autoApply == true || req.body.autoApply == false) {
            update['autoApply'] = req.body.autoApply;
        } else if (req.body.autoFetch == true || req.body.autoFetch == false) {
            update['autoFetch'] = req.body.autoFetch;
        }
        let result = await PlatformModel.updatePlatform({ _id: mongooseObjectId(req.body.id) }, { $set: update });
        if (result && result['_id']) {
            let response = Response.success();
            response.msg = "success";
            return res.status(200).json(response);
        } else {
            let response = Response.error();
            response.error = ['unable to update'];
            response.msg = "Something went wrong. Please try again later.";
            return res.status(200).json(response);
        }
    } catch (error) {
        let response = Response.error();
        response.error = [error.message];
        response.msg = "Something went wrong. Please try again later.";
        return res.status(200).json(response);
    }
}

exports.getAll = async (req, res) => {
    try {
        const match = {
            status: "1"
        };

        const group = {
            $group: {
                _id: "$platform_name", platform: { $first: "$$ROOT" }
            }
        };

        const project = {
            $project: {
                platform: "$platform",_id:0
            }
        };

        const sort = {
            $sort: { platform_name:1  }
        };

        const platforms = await PlatformModel.getAllPlatforms(match, group,sort, project);

        if (platforms) {
            const response = Response.success();
            response.payloadType = payloadType.object;
            response.payload = platforms;
            response.msg = "get all platforms Successfully";
            return res.status(200).json(response);
        }

        // In case platforms is falsy
        const response = Response.error();
        response.msg = "No platforms found";
        return res.status(404).json(response);

    } catch (error) {
        const response = Response.error();
        response.error = [error.message];
        response.msg = 'Something went wrong. Please try again later.';
        return res.status(500).json(response);
    }
};

exports.testApi=async(req,res)=>{
     try {
           if (!req.body && !req.body.credential) {
               let response = Response.error();
               response.msg = "Invalid request";
               return res.status(400).send(response);
           }
   
            let credential=req.body.credential
            let platform_name=req.body.credential.platform_name
            console.log("platform_name",platform_name)
            console.log("credential--",credential);
           let result;
           try {
               let page = 1
               if (platform_name.trim() == 'Offer18') {
                   page = 0
               }
               result = await apiPlugins[platform_name.trim()].apiCall(credential, page, 100);
               console.log("result--",result)
           } catch (apiCallError) {
               let response = Response.error();
               response.msg = 'Update Network Domain or Api url not working, error';
               return res.status(400).send(response);
           }
   
           if (result && result.data) {
               let response = Response.success();
               response.payload = result.data;
               response.msg = "success";
               return res.status(200).send(response)
           }
           else {
               let response = Response.error();
               response.msg = 'Check Network Domain or Api url not working';
               return res.status(200).send(response);
           }
       } catch (error) {
           debug(error)
           let response = Response.error();
           response.error = [error.message];
           response.msg = "Something Went Wrong!";
           return res.status(400).send(response);
       }
}