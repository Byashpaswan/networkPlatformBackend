const Mongoose=require('mongoose')
 require('dotenv').config({ path:'.env'}); 
const debug = require('debug')('darwin:controller:chatReply');
const chatLogModel=require('.././db/chatlog/chatlog')
// const {openai} =require('../helpers/Functions')
const ObjectId=Mongoose.Types.ObjectId;

const keywordResponses = [
  {
    keywords: ['help', 'support', 'assist'],
    reply: 'Sure! I can help you with our services and support options.',
  },
  {
    keywords: ['services', 'campaign', 'marketing'],
    reply: 'We offer to run your campaigns in an optimized way with dedicated support.',
  },
  {
    keywords: ['contact', 'email', 'phone'],
    reply: 'You can email us at support@proffcus.com or call +91-XXXX-XXXX.',
  },
  {
    keywords: ['price', 'cost', 'charge'],
    reply: 'Our pricing is customized based on your campaign needs. Would you like us to contact you?',
  },
  {
    keywords: ['location', 'office'],
    reply: 'We operate remotely but are headquartered in Noida, India.',
  }
];

exports.getReply = async (req, res) => {
   try{ 
     
      const userMessage = req.body.msg?.toLowerCase() || '';

     let  msg=[{sender:'user',text:userMessage}]

      console.log("User message:", userMessage);

      let response = "I'm not sure how to respond to that. Please try asking about our services, contact, or help.";

      for (const entry of keywordResponses) {
        if (entry.keywords.some(keyword => userMessage.includes(keyword))) {
          response = entry.reply;
          break;
        }
      }
      msg.push({sender:'bot',text:response});
      console.log("req.user",req.user)
      let savedData={ 
          nId:ObjectId(req.user.userDetail.network[0]),
          uId:req.user.userDetail.id,
          uName:req.user.userDetail.name,
          email:req.user.userDetail.email,
          msg:msg
        }
      

       await chatLogModel.create(savedData);
      return res.json({ reply: response });
   }
   catch(error){
    console.error('Error in getReply:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
   }
};
