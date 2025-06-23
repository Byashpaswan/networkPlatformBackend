const Mongoose = require("mongoose");
const ObjectId = Mongoose.Schema.Types.ObjectId;

const UserDetails = Mongoose.Schema({
    id: {
        type: ObjectId,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    pubId: {
        type: Number,
        required: false
    }
}, {
    _id: false
});

const DownloadCenter = Mongoose.Schema({
    networkId: {
        type: ObjectId,
        required: true
    },
    userDetails: {
        type: UserDetails,
        required: true
    },
    query: {
        type: String,
        required: true
    },
    hash: {
        type: String,
        required: true
    },
    status: {
        type: String,
        default: 'processing'
    },
    report: {
        type: String,
        required: true
    },
    filePath: {
        type: String
    },
    error: {
        type: String
    }
}, {
    timestamps: true
});

module.exports = DownloadCenter; 