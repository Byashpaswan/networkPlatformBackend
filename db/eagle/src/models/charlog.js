
const Mongoose=require('mongoose');
const  MongooseId=Mongoose.Schema.Types.ObjectId;

const chatMessage=Mongoose.Schema({
    sender:{
        type:String,
        enum:['user','bot'],
        require:true,
    },
    text:{
        type:String
    },
    // intent: {
    //     type: String,
    //     default: null,
    // },
//     isFromAI: {
//         type: Boolean,
//         default: false,
//   },
},{_id:false})




const ChatLog=Mongoose.Schema({
    nId:{
     type: MongooseId,
        require:true,
    },
    uId:{
        type:MongooseId,
        require:true
    },
    uName:{
         type:String
    },
    email:{
         type:String
    },
    msg:{
        type:[chatMessage],
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: { expires: '7d' } 
    }

},{timestamps:true})

module.exports=ChatLog;