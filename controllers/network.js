var Mongoose = require('mongoose');
const debug = require("debug")("darwin:Controller:Network");
const mongooseObjectId = Mongoose.Types.ObjectId;
const NetworkModel = require('../db/network/Network');
const UserModel = require('../db/user/User');
const AdvertiserModel = require('../db/advertiser/Advertiser');
const PublisherModel = require('../db/publisher/Publisher');

const Response = require('../helpers/Response');
const { payloadType } = require('../constants/config');
const networkObj = Mongoose.model('network');
const bcrypt=require("bcryptjs");
const requestIp = require('request-ip');
var Moment = require('moment');
const RolesModel=require('../db/Roles')

// ===========Registering New User=======================
//module for getting user enter values of form and storing in network database
exports.RegisterNetwork=function(req, res){
    console.log("req.body--",req.body);
    var name = req.body.first_name.trim() + " " + req.body.last_name.trim();
    const clientIp = requestIp.getClientIp(req); 
    var salt = bcrypt.genSaltSync(10);
    let hash=bcrypt.hashSync(req.body.password,salt);
    //console.log(req.body.network_unique_id,"Network_id");
    let filter = { $or: [{ "owner.email": req.body.email.trim() }, { "company_name": req.body.company_name.trim() },{"network_unique_id":req.body.network_unique_id}]};
    let projection = { _id :1 };
  // ======================checking whether network exists or not=================
  
  NetworkModel.isNetworkExist(filter, projection)
    .then( (result) => {
     // console.log(result);
        if (!result) {
          return res.status(400).send("error");
        }
        else if(result && result.length>0){
          let response = Response.error();
              response.msg = "exists"
            //   debug(response);
              return res.status(200).json(response);
        }
        else{
          query={name:'network_owner'}
          data={}
          RolesModel.isRoleExists(query,data).then(output=>{
            console.log("rolesData--",output)
            if(output.length<=0){
              let response = Response.error();
              response.msg = "try after some time"
            //   debug(response);
              return res.status(400).json(response);
            }
            // making network model****************
            let network = new NetworkModel({
            company_name: req.body.company_name.trim(),
            owner: {
              first_name: req.body.first_name.trim(),
              last_name:req.body.last_name.trim(),
              phone: req.body.phone.trim(),
              alternate_phone: req.body.alternate_phone.trim(),
              email: req.body.email.trim(),
              designation: req.body.designation.trim()
            },
            website: req.body.website.trim(),
            address: {
              address:req.body.address.trim(),
              locality:req.body.locality.trim(),
              city:req.body.city.trim(),
              state:req.body.state.trim(),
              pincode: req.body.pincode.trim(),
              country:req.body.country.trim()
            },
           // fD:[{
           //      aHN:req.body.company_name.trim(),
           //      aN:req.body.accountNumber.trim(),
           //      ifcs:req.body.ifcsCode.trim(),
           //      bN:req.body.bankName.trim(),
           //      call:req.body.mob.trim(),
           //      aType:req.body.accountType,
           //      usd:req.body.usd||false,
           //      addr:req.body.addr.trim()
           //    }],
           //   wc:req.body.wc.trim(),
           //   rT:req.body.Rt.trim(),
           //   payoneerId:req.body.payoneerId.trim(),
           //   gstin:req.body.GSTIN.trim(),
           //   ppId:req.body.ppId,
           //   sac:req.body.sac.trim(),

            network_unique_id:req.body.network_unique_id.trim() ,
            domain :{
              dashboard: req.body.network_unique_id.trim()+".proffcus.com",
              tracker:"tracker",
              api:"api"
            },
            // payCal:req.body.payCal||'min',
            current_timezone: req.body.current_timezone.trim(),
            });
            // ============================saving network=======================
            network.save().then( result=>{
              if (!result) {
                return res.send("internal error occurred");
              }
              //when we get an id --> network exists
              else if (result && result.length > 0) 
              {
                let response = Response.error();
                response.msg = "exists";
                // debug(response);
                return res.status(400).json(response);
              } 
              else 
              {
                id=result._id;
                // making user model*****************
                let user = new UserModel({
                  first_name :req.body.first_name,                    
                  last_name: req.body.last_name,                      
                  gender:'',                                            
                  email:req.body.email,                              
                  network:[Mongoose.Types.ObjectId(id)],                
                  phone:req.body.phone,                              
                  password:hash,                                        
                  status_label:'default',               
                  status:'0',                            
                  user_category_label:'network',             
                  user_category :'1',
                  user_type:['publisher', 'advertiser', 'network_owner'],
                  country:req.body.country,               
                  skype_id : '',                                
                    roles:{
                    network_id:Mongoose.Types.ObjectId(id),         
                    role:'network_owner',                             
                    role_id:Mongoose.Types.ObjectId(output[0]._id),             
                    permissions:output[0].permissions                          
                  },
                  first_login_ip :clientIp,             
                  last_login_ip :clientIp,                
                  reset_password_token :'',             
                  reset_password_required:'',//number   
                  rest_password_at :'',//date           
                  reset_password_ip:'abcd',             
                  last_login:Moment().format(),//date  
                });
                // =========================saving user===============================
                user.save().then( result =>{
                  user_id=result._id
                  // making advertiser model************************
                        let advertiser = new AdvertiserModel({
                            network_id: id,
                            name: name,
                            company: "self " + req.body.company_name.trim(),
                            slug : req.body.company_name.trim(),
                            company_logo: "",
                            address: {
                                address: req.body.address.trim(),
                                locality: req.body.locality.trim(),
                                city: req.body.city.trim(),
                                state: req.body.state.trim(),
                                pincode: req.body.pincode.trim(),
                                country: req.body.country.trim()
                            },
                            phone: req.body.phone.trim(),
                            status: "Active",
                            account_manager: {
                                name: name,
                                email: req.body.email.trim(),
                                userId: user_id,
                                phone: req.body.pincode.trim(),
                                skypeId: ""
                            },
                            parameters: "",
                            billing_address: "",
                            email: req.body.email.trim(),
                            skypeId: "",
                        });
                   
                  // ========================saving advertiser==================
                  advertiser.save().then( result =>{
                //   debug(result);
                  let response = Response.success();
                  response.payloadType = payloadType.array;
                  response.msg = " successfully saved advertiser"
                //   debug(response);
                  })// advertiser save then
                  .catch(err => {
                      let response = Response.error();
                      response.error = [err.message];
                    response.msg = " error while saving advertiser "
                    // debug(response);
                    return res.status(400).json(response);
                  })// advertiser save catch
                  // publisher model*********************
                  let publisher = new PublisherModel({
                  network_id: id,
                    name: name,
                    company: "self " +req.body.company_name.trim(),
                    company_logo:"",
                    address: {
                      address:req.body.address.trim(),
                      locality:req.body.locality.trim(),
                      city:req.body.city.trim(),
                      state:req.body.state.trim(),
                      pincode: req.body.pincode.trim(),
                      country:req.body.country.trim()
                    },
                    phone: req.body.phone.trim(),
                    status: "Active",
                    account_manager: {
                      name:name,
                      email:req.body.email.trim(),
                      userId:user_id,
                      phone: req.body.pincode.trim(),
                      skypeId:""
                    },
                    api_details:null,
                    payout_percent:100
                });
                // =======================saving publisher=========================
                publisher.save().then( result =>{
                // debug(result);
                let response = Response.success();
                response.payloadType = payloadType.array;
                response.msg = " successfully saved publisher"
                // debug(response);
                })// publisher save then
                .catch(err => {
                    let response = Response.error();
                    response.error = [err.message];
                  response.msg = " error while saving publisher "
                //   debug(response);
                  return res.status(400).json(response);
                })// publisher save catch
                // debug(result);
                let response = Response.success();
                response.payloadType = payloadType.array;
                response.msg = " successfully saved user"
                // debug(response);
                })// user save then
                .catch(err => {
                    let response = Response.error();
                    response.error = [err.message];
                  response.msg = " error while saving user "
                //   debug(response);
                  return res.status(400).json(response);
                })// user save catch
              }
              let response = Response.success();
              response.payloadType = payloadType.array;
              response.msg = " successfully saved network"
            //   debug(response);
              return res.status(200).json(response);
            })// network save then
            .catch( err =>{
              {
                console.log(err);
                let response = Response.error();
                response.error = [err.message];
                response.msg = " error while saving network "
                return res.status(400).json(response);
              }
            })// network save catch
        })// isRoleExists then
        .catch(err=>{
            let response = Response.error();
            response.error = [err.message];
          response.msg = " error occurred while retrieving permissions details "
        //   debug(response);
          return res.status(400).json(response);
        })// isRoleExists catch
        
    }
    });//isNetworkExists then
}

exports.isNetworkIdExists=function(req,res){

  let filter = { "network_unique_id" : req.params.id };
  let projection = { _id :1 };
  NetworkModel.isIdExists(filter,projection).then(result=>{
    //if no result is retrieved
    if( !result )
    {

      return res.status(400).send('error');
    }
    //when we get an id --network exists
    else if(result && result.length>0)
    {
      let response = Response.success();
          response.msg = "Occupied"
        //   debug(response);
          return res.status(200).json(response);
    }
    //user not exist new entry will be made 
    else
    {
      let response = Response.success();
          response.msg = "Not Occupied"
        //   debug(response);
          return res.status(200).json(response);
    } 
  })
    .catch(err => {
      
        let response = Response.error();
        response.error = [err.message];
      response.msg = " error occurred while searching for id "
    //   debug(response);
      return res.status(400).json(response);
  })
}

exports.getNetworkData = function(req,res){
  let filter={};
  let projection={company_name:1,status:1,website:1,domain:1,owner:1,_id:1};
  NetworkModel.findAllNetwork(filter,projection).then(result=>{
    if(result.length<1){
      let response = Response.error();
			response.payloadType = payloadType.array;
			response.msg = "No Network Added";
			return res.status(400).send( response )
    }
    else if (result.length>=1)
    {
      //console.log(result);
      res.status(200).json(result);
    }
  })
  .catch(err=>{
    let response=Response.error();
    response.err=payloadType.array;
    response.msg="Something Wents Wrong";
    return res.status(400).json(response);
  })

  
}

exports.getNetworkByID=function(req,res){
  const _id=req.params._id;
  // console.log( "network_id ",  _id);
  let filter={'_id':_id};
  let projection={};
  NetworkModel.findOneNetwork(filter,projection).then(result=>{
    if(result.length>=1){
      res.status(200).json(result);
    }
  })
  .catch(err=>{
    let response=Response.error();
    response.err=payloadType.array;
    response.msg="Something Wents Wrong";
    return res.status(400).json(response);
  })
}

exports.setStatus=function(req,res){
  let statusValue={status:req.body.status}  ;
  
  let filter={'_id': req.body._id};
  //console.log(filter,"HYYY");
  NetworkModel.updateStatus(filter,{$set : statusValue}).then(result=>{
    let response = Response.success();
    response.payloadType = payloadType.array;
    response.payload = [result];
    if (result.nModified > 0) {
        response.msg = "Status Updated Sucessfully"
      }
    else {
          response.msg = " Data Not Found "
        }
    return res.status(200).json(response);

  }).catch(err => {
    console.log(err);
    let response = Response.error();
    response.msg = "error updating";
    response.error = [err.message];
    return res.status(200).json(response);
})
  
}
