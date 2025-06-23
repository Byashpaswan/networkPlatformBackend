require('dotenv').config({ path: '.env' });
require('../db/connection')

const networkModel = require('../db/network/Network');
const UserModel = require('../db/user/User');

const getNetworks = async () => {
    try {
        let netObj = {};
        let networkList = await networkModel.findAllNetwork({}, { nid: 1 })
        for (const data of networkList) {
            netObj[data._id.toString()] = data.nid;
        }
        return netObj;
    } catch (error) {
        console.log(error);
    }
}

exports.updateNidInUsers = async () => {
    try {
        let networkObj = await getNetworks();
        let userList = await UserModel.getUsers();
        for (const data of userList) {
            if (data.network && data.network.length) {
                let nid = networkObj[data.network[0]];
                console.log(data.network[0], data._id, nid)
                await UserModel.findAndUpdateUser({ _id: data._id }, { $set: { "nid": nid } })
            }
        }
    } catch (error) {
        console.log(error);
    }
}

this.updateNidInUsers();