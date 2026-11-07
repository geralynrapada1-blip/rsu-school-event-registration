const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true
    },
    date: {
      type: String,
      required: true
    },
    time: {
      type: String,
      required: true
    },
    venue: {
      type: String,
      required: true
    },
    category: {
      type: String,
      default: "Campus Activity"
    },
    capacity: {
      type: Number,
      default: 100
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Event", eventSchema);