const express=require('express');
const router=express.Router()
const chatSupportController=require('../../controllers/chatReply')
const authentication=require('../../helpers/Auth')

router.use(authentication.tokenAuthentication);



router.post("/msg",chatSupportController.getReply);


module.exports = router;