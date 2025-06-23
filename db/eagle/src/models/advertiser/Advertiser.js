const Mongoose = require("mongoose");
const debug = require("debug")("eagle:models:Advertiser");
const MongooseAutoIncrement = require("mongoose-auto-increment");
const objectIdType = Mongoose.Schema.Types.ObjectId;
const mongooseObjectId = Mongoose.Types.ObjectId;
const {
  config
} = require("../../constants/index");
const Address = require("../Address");
const {
  getConstLabel,
  getConstValue
} = require("../../helper/Util");

const FinanceDetails = Mongoose.Schema({
  firstName: {
    type: String,
    require: false
  },
  lastName: {
    type: String,
    require: false
  },
  email: {
    type: String,
    required: false
  },
  phone: {
    type: String,
    required: false
  },
  skypeId: {
    type: String,
    required: false
  },
  address: {
    type: String,
    required: false
  },
  locality: {
    type: String,
    required: false
  },
  city: {
    type: String,
    required: false
  },
  state: {
    type: String,
    required: false
  },
  pincode: {
    type: Number,
    required: false
  },
  gstin:{
    type:String
  },
  country: {
    type: String,
    required: false
  }
});

const Manager = Mongoose.Schema({
  name: {
    type: String,
    require: false
  },
  email: {
    type: String,
    required: false
  },

  //Todo: have clarity: manager is register user or not
  userId: {
    type: objectIdType,
    required: false
  },
  phone: {
    type: String,
    required: false
  },
  skypeId: {
    type: String,
    required: false
  }
}, {
  _id: false
});

const Plaform = Mongoose.Schema(
  {
    platform_id: {
      type: objectIdType,
      required: false
    },
    platform_name: {
      type: String,
      required: false
    },
    domain: {
      type: [],
      required: false,
      default: []
    },
    status: {
      type: String,
      required: false,
      description: 'status of platform account '
    },
    platform_type_id: {
      type: objectIdType,
      required: false
    }
  },
  {
    _id: false
  }
)

const Advertiser = Mongoose.Schema({
  network_id: {
    type: objectIdType,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  company: {
    type: String,
    required: true
  },
  company_logo: {
    type: String,
    required: false
  },
  address: {
    type: Address
  },
  phone: {
    type: String,
    required: false
  },
  status: {
    type: String,
    required: true,
    default: 'InActive'

  },
  account_manager: {
    type: Manager,
    required: false,
    default: {}
  },
  financeDetails: {
    type: FinanceDetails,
    required: false,
    default: {}
  },
  parameters: {
    type: String
  },
  billing_address: {
    type: String
  },
  email: {
    type: String,
    required: false
  },
  skypeId: {
    type: String
  },
  platforms: {
    type: [Plaform]
  },
  slug: {
    type: String,
    // required: true
  },
  payCal : {
    type : String 
  },
  comments : {
    type : String
  }
}, {
  timestamps: true
});
Advertiser.index({
  company: 1,
  network_id: 1
}, {
  unique: true
});
Advertiser.index({
  network_id: 1,
  status: 1,
});

// Mongoose.plugin(MongooseAutoIncrement.plugin,
//   {
//     model: 'advertisers',
//     field: 'advertiser_id',
//     startAt: 1,
//     incrementBy:1,
// });
//module.exports = Mongoose.model('advertisers', Advertiser);
module.exports = Advertiser;
