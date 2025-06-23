var redis = require('redis');
const Promise = require('promise');
const debug = require("debug")("darwin:Helpers:RedisTest");

var client = redis.createClient( process.env.REDIS_PORT ||  '6379', process.env.REDIS_HOST ||  'xxxxxxx');

/**
 * New client created for redis
 */
client.on('connect', function () {
    console.log('redis connected')
})

/**
 * Set or update value of redis key
 * parameter : key, value, expire time is optional
 */
exports.updateRedisKeyData = function (key, value, expTime) {
    return new Promise(function (resolve, reject) {
        
        // If there is no expTime is passed and also there is no hash exist then defalt expire time is set
        if (!expTime) {
            client.exists(key, function (err, result) {
                if (err) {
                    reject({
                        error: true,
                        data: err.message,
                        msg: 'error while store value in redis'
                    })
                }
                if (result == 0) {
                    expTime = process.env.REDIS_Exp || 3600
                }
            })
        }
        
        client.set(key, value, function (err, result) {
            if (err) {
                reject({
                    error: true,
                    data: err.message,
                    msg: 'error while store value in redis'
                })
            }
            if (expTime > 0) {
                client.expire(key, expTime, function (err, result) {
                    if (err) {
                        reject({
                            error: true,
                            data: err.message,
                            msg: 'could not set expiry on redis key'
                        })
                    }
                    resolve({
                        error: false,
                        data: result,
                        message: 'Successfully set data in redis key with expire time ' + expTime
                    })
                })
            }
            else {
                resolve({
                    error: false,
                    data: result,
                    message: 'Successfully set data in redis key (pass 0 for default expire time)'
                })
            }
        })
    })
}

/**
 * Get data from redis key
 * parameter : key
 * return : value of key
 */
exports.getRedisKeyData = function (key) {
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
                message: 'successfully get data from redis key'
            })
        })
    })
}

/**
 * Delete given key from redis
 * parameters : key
 */
exports.delRedisKey = function (key) {
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
                message: 'redis key deleted successfully'
            })
        })
    })
}

/**
 * update a exiting hash key or make a new hash with new value
 * parameters: hash, value ( value should be in json format)
 */
exports.updateRedisHashData = function (hash, value, expTime) {
    return new Promise(function (resolve, reject) {

        // If there is no expTime is passed and also there is no hash exist then defalt expire time is set
        if (!expTime) {
            client.exists(hash, function (err, result) {
                if (err) {
                    reject({
                        error: true,
                        data: err.message,
                        msg: 'error while store value in redis'
                    })
                }
                if (result == 0) {
                    expTime = process.env.REDIS_Exp || 3600
                }
            })
        }

        value = formatRedisValue(value);
        client.hmset(hash, value, function (err, result) {
            if (err) {
                reject({
                    error: true,
                    data: err.message,
                    msg: 'error while store value in redis hash'
                })
            }
            if (expTime > 0) {
                client.expire(hash, expTime, function (err, result) {
                    if (err) {
                        reject({
                            error: true,
                            data: err.message,
                            msg: 'could not set expiry on redis hash'
                        })
                    }
                    resolve({
                        error: false,
                        data: result,
                        message: 'Successfully set data in redis hash with expire time ' + expTime
                    })
                })
            }
            else {
                resolve({
                    error: false,
                    data: result,
                    message: 'Successfully set data in redis hash (pass 0 for default expire time)'
                })
            }
        })
    })
}

/**
 * get data from a hash according to key
 * parameters : hash, key
 * return : value of a particuler key
 */
exports.getRedisHashKeyData = function (hash, key) {
    return new Promise(function (resolve, reject) {
        client.hget(hash, key, function (err, result) {
            if (err) {
                return reject({
                    error: true,
                    data: err.message,
                    msg: 'error while retrieving value from redis hash'
                })
            }
            return resolve({
                error: false,
                data: result,
                message: 'successfully get data from redis hash key'
            })
        })
    })
}

/**
 * get all data from a hash
 * parameters : hash
 * return : all data of a particuler hash in json format
 */
exports.getRedisHashAllData = function (hash) {
    return new Promise(function (resolve, reject) {
        client.hgetall(hash, function (err, result) {
            if (err) {
                return reject({
                    error: true,
                    data: err.message,
                    msg: 'error while retrieving value from redis hash'
                })
            }
            return resolve({
                error: false,
                data: result,
                message: 'successfully get data from redis hash'
            })
        })
    })
}

/**
 * Delete one key from hash data
 * For multiple delete give keys into array
 * parameters : hash, key
 */
exports.delRedisHashKey = function (hash, key) {
    return new Promise(function (resolve, reject) {
        client.hdel(hash, key, function (err, result) {
            if (err) {
                reject({
                    error: true,
                    data: err.message,
                    msg: 'error while deleting hash key from redis '
                })
            }
            resolve({
                error: false,
                data: result,
                message: 'hash key deleted successfully'
            })
        })
    })
}

/**
 * Delete whole hash from redis
 * parameters : hash
 */
exports.delRedisHash = function (hash) {
    return new Promise(function (resolve, reject) {
        client.del(hash, function (err, result) {
            if (err) {
                reject({
                    error: true,
                    data: err.message,
                    msg: 'error while deleting hash from redis '
                })
            }
            resolve({
                error: false,
                data: result,
                message: 'hash deleted successfully'
            })
        })
    })
}

/**
 * set data in redis set
 * parameters: key, value, expire time
 */
exports.updateRedisSetData = function (key, value, expTime) {
    return new Promise(function (resolve, reject) {

        // If there is no expTime is passed and also there is no hash exist then defalt expire time is set
        if (!expTime) {
            client.exists(key, function (err, result) {
                if (err) {
                    reject({
                        error: true,
                        data: err.message,
                        msg: 'error while store value in redis'
                    })
                }
                if (result == 0) {
                    expTime = process.env.REDIS_Exp
                }
            })
        }

        client.sadd(key, value, function (err, result) {
            if (err) {
                reject({
                    error: true,
                    data: err.message,
                    msg: 'error while store value in redis set'
                })
            }
            if (expTime > 0) {
                client.expire(key, expTime, function (err, result) {
                    if (err) {
                        reject({
                            error: true,
                            data: err.message,
                            msg: 'could not set expiry on redis set'
                        })
                    }
                    resolve({
                        error: false,
                        data: result,
                        message: 'Successfully set data in redis set with expire time ' + expTime
                    })
                })
            }
            else {
                resolve({
                    error: false,
                    data: result,
                    message: 'Successfully set data in redis set (pass 0 for default expire time)'
                })
            }
        })
    })
}

/**
 * Get data from redis set
 * parameters: set key
 */
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
                message: 'successfully get data from redis set'
            })
        })
    })
}

/**
 * get data from multiple sets, all data is union
 * parameters: all keys which are needed to merge
 * return: union of all keys value
 */
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

/**
 * Format nested data of json object into a string
 */
function formatRedisValue(value) {

    let formattedObject = value;
    let allKeys = Object.keys(value);

    allKeys.forEach(key => {
        if (typeof value[key] === 'object') {
            formattedObject[key] = JSON.stringify(value[key]);
        }
    })

    return formattedObject;
}


// test = async () => {

//     let result = ''
//     // let data = { 'key1': 'data1', 'key2': 'data2', 'key3': 'data3', 'key4': 'data4', 'key5': 'data5', 'key6': 'data6', 'key7': 'data7', 'key8': 'data8', 'key9': 'data9', 'key10': 'data10', 'key11': 'data11', 'key12': 'data12', 'key13': 'data13' }

//     // result = await this.updateRedisHashData("myhash", data)
//     // console.log(result);

//     // result = await this.getRedisHashAllData("myhash")
//     // console.log(result);

//     data = { 'key1': { 'key2': 'Hello' }, 'key2': { 'key3': 'World' }, 'key3': 'Nitish' }
//     result = await this.updateRedisHashData("myhash", data)
//     console.log(result);

//     // result = await this.getRedisHashKeyData("myhash", 'key1')
//     // console.log(result);

//     // result = await this.delRedisHashKey("myhash", ['key12','key13'])
//     // console.log(result);

//     // result = await this.delRedisHash("myhash")
//     // console.log(result);

//     // result = await this.getRedisHashAllData("myhash")
//     // console.log(result);


//     // result = await this.updateRedisKeyData('key1', 'data1')
//     // console.log(result);

// }

// test()