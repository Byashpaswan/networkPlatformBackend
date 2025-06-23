const Mongoose = require("mongoose");
const debug = require("debug")("eagle:models:ApplicationDetails");
const objectIdType = Mongoose.Schema.Types.ObjectId;

const ApplicationStatus = Mongoose.Schema({
    app_id: {
        type: String,
        required: true,
    },
    country: {
        type: String,
    },
    name: {
        type: String,
    },
    last_update: {
        type: Date,
    },
    category: {
        type: String,
    },
    count : {
        type : Number ,
    },
    before_7_days:{
        type : Number , 
    },
    before_30_days: {
        type : Number , 
    },
    conv_count : {
        type : Number , 
        default : 0 
    } , 
    campaign_status : {
        type : String ,
        default : '',

    },
    update: {
        type : String , 
        default : '' ,

    },
    is_incorrect_app_id: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

ApplicationStatus.index({ app_id: 1 }, { unique: true });

module.exports = ApplicationStatus;