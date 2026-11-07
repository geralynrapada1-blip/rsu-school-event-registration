const mongoose = require("mongoose");

const registrationSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true
    },
    studentName: {
      type: String,
      required: true,
      trim: true
    },
    studentId: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true
    },
    course: {
      type: String,
      required: true
    },
    yearLevel: {
      type: String,
      required: true
    },
    attendance: {
      type: String,
      enum: ["Not Yet Attended", "Present"],
      default: "Not Yet Attended"
    },
    reminderSent: {
    type: Boolean,
    default: false
},
    
  },
  { timestamps: true }
  
);

registrationSchema.index(
  { event: 1, studentId: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  "Registration",
  registrationSchema
);