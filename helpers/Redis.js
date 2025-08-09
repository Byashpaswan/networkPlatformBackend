// // var redis = require('redis');
// const Promise = require('promise');
// const debug = require("debug")("darwin:Helpers:Redis");
// const {createClient}=require('redis')

// const expire = 600;

// // var client = redis.createClient(process.env.REDIS_PORT || '6379', process.env.REDIS_HOST || '127.0.0.1');
// //var client = redis.createClient(process.env.REDIS_PORT, process.env.REDIS_HOST);
// var client = createClient({url: process.env.REDIS_HOST});


// client.on('connect', function () {
//     debug('redis connected');
// });



const Promise = require('promise');
const debug = require("debug")("darwin:Helpers:Redis");
const {createClient}=require('redis')

const expire = 600;

// var client = redis.createClient(process.env.REDIS_PORT || '6379', process.env.REDIS_HOST || '127.0.0.1');

const client = createClient({
  socket: {
    host: process.env.REDIS_HOST || 'redis-14114.c84.us-east-1-2.ec2.redns.redis-cloud.com',
    port:Number(process.env.REDIS_PORT)|| 14114
  },
  username: 'default',
  password:process.env.REDIS_PASSWORD ||'rFew2iVCPcOGQYAUcpSQJ1aJWNWOOHKN'
});

// Logging events
client.on('connect', () => {
  debug('redis connected');
});

client.on('error', (err) => {
  debug('Redis Client Error', err);
});

// ✅ Async function to connect Redis
async function runRedis() {
  try {
    await client.connect();
    debug('Redis client is ready');
  } catch (err) {
    debug('Error connecting to Redis:', err);
  }
}

// Run connection
runRedis();






// exports.getRedisKeys = function (pattern) {
//     return new Promise(function (resolve, reject) {
//         client.keys(pattern, function (err, result) {
//             if (err) {
//                 reject({
//                     error: true,
//                     data: err.message,
//                     msg: 'error while retrieving keys from redis'
//                 });
//             }
//             resolve({
//                 error: false,
//                 data: result,
//                 message: ' successfully get keys from redis'
//             });
//         });
//     });
// }

exports.getRedisKeys = async function (pattern) {
    try {
        const result = await client.keys(pattern);
        return {
            error: false,
            data: result,
            message: 'successfully got keys from redis'
        };
    } catch (err) {
        return {
            error: true,
            data: err.message,
            msg: 'error while retrieving keys from redis'
        };
    }
};

// exports.getRedisData = function (key) {
//     //debug('get offerkey ', offerKey);
//     return new Promise(function (resolve, reject) {
//         client.get(key, function (err, result) {
//             if (err) {
//                 reject({
//                     error: true,
//                     data: err.message,
//                     msg: 'error while retrieving  value from redis'
//                 })
//             }

//             resolve({
//                 error: false,
//                 data: result,
//                 message: ' successfully get from redis'
//             })

//         })
//     })

// }

exports.getRedisData = async function (key) {
    try {
        const result = await client.get(key);
        return {
            error: false,
            data: result,
            message: 'successfully got value from redis'
        };
    } catch (err) {
        return {
            error: true,
            data: err.message,
            msg: 'error while retrieving value from redis'
        };
    }
};


// exports.setExpire = function (key, exp) {
//     return new Promise(function (resolve, reject) {
//         client.expire(key, exp, function (err) {
//             if (err) {
//                 debug("could not set expiry to key ", key)
//             }
//             resolve({
//                 error: false,
//                 data: result,
//                 message: 'successfully set expire in redis key'
//             });
//         });
//     });
// }


exports.setExpire = async function (key, exp) {
    try {
        await client.expire(key, exp);
        return {
            error: false,
            data: null,
            message: 'successfully set expire in redis key'
        };
    } catch (err) {
        debug("could not set expiry to key", key, err);
        return {
            error: true,
            data: err.message,
            message: 'error while setting expire in redis key'
        };
    }
};

// exports.setRedisData = function (key, value, exp) {
//     return new Promise(function (resolve, reject) {
//         if (value && typeof value == "object") {
//             value = JSON.stringify(value);
//         }else if(value == null || value == undefined){
//             return resolve({
//                 error: true,
//                 data: null,
//                 msg: 'not assign falsy value.'
//             });
//         }
//         client.set(key, value, function (err, result) {
//             if (err) {
//                 reject({
//                     error: true,
//                     data: err.message,
//                     msg: 'error while store value in redis'
//                 });
//             }
//             exp = exp || process.env.REDIS_Exp;
//             client.expire(key, exp, function (err) {
//                 if (err) {
//                     debug("could not set expiry to key ", key)
//                 }
//                 resolve({
//                     error: false,
//                     data: result,
//                     message: 'successfully set in redis hash'
//                 });
//             });
//         });
//     });
// }
exports.setRedisData = async function (key, value, exp) {
  try {
    if (value == null || value === undefined) {
      return {
        error: true,
        data: null,
        msg: 'Not assigning falsy value.',
      };
    }

    if (typeof value === 'object') {
      value = JSON.stringify(value);
    }

    await client.set(key, value);

    exp = parseInt(exp) || parseInt(process.env.REDIS_Exp) || 600; // Default 10 minutes
    await client.expire(key, exp);

    return {
      error: false,
      data: value,
      message: 'Successfully set in Redis',
    };
  } catch (err) {
    console.error("❌ setRedisData error:", err.message);
    return {
      error: true,
      data: err.message,
      msg: 'Error while storing value in Redis',
    };
  }
};


// exports.delMultipleRedisData = function(...keys){
//     return new Promise(function (resolve, reject){
//         client.del(keys, function (err, result){
//             if(err){
//                 reject({
//                     error : true,
//                     data : err.message,
//                     msg : 'error while deleting keys in redis'
//                 });
//             }
//             resolve({
//                 error : false,
//                 data : result,
//                 message : 'keys in redis deleted successfully'
//             })
//         })
//     })
// }
exports.delMultipleRedisData = async function (...keys) {
    try {
        const result = await client.del(...keys); // deletes multiple keys
        return {
            error: false,
            data: result, // number of keys deleted
            message: 'keys in redis deleted successfully'
        };
    } catch (err) {
        return {
            error: true,
            data: err.message,
            msg: 'error while deleting keys in redis'
        };
    }
}


// exports.delRedisData = function (key) {
//     return new Promise(function (resolve, reject) {
//         client.del(key, function (err, result) {
//             if (err) {
//                 reject({
//                     error: true,
//                     data: err.message,
//                     msg: 'error while deleting key in redis'
//                 })
//             }
//             resolve({
//                 error: false,
//                 data: result,
//                 message: 'key in redis deleted successfully'
//             })
//         })
//     })


// }

exports.delRedisData = async function (key) {
    try {
        const result = await client.del(key); // deletes the key
        return {
            error: false,
            data: result, // 1 if deleted, 0 if key didn't exist
            message: 'key in redis deleted successfully'
        };
    } catch (err) {
        return {
            error: true,
            data: err.message,
            msg: 'error while deleting key in redis'
        };
    }
};


// exports.getRedisHashData = function (hash, key) {
//     //console.log('get offerkey ', offerKey);
//     return new Promise(function (resolve, reject) {
//         key = hash + ":" + key
//         client.get(key, function (err, result) {
//             if (err) {
//                 return reject({
//                     error: true,
//                     data: err.message,
//                     msg: 'error while retrieving  value from redis hash'
//                 })
//             }
//             try {
//                 result = JSON.parse(result);
//                 return resolve({
//                     error: false,
//                     data: result,
//                     message: ' successfully get from redis key'
//                 })
//             }
//             catch {
//                 return reject({
//                     error: true,
//                     data: "",
//                     msg: 'Invalid data getting from redis'
//                 })
//             }

//         })
//     })

// }

exports.getRedisHashData = async function (hash, key) {
    const fullKey = `${hash}:${key}`;
    try {
        const result = await client.get(fullKey);

        if (!result) {
            return {
                error: true,
                data: null,
                msg: 'Key does not exist in Redis'
            };
        }

        let parsed = result;
        try {
            parsed = JSON.parse(result);
        } catch {
            // Keep as string if not valid JSON
        }

        return {
            error: false,
            data: parsed,
            message: 'Successfully retrieved value from Redis'
        };
    } catch (err) {
        return {
            error: true,
            data: err.message,
            msg: 'Error while retrieving value from Redis'
        };
    }
};


// exports.setRedisHashData = function (hash, key, value, exp) {
//     return new Promise(function (resolve, reject) {
//         value = JSON.stringify(value);
//         key = hash + ":" + key
//         client.set(key, value, function (err, result) {
//             if (err) {
//                 reject({
//                     error: true,
//                     data: err.message,
//                     msg: 'error while store value in redis hash'
//                 })
//             }
//             exp = exp || process.env.REDIS_Exp;
//             client.expire(key, exp, function (err) {
//                 if (err) {
//                     debug("could not set expiry to key ", key)
//                 }
//                 resolve({
//                     error: false,
//                     data: result,
//                     message: ' successfully set  in redis hash'
//                 })
//             });
//         })
//     })
// }

exports.setRedisHashData = async function (hash, key, value, exp) {
  const fullKey = `${hash}:${key}`;
   console.log("full keys--",fullkey);

  if (value == null || typeof value === 'undefined') {
    return {
      error: true,
      data: null,
      msg: 'Falsy or undefined value not allowed',
    };
  }

  try {
    const serialized = JSON.stringify(value);
     console.log("serialzed--",serialized);
    const result = await client.set(fullKey, serialized);
    
    exp = exp || process.env.REDIS_Exp || 3600; // fallback to 1 hour
    await client.expire(fullKey, exp);

    return {
      error: false,
      data: result,
      message: 'Successfully set value in Redis with expiry'
    };
  } catch (err) {
    return {
      error: true,
      data: err.message,
      msg: 'Error while storing value in Redis',
    };
  }
};


// exports.getHashData = function (key, field) {
//     //console.log('get offerkey ', offerKey);
//     return new Promise(function (resolve, reject) {
//         client.hget(key, field, function (err, result) {
//             if (err) {
//                 return reject({
//                     error: true,
//                     data: err.message,
//                     msg: 'error while retrieving  value from redis hash'
//                 })
//             }
//             try {
//                 return resolve({
//                     error: false,
//                     data: result,
//                     message: 'successfully get from redis hash value'
//                 })
//             }
//             catch {
//                 return reject({
//                     error: true,
//                     data: "",
//                     msg: 'Invalid data getting from redis'
//                 })
//             }

//         })
//     })

// }
exports.getHashData = async function (key, field) {
    try {
        const result = await client.hGet(key, field);

        return {
            error: false,
            data: result,
            message: 'Successfully got value from Redis hash'
        };
    } catch (err) {
        return {
            error: true,
            data: err.message,
            msg: 'Error while retrieving value from Redis hash'
        };
    }
};

// exports.setHashData = function (key, field, value, exp) {
//     return new Promise(function (resolve, reject) {
//         if (value && typeof value == "object") {
//             value = JSON.stringify(value);
//         }
//         client.hset(key, field, value, function (err, result) {
//             if (err) {
//                 reject({
//                     error: true,
//                     data: err.message,
//                     msg: 'error while store value in redis hash'
//                 })
//             }
//             exp = exp || process.env.REDIS_Exp;
//             client.expire(key, exp, function (err) {
//                 if (err) {
//                     debug("could not set expiry to key ", key)
//                 }
//                 resolve({
//                     error: false,
//                     data: result,
//                     message: ' successfully set in redis hash'
//                 })
//             });
//         })
//     })
// }


exports.setHashData = async function (key, field, value, exp) {
    try {
        // Convert objects to JSON strings
        if (value && typeof value === "object") {
            value = JSON.stringify(value);
        }

        // Store value in Redis hash
        const result = await client.hSet(key, field, value);

        // Set expiry (default from env if not provided)
        exp = exp || process.env.REDIS_Exp;
        if (exp) {
            await client.expire(key, parseInt(exp, 10));
        }

        return {
            error: false,
            data: result,
            message: 'Successfully set in Redis hash'
        };

    } catch (err) {
        return {
            error: true,
            data: err.message,
            msg: 'Error while storing value in Redis hash'
        };
    }
};


// exports.setRedisHashMultipleData = function (key, jsonData, exp) {

//     return new Promise(function (resolve, reject) {

//         // Format json value into string then convert into json again
//         if (typeof (jsonData) === 'object') {
//             jsonData = formatNestedObjectIntoString(jsonData)
//         }

//         client.hmset(key, jsonData, function (err, result) {
//             if (err) {
//                 reject({
//                     err: true,
//                     data: err.message
//                 })
//             }
//             if (exp != -1) {
//                 exp = exp || process.env.REDIS_Exp;
//                 client.expire(key, exp)
//             }
//             resolve({
//                 err: false,
//                 data: result
//             })
//         })
//     })
// }

exports.setRedisHashMultipleData = async function (key, jsonData, exp) {
    try {
        // Convert nested objects to strings if needed
        if (typeof jsonData === 'object') {
            jsonData = formatNestedObjectIntoString(jsonData);
        }

        // In redis v4+, hSet can accept a plain object
        await client.hSet(key, jsonData);

        // Set expiry if required
        if (exp !== -1) {
            exp = exp || process.env.REDIS_Exp;
            await client.expire(key, exp);
        }

        return {
            err: false,
            data: 'Successfully set multiple hash fields in Redis'
        };

    } catch (error) {
        return {
            err: true,
            data: error.message
        };
    }
};


// exports.getRedisHashMultipleData = function (key) {

//     return new Promise(function (resolve, reject) {

//         client.hgetall(key, function (err, result) {
//             if (err) {
//                 reject({
//                     err: true,
//                     data: err.message
//                 })
//             }
//             resolve({
//                 err: false,
//                 data: result
//             })
//         })
//     })
// }
exports.getRedisHashMultipleData = async function (key) {
    try {
        const result = await client.hGetAll(key);
        return {
            err: false,
            data: result
        };
    } catch (err) {
        return {
            err: true,
            data: err.message
        };
    }
};

// exports.delRedisHashData = function (hash, key) {
//     return new Promise(function (resolve, reject) {
//         key = hash + ":" + key
//         client.del(key, function (err, result) {
//             if (err) {
//                 reject({
//                     error: true,
//                     data: err.message,
//                     msg: 'error while deleting hash value from redis '
//                 })
//             }
//             resolve({
//                 error: false,
//                 data: result,
//                 message: ' hash deleted'
//             })
//         })
//     })
// }
exports.delRedisHashData = async function (hash, key) {
    try {
        const redisKey = `${hash}:${key}`;
        const result = await client.del(redisKey);

        return {
            error: false,
            data: result,
            message: 'hash deleted'
        };
    } catch (err) {
        return {
            error: true,
            data: err.message,
            msg: 'error while deleting hash value from redis'
        };
    }
};

// exports.delRedisHash=function(hash){
//     return new Promise(function(resolve,reject){
//         client.del(hash,function (err, result) {
//             if (err){
//                 reject({
//                  error:true,
//                     data:err.message,
//                     msg:'error while deleting hash value from redis '
//                 })
//             }
//             resolve({
//                 error:false,
//                 data:result,
//                 message:' hash deleted'
//             })
//         })
//     })
// }

// exports.getRedisSetData = function (key) {
//     return new Promise(function (resolve, reject) {
//         client.smembers(key, function (err, result) {
//             if (err) {
//                 reject({
//                     error: true,
//                     data: err.message,
//                     msg: 'error while retrieving value from redis set'
//                 })
//             }
//             resolve({
//                 error: false,
//                 data: result,
//                 message: ' successfully get from redis set'
//             })
//         })
//     })
// }
exports.getRedisSetData = async function (key) {
    try {
        const result = await client.sMembers(key); // v4+ API
        return {
            error: false,
            data: result,
            message: 'successfully retrieved from redis set'
        };
    } catch (err) {
        return {
            error: true,
            data: err.message,
            msg: 'error while retrieving value from redis set'
        };
    }
};


// exports.checkMemberInRedisSet = function (key, member) {
//     return new Promise(function (resolve, reject) {
//         client.sismember(key, member, function (err, result) {
//             if (err) {
//                 reject({
//                     error: true,
//                     data: err.message,
//                     msg: 'error while retrieving value from redis set'
//                 })
//             }
//             resolve({
//                 error: false,
//                 data: result,
//                 message: ' successfully get from redis set'
//             })
//         })
//     })
// }
exports.checkMemberInRedisSet = async function (key, member) {
    try {
        const result = await client.sIsMember(key, member); // v4+ API
        return {
            error: false,
            data: result,
            message: 'successfully checked member in redis set'
        };
    } catch (err) {
        return {
            error: true,
            data: err.message,
            msg: 'error while checking member in redis set'
        };
    }
};

// exports.setMultipleKeyWithExpire = function (arrOfKeyValObj, exp) {
//     return new Promise(function (resolve, reject) {

//         exp = exp || process.env.REDIS_Exp;
//         const commands = arrOfKeyValObj.map((obj) => ['set', obj.key, obj.value, 'ex', exp]);
//         client
//             .multi(commands)
//             .exec(function (err, result) {
//                 if (err) {
//                     reject({
//                         error: true,
//                         data: err.message,
//                         msg: 'error while retrieving value from redis set'
//                     })
//                 }
//                 else {
//                     resolve({
//                         error: false,
//                         data: result,
//                         message: ' successfully get from redis set'
//                     })
//                 }
//             });
//     })
// }
exports.setMultipleKeyWithExpire = async function (arrOfKeyValObj, exp) {
    try {
        exp = exp || process.env.REDIS_Exp;

        // Convert key-value array into multi commands
        const commands = arrOfKeyValObj.map(obj => [
            'set', obj.key, obj.value, 'EX', exp
        ]);

        const result = await client.multi(commands).exec();

        return {
            error: false,
            data: result,
            message: 'Successfully set multiple keys with expiry'
        };
    } catch (err) {
        return {
            error: true,
            data: err.message,
            msg: 'Error while setting multiple keys with expiry'
        };
    }
};

// exports.getMultipleKeys = function (keysPattern) {
//     return new Promise((resolve, reject) => {
//       client.keys(keysPattern, (err, result) => {
//         if (err) {
//           reject({
//             error: true,
//             data: err.message,
//             msg: 'Error while retrieving keys from keyPattern'
//           });
//         } else {
//           resolve({
//             error: false,
//             data: result,
//             message: 'Successfully retrieved keys from keyPattern'
//           });
//         }
//       });
//     });
// }
  exports.getMultipleKeys = async function (keysPattern) {
    try {
        const result = await client.keys(keysPattern);
        return {
            error: false,
            data: result,
            message: 'Successfully retrieved keys from keyPattern'
        };
    } catch (err) {
        return {
            error: true,
            data: err.message,
            msg: 'Error while retrieving keys from keyPattern'
        };
    }
};

// exports.getMultipleRedisData = function (keys) {
//     return new Promise(function (resolve, reject) {
//         const commands = keys.map((key) => ['get', key]);
//         client
//             .multi(commands)
//             .exec(function (err, result) {
//                 if (err) {
//                     reject({
//                         error: true,
//                         data: err.message,
//                         msg: 'error while retrieving value from redis'
//                     })
//                 }
//                 else {
//                     resolve({
//                         error: false,
//                         data: result,
//                         message: 'successfully get from redis'
//                     })
//                 }
//             });
//     })
// }

exports.getMultipleRedisData = async function (keys) {
    try {
        const pipeline = client.multi();

        // Queue all GET commands
        keys.forEach((key) => {
            pipeline.get(key);
        });

        // Execute all queued commands
        const result = await pipeline.exec();

        return {
            error: false,
            data: result.map(item => item[1]), // item = [error, value]
            message: 'Successfully retrieved data from Redis'
        };
    } catch (err) {
        return {
            error: true,
            data: err.message,
            msg: 'Error while retrieving value from Redis'
        };
    }
};

// exports.getMultipleSetData = function (keys) {
//     return new Promise(function (resolve, reject) {
//         const commands = keys.map((key) => ['smembers', key]);
//         client
//             .multi(commands)
//             .exec(function (err, result) {
//                 if (err) {
//                     reject({
//                         error: true,
//                         data: err.message,
//                         msg: 'error while retrieving value from redis set'
//                     })
//                 }
//                 else {
//                     resolve({
//                         error: false,
//                         data: result,
//                         message: ' successfully get from redis set'
//                     })
//                 }
//             });
//     })
// }
exports.getMultipleSetData = async function (keys) {
    try {
        const results = await Promise.all(
            keys.map(async (key) => {
                const members = await client.sMembers(key); // Redis v4 method
                return { key, members };
            })
        );

        return {
            error: false,
            data: results,
            message: 'Successfully retrieved data from Redis sets'
        };
    } catch (err) {
        return {
            error: true,
            data: err.message,
            msg: 'Error while retrieving value from Redis set'
        };
    }
};


// exports.getMultipleSortedSetData = function (keys, startIndex, endIndex) {
//     return new Promise(function (resolve, reject) {
//         const commands = keys.map((key) => ['zrange', key, startIndex, endIndex, 'WITHSCORES']);
//         client
//             .multi(commands)
//             .exec(function (err, result) {
//                 if (err) {
//                     reject({
//                         error: true,
//                         data: err.message,
//                         msg: 'error while retrieving value from redis sorted set'
//                     })
//                 }
//                 else {
//                     resolve({
//                         error: false,
//                         data: result,
//                         message: ' successfully get from redis sorted set'
//                     })
//                 }
//             });
//     })
// }
exports.getMultipleSortedSetData = async function (keys, startIndex, endIndex) {
    try {
        const commands = keys.map((key) => [
            'zRange', // new camelCase command
            key,
            startIndex,
            endIndex,
            { WITHSCORES: true }
        ]);

        const result = await client.multi(commands).exec();

        return {
            error: false,
            data: result,
            message: 'Successfully retrieved from Redis sorted set'
        };

    } catch (err) {
        return {
            error: true,
            data: err.message,
            msg: 'Error while retrieving value from Redis sorted set'
        };
    }
};

// exports.getRedisMgetData = function (key) {
//     return new Promise(function (resolve, reject) {
//         client.mget(key, function (err, result) {
//             if (err) {
//                 reject({
//                     error: true,
//                     data: err.message,
//                     msg: 'error while retrieving value from redis set'
//                 })
//             }
//             resolve({
//                 error: false,
//                 data: result,
//                 message: ' successfully get from redis set'
//             })
//         })
//     })
// }
exports.getRedisMgetData = function (keys) {
    return new Promise(async (resolve, reject) => {
        try {
            const result = await client.mGet(keys); // v4+ uses camelCase: mGet
            resolve({
                error: false,
                data: result,
                message: 'successfully got from redis set'
            });
        } catch (err) {
            reject({
                error: true,
                data: err.message,
                msg: 'error while retrieving value from redis set'
            });
        }
    });
};


// exports.removeRedisSetMember = function (key, value) {
//     return new Promise(function (resolve, reject) {
//         client.srem(key, value, function (err, result) {
//             if (err) {
//                 reject({
//                     error: true,
//                     data: err.message,
//                     msg: 'error while removing value from redis set'
//                 })
//             }
//             resolve({
//                 error: false,
//                 data: result,
//                 message: ' successfully removed value from redis set'
//             })
//         })
//     })
// }
exports.removeRedisSetMember = async function (key, value) {
    try {
        const result = await client.sRem(key, value); // Note: sRem is camelCase in v4+
        return {
            error: false,
            data: result,
            message: 'Successfully removed value from Redis set'
        };
    } catch (err) {
        return {
            error: true,
            data: err.message,
            msg: 'Error while removing value from Redis set'
        };
    }
};


// exports.getRedisSetLength = function(key, exp){
//     return new Promise(function (resolve, reject) {
//         client.scard(key, function (err, result) {
//             if (err) {
//                 reject({
//                     error: true,
//                     data: err.message,
//                     msg: 'error while store value in redis set'
//                 })
//             }
//             resolve({
//                 error: false,
//                 data: result,
//                 message: ' successfully set in redis set'
//             })

//             // exp = exp || process.env.REDIS_Exp;
//             // client.expire(key, exp, function (err, result) {
//             //     if (err) {
//             //         // debug( "could not set expiry to set ",key)
//             //     }
//             //     resolve({
//             //         error: false,
//             //         data: result,
//             //         message: ' successfully set in redis set'
//             //     })
//             // })
//         })
//     })
// }
exports.getRedisSetLength = async function (key, exp) {
    try {
        const result = await client.sCard(key);
        if (exp) {
            await client.expire(key, exp); // set TTL if provided
        }
        return {
            error: false,
            data: result,
            message: 'Successfully retrieved Redis set length'
        };
    } catch (err) {
        return {
            error: true,
            data: err.message,
            msg: 'Error while retrieving Redis set length'
        };
    }
};

// exports.setRedisSetData = function (key, value, exp) {
//     return new Promise(function (resolve, reject) {
//         client.sadd(key, value, function (err, result) {
//             if (err) {
//                 reject({
//                     error: true,
//                     data: err.message,
//                     msg: 'error while store value in redis set'
//                 })
//             }
//             exp = exp || process.env.REDIS_Exp;
//             client.expire(key, exp, function (err, result) {
//                 if (err) {
//                     // debug( "could not set expiry to set ",key)
//                 }
//                 resolve({
//                     error: false,
//                     data: result,
//                     message: ' successfully set in redis set'
//                 })
//             })
//         })
//     })
// }
exports.setRedisSetData = function (key, value, exp) {
    return new Promise((resolve, reject) => {
        client.sadd(key, value, (err, saddResult) => {
            if (err) {
                return reject({
                    error: true,
                    data: err.message,
                    msg: 'Error while storing value in Redis set'
                });
            }

            exp = Number(exp || process.env.REDIS_Exp || 3600); // default 1h
            client.expire(key, exp, (expireErr) => {
                if (expireErr) {
                    return reject({
                        error: true,
                        data: expireErr.message,
                        msg: 'Error while setting expiry for Redis set'
                    });
                }

                resolve({
                    error: false,
                    data: saddResult, // number of items actually added
                    message: `Successfully added value to Redis set and set expiry to ${exp}s`
                });
            });
        });
    });
};


// exports.getRedisSetsDataByUnion = function (keys) {
//     return new Promise(function (resolve, reject) {
//         client.sunion(keys, function (err, result) {
//             if (err) {
//                 reject({
//                     error: true,
//                     data: err.message,
//                     msg: 'error while retrieving value from redis sets by union'
//                 })
//             }
//             resolve({
//                 error: false,
//                 data: result,
//                 message: ' successfully get from redis sets by union'
//             })
//         })
//     })
// }
exports.getRedisSetsDataByUnion = async function (keys) {
    try {
        // Ensure keys is an array
        if (!Array.isArray(keys)) {
            throw new Error('keys must be an array');
        }

        const result = await client.sUnion(keys); // Redis v4+ method name is camelCase
        return {
            error: false,
            data: result,
            message: 'successfully got data from Redis sets by union'
        };
    } catch (err) {
        return {
            error: true,
            data: err.message,
            msg: 'error while retrieving value from Redis sets by union'
        };
    }
};


// exports.getRedisHashDataByKeys = function (key, fieldsArray) {
//     return new Promise(function (resolve, reject) {
//         client.hmget(key, fieldsArray, function (err, result) {
//             if (err) {
//                 reject({
//                     error: true,
//                     data: err.message,
//                 })
//             }
//             resolve({
//                 error: false,
//                 data: result,
//             })
//         })
//     })
// }
exports.getRedisHashDataByKeys = function (key, fieldsArray) {
    return new Promise(function (resolve, reject) {
        if (!Array.isArray(fieldsArray) || fieldsArray.length === 0) {
            return reject({
                error: true,
                data: 'fieldsArray must be a non-empty array',
            });
        }

        client.hmget(key, fieldsArray, function (err, result) {
            if (err) {
                return reject({
                    error: true,
                    data: err.message,
                });
            }

            resolve({
                error: false,
                data: result,
            });
        });
    });
};

// exports.setDataInRedisSortedSet = function (args, exp) {
//     return new Promise(function (resolve, reject) {

//         client.zadd(args, function (err, result) {
//             if (err) {
//                 reject({
//                     error: true,
//                     data: err.message,
//                 })
//             }
//             exp = exp || process.env.REDIS_Exp;
//             client.expire(args[0], exp, function (err) {
//                 if (err) { debug("could not set expiry to sorted set", args[0]) }
//             })
//             resolve({
//                 error: false,
//                 data: result,
//             })
//         })
//     })
// }

exports.setDataInRedisSortedSet = async function (args, exp) {
  try {
    const [key, score, member] = args;

    // validate input
    if (!key || !member || isNaN(score)) {
      throw new Error("Invalid Redis zAdd args");
    }

    const data = [{ score: parseFloat(score), value: member }];
    const result = await client.zAdd(key, data);

    exp = exp || parseInt(process.env.REDIS_Exp) || 600;
    await client.expire(key, exp);

    return {
      error: false,
      data: result,
    };
  } catch (err) {
    console.error("❌ Error in setDataInRedisSortedSet:", err.message);
    return {
      error: true,
      data: err.message,
    };
  }
};



// exports.removeDataFromRedisSortedSet = function (key, member) {
//     return new Promise(function (resolve, reject) {
//         client.zrem(key, member, function (err, result) {
//             if (err) {
//                 reject({
//                     error: true,
//                     data: err.message,
//                 })
//             }
//             resolve({
//                 error: false,
//                 data: result,
//             })
//         })
//     })
// }
exports.removeDataFromRedisSortedSet = async function (key, member) {
    try {
        const result = await client.zRem(key, member); // zRem for sorted set remove
        return {
            error: false,
            data: result,
        };
    } catch (err) {
        return {
            error: true,
            data: err.message,
        };
    }
};

// exports.getDataFromRedisSortedSet = function (args) {
//     return new Promise(function (resolve, reject) {
//         client.zrange(args, function (err, result) {
//             if (err) {
//                 reject({
//                     error: true,
//                     data: err.message,
//                 })
//             }
//             let result2 = {};
//             if (result && result.length) {
//                 for (let i = 0; i < result.length; i += 2) {
//                     result2[result[i]] = parseFloat(result[i + 1])
//                 }
//             }
//             resolve({
//                 error: false,
//                 data: result2,
//             })
//         })
//     })
// }
exports.getDataFromRedisSortedSet = async function (key) {
    try {
        // Fetch with scores
        const result = await client.zRangeWithScores(key, 0, -1);

        // Convert to { member: score } format
        const resultObj = {};
        for (const { value, score } of result) {
            resultObj[value] = parseFloat(score);
        }

        return {
            error: false,
            data: resultObj,
        };
    } catch (err) {
        return {
            error: true,
            data: err.message,
        };
    }
};

// exports.getAllDataFromRedisSortedSet = function (key) {
//     let args=[key,0,-1,'WITHSCORES']
//     return new Promise(function (resolve, reject) {
//         client.zrange(args, function (err, result) {
//             if (err) {
//                 reject({
//                     error: true,
//                     data: err.message,
//                 })
//             }
//             let result2 = {};
//             if (result && result.length) {
//                 for (let i = 0; i < result.length; i += 2) {
//                     result2[result[i]] = parseFloat(result[i + 1])
//                 }
//             }
//             resolve({
//                 error: false,
//                 data: result2,
//             })
//         })
//     })
// }
exports.getAllDataFromRedisSortedSet = async function (key) {
  try {
    const result = await client.zRange(key, 0, -1, { WITHSCORES: true }); // v4 format

    // Redis v4 returns an object: { member1: score1, member2: score2, ... }
    // So no need to manually convert array into object

    // Optionally: Convert string scores to float
    const parsed = {};
    for (const [member, score] of Object.entries(result)) {
      parsed[member] = parseFloat(score);
    }

    return {
      error: false,
      data: parsed
    };
  } catch (err) {
    return {
      error: true,
      data: err.message
    };
  }
};



// exports.getLengthFromRedisSortedSet=function(key){
//     return new Promise(function(resolve,reject){
//         client.zcard(key,function(err,result){
//             if(err){
//                 reject({
//                     error: true,
//                     data: err.message,
//                     msg: 'error while getting count in redis'
//                 })
//             }
//             resolve({
//                 error: false,
//                 data: result,
//                 message: ' successfully get from redis set'
//             })
//         })
//     })
// }

exports.getLengthFromRedisSortedSet = async function (key) {
  try {
    const result = await client.zCard(key); // ✅ Note: `zCard` is camelCase in Redis v4+
    return {
      error: false,
      data: result,
      message: 'Successfully got count from Redis sorted set'
    };
  } catch (err) {
    return {
      error: true,
      data: err.message,
      msg: 'Error while getting count in Redis'
    };
  }
};


// exports.popMemberFromSortedSetWithLowestScore=function(key,length=1){
//     return new Promise(function(resolve,reject){
//         client.zpopmin(key,length,function(err,result){
//             if(err){
//                 reject({
//                     error: true,
//                     data: err.message,
//                     msg: 'error while extracting in redis'
//                 })
//             }
//             resolve({
//                 error: false,
//                 data: result,
//                 message: ' successfully Extract from redis set'
//             })
//         })
//     })
// }

exports.popMemberFromSortedSetWithLowestScore = async function (key, length = 1) {
  try {
    const result = await client.zPopMin(key, length); // ✅ Redis v4+ uses camelCase
    return {
      error: false,
      data: result,
      message: 'Successfully extracted from Redis sorted set'
    };
  } catch (err) {
    return {
      error: true,
      data: err.message,
      msg: 'Error while extracting from Redis'
    };
  }
};

// exports.getScoreOfMemberFromSortedSet=function(key,member){
//     return new Promise(function(resolve,reject){
//         client.zscore(key,member,function(err,result){
//             if(err){
//                 reject({
//                     error: true,
//                     data: err.message,
//                     msg: 'error while getting member in redis'
//                 })
//             }
//             resolve({
//                 error: false,
//                 data: result,
//                 message: ' successfully  get member score from redis set'
//             })
//         })
//     })
// }
exports.getScoreOfMemberFromSortedSet = async function (key, member) {
  try {
    const result = await client.zScore(key, member); // ✅ Redis v4+ uses zScore
    return {
      error: false,
      data: result,
      message: 'Successfully got member score from Redis sorted set'
    };
  } catch (err) {
    return {
      error: true,
      data: err.message,
      msg: 'Error while getting member score from Redis'
    };
  }
};

// exports.incrementRedisKey = function (key, exp) {

//     return new Promise(function (resolve, reject) {

//         client.incr(key, function (err, result) {
//             if (err) {
//                 reject({
//                     err: true,
//                     data: err.message
//                 })
//             }
//             exp = exp || process.env.REDIS_Exp;
//             client.expire(key, exp)
//             resolve({
//                 err: false,
//                 data: result
//             })
//         })
//     })
// }
exports.incrementRedisKey = async function (key, exp) {
    try {
        const result = await client.incr(key);
        exp = exp || process.env.REDIS_Exp;

        if (exp) {
            await client.expire(key, exp);
        }

        return {
            err: false,
            data: result
        };
    } catch (error) {
        return {
            err: true,
            data: error.message
        };
    }
};


// exports.incrbyRedisData = function (key, value, exp) {
//     return new Promise(function (resolve, reject) {
//         client.incrby(key, value, function (err, result) {
//             if (err) {
//                 reject({
//                     error: true,
//                     data: err.message,
//                     msg: 'error while incrementing value in redis!'
//                 });
//             }
//             exp = exp || process.env.REDIS_Exp;
//             client.expire(key, exp, function (err) {
//                 if (err) {
//                     debug("could not set expiry to key ", key)
//                 }
//                 resolve({
//                     error: false,
//                     data: result,
//                     message: 'successfully set in redis hash'
//                 });
//             });
//         });
//     });
// }
exports.incrbyRedisData = async function (key, value, exp) {
    try {
        const result = await client.incrBy(key, value);

        exp = exp || process.env.REDIS_Exp;
        try {
            await client.expire(key, exp);
        } catch (expireErr) {
            console.error(`Could not set expiry for key ${key}:`, expireErr);
        }

        return {
            error: false,
            data: result,
            message: 'Successfully incremented value and set expiry in Redis'
        };
    } catch (err) {
        return {
            error: true,
            data: err.message,
            msg: 'Error while incrementing value in Redis!'
        };
    }
};

// exports.setRedisQueueData = function (key, value) {
//     return new Promise(function (resolve, reject) {
//         client.rpush(key, value, function (err, result) {
//             if (err) {
//                 reject();
//             }
//             resolve(result);
//         })
//     });
// }
exports.setRedisQueueData = async function (key, value) {
    try {
        const result = await client.rPush(key, value); // push to right end of list
        return result; // returns new length of list
    } catch (err) {
        throw {
            error: true,
            data: err.message
        };
    }
};

// exports.getRedisQueueData = function (key) {
//     return new Promise(function (resolve, reject) {
//         client.lpop(key, function (err, result) {
//             if (err) {
//                 reject();
//             }
//             resolve(result);
//         });
//     });
// }
exports.getRedisQueueData = async function (key) {
    try {
        const result = await client.lPop(key); // pops from left end of list
        return result; // will be null if list is empty
    } catch (err) {
        throw {
            error: true,
            data: err.message
        };
    }
};


const formatNestedObjectIntoString = (jsonData) => {

     for(let key in jsonData){
        if (jsonData[key] === null || jsonData[key] === undefined) {
            jsonData[key] = ''; // Replace null or undefined with an empty string
        } else if (typeof jsonData[key] === 'object') {
            let value = jsonData[key]; // Convert objects to JSON strings
            jsonData[key]  = value.toString()
        }
    }

    return jsonData
}

exports.testRedis = async () => {
    await this.setRedisHashData("ab", "cd", { "www": "cost2action.com" }, 2)
    let result = await this.getRedisHashData("ab", "cd")
    if (result) {
        console.log(result);
    }
}

// exports.getHashKeys = function (keys) {
//     return new Promise(function (resolve, reject) {
//         client.hkeys(keys, function (err, result) {
//             if (err) {
//                 reject({
//                     error: true,
//                     data: err.message,
//                     msg: 'error while retrieving keys from redis'
//                 });
//             }
//             resolve({
//                 error: false,
//                 data: result,
//                 message: ' successfully get keys from redis'
//             });
//         });
//     });
// }
exports.getHashKeys = async function (key) {
    try {
        const result = await client.hKeys(key); // hKeys replaces hkeys in v4
        return {
            error: false,
            data: result,
            message: 'Successfully retrieved keys from Redis'
        };
    } catch (err) {
        return {
            error: true,
            data: err.message,
            msg: 'Error while retrieving keys from Redis'
        };
    }
};

// this.testRedis()
