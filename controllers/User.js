const userModel= require("../db/user/User");
exports.getUser = (req, res ) =>{
  userModel.getUser()
  .then( result =>{
    res.send("ok");
  }).catch( err =>{
    res.send("err");
  })
}
