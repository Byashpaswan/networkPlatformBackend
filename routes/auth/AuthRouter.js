const express = require('express');
const router = express.Router();
const debug = require('debug')('darwin:router:AuthRouter');
const Helper = require("../../helpers/Auth");
const Validation = require("../../validations/Validator");

// const multer = require('multer');
// const upload = multer();

router.post("/token",Helper.tokenRegenerate);
router.post("/tokenChecker",Helper.tokenAuthentication,(req,res)=>{
    res.send("valid token");
});
router.post("/forgetpassword",Helper.forgetPassowrd);
router.post("/checkurl",Helper.resetPassword);
router.post("/resetpassword",Validation.setPassword,Helper.setPassword);
module.exports = router;


