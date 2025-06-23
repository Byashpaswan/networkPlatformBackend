const Mongoose = require("mongoose");
const debug = require("debug")("eagle:models:User");
const objectIdType = Mongoose.Schema.Types.ObjectId;
const mongooseObjectId = Mongoose.Types.ObjectId;
const { config } = require('../constants/index');
//config.USER_STATUS.default
const { getConstLabel, getConstValue } = require('../helper/Util');

const isValidNetworkId = function () {
  return typeof this.network === null || Mongoose.Types.ObjectId.isValid(this.network) ? true : false;
};

const permissions = Mongoose.Schema({
  id: {
    type: objectIdType,
  },
  name: { type: String, }

}, {
  _id: false
});

const publisher = Mongoose.Schema({
  id: {
    type: objectIdType,
  },
  name: { type: String, }

}, {
  _id: false
});

const advertiser = Mongoose.Schema({
  id: {
    type: objectIdType,
  },
  name: { type: String, }

}, {
  _id: false
});

const RolesAndPermissions = Mongoose.Schema({
  network_id: {
    type: objectIdType,
    required: isValidNetworkId,
  },
  role: {
    type: String,
    required: false,
    default: null,
  },
  role_id: {
    type: objectIdType,
    required: true,
  },
  permissions: {
    type: [permissions],
    required: true,
  }

}, {
  _id: false
})

const UserSchema = Mongoose.Schema({
  first_name: {
    type: String,
    required: true,
  },
  last_name: {
    type: String,
    required: false,//modified
  },
  gender: {
    type: String,
    required: false,//modified
  },
  email: {
    type: String,
    required: true,
  },
  network: {
    type: [objectIdType],
    required: isValidNetworkId,
  },
  nid: {
    type: Number
  },
  phone: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  profile_image: {
    type: String,
    required: false,
    default: ''
  },
  status_label: {
    type: String,
    require: true,
    enum: getConstLabel(config.USER_STATUS),
    default: config.USER_STATUS.default.label,
  },
  status: {
    type: Number,
    require: true,
    enum: Object.keys(getConstValue(config.USER_STATUS)).map(Number),
    default: config.USER_STATUS.default.value,
  },
  user_category_label: {
    type: String,
    required: true,
    enum: getConstLabel(config.USER_CATEGORY),
    default: config.USER_CATEGORY.default.label,
  },
  user_category: {
    type: Number,
    required: true,
    enum: Object.keys(getConstValue(config.USER_CATEGORY)).map(Number),
    default: config.USER_CATEGORY.default.value,
  },
  user_type: {
    type: [String],
    enum: getConstLabel(config.USER_TYPE),
    required: true,
    default: []
  },
  parent_id: {
    type: [objectIdType],
    required: true,
    default: null
  },
  last_login: {
    type: Date,
    required: true,
    default: new Date()
  },
  country: {
    type: String,
    required: false,
    default: "",
  },
  skype_id: {
    type: String,
    required: false,
    default: "",
  },
  first_login_ip: {
    type: String,
    required: true,

  },

  last_login_ip: {
    type: String,
    required: true,
  },
  reset_password_token: {
    type: String,
    required: false,
  },
  token: {
    type: String,
    required: false,
  },
  reset_password_required: {
    type: Number,
    required: false,
    default: 0,
  },
  rest_password_at: {
    type: Date,
    required: false,
    default: null,

  },
  reset_password_ip: {
    type: String,
    required: false,
    default: null,

  },
  //Todo: set roles required true once permission ready
  roles: {
    type: RolesAndPermissions,
    required: false,
  },
  isPublisher: {
    type: Boolean,
    require: false,
    default: false,
    description: 'true if atleast one publisher is asigned to this user '
  },
  isAdvertiser: {
    type: Boolean,
    require: false,
    default: false,
    description: 'true if atleast one advertiser is asigned to this user '
  },
  publisher: {
    type: [publisher],
    require: false
  },
  advertiser: {
    type: [advertiser],
    require: false
  }
}, {
  timestamps: true
});

UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ network: 1, email: 1, status: 1 });
UserSchema.index({ user_category: 1 });

//module.exports = Mongoose.model('user', UserSchema);
module.exports = UserSchema;

