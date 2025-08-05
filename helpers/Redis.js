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






exports.getRedisKeys = function (pattern) {
    return new Promise(function (resolve, reject) {
        client.keys(pattern, function (err, result) {
            if (err) {
                reject({
                    error: true,
                    data: err.message,
                    msg: 'error while retrieving keys from redis'
                });
            }
            resolve({
                error: false,
                data: result,
                message: ' successfully get keys from redis'
            });
        });
    });
}

exports.getRedisData = function (key) {
    //debug('get offerkey ', offerKey);
    return new Promise(function (resolve, reject) {
        client.get(key, function (err, result) {
            if (err) {
                reject({
                    error: true,
                    data: err.message,
                    msg: 'error while retrieving  value from redis'
                })
            }

            resolve({
                error: false,
                data: result,
                message: ' successfully get from redis'
            })

        })
    })

}

exports.setExpire = function (key, exp) {
    return new Promise(function (resolve, reject) {
        client.expire(key, exp, function (err) {
            if (err) {
                debug("could not set expiry to key ", key)
            }
            resolve({
                error: false,
                data: result,
                message: 'successfully set expire in redis key'
            });
        });
    });
}

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


exports.delMultipleRedisData = function(...keys){
    return new Promise(function (resolve, reject){
        client.del(keys, function (err, result){
            if(err){
                reject({
                    error : true,
                    data : err.message,
                    msg : 'error while deleting keys in redis'
                });
            }
            resolve({
                error : false,
                data : result,
                message : 'keys in redis deleted successfully'
            })
        })
    })
}

exports.delRedisData = function (key) {
    return new Promise(function (resolve, reject) {
        client.del(key, function (err, result) {
            if (err) {
                reject({
                    error: true,
                    data: err.message,
                    msg: 'error while deleting key in redis'
                })
            }
            resolve({
                error: false,
                data: result,
                message: 'key in redis deleted successfully'
            })
        })
    })


}

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

    if (result === null) {
      return {
        error: true,
        data: null,
        msg: 'Key does not exist in Redis'
      };
    }

    let parsed;
    try {
      parsed = JSON.parse(result);
    } catch (e) {
      // If not JSON, return as raw string
      parsed = result;
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

  if (value == null || typeof value === 'undefined') {
    return {
      error: true,
      data: null,
      msg: 'Falsy or undefined value not allowed',
    };
  }

  try {
    const serialized = JSON.stringify(value);
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
exports.getHashData = function (key, field) {
    return new Promise((resolve, reject) => {
        client.hget(key, field, (err, result) => {
            if (err) {
                return reject({
                    error: true,
                    data: err.message,
                    msg: 'Error while retrieving value from Redis hash',
                });
            }

            return resolve({
                error: false,
                data: result,
                message: 'Successfully retrieved from Redis hash',
            });
        });
    });
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


exports.setHashData = function (key, field, value, exp) {
    return new Promise((resolve, reject) => {
        // Prevent storing null/undefined
        if (value === null || value === undefined) {
            return resolve({
                error: true,
                data: null,
                msg: 'Cannot set null or undefined value in Redis hash',
            });
        }

        if (typeof value === "object") {
            value = JSON.stringify(value);
        }

        client.hset(key, field, value, (err, result) => {
            if (err) {
                return reject({
                    error: true,
                    data: err.message,
                    msg: 'Error while storing value in Redis hash',
                });
            }

            // Set expiry
            exp = exp || process.env.REDIS_Exp;
            client.expire(key, exp, (err) => {
                if (err) {
                    console.warn("Could not set expiry on key:", key);
                }

                return resolve({
                    error: false,
                    data: result,
                    message: 'Successfully set in Redis hash',
                });
            });
        });
    });
};

exports.setRedisHashMultipleData = function (key, jsonData, exp) {

    return new Promise(function (resolve, reject) {

        // Format json value into string then convert into json again
        if (typeof (jsonData) === 'object') {
            jsonData = formatNestedObjectIntoString(jsonData)
        }

        client.hmset(key, jsonData, function (err, result) {
            if (err) {
                reject({
                    err: true,
                    data: err.message
                })
            }
            if (exp != -1) {
                exp = exp || process.env.REDIS_Exp;
                client.expire(key, exp)
            }
            resolve({
                err: false,
                data: result
            })
        })
    })
}

exports.getRedisHashMultipleData = function (key) {

    return new Promise(function (resolve, reject) {

        client.hgetall(key, function (err, result) {
            if (err) {
                reject({
                    err: true,
                    data: err.message
                })
            }
            resolve({
                err: false,
                data: result
            })
        })
    })
}

exports.delRedisHashData = function (hash, key) {
    return new Promise(function (resolve, reject) {
        key = hash + ":" + key
        client.del(key, function (err, result) {
            if (err) {
                reject({
                    error: true,
                    data: err.message,
                    msg: 'error while deleting hash value from redis '
                })
            }
            resolve({
                error: false,
                data: result,
                message: ' hash deleted'
            })
        })
    })
}
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

exports.getRedisSetData = function (key) {
    return new Promise(function (resolve, reject) {
        client.smembers(key, function (err, result) {
            if (err) {
                reject({
                    error: true,
                    data: err.message,
                    msg: 'error while retrieving value from redis set'
                })
            }
            resolve({
                error: false,
                data: result,
                message: ' successfully get from redis set'
            })
        })
    })
}

exports.checkMemberInRedisSet = function (key, member) {
    return new Promise(function (resolve, reject) {
        client.sismember(key, member, function (err, result) {
            if (err) {
                reject({
                    error: true,
                    data: err.message,
                    msg: 'error while retrieving value from redis set'
                })
            }
            resolve({
                error: false,
                data: result,
                message: ' successfully get from redis set'
            })
        })
    })
}

exports.setMultipleKeyWithExpire = function (arrOfKeyValObj, exp) {
    return new Promise(function (resolve, reject) {

        exp = exp || process.env.REDIS_Exp;
        const commands = arrOfKeyValObj.map((obj) => ['set', obj.key, obj.value, 'ex', exp]);
        client
            .multi(commands)
            .exec(function (err, result) {
                if (err) {
                    reject({
                        error: true,
                        data: err.message,
                        msg: 'error while retrieving value from redis set'
                    })
                }
                else {
                    resolve({
                        error: false,
                        data: result,
                        message: ' successfully get from redis set'
                    })
                }
            });
    })
}

exports.getMultipleKeys = function (keysPattern) {
    return new Promise((resolve, reject) => {
      client.keys(keysPattern, (err, result) => {
        if (err) {
          reject({
            error: true,
            data: err.message,
            msg: 'Error while retrieving keys from keyPattern'
          });
        } else {
          resolve({
            error: false,
            data: result,
            message: 'Successfully retrieved keys from keyPattern'
          });
        }
      });
    });
}
  
exports.getMultipleRedisData = function (keys) {
    return new Promise(function (resolve, reject) {
        const commands = keys.map((key) => ['get', key]);
        client
            .multi(commands)
            .exec(function (err, result) {
                if (err) {
                    reject({
                        error: true,
                        data: err.message,
                        msg: 'error while retrieving value from redis'
                    })
                }
                else {
                    resolve({
                        error: false,
                        data: result,
                        message: 'successfully get from redis'
                    })
                }
            });
    })
}

exports.getMultipleSetData = function (keys) {
    return new Promise(function (resolve, reject) {
        const commands = keys.map((key) => ['smembers', key]);
        client
            .multi(commands)
            .exec(function (err, result) {
                if (err) {
                    reject({
                        error: true,
                        data: err.message,
                        msg: 'error while retrieving value from redis set'
                    })
                }
                else {
                    resolve({
                        error: false,
                        data: result,
                        message: ' successfully get from redis set'
                    })
                }
            });
    })
}

exports.getMultipleSortedSetData = function (keys, startIndex, endIndex) {
    return new Promise(function (resolve, reject) {
        const commands = keys.map((key) => ['zrange', key, startIndex, endIndex, 'WITHSCORES']);
        client
            .multi(commands)
            .exec(function (err, result) {
                if (err) {
                    reject({
                        error: true,
                        data: err.message,
                        msg: 'error while retrieving value from redis sorted set'
                    })
                }
                else {
                    resolve({
                        error: false,
                        data: result,
                        message: ' successfully get from redis sorted set'
                    })
                }
            });
    })
}

exports.getRedisMgetData = function (key) {
    return new Promise(function (resolve, reject) {
        client.mget(key, function (err, result) {
            if (err) {
                reject({
                    error: true,
                    data: err.message,
                    msg: 'error while retrieving value from redis set'
                })
            }
            resolve({
                error: false,
                data: result,
                message: ' successfully get from redis set'
            })
        })
    })
}

exports.removeRedisSetMember = function (key, value) {
    return new Promise(function (resolve, reject) {
        client.srem(key, value, function (err, result) {
            if (err) {
                reject({
                    error: true,
                    data: err.message,
                    msg: 'error while removing value from redis set'
                })
            }
            resolve({
                error: false,
                data: result,
                message: ' successfully removed value from redis set'
            })
        })
    })
}

exports.getRedisSetLength = function(key, exp){
    return new Promise(function (resolve, reject) {
        client.scard(key, function (err, result) {
            if (err) {
                reject({
                    error: true,
                    data: err.message,
                    msg: 'error while store value in redis set'
                })
            }
            resolve({
                error: false,
                data: result,
                message: ' successfully set in redis set'
            })

            // exp = exp || process.env.REDIS_Exp;
            // client.expire(key, exp, function (err, result) {
            //     if (err) {
            //         // debug( "could not set expiry to set ",key)
            //     }
            //     resolve({
            //         error: false,
            //         data: result,
            //         message: ' successfully set in redis set'
            //     })
            // })
        })
    })
}

exports.setRedisSetData = function (key, value, exp) {
    return new Promise(function (resolve, reject) {
        client.sadd(key, value, function (err, result) {
            if (err) {
                reject({
                    error: true,
                    data: err.message,
                    msg: 'error while store value in redis set'
                })
            }
            exp = exp || process.env.REDIS_Exp;
            client.expire(key, exp, function (err, result) {
                if (err) {
                    // debug( "could not set expiry to set ",key)
                }
                resolve({
                    error: false,
                    data: result,
                    message: ' successfully set in redis set'
                })
            })
        })
    })
}

exports.getRedisSetsDataByUnion = function (keys) {
    return new Promise(function (resolve, reject) {
        client.sunion(keys, function (err, result) {
            if (err) {
                reject({
                    error: true,
                    data: err.message,
                    msg: 'error while retrieving value from redis sets by union'
                })
            }
            resolve({
                error: false,
                data: result,
                message: ' successfully get from redis sets by union'
            })
        })
    })
}

exports.getRedisHashDataByKeys = function (key, fieldsArray) {
    return new Promise(function (resolve, reject) {
        client.hmget(key, fieldsArray, function (err, result) {
            if (err) {
                reject({
                    error: true,
                    data: err.message,
                })
            }
            resolve({
                error: false,
                data: result,
            })
        })
    })
}

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



exports.removeDataFromRedisSortedSet = function (key, member) {
    return new Promise(function (resolve, reject) {
        client.zrem(key, member, function (err, result) {
            if (err) {
                reject({
                    error: true,
                    data: err.message,
                })
            }
            resolve({
                error: false,
                data: result,
            })
        })
    })
}
exports.getDataFromRedisSortedSet = function (args) {
    return new Promise(function (resolve, reject) {
        client.zrange(args, function (err, result) {
            if (err) {
                reject({
                    error: true,
                    data: err.message,
                })
            }
            let result2 = {};
            if (result && result.length) {
                for (let i = 0; i < result.length; i += 2) {
                    result2[result[i]] = parseFloat(result[i + 1])
                }
            }
            resolve({
                error: false,
                data: result2,
            })
        })
    })
}

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

exports.incrementRedisKey = function (key, exp) {

    return new Promise(function (resolve, reject) {

        client.incr(key, function (err, result) {
            if (err) {
                reject({
                    err: true,
                    data: err.message
                })
            }
            exp = exp || process.env.REDIS_Exp;
            client.expire(key, exp)
            resolve({
                err: false,
                data: result
            })
        })
    })
}

exports.incrbyRedisData = function (key, value, exp) {
    return new Promise(function (resolve, reject) {
        client.incrby(key, value, function (err, result) {
            if (err) {
                reject({
                    error: true,
                    data: err.message,
                    msg: 'error while incrementing value in redis!'
                });
            }
            exp = exp || process.env.REDIS_Exp;
            client.expire(key, exp, function (err) {
                if (err) {
                    debug("could not set expiry to key ", key)
                }
                resolve({
                    error: false,
                    data: result,
                    message: 'successfully set in redis hash'
                });
            });
        });
    });
}
exports.setRedisQueueData = function (key, value) {
    return new Promise(function (resolve, reject) {
        client.rpush(key, value, function (err, result) {
            if (err) {
                reject();
            }
            resolve(result);
        })
    });
}

exports.getRedisQueueData = function (key) {
    return new Promise(function (resolve, reject) {
        client.lpop(key, function (err, result) {
            if (err) {
                reject();
            }
            resolve(result);
        });
    });
}

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

exports.getHashKeys = function (keys) {
    return new Promise(function (resolve, reject) {
        client.hkeys(keys, function (err, result) {
            if (err) {
                reject({
                    error: true,
                    data: err.message,
                    msg: 'error while retrieving keys from redis'
                });
            }
            resolve({
                error: false,
                data: result,
                message: ' successfully get keys from redis'
            });
        });
    });
}
// this.testRedis()
