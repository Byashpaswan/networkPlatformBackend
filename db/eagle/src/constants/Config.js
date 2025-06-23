
exports.USER_CATEGORY = {
  default: {
    label: "default",
    value: '0',
    description: "",
  },
  network: {
    label: "network",
    value: '1',
    description: "",
  },
  system: {
    label: "system",
    value: '2',
    description: "",
  }, publisher: {
    label: "publisher",
    value: '3',
    description: "",
  }, advertiser: {
    label: "advertiser",
    value: '4',
    description: "",
  }
};

exports.Permission_Category = [ 'User', 'offer', 'advertiser', 'affiliate', 'system', 'reports' , 'external' , 'dashboard'];
exports.USER_TYPE = {
  publisher: {
    label: "publisher",
    value: '0',
    description: "",
  },

  advertiser: {
    label: "advertiser",
    value: '1',
    description: "",
  },

  network_owner: {
    label: "network_owner",
    value: '2',
    description: "",
  },

  network_user: {
    label: "network_user",
    value: '3',
    description: "",
  },

  system_user: {
    label: "system_user",
    value: '4',
    description: "",
  }
}

// export const USER_CATEGORY = {
//   ops_advertiser_manager: 0,
//   ops_publisher_manager: 1,
//   network_owner: 2,
//   network_publisher:3,
//   network_advertiser:4,
//   system_user:5,
//   default:0,
//   network: 1,
//   system:2

// };
exports.VERSION_CONDITION = {
  lt: {
    label: "<",
    value: "lt",
    description: "Less Than"
  },
  gt: {
    label: ">",
    value: "gt",
    description: "Greater Than"
  },
  lte: {
    label: "<=",
    value: "lte",
    description: "Less Than Equal To"
  },
  gte: {
    label: ">=",
    value: "gte",
    description: "Greater Than Equal To"
  },
  eq: {
    label: "=",
    value: "eq",
    description: "Equals To"
  },
  neq: {
    label: "!=",
    value: "neq",
    description: "Not Equals To"
  },
};
exports.OFFERS_CATERGORIES = {
  Gaming: { description: 'Gaming', type: 'offer' },
  Utilities: { description: 'Utilities', type: 'offer' },
  Social: { description: 'Social', type: 'offer' },
  Banking: { description: 'Banking', type: 'offer' },
  Classifieds: { description: 'Classifieds', type: 'offer' },
  "Real Estate": { description: 'Real Estate', type: 'offer' },
  Travel: { description: 'Travel', type: 'offer' },
  Automobile: { description: 'Automobile', type: 'offer' },
  Securities: { description: 'Securities', type: 'offer' },
  Jewellery: { description: 'Jewellery', type: 'offer' },
  Education: { description: 'Education', type: 'offer' },
  "Food and Drink": { description: 'Food and Drink', type: 'offer' },
  Adult: { description: 'Adult', type: 'offer' },
  Dating: { description: 'Dating', type: 'offer' },
  Sports: { description: 'Sports', type: 'offer' },
  Entertainment: { description: 'Entertainment', type: 'offer' },
  "e-commerce": { description: 'e-commerce', type: 'offer' }
}
  ;
exports.OFFER_CATEGORY_TYPE = ['offer'];
exports.REDIRECT_METHOD = ['javascript_redirect', 'meta_redirect', 'server_redirect(permanent)', 'server_redirect(temporary)'];
exports.OFFERS_REVENUE_TYPE = ['CPI', 'CPA', 'CPC', 'CPD', 'CPM', 'CPS', 'CPR', 'CPL', 'CPA_FLAT', 'CPA_PERCENTAGE', 'CPA_BOTH', 'CPE', 'unknown'];
exports.currency = ['INR', 'USD', 'EURO'];
exports.DEVICE = ['all', 'mobile', 'desktop', 'unknown'];
exports.OS = ['all', 'android', 'ios', 'windows', 'amazon', 'blackberry', 'unknown'];
exports.country = [
  { key: "ALL", value: "All" },
  { key: "AF", value: "Afghanistan" },
  { key: "AX", value: "Aland Islands" },
  { key: "AL", value: "Albania" },
  { key: "DZ", value: "Algeria" },
  { key: "AD", value: "Andorra" },
  { key: "AO", value: "Angola" },
  { key: "AI", value: "Anguilla" },
  { key: "AG", value: "Antigua and Barbuda" },
  { key: "AR", value: "Argentina" },
  { key: "AM", value: "Armenia" },
  { key: "AW", value: "Aruba" },
  { key: "AU", value: "Australia" },
  { key: "AT", value: "Austria" },
  { key: "AZ", value: "Azerbaijan" },
  { key: "BS", value: "Bahamas" },
  { key: "BH", value: "Bahrain" },
  { key: "BD", value: "Bangladesh" },
  { key: "BB", value: "Barbados" },
  { key: "BY", value: "Belarus" },
  { key: "BE", value: "Belgium" },
  { key: "BZ", value: "Belize" },
  { key: "BJ", value: "Benin" },
  { key: "BM", value: "Bermuda" },
  { key: "BT", value: "Bhutan" },
  { key: "BO", value: "Bolivia" },
  { key: "BQ", value: "Bonaire, int Eustatius and Saba" },
  { key: "BA", value: "Bosnia and Herzegovina" },
  { key: "BW", value: "Botswana" },
  { key: "BR", value: "Brazil" },
  { key: "BN", value: "Brunei Darussalam" },
  { key: "BG", value: "Bulgaria" },
  { key: "BF", value: "Burkina Faso" },
  { key: "KH", value: "Cambodia" },
  { key: "CM", value: "Cameroon" },
  { key: "CA", value: "Canada" },
  { key: "CV", value: "Cape Verde" },
  { key: "KY", value: "Cayman Islands" },
  { key: "CF", value: "Central African Republic" },
  { key: "CL", value: "Chile" },
  { key: "CN", value: "China" },
  { key: "CC", value: "Cocos (Keeling) Islands" },
  { key: "CO", value: "Colombia" },
  { key: "CR", value: "Costa Rica" },
  { key: "CI", value: "C&#244;te d'Ivoire" },
  { key: "HR", value: "Croatia" },
  { key: "CW", value: "Cura&#231;ao" },
  { key: "CY", value: "Cyprus" },
  { key: "CZ", value: "Czech Republic" },
  { key: "DK", value: "Denmark" },
  { key: "DJ", value: "Djibouti" },
  { key: "DM", value: "Dominica" },
  { key: "DO", value: "Dominican Republic" },
  { key: "EC", value: "Ecuador" },
  { key: "EG", value: "Egypt" },
  { key: "SV", value: "El Salvador" },
  { key: "GQ", value: "Equatorial Guinea" },
  { key: "EE", value: "Estonia" },
  { key: "ET", value: "Ethiopia" },
  { key: "FO", value: "Faroe Islands" },
  { key: "FJ", value: "Fiji" },
  { key: "FI", value: "Finland" },
  { key: "FR", value: "France" },
  { key: "GF", value: "French Guiana" },
  { key: "PF", value: "French Polynesia" },
  { key: "GM", value: "Gambia" },
  { key: "GE", value: "Georgia" },
  { key: "DE", value: "Germany" },
  { key: "GH", value: "Ghana" },
  { key: "GI", value: "Gibraltar" },
  { key: "GR", value: "Greece" },
  { key: "GL", value: "Greenland" },
  { key: "GD", value: "Grenada" },
  { key: "GP", value: "Guadeloupe" },
  { key: "GU", value: "Guam" },
  { key: "GT", value: "Guatemala" },
  { key: "GG", value: "Guernsey" },
  { key: "GN", value: "Guinea" },
  { key: "GY", value: "Guyana" },
  { key: "HT", value: "Haiti" },
  { key: "HN", value: "Honduras" },
  { key: "HK", value: "Hong Kong" },
  { key: "HU", value: "Hungary" },
  { key: "IS", value: "Iceland" },
  { key: "IN", value: "India" },
  { key: "ID", value: "Indonesia" },
  { key: "IR", value: "Iran" },
  { key: "IQ", value: "Iraq" },
  { key: "IE", value: "Ireland" },
  { key: "IM", value: "Isle of Man" },
  { key: "IL", value: "Israel" },
  { key: "IT", value: "Italy" },
  { key: "JM", value: "Jamaica" },
  { key: "JP", value: "Japan" },
  { key: "JE", value: "Jersey" },
  { key: "JO", value: "Jordan" },
  { key: "KZ", value: "Kazakhstan" },
  { key: "KE", value: "Kenya" },
  { key: "KR", value: "Korea - South" },
  { key: "KW", value: "Kuwait" },
  { key: "KG", value: "Kyrgyzstan" },
  { key: "LA", value: "Laos" },
  { key: "LV", value: "Latvia" },
  { key: "LB", value: "Lebanon" },
  { key: "LR", value: "Liberia" },
  { key: "LY", value: "Libya" },
  { key: "LI", value: "Liechtenstein" },
  { key: "LT", value: "Lithuania" },
  { key: "LU", value: "Luxembourg" },
  { key: "MO", value: "Macao" },
  { key: "MK", value: "Macedonia" },
  { key: "MG", value: "Madagascar" },
  { key: "MW", value: "Malawi" },
  { key: "MY", value: "Malaysia" },
  { key: "MV", value: "Maldives" },
  { key: "ML", value: "Mali" },
  { key: "MT", value: "Malta" },
  { key: "MH", value: "Marshall Islands" },
  { key: "MQ", value: "Martinique" },
  { key: "MU", value: "Mauritius" },
  { key: "MX", value: "Mexico" },
  { key: "MD", value: "Moldova" },
  { key: "MC", value: "Monaco" },
  { key: "MN", value: "Mongolia" },
  { key: "ME", value: "Montenegro" },
  { key: "MS", value: "Montserrat" },
  { key: "MA", value: "Morocco" },
  { key: "MZ", value: "Mozambique" },
  { key: "MM", value: "Myanmar" },
  { key: "NR", value: "Nauru" },
  { key: "NP", value: "Nepal" },
  { key: "NL", value: "Netherlands" },
  { key: "NC", value: "New Caledonia" },
  { key: "NZ", value: "New Zealand" },
  { key: "NI", value: "Nicaragua" },
  { key: "NE", value: "Niger" },
  { key: "NG", value: "Nigeria" },
  { key: "MP", value: "Northern Mariana Islands" },
  { key: "NO", value: "Norway" },
  { key: "OM", value: "Oman" },
  { key: "PK", value: "Pakistan" },
  { key: "PS", value: "Palestinian Territory" },
  { key: "PA", value: "Panama" },
  { key: "PY", value: "Paraguay" },
  { key: "PE", value: "Peru" },
  { key: "PH", value: "Philippines" },
  { key: "PL", value: "Poland" },
  { key: "PT", value: "Portugal" },
  { key: "PR", value: "Puerto Rico" },
  { key: "QA", value: "Qatar" },
  { key: "RE", value: "Reunion" },
  { key: "RO", value: "Romania" },
  { key: "RU", value: "Russian Federation" },
  { key: "RW", value: "Rwanda" },
  { key: "KN", value: "Saint Kitts and Nevis" },
  { key: "LC", value: "Saint Lucia" },
  { key: "MF", value: "Saint Martin" },
  { key: "VC", value: "Saint Vincent and the Grenadines" },
  { key: "WS", value: "Samoa" },
  { key: "SA", value: "Saudi Arabia" },
  { key: "SN", value: "Senegal" },
  { key: "RS", value: "Serbia" },
  { key: "SC", value: "Seychelles" },
  { key: "SL", value: "Sierra Leone" },
  { key: "SG", value: "Singapore" },
  { key: "SX", value: "Sint Maarten (Dutch part)" },
  { key: "SK", value: "Slovakia" },
  { key: "SI", value: "Slovenia" },
  { key: "SO", value: "Somalia" },
  { key: "ZA", value: "South Africa" },
  { key: "ES", value: "Spain" },
  { key: "LK", value: "Sri Lanka" },
  { key: "SD", value: "Sudan" },
  { key: "SR", value: "Suriname" },
  { key: "SZ", value: "Swaziland" },
  { key: "SE", value: "Sweden" },
  { key: "CH", value: "Switzerland" },
  { key: "SY", value: "Syria" },
  { key: "TW", value: "Taiwan" },
  { key: "TJ", value: "Tajikistan" },
  { key: "TZ", value: "Tanzania, nited Republic of" },
  { key: "TH", value: "Thailand" },
  { key: "TL", value: "Timor-Leste" },
  { key: "TT", value: "Trinidad and Tobago" },
  { key: "TN", value: "Tunisia" },
  { key: "TR", value: "Turkey" },
  { key: "TM", value: "Turkmenistan" },
  { key: "TC", value: "Turks and Caicos Islands" },
  { key: "UG", value: "Uganda" },
  { key: "UA", value: "Ukraine" },
  { key: "AE", value: "United Arab Emirates" },
  { key: "UK", value: "United Kingdom" },
  { key: "US", value: "United States" },
  { key: "UY", value: "Uruguay" },
  { key: "UZ", value: "Uzbekistan" },
  { key: "VU", value: "Vanuatu" },
  { key: "VE", value: "Venezuela, olivarian Republic of" },
  { key: "VN", value: "Vietnam" },
  { key: "VG", value: "Virgin Islands, ritish" },
  { key: "VY", value: "Virgin Islands, .S." },
  { key: "YE", value: "Yemen" },
  { key: "ZM", value: "Zambia" },
  { key: "ZW", value: "Zimbabwe" }];

exports.USER_STATUS = {
  active: {
    label: 'active',
    value: 2,
    description: ''
  },
  inactive: {
    label: 'inactive',
    value: 3,
    description: ''
  },
  default: {
    label: 'default',
    value: 0,
    description: ''
  },
  applied: {
    label: 'applied',
    value: 1,
    description: ''
  },
  blocked: {
    label: 'blocked',
    value: -1,
    description: ''
  },
  deleted: {
    label: 'deleted',
    value: -2,
    description: ''
  },


};
exports.PUBLISHER_Offer_STATUS = ['pending', 'approved', 'rejected']

exports.INVALID_CLICK_STATUS = {
  104: {
    label: 104,
    description: "Invalid offer id"
  },
  105: {
    label: 105,
    description: "Invalid affiliate id"
  },
  106: {
    label: 106,
    description: "Affiliate not found"
  },
  107: {
    label: 107,
    description: "Affiliate is not active"
  },
  108: {
    label: 108,
    description: "Offer not valid  for affiliate"
  },
  109: {
    label: 109,
    description: "Offer not approved for publisher"
  },
  110: {
    label: 110,
    description: "Offer not active"
  },
  111: {
    label: 111,
    description: "Offer not live"
  },
  112: {
    label: 112,
    description: "Offer expired"
  },
  113: {
    label: 113,
    description: "Not valid for this country"
  },
  114: {
    label: 114,
    description: "Not valid for this city"
  },
  115: {
    label: 115,
    description: "Not valid for this device"
  },
  116: {
    label: 116,
    description: "Server Error"
  },
  117: {
    label: 117,
    description: "Capping Over"
  },
  118: {
    label: 118,
    description: "Advertiser not active"
  },
  125: {
    label: 125,
    description: "Offer is Blocked"
  },
  126: {
    label: 126,
    description: "Offer is Auto Blocked"
  }
};

exports.CONVERSION_FAILED_STATUS = {
  119: {
    label: 119,
    description: "server error"
  },
  120: {
    label: 120,
    description: "duplicate conversion"
  },
  121: {
    label: 121,
    description: "click id not passed or blank click id"
  },
  122: {
    label: 122,
    description: "invalid click id"
  },
  123: {
    label: 123,
    description: "offer not found"
  },
  124: {
    label: 124,
    description: "inserting goal conversion error"
  },
}

// pubOff schema for offer
exports.PUBLISHER_OFFERS_STATUS = {
  new: {
    label: "new",
    value: 0,
    description: 'publisher not in pubOff of offer',
  },
  approved: {
    label: "approved",
    value: 1,
    description: 'offer active for publisher',
  },
  applied: {
    label: "applied",
    value: 2,
    description: 'publisher applied for offer',
  },
  paused: {
    label: "paused",
    value: 3,
    description: 'offer paused for publisher',
  },
  rejected: {
    label: 'rejected',
    value: 4,
    description: "offer rejected for publisher",
  }
};

exports.ADVERTISER_OFFER_STATUS = {
  no_link: {
    label: "no_link",
    value: 0,
    description: 'offer without link',
  },
  active: {
    label: 'active',
    value: 1,
    description: "offer with tracking link",
  },
}

exports.OFFERS_STATUS = {
  no_link: {
    label: "no_link",
    value: 0,
    description: 'offer without link',
  },
  active: {
    label: 'active',
    value: 1,
    description: "",
  },
  waitingForApproval: {
    label: "waitingForApproval",
    value: 2,
    description: 'Offer request has been sent to advertiser panel for approval',
  },
  applied: {
    label: "applied",
    value: 3,
    description: 'Offer approval request made by user but has not requested to advertiser panel',
  },
  waiting_in_apply: {
    label: "waiting_in_apply",
    value: 4,
    description: 'Apply offer daily limit reached, can be applied next day',
  },
  paused: {
    label: "paused",
    value: 5,
    description: 'Offer paused for the time',
  },
  deleted: {
    label: 'deleted',
    value: -1,
    description: "",
  },
  unmanaged: {
    label: 'unmanaged',
    value: -2,
    description: "",
  },
  rejected: {
    label: 'rejected',
    value: -3,
    description: "Offer has been rejected by the advertiser",
  },
};

// export const OFFERS_STATUS = {
//     new :"new",
//     pending: "waiting_for_approval",
//     active: "active",
//     unmanaged: "unmanaged",
//     delete: "deleted",
//   };

exports.OFFER_VISIBILITY = {
  private: {
    label: 'private',
    value: 0,
    description: '',
  },
  approval_required: {
    label: "approval_required",
    value: 1,
    description: "",
  },
  auto_approve: {
    label: 'auto_approve',
    value: 2,
    description: "",
  },
  public: {
    label: 'public',
    value: 3,
    description: '',
  }


}

exports.NETWORK_SETTING_MACROS = {
  source: {
    value: 'source',
    description: '',
  },
  clickId: {
    value: 'click_id',
    description: '',
  },
  aff_click_id: {
    value: 'aff_click_id',
    description: '',
  },
  gaid: {
    value: 'gaid',
    description: '',
  },
  idfa: {
    value: 'idfa',
    description: '',
  },
  AppName: {
    value: 'app_name',
    description: '',
  },
  AffLang: {
    value: 'aff_lang',
    description: '',
  },

}

exports.POSTBACK_FORWARDING_MACROS = {
  click_id: {
    value: 'click_id',
    description: '',
  },
  source: {
    value: 'aff_source',
    description: '',
  },
  goal_id: {
    value: 'goal_id',
    description: '',
  },
  creative_id: {
    value: 'creative_id',
    description: '',
  },
  payout: {
    value: 'payout',
    description: '',
  },
  gaid: {
    value: 'gaid',
    description: '',
  },
  idfa: {
    value: 'idfa',
    description: '',
  },
  offer_id: {
    value: 'offer_id',
    description: '',
  },
  AvertiserSource: {
    value: 'ad_source',
    description: '',
  },
  ad_ip: {
    value: 'ad_ip',
    description: '',
  },
  ad_ins_time: {
    value: 'ad_ins_time',
    description: '',
  },
  ad_currency: {
    value: 'ad_currency',
    description: '',
  },
  goal: {
    value: 'goal',
    description: '',
  },
  goal_data: {
    value: 'goal_data',
    description: '',
  },
};

exports.POSTBACK_FORWARDING_CASE = {
  "forward All Postback": {
    value: 'forward_all',
    description: "forward all incoming postback"
  },
  "forward Unmatched Postback": {
    value: 'forward_unmatched',
    description: "forward postback which have unmatched click id only"
  },
  "No forwarding": {
    value: "no_forwarding",
    description: "no forwarding of postback"
  }
}
// export const OFFER_VISIBILITY = {
//   private:"private",
//   approval_required: "approval_required",
//   auto_approve : "auto_approve",
//   public: "public",
// }

exports.APPROVE_ADVERTISER_OPTIONS = {
  100: {
    label: 100,
    description: "Auto Approve Disabled"
  },
  101: {
    label: 101,
    description: "Auto Approve Selected"
  },
  102: {
    label: 102,
    description: "Auto Approve All"
  },
  103: {
    label: 103,
    description: "Auto Approve Other Than Selected"
  },
  104: {
    label: 104,
    description: "Pre Approve Selected"
  },
  105: {
    label: 105,
    description: "Pre Approve All"
  },
  106: {
    label: 106,
    description: "Pre Approve Other Than Selected"
  }
};
