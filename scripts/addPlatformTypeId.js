require('dotenv').config({ path: '.env' });
require('../db/connection')
const mongoose = require('mongoose');

const UserModel = require('../db/user/User');
const networkModel = require('../db/network/Network');
const { PlatformModel, PlatformTypeModel } = require('../db/platform/Platform');

exports.updateUniqueIds = async () => {
    try {
        let userList = await UserModel.getUsers();
        for (const data of userList) {
            let newSeqDoc = await mongoose.connection.db.collection('identitycounters').findOneAndUpdate({ model: "user", field: "uid" }, { $inc: { count: 1 } }, { returnOriginal: false });
            console.log(data._id, newSeqDoc.value);
            await UserModel.findAndUpdateUser({ _id: data._id }, { $set: { uid: newSeqDoc.value.count } })
        }

        let networkList = await networkModel.findAllNetwork();
        for (const data of networkList) {
            let newSeqDoc = await mongoose.connection.db.collection('identitycounters').findOneAndUpdate({ model: "network", field: "nid" }, { $inc: { count: 1 } }, { returnOriginal: false });
            console.log(data._id, newSeqDoc.value);
            await networkModel.updateTimeZone({ _id: data._id }, { $set: { nid: newSeqDoc.value.count } })
        }

        let platformList = await PlatformModel.getPlatform();
        for (const data of platformList) {
            let newSeqDoc = await mongoose.connection.db.collection('identitycounters').findOneAndUpdate({ model: "platform", field: "plid" }, { $inc: { count: 1 } }, { returnOriginal: false });
            console.log(data._id, newSeqDoc.value);
            await PlatformModel.updatePlatform({ _id: data._id }, { $set: { plid: newSeqDoc.value.count } })
        }

        let platformTypeList = await PlatformTypeModel.getPlatformTypes();
        for (const data of platformTypeList) {
            let newSeqDoc = await mongoose.connection.db.collection('identitycounters').findOneAndUpdate({ model: "platformtypes", field: "plty" }, { $inc: { count: 1 } }, { returnOriginal: false });
            console.log(data._id, newSeqDoc.value);
            await PlatformTypeModel.updatePlatformTypes({ _id: data._id }, { $set: { plty: newSeqDoc.value.count } })
        }
    } catch (error) {
        console.log(error)
    }
}

this.updateUniqueIds();