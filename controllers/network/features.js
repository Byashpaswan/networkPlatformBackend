const Mongoose = require('mongoose');
const mongooseObjectId = Mongoose.Types.ObjectId;
//const debug = required("debug")("darwin:Controller:NetworkModel");
const NetworkModel = require('../../db/network/Network');
const Response = require('../../helpers/Response');
const { payloadType } = require('../../constants/config');
const FeaturesModel = require('../../db/features/feature') 
const UserModel = require("../../db/user/User")

exports.getSingleNetworkFeature = async  ( req ,res ) => {
    try{
        let networkdata = await NetworkModel.getOneNetwork({ _id : mongooseObjectId(req.user.userDetail['network'][0])} , { features : 1  , _id : 0 })
        let featureData = await  FeaturesModel.getFeatures( { name : { $in : networkdata.features }  } , { permissions : 1  ,_id : 0 , name : 1 } )
        if (featureData && featureData.length == 0) {
            let response = Response.error();
            response.payloadType = payloadType.array;
            response.payload = result;
            response.msg = "no features found!!!";
            return res.status(400).send(response);
        }

        let allFeaturePermission = [] ;
        featureData.map(ele=>{
            ele.permissions.map(item =>{
                allFeaturePermission.push( item.name );
            })
        })
        let response = Response.success();
        response.payloadType = payloadType.array;
        response.payload = allFeaturePermission ;
        response.msg = "features get successfully!"
        return res.status(200).json(response);

    }catch(error){
        console.log(" error when getSingle NetworkFeatures ", error.message);
        let response = Response.error();
        response.error = [err.message];
        response.msg = "Error while update features";
        return res.status(500).json(response);
    }

}

exports.updateFeatures  = async( req, res ) => {
   try{
        if(req.body.feature_id && mongooseObjectId.isValid(req.body.feature_id)){
            let result = await FeaturesModel.updateFeatures({_id : mongooseObjectId(req.body.feature_id )} , { "permissions" : req.body.permissions } )
            if(result && result.ok ){
                let response = Response.success();
                response.payloadType = payloadType.array;
                response.payload = result ;
                response.msg = "features update successfully!"
                return res.status(200).json(response);
            }else{
                let response = Response.error();
                response.payloadType = payloadType.array;
                response.payload = [];
                response.msg = " something went wrong on update feature !!" ;
                return res.status(400).send(response)
            }
        }else{
            let response = Response.error();
            response.payloadType = payloadType.array;
            response.payload = [];
            response.msg = " something went wrong on update feature !!" ; 
            return res.status(400).send(response)
        }
   }catch(error){
        console.log(" error when get updateFeatures ", error.message);
        let response = Response.error();
        response.error = [err.message];
        response.msg = "Error while update features";
        return res.status(500).json(response);
   }
}
exports.createFeatures = async (req, res) => {
    try {
        let filter = { name: req.body.features.name };
        let projection = { _id: 1 };

        let result = await FeaturesModel.isFeaturesExist(filter, projection);

        if (result && result.length > 0) {
            let response = Response.success();
            response.msg = 'exists';
            return res.status(200).json(response);
        }

        let feature = new FeaturesModel({ name: req.body.features.name });

        await feature.save();

        let response = Response.success();
        response.payloadType = payloadType.array;
        response.msg = "success";

        return res.status(200).json(response);

    } catch (err) {
        console.error("Error in createFeatures:", err);
        let response = Response.error();
        response.error = [err.message];
        response.msg = "Error while saving features";
        return res.status(500).json(response);
    }
};
exports.getFeaturesByNetwork = async ( req, res) =>{
    try{

        let featuresIds = [];
        let filter = {};
        if(req.user.userDetail.network){
            filter = { _id : mongooseObjectId(req.user.userDetail.network[0])};
        }else{
            let response = Response.error();
            response.payloadType = payloadType.array;
            response.payload = [];
            response.msg = "no features found!!!";
            return res.status(400).send(response);
        }
        // let projection = { features : 1, _id : 0 };
        // let networkData = await NetworkModel.getOneNetwork(filter, projection);

        // if(networkData && Object.keys(networkData).length > 0 ){
        //     if(networkData.features){
        //         networkData.features.forEach(ele=>{
        //             featuresIds.push(ele._id)
        //         })
        //     }
        // }
        // let featuresData = await FeaturesModel.getFeatures({ _id : { $in : featuresIds }}, { _id : 0, permissions : 1 })
        // console.log(" featuresData -> ", featuresData[0].permissions.length);
        let featuresPermissions = [];
        // for(let i = 0 ; i < featuresData.length ; i++){
        //     for(let j = 0; j < featuresData[i].permissions.length ; j++){
        //         featuresPermissions.push(featuresData[i].permissions[j]['id'].toString())
        //     }
        // }
        let networkData = await NetworkModel.getOneNetwork({ _id  : mongooseObjectId(req.user.userDetail.network[0])});
        if(!networkData){
            let response = Response.success();
            response.payloadType = payloadType.array;
            response.payload = featuresPermissions ;
            response.msg = "features get successfully, network not found"
            return res.status(200).json(response);
        }
        let userData = await UserModel.getUsers({ email : networkData['owner']['email'] }, { "roles.permissions" : 1 }, {})
        if(userData && userData.length){
            userData[0]['roles']['permissions'].forEach(ele=>{
                featuresPermissions.push(ele.id);
            })
        }
        let response = Response.success();
        response.payloadType = payloadType.array;
        response.payload = featuresPermissions ;
        response.msg = "features get successfully!"
        return res.status(200).json(response);

    }catch(error){
        console.log(" error when getFeaturesByNetwork ", error);
        let response = Response.error();
        response.error = [error.message];
        response.msg = " error while getFeaturesByNetwork"
        return res.status(200).json(response);
    }

}
exports.getFeatures = async  (req, res) => {
   try{
    let filter = {};
    projection = {
       name : 1 , permissions : 1 
    };
    await FeaturesModel.getAllFeatures(filter, projection)
        .then(result => {
            if (!result) {
                let response = Response.error();
                response.payloadType = payloadType.array;
                response.payload = result;
                response.msg = "no features found!!!";
                return res.status(400).send(response)
            }
            else if (result && result.length == 0) {
                let response = Response.error();
                response.payloadType = payloadType.array;
                response.payload = result;
                response.msg = "no features found!!!";
                return res.status(400).send(response);
            }
            else {

                let response = Response.success();
                response.payloadType = payloadType.array;
                response.payload = result ;
                response.msg = "features get successfully!"
                return res.status(200).json(response);

            }
        }).catch(err => {
            console.log( "err getFeatures" , err);
            let response = Response.error();
            response.error = [err.message];
            response.msg = " error while getting features "
            return res.status(200).json(response);
        });

   }catch(error){
        console.log(" error when getFeatures ", error.message);
        let response = Response.error();
        response.error = [err.message];
        response.msg = " error while getting features "
        return res.status(200).json(response);
   }
};