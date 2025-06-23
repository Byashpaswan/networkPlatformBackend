const Mongoose = require("mongoose");
const objectIdType = Mongoose.Schema.Types.ObjectId;

const workerStatus = Mongoose.Schema({

    network_id: {
        type: objectIdType,
        required: true,
    },
    usrName: {
        type: String
    },
    usrId: {
        type: objectIdType
    },
    wName: {
        type: String
    },
    pName: {
        type: String
    },
    status: {
        type: String
    },
    fOffCnt: {
        type: Number
    },
    count: {
        type: Number
    },
    sDetails: {
        type: Object
    }
}, {
    timestamps: true,
    versionKey: false
});

module.exports = workerStatus;
