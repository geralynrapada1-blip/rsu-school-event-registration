const mongoose = require("mongoose");

const subscriberSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },

    email: {
        type: String,
        required: true,
        lowercase: true,
        unique: true,
        trim: true
    },

    subscribed: {
        type: Boolean,
        default: true
    }

}, { timestamps: true });

module.exports = mongoose.model(
    "Subscriber",
    subscriberSchema
);