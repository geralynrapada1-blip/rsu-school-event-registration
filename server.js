require("dotenv").config();

const nodemailer = require("nodemailer");
const cron = require("node-cron");

const Subscriber = require("./models/Subscriber");

const express = require("express");
const mongoose = require("mongoose");
const path = require("path");

const Event = require("./models/Event");
const Registration = require("./models/Registration");

const app = express();
// EMAIL CONFIGURATION

const transporter = nodemailer.createTransport({
    service: "gmail",

    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// SEND EMAIL FUNCTION

async function sendEmail(to, subject, html) {

    return transporter.sendMail({
        from: `"RSU-Cajidiocan Campus" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html
    });

}

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "public")));

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

// Add sample events
async function addSampleEvents() {
  const count = await Event.countDocuments();

  if (count > 0) return;

  await Event.insertMany([
    {
      title: "Campus Orientation",
      description: "An introductory activity for students.",
      date: "2026-11-20",
      time: "09:00",
      venue: "RSU-Cajidiocan Campus",
      category: "Orientation",
      capacity: 100
    },
    {
      title: "Technology Week",
      description: "A campus activity featuring technology-related learning.",
      date: "2026-11-25",
      time: "08:30",
      venue: "Campus Activity Area",
      category: "Academic",
      capacity: 150
    }
  ]);

  console.log("Sample events added.");
}

// Display all events
app.get("/api/events", async (req, res) => {
  try {
    const events = await Event.find().sort({ date: 1 });

    const counts = await Registration.aggregate([
      {
        $group: {
          _id: "$event",
          total: { $sum: 1 }
        }
      }
    ]);

    const countMap = new Map(
      counts.map(item => [
        String(item._id),
        item.total
      ])
    );

    res.json(
      events.map(event => ({
        ...event.toObject(),
        registeredCount:
          countMap.get(String(event._id)) || 0
      }))
    );

  } catch (error) {
    res.status(500).json({
      message: "Could not load events."
    });
  }
});

// Add a new event
app.post("/api/events", async (req, res) => {
  try {
    const {
      title,
      description,
      date,
      time,
      venue,
      category,
      capacity
    } = req.body;

    if (
      !cleanText(title) ||
      !cleanText(description) ||
      !cleanText(date) ||
      !cleanText(time) ||
      !cleanText(venue) ||
      !Number.isInteger(Number(capacity)) ||
      Number(capacity) < 1
    ) {
      return res.status(400).json({
        message: "Please complete all event fields."
      });
    }

    const event = await Event.create({
      title: cleanText(title),
      description: cleanText(description),
      date,
      time,
      venue: cleanText(venue),
      category: cleanText(category) || "Campus Activity",
      capacity: Number(capacity)
    });
    // NOTIFY SUBSCRIBED STUDENTS

try {

    const subscribers = await Subscriber.find({
        subscribed: true
    }).select("email");

    for (const student of subscribers) {

        await sendEmail(
            student.email,
            "New Upcoming School Event - RSU Cajidiocan",
          
            `
            <div style="font-family:Arial;padding:20px;">

                <h2 style="color:#174a80;">
                    RSU-Cajidiocan Campus
                </h2>

                <p>Hello Students!</p>

                <h3>New School Event Announcement!</h3>

                <p>A new school event has been added.</p>

                <p><b>Event:</b> ${event.title}</p>

                <p><b>Date:</b> ${event.date}</p>

                <p><b>Time:</b> ${event.time}</p>

                <p><b>Venue:</b> ${event.venue}</p>

                <p><b>Description:</b> ${event.description}</p>

               <p>
    Visit our School Event Registration website
    to view the event and register.
</p>

<a href="${process.env.BASE_URL}/#eventList"
   style="background-color:#174a80;
   color:white;
   padding:12px 20px;
   text-decoration:none;
   border-radius:5px;
   display:inline-block;">
    REGISTER NOW
</a>

   <p>Thank you!</p>

                

            </div>
            `
        );

    }

    console.log("Event announcements sent.");

} catch (emailError) {

    console.error("Announcement email error:", emailError);

}

    res.status(201).json({
      message: "Event added successfully.",
      event
    });

  } catch (error) {
    res.status(500).json({
      message: "Could not add the event."
    });
  }
});

// Student registration
app.post("/api/registrations", async (req, res) => {
  try {
    const {
      eventId,
      studentName,
      studentId,
      email,
      course,
      yearLevel
    } = req.body;

    if (
      !eventId ||
      !cleanText(studentName) ||
      !cleanText(studentId) ||
      !cleanText(email) ||
      !cleanText(course) ||
      !cleanText(yearLevel)
    ) {
      return res.status(400).json({
        message: "Please fill in all required fields."
      });
    }

    if (!validEmail(email)) {
      return res.status(400).json({
        message: "Enter a valid email address."
      });
    }

    if (!mongoose.isValidObjectId(eventId)) {
      return res.status(400).json({
        message: "Please choose a valid event."
      });
    }

    const selectedEvent = await Event.findById(eventId);

    if (!selectedEvent) {
      return res.status(404).json({
        message: "Event not found."
      });
    }

    const count = await Registration.countDocuments({
      event: eventId
    });

    if (count >= selectedEvent.capacity) {
      return res.status(409).json({
        message: "Registration limit reached."
      });
    }

    const registration = await Registration.create({
      event: eventId,
      studentName: cleanText(studentName),
      studentId: cleanText(studentId),
      email: cleanText(email),
      course: cleanText(course),
      yearLevel: cleanText(yearLevel)
    });
    // SEND REGISTRATION CONFIRMATION

try {

    await sendEmail(
        registration.email,
        "Event Registration Confirmation - RSU Cajidiocan",

        `
        <div style="font-family:Arial;padding:20px;">

            <h2 style="color:#174a80;">
                Registration Successful!
            </h2>

            <p>Hello ${registration.studentName},</p>

            <p>
                Your registration has been successfully
                submitted.
            </p>

            <p><b>Event:</b> ${selectedEvent.title}</p>

            <p><b>Date:</b> ${selectedEvent.date}</p>

            <p><b>Time:</b> ${selectedEvent.time}</p>

            <p><b>Venue:</b> ${selectedEvent.venue}</p>

            <p>
                Thank you for registering!
                We look forward to seeing you.
            </p>

            <p>RSU-Cajidiocan Campus</p>

        </div>
        `
    );

    console.log("Confirmation email sent.");

} catch (emailError) {

    console.error("Confirmation email error:", emailError);

}

    res.status(201).json({
      message: "Registration submitted successfully!",
      registration
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "This student is already registered for this event."
      });
    }

    res.status(500).json({
      message: "Could not submit registration."
    });
  }
});

// Display registration records
app.get("/api/registrations", async (req, res) => {
  try {
    const registrations = await Registration.find()
      .populate("event", "title date")
      .sort({ createdAt: -1 });

    res.json(registrations);

  } catch (error) {
    res.status(500).json({
      message: "Could not load registrations."
    });
  }
});

// Update attendance
app.patch("/api/registrations/:id/attendance", async (req, res) => {
  try {
    const { attendance } = req.body;

    if (!["Present", "Not Yet Attended"].includes(attendance)) {
      return res.status(400).json({
        message: "Invalid attendance status."
      });
    }

    const registration = await Registration.findByIdAndUpdate(
      req.params.id,
      { attendance },
      { new: true, runValidators: true }
    );

    if (!registration) {
      return res.status(404).json({
        message: "Registration not found."
      });
    }

    res.json({
      message: "Attendance updated.",
      registration
    });

  } catch (error) {
    res.status(500).json({
      message: "Could not update attendance."
    });
  }
});

// Start website
async function startServer() {
  if (!process.env.MONGODB_URI) {
    console.error("Please configure MONGODB_URI in your .env file.");
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log("Connected to MongoDB.");

    await addSampleEvents();

    app.listen(PORT, () => {
      console.log(`Website running at http://localhost:${PORT}`);
    });

  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    process.exit(1);
  }
}

// STUDENT EMAIL SUBSCRIPTION

app.post("/api/subscribe", async (req, res) => {

    try {

        const { name, email, consent } = req.body;

        if (
            !name?.trim() ||
            !email?.trim() ||
            consent !== true
        ) {
            return res.status(400).json({
                message: "Please complete all fields and agree to subscribe."
            });
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({
                message: "Please enter a valid email address."
            });
        }

        const existing = await Subscriber.findOne({
            email: email.trim().toLowerCase()
        });

        if (existing && existing.subscribed) {
            return res.status(409).json({
                message: "This email is already subscribed."
            });
        }

        let subscriber;

        if (existing) {

            existing.name = name.trim();
            existing.subscribed = true;

            subscriber = await existing.save();

        } else {

            subscriber = await Subscriber.create({
                name: name.trim(),
                email: email.trim().toLowerCase(),
                subscribed: true
            });

        }

        res.status(201).json({
            message: "Successfully subscribed to event notifications!"
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Subscription failed. Please try again."
        });

    }

});

// AUTOMATIC EVENT REMINDERS

cron.schedule("*/10 * * * *", async () => {

    try {

        const registrations = await Registration.find({
            reminderSent: false
        }).populate("event");

        const now = new Date();

        for (const student of registrations) {

            if (!student.event) continue;

            const eventDate = new Date(
                `${student.event.date}T${student.event.time}:00`
            );

            const hoursLeft =
                (eventDate - now) / (1000 * 60 * 60);

            if (hoursLeft > 0 && hoursLeft <= 24) {

                await sendEmail(
                    student.email,
                    "Upcoming Event Reminder - RSU Cajidiocan",

                    `
                    <div style="font-family:Arial;padding:20px;">

                        <h2 style="color:#174a80;">
                            Event Reminder!
                        </h2>

                        <p>Hello ${student.studentName},</p>

                        <p>
                            This is a reminder that you have
                            registered for an upcoming school event.
                        </p>

                        <p>
                            <b>Event:</b>
                            ${student.event.title}
                        </p>

                        <p>
                            <b>Date:</b>
                            ${student.event.date}
                        </p>

                        <p>
                            <b>Time:</b>
                            ${student.event.time}
                        </p>

                        <p>
                            <b>Venue:</b>
                            ${student.event.venue}
                        </p>

                        <p>
                            We hope to see you there!
                        </p>

                        <p>RSU-Cajidiocan Campus</p>

                    </div>
                    `
                );

                student.reminderSent = true;

                await student.save();

                console.log(
                    "Reminder sent to:",
                    student.email
                );

            }

        }

    } catch (error) {

        console.error("Reminder error:", error);

    }

});
startServer();