const Config = require('../constants/config')

exports.error = ( ) =>{
  return {
      err: true,
      msg: "Some thing went wrong",
      error : [],
    };
}

exports.success = ( ) =>{
  return {
    err: false,
      msg: "success",
      payloadType: Config.payloadType.object,
      payload: [],
  }
}
