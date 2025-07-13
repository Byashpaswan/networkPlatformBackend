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



const { createClient } = require('redis');
const debug = require("debug")("darwin:Helpers:Redis");
const Promise = require('promise'); // Not required unless used elsewhere

const expire = 600;

// ✅ Use the correct environment variable (typically named REDIS_URL or REDIS_URI)
const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379'; // fallback to localhost
if (!redisUrl) {
  throw new Error('❌ REDIS URL is not defined in environment variables.');
}

// ✅ Use createClient({ url }) syntax
const client = createClient({
    url: redisUrl,
      socket: {
      tls: true, // 🔐 Upstash requires TLS
      reconnectStrategy: retries => {
      console.log(`🔁 Redis reconnecting attempt ${retries}`);
      return Math.min(retries * 100, 3000);
    }
  }
});


client.on('connect', function () {
    debug('Redis connected');
});

client.on('error', function (err) {
    debug('Redis Client Error', err);
});


(async () => {
    try {
        await client.connect();
    } catch (err) {
        debug('Redis connection failed:', err);
    }
})();

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

exports.setRedisData = function (key, value, exp) {
    return new Promise(function (resolve, reject) {
        if (value && typeof value == "object") {
            value = JSON.stringify(value);
        }else if(value == null || value == undefined){
            return resolve({
                error: true,
                data: null,
                msg: 'not assign falsy value.'
            });
        }
        client.set(key, value, function (err, result) {
            if (err) {
                reject({
                    error: true,
                    data: err.message,
                    msg: 'error while store value in redis'
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

exports.getRedisHashData = function (hash, key) {
    //console.log('get offerkey ', offerKey);
    return new Promise(function (resolve, reject) {
        key = hash + ":" + key
        client.get(key, function (err, result) {
            if (err) {
                return reject({
                    error: true,
                    data: err.message,
                    msg: 'error while retrieving  value from redis hash'
                })
            }
            try {
                result = JSON.parse(result);
                return resolve({
                    error: false,
                    data: result,
                    message: ' successfully get from redis key'
                })
            }
            catch {
                return reject({
                    error: true,
                    data: "",
                    msg: 'Invalid data getting from redis'
                })
            }

        })
    })

}

exports.setRedisHashData = function (hash, key, value, exp) {
    return new Promise(function (resolve, reject) {
        value = JSON.stringify(value);
        key = hash + ":" + key
        client.set(key, value, function (err, result) {
            if (err) {
                reject({
                    error: true,
                    data: err.message,
                    msg: 'error while store value in redis hash'
                })
            }
            exp = exp || process.env.REDIS_Exp;
            client.expire(key, exp, function (err) {
                if (err) {
                    debug("could not set expiry to key ", key)
                }
                resolve({
                    error: false,
                    data: result,
                    message: ' successfully set  in redis hash'
                })
            });
        })
    })
}

exports.getHashData = function (key, field) {
    //console.log('get offerkey ', offerKey);
    return new Promise(function (resolve, reject) {
        client.hget(key, field, function (err, result) {
            if (err) {
                return reject({
                    error: true,
                    data: err.message,
                    msg: 'error while retrieving  value from redis hash'
                })
            }
            try {
                return resolve({
                    error: false,
                    data: result,
                    message: 'successfully get from redis hash value'
                })
            }
            catch {
                return reject({
                    error: true,
                    data: "",
                    msg: 'Invalid data getting from redis'
                })
            }

        })
    })

}
exports.setHashData = function (key, field, value, exp) {
    return new Promise(function (resolve, reject) {
        if (value && typeof value == "object") {
            value = JSON.stringify(value);
        }
        client.hset(key, field, value, function (err, result) {
            if (err) {
                reject({
                    error: true,
                    data: err.message,
                    msg: 'error while store value in redis hash'
                })
            }
            exp = exp || process.env.REDIS_Exp;
            client.expire(key, exp, function (err) {
                if (err) {
                    debug("could not set expiry to key ", key)
                }
                resolve({
                    error: false,
                    data: result,
                    message: ' successfully set in redis hash'
                })
            });
        })
    })
}

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

exports.setDataInRedisSortedSet = function (args, exp) {
    return new Promise(function (resolve, reject) {

        client.zadd(args, function (err, result) {
            if (err) {
                reject({
                    error: true,
                    data: err.message,
                })
            }
            exp = exp || process.env.REDIS_Exp;
            client.expire(args[0], exp, function (err) {
                if (err) { debug("could not set expiry to sorted set", args[0]) }
            })
            resolve({
                error: false,
                data: result,
            })
        })
    })
}

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

exports.getAllDataFromRedisSortedSet = function (key) {
    let args=[key,0,-1,'WITHSCORES']
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

exports.getLengthFromRedisSortedSet=function(key){
    return new Promise(function(resolve,reject){
        client.zcard(key,function(err,result){
            if(err){
                reject({
                    error: true,
                    data: err.message,
                    msg: 'error while getting count in redis'
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

exports.popMemberFromSortedSetWithLowestScore=function(key,length=1){
    return new Promise(function(resolve,reject){
        client.zpopmin(key,length,function(err,result){
            if(err){
                reject({
                    error: true,
                    data: err.message,
                    msg: 'error while extracting in redis'
                })
            }
            resolve({
                error: false,
                data: result,
                message: ' successfully Extract from redis set'
            })
        })
    })
}
exports.getScoreOfMemberFromSortedSet=function(key,member){
    return new Promise(function(resolve,reject){
        client.zscore(key,member,function(err,result){
            if(err){
                reject({
                    error: true,
                    data: err.message,
                    msg: 'error while getting member in redis'
                })
            }
            resolve({
                error: false,
                data: result,
                message: ' successfully  get member score from redis set'
            })
        })
    })
}
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
