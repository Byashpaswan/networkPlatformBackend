const Mongoose = require("mongoose");

const Categories = Mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    type: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    status: {
        type: Number,
        required: true
    }
}, {
    timestamps: true
});

Categories.index({ name: 1, type: 1 }, { unique: true });

module.exports = Categories;