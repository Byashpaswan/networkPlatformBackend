const Mongoose = require('mongoose');
const mongooseObjectId = Mongoose.Types.ObjectId;
//const debug = required("debug")("darwin:Controller:Network");
const Network = require('../../db/network/Network');
const Response = require('../../helpers/Response');
const { payloadType } = require('../../constants/config');
// const network = Mongoose.model('network');
const Functions = require("../../helpers/Functions");
const Redis = require('../../helpers/Redis');
const fs = require('fs');
const handlingDomainModel  = require('../../db/handlingDomain/handlingDomain');
const { error } = require('console');
const FeaturesModel  = require('../../db/features/feature');
const UserModel = require("../../db/user/User");

exports.getPostbackDomain = async (networkId) => {
    const networkDomain = {
        "5e4d056eeb383b291949a3df": "cost2action.g2prof.net",
        "5e4d069278af0f2923e289fb": "andromobi.g2prof.net",
        "5e4d0702eb383b291949a3e3": "adsever.g2prof.net",
        "5e4d077078af0f2923e289ff": "t.adsdolf.in",
        "5e4d07f0eb383b291949a3e7": "track.crossway.rocks",
        "606d57c90ed8256e416fd9e0": "offerrobo.g2prof.net",
        "6231e2ced133d53d82ffb22b": "grootmobi.g2prof.net",
        "62a2fd31373f8b66bd20d4ec": "pantherads.g2prof.net"
    };
    let domain = networkDomain[networkId.toString()];
    try {
        const result = await Network.findOneDoc({ "_id": mongooseObjectId(networkId) }, { "domain.tracker": 1 });
        if (result['domain'] && result['domain']['tracker']) {
            domain = result['domain']['tracker'];
        }
        return domain;
    } catch (error) {
        return domain;
    }
}

exports.allNetwork = (req, res) => {
    let filter = {};
    projection = {
        'company_name': 1, 'owner.first_name': 1, 'owner.last_name': 1,
        'owner.phone': 1, 'website': 1, 'address.country': 1, 'owner.email': 1,
    };
    Network.findAllNetwork(filter, projection)
        .then(result => {
            if (!result) {
                let response = Response.error();
                response.payloadType = payloadType.array;
                response.payload = result;
                response.msg = "no network found!!!";
                return res.status(400).send(response)
            }
            else if (result && result.length == 0) {
                return res.send('length <0')
            }
            else {
                return res.send(result);
            }
        }).catch(err => {
            let response = Response.error();
            response.error = [err.message];
            response.msg = " error while getting "
            return res.status(200).json(response);
        });
};
exports.getOneNetwork = (req, res) => {
    let filter = {}
    projection = {}
    if (req.params.netId !== undefined && req.params.netId != '') {
        filter = { _id: req.params.netId.trim() };
    }
    else {
        filter = { _id: req.user.userDetail.network };
    }
    if (req.body.phone !== undefined && req.body.phone != '') {
        filter['owner.phone'] = req.body.phone.trim();
    }
    if (req.body.email !== undefined && req.body.email != '') {
        filter['owner.email'] = req.body.email.trim();
    }
    Network.findOneNetwork(filter, projection)
        .then(note => {
            if (!note.length) {
                let response = Response.error();
                response.payloadType = payloadType.array;
                response.msg = "no record found!!!";
                response.error = ["no data found"];
                return res.status(200).send(response)
            }
            res.send(note);
        }).catch(err => {
            let response = Response.error();
            response.error = [err.message];
            response.msg = " error while  saving "

            return res.status(200).json(response);
        })
};
// Delete a Network with the specified netId in the request
exports.deleteNetwork = (req, res) => {
    Network.findByIdAndRemove(req.params.netId)
        .then(note => {
            let response = Response.success();
            response.payloadType = payloadType.array;
            response.msg = "Note deleted successfully!"
            return res.status(200).json(response);
        }).catch(err => {
            if (err.kind === 'ObjectId' || err.name === 'NotFound') {
                let response = Response.error();
                response.msg = "error fetching data";
                response.error = [err.message];
                return res.status(200).json(response);
            }
            return res.status(500).json(response);
        });
};
exports.getSettings = async (req, res) => {
    try {
        let filter = { _id: req.user.userDetail.network };
        let projection = { network_publisher_setting: 1, postback_forwarding_setting: 1, "address.country": 1, current_timezone: 1, network_publisher_setting_string: 1, domain: 1,pidPrefix:1,ip_block_without_test_click:1,ip_block_with_test_click:1,ipOfferBlockLimit:1,ipAppBlockLimit:1,advLink:1,pubLink:1,offer_export_setting:1,cpp:1 };
        let result = await Network.findOneNetwork(filter, projection);
        if (result) {
            let response = Response.success();
            response.payloadType = payloadType.array;
            response.payload = result[0];
            response.msg = "success";
            return res.status(200).send(response)
        }
    } catch (err) {
        let response = Response.error();
        response.payloadType = payloadType.array;
        response.error = [err.message];
        response.msg = "Error getting network settings";
        return res.status(400).send(response)
    }

}
exports.saveSetting = async (req, res) => {
    try {
        if (!req.body.parameter && !req.body.customParameters) {
            let response = Response.error();
            response.msg = "Invalid or Incomplete data Request";
            response.error = ["Parameters are not provided"];
            return res.status(400).json(response);
        }
        let settings = Functions.trimArray(JSON.parse(req.body.parameter));
        let customsettings = Functions.trimArray(JSON.parse(req.body.customParameters));
        let uniqueSettings = {};
        for (let i of settings) {
            if (uniqueSettings[i['key']]) {
                uniqueSettings[i['key']].push(i['val']);
            } else {
                uniqueSettings[i['key']] = [i['val']];
            }
        }
        let count = 1;
        for (let i of customsettings) {
            if (uniqueSettings[i['key']]) {
                uniqueSettings[i['key']].push('custom' + count);
            } else {
                uniqueSettings[i['key']] = ['custom' + count];
            }
            count++;
        }

        let index = Object.keys(uniqueSettings);

        let ConvertToString = '';
        for (let key in index) {
            ConvertToString = ConvertToString + index[key] + "=";
            for (let val in uniqueSettings[index[key]]) {
                ConvertToString = ConvertToString + "{" + uniqueSettings[index[key]][val] + "}_";
            }
            ConvertToString = ConvertToString.substring(0, ConvertToString.length - 1);
            ConvertToString = ConvertToString + "&";
        }
        ConvertToString = ConvertToString.substring(0, ConvertToString.length - 1);
        let updateData = {
            "network_publisher_setting.payout": uniqueSettings.payout || [],
            "network_publisher_setting.source": uniqueSettings.source || [],
            "network_publisher_setting.aff_sub1": uniqueSettings.aff_sub1 || [],
            "network_publisher_setting.aff_sub2": uniqueSettings.aff_sub2 || [],
            "network_publisher_setting.aff_sub3": uniqueSettings.aff_sub3 || [],
            "network_publisher_setting.aff_sub4": uniqueSettings.aff_sub4 || [],
            "network_publisher_setting.aff_sub5": uniqueSettings.aff_sub5 || [],
            "network_publisher_setting.aff_sub6": uniqueSettings.aff_sub6 || [],
            "network_publisher_setting.aff_sub7": uniqueSettings.aff_sub7 || [],
            network_publisher_setting_string: ConvertToString,
            "network_publisher_setting_string": req.body.network_publisher_setting_string
        }
        // filter={_id:mongooseObjectId(req.user.userDetail.network)};
        let filter = req.user.userDetail.network[0];
        let projection = { $set: updateData };
        try {
            let result = await Network.modifyNetwork(filter, projection);
            if (!result) {
                let response = Response.error();
                response.payloadType = payloadType.array;
                response.payload = result
                response.msg = "Unable to save Network Parameter setting";
                return res.status(200).send(response)
            }
            Redis.delRedisHashData('networkSetting', req.user.userDetail.network[0].toString());
            let response = Response.success();
            response.payloadType = payloadType.array;
            response.payload = [];
            response.msg = "Successfully save Network Parameter setting";
            return res.status(200).send(response);
        }
        catch (err) {
            let response = Response.error();
            response.payloadType = payloadType.array;
            response.payload = result
            response.error = [err.message];
            response.msg = "Unable to save Network Parameter setting";
            return res.status(400).send(response)
        }
    } catch (err) {
        let response = Response.error();
        response.msg = "Unable to save Network Parameter setting, Try Again";
        response.error = [err.message];
        return res.status(400).json(response);
    }
}

exports.savedomain = (req, res) => {

    if (!req.body || !Object.keys(req.body).length) {
        return res.status(500).send({ message: "Bad Request" })
    }

    let reflect = {};
    if (req.body.dashboard.trim()) {
        reflect['domain.dashboard'] = req.body.dashboard.trim();
    }
    if (req.body.tracker.trim()) {
        reflect['domain.tracker'] = req.body.tracker.trim();
    }
    if (req.body.api.trim()) {
        reflect['domain.api'] = req.body.api.trim();
    }

    Network.domainExist(reflect, {}).then(data => {
        if (data.length >= 1) {
            let response = Response.error();
            response.payloadType = payloadType.array;
            response.payload = [data];
            response.msg = "Change your domains name";
            return res.status(200).json(response);
        }
        else {
            let filter = { _id: req.user.userDetail.network };
            Network.updateDomain(filter, { $set: reflect }).then(result => {
                let response = Response.success();
                response.payloadType = payloadType.array;
                response.payload = [result];
                if (result.nModified > 0) {
                    response.msg = " Data Updated Sucessfully "
                }
                else {
                    response.msg = " Data Not Found "
                }
                return res.status(200).json(response);
            }).catch(err => {
                let response = Response.error();
                response.msg = "error updating";
                response.error = [err.message];
                return res.status(200).json(response);
            });
        }
    }).catch(error => {
        let response = Response.error();
        response.msg = "error ";
        response.error = [error.message];
        return res.status(200).json(response);
    });
}

// Update a Network identified by the netId in the request
exports.updateNetwork = async  (req, res) => {
    if (!req.body) {
        return res.status(400).send({
            message: "Note content can not be empty"
        });
    }

    // remove permissions from users, which are provided by owner, but by superAdmin remove that features. 
    if(req.body.network_id){
        let features_ids  = [];
        let networkData = await Network.getOneNetwork({ _id  : mongooseObjectId(req.body.network_id) }, { features : 1 });
        for(let i = 0; i < networkData['features'].length; i++){
            let flag = false;
            for(let j = 0; j < req.body.features.length; j++){
                if(req.body.features[j]['_id'] == networkData['features'][i]['_id']){
                    flag = true;
                }
            }
            if(!flag){
                features_ids.push(mongooseObjectId(networkData['features'][i]['_id']));
            }
        }
        if(networkData && networkData['features'].length){
           // remove feature's permissions whne remove feature from network.
           if(features_ids && features_ids.length){
                let featuresData = await FeaturesModel.getFeatures({ _id : { $in : features_ids }} , { permissions : 1 });
                if(featuresData && featuresData.length){
                    let permissions_ids = [];
                    for(let i = 0; i < featuresData.length; i++){
                        for(let j = 0; j < featuresData[i]['permissions'].length; j++){
                            permissions_ids.push(mongooseObjectId(featuresData[i]['permissions'][j]['id']))
                        }
                    }
                    if(permissions_ids && permissions_ids.length){
                        // permissions assign to network_owner.
                        let update = {
                            $pull : {
                                "roles.permissions" : {
                                    id : { $in :  permissions_ids.map(id=>mongooseObjectId(id)) }
                                }
                            }
                        }
                        let options = {
                            new : true
                        }
                        await UserModel.findAndUpdateUsersPermissions({ 'network' : mongooseObjectId( req.body.network_id ) }, update, options);                               
                        let keyPattern = `user:${req.body['network_id']}:*`;
                        let keysResult = await Redis.getMultipleKeys(keyPattern);
                        if(!keysResult.error && keysResult.data.length){
                        await Redis.delMultipleRedisData( ...keysResult.data );
                        }
                    }
                }
            }
        }
    }
    let formvalue = {
        company_name: req.body.company_name,
        owner: {
            first_name: req.body.first_name,
            last_name: req.body.last_name,
            phone: req.body.phone,
            alternate_phone: req.body.alternate_phone,
            email: req.body.email,
            designation: req.body.designation
        },
        website: req.body.website,
        address: {
            address: req.body.address,
            locality: req.body.locality,
            city: req.body.city,
            state: req.body.state,
            pincode: req.body.pincode,
            country: req.body.country,
        },
        features : req.body.features
    }
    let filter = {};
    if(req.user.userDetail.network){
        filter = { _id: req.user.userDetail.network };
    }else{
        filter = { _id : mongooseObjectId(req.body.network_id) }
    }
    projection = { $set: formvalue};

    Network.modifyNetwork(filter, projection)
        .then( async result => {
            let response = Response.success();
            response.payloadType = payloadType.array;
            response.payload = result;
            if (Object.keys(result).length > 0) {
                response.msg = " Data Found "
                let featuresIds = [];
                // get all features _ids which are assigned to network.
                if (req.body.features.length) {
                    for(let i = 0; i < req.body.features.length; i++){
                        featuresIds.push(mongooseObjectId(req.body.features[i]['_id']))
                    }               
                }                
                let permissions  = [];
                // find feature's permissions 
                let featuresPermissions = await FeaturesModel.getAllFeatures({ _id : { $in : featuresIds }}, { permissions : 1})
                if(featuresPermissions.length){
                    for(let i = 0; i< featuresPermissions.length; i++){
                        if(featuresPermissions[i]['permissions'].length){
                            for(let j = 0; j < featuresPermissions[i]['permissions'].length; j++){
                                permissions.push({
                                    name : featuresPermissions[i]['permissions'][j]['name'],
                                    id : featuresPermissions[i]['permissions'][j]['id']
                                })
                            }
                        }
                    }
                }
               if(permissions && permissions.length){
                    // permissions assign to network_owner.
                    let update = {
                        $addToSet : {
                            "roles.permissions" :  {
                                $each : permissions
                            }
                        }
                    }

                    await UserModel.findAndUpdateUser({ "email" : result['owner']['email'] }, update,{})        
                    let keyPattern = `user:${req.body['network_id']}:*`;
                    let keysResult = await Redis.getMultipleKeys(keyPattern);
                    if(!keysResult.error && keysResult.data.length){
                    await  Redis.delMultipleRedisData( ...keysResult.data );
                    }        
                }
            }
            else {
                response.msg = " Data Not Found "
            }
            return res.status(200).json(response);
        }).catch(err => {
            console.log(" error ", err);
            let response = Response.error();
            response.msg = "error updating";
            response.error = [err.message];
            return res.status(200).json(response);
        });
};
exports.updateNetworkLogo = async (req, res) => {

    try {
        let networkId = req.user.userDetail.network[0]
        let filter = { _id: req.user.userDetail.network };
        let projection = { networklogo_Url: 1 };
        let previousimg
        let result = await Network.findOneNetwork(filter, projection);
        if (result[0].networklogo_Url) {
            previousimg = 'public' + result[0].networklogo_Url;
        }

        if (req.file) {
            fileName = '/uploads/network/' + networkId + '/' + req.file.filename;
            formvalue = {
                networklogo_Url: fileName
            }
            if (previousimg != 'public' + formvalue.networklogo_Url && previousimg != undefined) {
                // fs.unlinkSync(previousimg)
                try {
                    fs.realpath(previousimg)
                } catch (error) {
                    console.log("Upload Network Logo error", error)
                }
            }
        }
        projection = { $set: formvalue }
        result = await Network.modifyNetwork(filter, projection)
        if (result) {
            let response = Response.success();
            response.payloadType = payloadType.Object;
            response.payload = result;
            res.status(200).send(response)
        }

    }
    catch (err) {
        let response = Response.error();
        response.error = [err.message];
        response.msg = "error updating images";
        return res.status(400).send(response)
    }
}

exports.updateSecondaryNetworkLogo = async (req, res) => {
    let response = Response.success();
    response.payload = "Success";
    res.status(200).send(response)
}

exports.savePostbackForwarding = async (req, res) => {
    let status = 0 ;
    if ((req.body.postbackurl && req.body.parameter) || req.body.forwarding_setting) {
        try {
            let postbackForwarding = await Network.findOneNetwork({ "_id": mongooseObjectId(req.user.userDetail.network[0]) }, { "postback_forwarding_setting": 1 });
            if (postbackForwarding && postbackForwarding.length && postbackForwarding[0]['postback_forwarding_setting']) {
                for (let item of postbackForwarding[0]['postback_forwarding_setting']) {
                    if (item['endpoint'] === req.body.postbackurl.trim()) {
                        if (!req.body.postbackId) {
                            let response = Response.error();
                            response.error = [];
                            response.msg = "Postback Url is already exists!";
                            return res.status(200).send(response);
                        } else if (req.body.postbackId && req.body.postbackId.toString() != item['_id'].toString()) {
                            let response = Response.error();
                            response.error = [];
                            response.msg = "Postback Url is already exists!";
                            return res.status(200).send(response);
                        }
                    }
                }
            }
            let forwarding_setting = req.body.forwarding_setting.trim();
            let queryParams = '';
            if (req.body.parameter || forwarding_setting != "no_forwarding") {
                let parameters = Functions.trimArray(JSON.parse(req.body.parameter));

                var keys = ['key', 'val'];
                for (let key of parameters) {
                    let test = Functions.obsKeysToString(key, keys, '={');
                    queryParams = queryParams + test;
                }
                if (req.body.customParam) {
                    let customParam = Functions.trimArray(JSON.parse(req.body.customParam));
                    for (let key of customParam) {
                        let test = Functions.objectKeyToStringTrimmed(key, keys, '=');
                        queryParams = queryParams + test;
                    }
                }
                queryParams = queryParams.substring(0, queryParams.length - 1);
                queryParams = queryParams.replace(/\s/g, '');
            }

            if(req.body.status || req.body.status == 0 ){
                status = req.body.status ;
            }
            let reflect = { postback_forwarding_setting: { "endpoint": req.body.postbackurl.trim(), "params": queryParams, "forwarding_setting": forwarding_setting  , "status" : status } };
            let filter = mongooseObjectId(req.user.userDetail.network[0]);
            if (req.body.postbackId) {
                await Network.modifyNetwork(filter, { $pull: { "postback_forwarding_setting": { "_id": mongooseObjectId(req.body.postbackId) } } });
            }
            let result = await Network.modifyNetwork(filter, { $push: reflect });
            if (result && result.network_unique_id) {
                Redis.setRedisHashData('postback_forwarding_setting', result.network_unique_id, reflect.postback_forwarding_setting, 0);
            }
            let response = Response.success();
            response.payloadType = payloadType.array;
            response.payload = [];
            response.msg = "Successfully saved Postback Forwarding Setting!";
            return res.status(200).send(response)
        }
        catch (err) {
            let response = Response.error();
            response.error = [err.message];
            response.msg = "Unable to save Postback Forwarding Setting!";
            return res.status(400).send(response)
        }
    }
    else {
        let response = Response.error();
        response.msg = "Invalid or Incomplete Data";
        response.error = ["Invalid or Incomplete Data"];
        return res.status(200).json(response);
    }
}

exports.getPublisherLinkSettings = async (req, res) => {
    try {
        let filter = { '_id': req.user.userDetail.network[0] };
        let projection = { _id: 0, network_unique_id: 1, network_publisher_setting_string: 1, domain: 1 };
        Network.findOneNetwork(filter, projection).then(result => {
            let response = Response.success();
            response.payloadType = payloadType.object;
            if (result) {
                response.payload = { subdomain: result[0].network_unique_id, tracking_domain: process.env.TRACKING_DOMAIN, tracking_path: process.env.TRACKING_PATH, domain: result[0].domain, extra_param: result[0].network_publisher_setting_string };
                response.msg = "success";
            }
            else {
                response.payload = [];
                response.msg = "Not Found Publisher Link Settings";
            }
            return res.status(200).send(response)
        })
    } catch (err) {
        let response = Response.error();
        response.payloadType = payloadType.array;
        response.error = [err.message];
        response.msg = "Error getting network settings";
        return res.status(400).send(response)
    }

}

exports.getNetworks = async (req, res) => {
    let filter = {};
    let projection = {
        _id: 1,
        network_unique_id: 1
    };
    await Network.findAllNetwork(filter, projection)
        .then(result => {
            if (result && result.length) {
                let response = Response.success();
                response.payloadType = payloadType.array;
                response.payload = result;
                response.msg = "Networks fetched successfully!";
                return res.status(200).json(response);
            } else {
                let response = Response.error();
                response.msg = "No record found!";
                response.error = [""];
                return res.status(200).json(response);
            }
        }).catch(err => {
            let response = Response.error();
            response.msg = "Probably something went wrong, Try again!";
            response.error = [err.message];
            return res.status(200).json(response);
        });
}
exports.getSingleNetworks = async (req, res) => {
    let filter = { _id  : mongooseObjectId(req.body.network_id) };
    let projection = {
        website: 1 ,
        status:1,
        company_name: 1 ,
        owner: 1,
        address: 1,
        features:1 ,
    };
    await Network.findAllNetwork(filter, projection)
        .then(result => {
            if (result && result.length) {
                let response = Response.success();
                response.payloadType = payloadType.array;
                response.payload = result;
                response.msg = "Networks fetched successfully!";
                return res.status(200).json(response);
            } else {
                let response = Response.error();
                response.msg = "No record found!";
                response.error = [""];
                return res.status(200).json(response);
            }
        }).catch(err => {
            console.log(" error getSingleNetwork ", err);
            let response = Response.error();
            response.msg = "Probably something went wrong, Try again!";
            response.error = [err.message];
            return res.status(200).json(response);
        });
};

exports.updateOffer_export_setting = (req, res) => {
    let filter = { '_id': req.user.userDetail.network[0] };
    Network.updateStatus(filter, { $set: { offer_export_setting: req.body.offerKey } }).then(result => {
        let response = Response.success();
        response.payloadType = payloadType.array;
        response.payload = result;
        if (result.nModified > 0) {
            response.msg = " Offer Setting Update Sucessfully "
        }
        else {
            response.msg = " Data Not Found "
        }
        return res.status(200).json(response);
    }).catch(err => {
        let response = Response.error();
        response.msg = "error updating";
        response.error = [err.message];
        return res.status(200).json(response);
    });
}
exports.updateReport_export_setting = (req, res) => {
    let filter = { '_id': req.user.userDetail.network[0] };
    Network.updateStatus(filter, { $set: { report_export_setting: req.body.reportKey } }).then(result => {
        let response = Response.success();
        response.payloadType = payloadType.array;
        response.payload = result;
        if (result.nModified > 0) {
            response.msg = " Report Setting Update Sucessfully "
        }
        else {
            response.msg = " Data Not Found "
        }
        return res.status(200).json(response);
    }).catch(err => {
        let response = Response.error();
        response.msg = "error updating";
        response.error = [err.message];
        return res.status(200).json(response);
    });
}

exports.findOfferSettingKey = (req, res) => {
    let filter = { '_id': req.user.userDetail.network[0] };
    let projection = { _id: 0, offer_export_setting: 1, network_publisher_setting_string: 1 };
    Network.findOneNetwork(filter, projection).then(result => {
        if (result) {
            let response = Response.success();
            response.payload = result;
            if (result.length > 0) {
                response.msg = "Offer_Setting_Keys";
            }
            else {
                response.msg = "Blank";
            }

            return res.status(200).send(response)
        }
    }).catch(err => {
        let response = Response.error();
        response.msg = "Error Updating";
        response.error = [err.message];
        return res.status(400).json(response);
    })
}
exports.findReportSettingKey = (req, res) => {
    let filter = { '_id': req.user.userDetail.network[0] };
    let projection = { _id: 0, report_export_setting: 1 };
    Network.findOneNetwork(filter, projection).then(result => {
        if (result) {
            let response = Response.success();
            response.payload = result;
            if (result.length > 0) {
                response.msg = "Report_Setting_Keys";
            }
            else {
                response.msg = "Blank";
            }

            return res.status(200).send(response)
        }
    }).catch(err => {
        let response = Response.error();
        response.msg = "Error Updating";
        response.error = [err.message];
        return res.status(400).json(response);
    })
}
exports.saveTimeZone = (req, res) => {

    Network.updateTimeZone({ _id: req.user.userDetail.network[0] }, req.body).then(result => {
        if (result) {
            let response = Response.success();
            response.msg = "Time zone updated succesfully...";
            return res.status(200).send(response)
        }
        else {
            let response = Response.error();
            response.msg = "Time zone not updated";
            response.error = [err.message];
            return res.status(200).json(response);
        }
    }).catch(err => {
        let response = Response.error();
        response.msg = "Probably something went wrong, Try again!";
        response.error = [err.message];
        return res.status(400).json(response);
    })
}

exports.getNetworkPostback = async (req, res) => {
    try {
        let result = await Network.findOneNetwork({ "_id": mongooseObjectId(req.user.userDetail.network[0]) }, { "postback_forwarding_setting": 1 });
        if (result && result.length && result[0]["postback_forwarding_setting"]) {
            let response = Response.success();
            response.payloadType = payloadType.array;
            response.payload = result[0]["postback_forwarding_setting"];
            response.msg = "Network postback forwarding setting fetched successfully!";
            return res.status(200).json(response);
        } else {
            let response = Response.error();
            response.msg = "No record found!";
            response.error = [""];
            return res.status(200).json(response);
        }
    } catch (err) {
        let response = Response.error();
        response.error = [err.message];
        response.msg = "Error getting network postback forwarding setting!";
        return res.status(400).send(response)
    }
};

exports.deleteNetworkPostback = async (req, res) => {
    try {
        let reflect = {
            $pull: {
                "postback_forwarding_setting": {
                    "_id": mongooseObjectId(req.body['postback_forwarding_setting_id'])
                }
            }
        }
        let result = await Network.updateTimeZone({ "_id": mongooseObjectId(req.user.userDetail.network[0]) }, reflect);
        if (result) {
            let response = Response.success();
            response.msg = "Network postback forwarding setting deleted successfully!";
            return res.status(200).json(response);
        } else {
            let response = Response.error();
            response.msg = "Something went wrong please try again!";
            response.error = [""];
            return res.status(200).json(response);
        }
    } catch (err) {
        let response = Response.error();
        response.error = [err.message];
        response.msg = "Error while deleting network postback forwarding setting!";
        return res.status(400).send(response)
    }
};

exports.saveNetworkTheme = (req, res) => {
    let filter = { _id: req.body.network_id };
    let update = { $set: { theme: req.body.settings } };
    Network.updateStatus(filter, update)
        .then(result => {
            if (result.nModified > 0) {
                let response = Response.success();
                response.payloadType = payloadType.array;
                response.payload = [];
                response.msg = "Theme updated succesfully.";
                return res.status(200).send(response);
            } else {
                let response = Response.error();
                response.error = [err.message];
                response.msg = "Something went wromg. "
                return res.status(200).json(response);
            }
        })
        .catch(err => {
            let response = Response.error();
            response.error = [err.message];
            response.msg = "Error while updating theme."
            return res.status(200).json(response);
        });
}

exports.getTheme = (req, res) => {
    let filter = { _id: req.body.network_id };
    let projection = { theme: 1, _id: 0 };
    Network.findOneNetwork(filter, projection)
        .then(result => {
            let response = Response.success();
            response.payloadType = payloadType.array;
            response.payload = result[0];
            response.msg = "succesfully fetched..";
            return res.status(200).send(response);
        })
        .catch(err => {
            let response = Response.error();
            response.error = [err.message];
            response.msg = " error while fetching details.. "
            return res.status(200).json(response);
        })
}


exports.saveNetworkThemeM = (req, res) => {
    let filter = { _id: req.body.network_id };
    let update = { $set: { themeM: req.body.settings } };
    Network.updateStatus(filter, update)
        .then(result => {
            if (result.nModified > 0) {
                let response = Response.success();
                response.payloadType = payloadType.array;
                response.payload = [];
                response.msg = "Theme updated succesfully.";
                return res.status(200).send(response);
            } else {
                let response = Response.error();
                response.error = [err.message];
                response.msg = "Something went wromg. "
                return res.status(200).json(response);
            }
        })
        .catch(err => {
            let response = Response.error();
            response.error = [err.message];
            response.msg = "Error while updating theme."
            return res.status(200).json(response);
        });
}
exports.getThemeM = (req, res) => {
    let filter = { _id: req.body.network_id };
    let projection = { themeM: 1, _id: 0 };
    Network.findOneNetwork(filter, projection)
        .then(result => {
            let response = Response.success();
            response.payloadType = payloadType.array;
            response.payload = result[0];
            response.msg = "succesfully fetched..";
            return res.status(200).send(response);
        })
        .catch(err => {
            let response = Response.error();
            response.error = [err.message];
            response.msg = " error while fetching details.. "
            return res.status(200).json(response);
        })
}

exports.saveNetwokDomain = (req, res) => {
    try {
        if (Object.keys(req.body).length > 0) {
            const {domain, type } = req.body;
            if (domain && type) {
                const newDomanObj = new handlingDomainModel({
                    'N_id': req.user.userDetail.network[0]||req.user.userDetail.network,
                    'domain': domain,
                    'type': type,
                    'N_u_id': req.user.userDetail.network_unique_id,
                    'nid': req.user.userDetail.nid,
                });
                newDomanObj.save((err, savedDomain) => {
                    if (err) {
                        console.error("Error saving network domain:", err);
                        res.status(500).json({ error: "Error saving network domain" });
                    } else {
                        res.status(200).json({ message: "Domain saved successfully", domain: savedDomain });
                    }
                });
            } else {
                res.status(400).json({ error: "Incomplete request body" });
            }
        } else {
            res.status(400).json({ error: "Empty request body" });
        }
    } catch (error) {
        console.error("Error saving network domain:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

exports.getHandlingDomainData = async (req, res) => {
    try {
          let filter={};
           if(req.user.userDetail.network){
             filter['N_id']=mongooseObjectId(req.user.userDetail.network[0])
           }
        const result= await handlingDomainModel.getAggregatedData(filter);
        // Extract relevant data
        const formattedResult = result.map(group => ({
            type: group._id,
            items: group.items
        }));
        return res.status(200).json({ result: formattedResult });
    } catch (error) {
        console.error("Error in getHandlingDomainData:", error);
       return res.status(500).json({ error: "Internal Server Error" });
    }
}



exports.deleteNetworkDomain = async (req, res) => {
    try {
        if (req.body.network_Domain_id) {
            const domainId = mongooseObjectId(req.body.network_Domain_id);
            await handlingDomainModel.deleteNetworkDomain({ _id: domainId });
            res.status(200).json({ message: "Domain deleted successfully" });
        } else {
            res.status(400).json({ error: "Network domain ID is required" });
        }
    } catch (error) {
        console.error("Error deleting network domain:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};




exports.getNetworkDomainData = async (req, res) => {

    try {

        let filter = {};
        let networkData = await handlingDomainModel.getNetwork(filter, {})
        if (networkData.length > 0) {

            let response = Response.success();
            response.payloadType = payloadType.array;
            response.payload = networkData;
            response.msg = "success";
            return res.status(200).send(response)
        }
    } catch (err) {
        let response = Response.error();
        response.payloadType = payloadType.array;
        response.error = [err.message];
        response.msg = "Error getting networkDomain data";
        return res.status(400).send(response)
    }

}

exports.updateStatus = async (req, res) => {
    try {
        if (!req.body.domainData) {
            return res.status(400).json({ error: "Empty request body" });
        }

        const { _id, status } = req.body.domainData;

        if (!_id || !status) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const updateResult = await handlingDomainModel.updateOne({ _id: _id }, { $set: { status: status } });

        if (updateResult.nModified > 0) {
            let response = {
                success: true,
                payloadType: "array",
                payload: null, // Replace `null` with `networkData` or the actual data if needed
                msg: "Success"
            };
            return res.status(200).send(response);
        } else {
            return res.status(404).json({ error: "Document not found or status already updated" });
        }
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Internal server error" });
    }
}


exports.UpdatePublisherIdPrefix = async (req, res) => {
    try {
      // Validate request body
      if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json(Response.error({ msg: "Invalid or empty request body" }));
      }
  
      // Extract network details from the user object
     
       const networkId=req.user.userDetail.network['0'];
      if (!networkId) {
        return res.status(400).json(Response.error({ msg: "Network details are missing for the user." }));
      }
  
      // Validate and prepare filter and update objects
      const filter = { _id: mongooseObjectId(networkId) };
      const update = {};
  
      const { IpAppBlockLimit, IpOfferBlockLimit, PubId_Prefix } = req.body;
  
      if (!IpAppBlockLimit) {
        return res.status(400).json(Response.error({ msg: "IpAppBlockLimit is required in the request." }));
      }
      update['ipAppBlockLimit'] = IpAppBlockLimit;
  
      if (!IpOfferBlockLimit) {
        return res.status(400).json(Response.error({ msg: "IpOfferBlockLimit is required in the request." }));
      }
      update['ipOfferBlockLimit'] = IpOfferBlockLimit;
  
      if (!PubId_Prefix) {
        return res.status(400).json(Response.error({ msg: "PubId_Prefix is required in the request body." }));
      }
      update['pidPrefix'] = PubId_Prefix;
  
      // Perform the update operation
      const updatedData = await Network.UpdatePublisherIdPrefix(filter, { $set: update }, { upsert: true });
  
      if (updatedData.nModified > 0) {
        return res.status(200).json(
          Response.success({
            payloadType: payloadType.array,
            payload: updatedData[0],
            msg: "successfully updated.",
          })
        );
      } else {
        return res.status(200).json(Response.error({ msg: "No matching record found to update." }));
      }
    } catch (err) {
      console.error("Error occurred:", err.message);
      return res.status(500).json(
        Response.error({
          err: [err.message],
          msg: "Something went wrong.",
        })
      );
    }
  };
  



exports.IpBlockWithoutTestClick = async (req, res) => {
    try {
        // Validate request body
        if (!req.body || typeof req.body.status === 'undefined') {
            return res.status(400).json({ msg: 'Invalid request: Missing or incorrect status in request body.' });
        }

        // Prepare filter and update
        const filter = { '_id': req.user.userDetail.network[0] }; // Ensure this is accessing the correct ID
        const update = { ip_block_without_test_click: req.body.status };

        // Update the network record
        const updatedData = await Network.updateNetwork(filter, update, { upsert: true });

        // Handle response if update is successful
        if (updatedData) {

            return res.status(200).json({ msg: 'IPBlockWithoutTestClick status updated successfully.', data: updatedData });
        } else {
            return res.status(404).json({ msg: 'Network not found or no changes made.' });
        }
    } catch (err) {
        console.error('Error in IpBlockWithoutTestClick:', err);
        return res.status(500).json({ msg: 'Internal server error.', error: err.message });
    }
};



exports.IpBlockWithTestClick=async(req,res)=>{

    try {
        // Validate request body
        if (!req.body || typeof req.body.status === 'undefined') {
            return res.status(400).json({ msg: 'Invalid request: Missing or incorrect status in request body.' });
        }

        // Prepare filter and update
        const filter = { '_id': req.user.userDetail.network[0] }; // Ensure this is accessing the correct ID
        const update = { ip_block_with_test_click: req.body.status };

        // Update the network record
        const updatedData = await Network.updateNetwork(filter, update, { upsert: true });

        // Handle response if update is successful
        if (updatedData) {
            return res.status(200).json({ msg: 'IPBlockWithTestClick status updated successfully.', data: updatedData });
        } else {
            return res.status(404).json({ msg: 'Network not found or no changes made.' });
        }
    } catch (err) {
        console.error('Error in IpBlockWithTestClick:', err);
        return res.status(500).json({ msg: 'Internal server error.', error: err.message });
    }


}

exports.saveAdvLinkStatus=async(req,res)=>{
    //   console.log("req.body--",req.body)
    try {
    
        if(!req.body){
            return res.status(400).json({msg:"Invalid resquest"})
        }
        
        const filter = { '_id': req.user.userDetail.network[0] }; // Ensure this is accessing the correct ID
        const update = { 'advLink': req.body.status };

        // Update the network record
        const updatedData = await Network.updateNetwork(filter, update, { upsert: true });

        // Handle response if update is successful
        if (updatedData) {
            return res.status(200).json({ msg: 'advLink status updated successfully.', data: updatedData });
        } else {
            return res.status(404).json({ msg: 'Network not found or no changes made.' });
        }
    } catch (error) {
        console.error('Error in IpBlockWithTestClick:', err);
        return res.status(500).json({ msg: 'Internal server error.', error: err.message });
        
    }

}

exports.savePubLinkStatus=async(req,res)=>{
    try {

        const filter = { '_id': req.user.userDetail.network[0] }; // Ensure this is accessing the correct ID
        const update = { 'pubLink': req.body.status };

        // Update the network record
        const updatedData = await Network.updateNetwork(filter, update, { upsert: true });

        // Handle response if update is successful
        if (updatedData) {
            return res.status(200).json({ msg: 'pubLink status updated successfully.', data: updatedData });
        } else {
            return res.status(404).json({ msg: 'Network not found or no changes made.' });
        }
        
    } catch (error) {
        console.error('Error in IpBlockWithTestClick:', err);
        return res.status(500).json({ msg: 'Internal server error.', error: err.message });
        
    }
}


exports.setOfferExportSetting=async(req,res)=>{

    try {
            if(!req.body){
                return res.status(400).json({msg:"Invalid resquest"})
            }
            let filter={"_id":req.user.userDetail.network[0]};

            let key=Object.keys(req.body)[0];
            let value=req.body[key];
            if(value){
                let updatres= await Network.updateOne(filter,{$addToSet:{offer_export_setting:key}}) 
                if(updatres.nModified>0){
                    return res.status(200).json({ msg: `${key} status updated successfully.`});  
                }
                else{
                    return res.status(400).json({msg:'Network Not found or not updated'})
                }

            }
            else{
                let updatres= await Network.updateOne(filter,{$pull:{offer_export_setting:key}}) 
                if(updatres.nModified>0){
                    return res.status(200).json({ msg: `${key} status updated successfully.`});  
                }
                else{
                    return res.status(400).json({msg:'Network Not found or not updated'})
            }
          }
   
    } catch (error) {
         return res.status(500).json({msg:'Internal Server error',error:error.message})
        
    }
}

exports.setReportExportSetting=async(req,res)=>{

try {
      if(!req.body){
        return res.status(400).json({msg:"Invailid request"});
      }
    let filter={"_id":req.user.userDetail.network[0]}
    let key=Object.keys(req.body)[0];
    let value=req.body[key]

    if(value){
        let updateRes=await Network.updateOne(filter,{$addToSet:{report_export_setting:key}})
        if(updateRes.nModified>0){
            return res.status(200).json({ msg: `${key} status updated successfully.`});  
        }
        else{
            return res.status(400).json({msg:'Network Not found or not updated'})
        }
    } 
    else{
         let updates=await Network.updateOne(filter,{$pull:{report_export_setting:key}})
         if(updates.nModified>0){
            return res.status(200).json({ msg: `${key} status updated successfully.`});  
        }
        else{
            return res.status(400).json({msg:'Network Not found or not updated'})
    }
    } 
      
} catch (error) {
    return res.status(500).json({msg:'Internal Server error',error:error.message})

    
}
}


exports.setCutpercentage=async(req,res)=>{
    try {
        if(!req.body){
            return res.status(400).json({msg:"Invalid Request"});
        }
        let filter={"_id":req.user.userDetail.network[0]}
        let value=req.body.key;

        if(value){
            let updates=await Network.updateOne(filter,{$set:{'cpp':value}});
            if(updates.nModified>0){
              return res.status(200).json({msg:`CutPercent Priority ${value}  save Successfully !`})
            }
            else{
                return res.status(400).json({msg:'Network Not found or not updated'})
           }
        }

    } catch (error) {
    return res.status(500).json({msg:'Internal Server error',error:error.message})
        
    }
}


exports.UpdateFinancial=async(req,res)=>{
    console.log("req.body--",req.body)
    try {
        if(!req.body){
            return res.status(400).json({msg:"Invalid Request"});
        }
        let filter={"_id":req.user.userDetail.network[0]}
        let setUpdate={};
        let finalUpdate={};

        let update={'aHN':req.user.userDetail.company_name};
        
        if(req.body.aN){
            update['aN']=req.body.aN;
        }
        if(req.body.bName){
            update['bN']=req.body.bName.trim();
        }
        if(req.body.ifcs){
            update['ifcs']=req.body.ifcs;
        }
        if(req.body.addr){
            update['addr']=req.body.addr;
        }
        if(req.body.call){
            update['call']=req.body.call;
        }
        if(req.body.usd){
            update['usd']=req.body.usd;
        }
        
        if(req.body.ppId){
            setUpdate['ppId']=req.body.ppId;
        }

        if(req.body.gstin){
            setUpdate['gstin']=req.body.gstin;
        }
        if(req.body.sac){
            setUpdate['sac']=req.body.sac;
        }
        if(req.body.payoneerid){
            setUpdate['payoneerId']=req.body.payoneerid;
        }
        if(req.body.routing){
            setUpdate['rT']=req.body.routing
        }
        if(req.body.shiftCode){
            setUpdate['wc']=req.body.shiftCode
        }
        
        if(Object.keys(setUpdate).length>0){
            finalUpdate['$set']=setUpdate
        }
        if(Object.keys(update).length>1){
            finalUpdate['$addToSet']={fD:update};
        }
         console.log("final Update--",finalUpdate)
            let updates=await Network.updateOne(filter,finalUpdate);
            if(updates.nModified>0){
                let response= Response.success();
                response.payloadType = payloadType.array;
                response.payload = [];
                response.msg = "Financial Details Updated Successfully!";
                return res.status(200).json(response);
            }
            else{
                let response= Response.error();
                response.msg = "Network Not found or not updated";
                response.error = [""];
                return res.status(400).json(response);
            }
        }
        catch(error){
            console.error("Error in UpdateFinancial:", error);
            let response = Response.error();
            response.error = [error.message];
            response.msg = "Internal server error.";
            return res.status(500).json(response);
        }
}



