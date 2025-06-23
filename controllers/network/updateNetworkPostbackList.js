const Mongoose = require('mongoose');
const mongooseObjectId = Mongoose.Types.ObjectId;
//const debug = required("debug")("darwin:Controller:Network");
const NetworkModel = require('../../db/network/Network');
const Response = require('../../helpers/Response');
const { payloadType } = require('../../constants/config');





exports.updateNetworkPostbackStatus  = async (req, res) => { 
      
  let filter = {
          _id: mongooseObjectId(req.user.userDetail.network[0]),
          "postback_forwarding_setting._id": mongooseObjectId(req.body.id)
        }

        let update = {
            $set : {
                "postback_forwarding_setting.$.status": req.body.status 

            }
        }


  const updateRes= await NetworkModel.updatePostbackStatus( filter , update ) ; 
  if(!updateRes['nModified']>0){
    let response = Response.error();
    response.msg = "status not updated";
    response.error = ["data not found something went wrong!"];
    return res.status(400).json(response);
  }

  let response = Response.success();
    response.payloadType = payloadType.array;
    response.payload = updateRes[0]
    response.msg = "status update successfully";
    return res.status(200).send(response)

}