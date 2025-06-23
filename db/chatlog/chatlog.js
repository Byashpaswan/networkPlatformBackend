const mongoose=require('mongoose');
const { chatLog } = require('../Model');





module.exports=mongoose.model('chat_log',chatLog);






