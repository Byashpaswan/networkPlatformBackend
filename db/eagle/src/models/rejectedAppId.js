const Mongoose = require("mongoose");
const objectIdType = Mongoose.Schema.Types.ObjectId;
require('mongoose-double')(Mongoose);

const rejectedAppId = Mongoose.Schema({

    network_id: {
        type: objectIdType,
        required: true,
    },
    app_id: {
        type: String,
        required: true
    }
})

rejectedAppId.index({app_id: 1, })

module.exports = rejectedAppId;