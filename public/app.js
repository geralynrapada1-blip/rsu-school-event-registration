const eventList = document.getElementById("eventList");
const eventSelect = document.getElementById("eventId");

const registrationForm =
    document.getElementById("registrationForm");

const eventForm =
    document.getElementById("eventForm");

const registrationRows =
    document.getElementById("registrationRows");

// Display messages
function showMessage(id, message, type) {
    const element = document.getElementById(id);

    element.textContent = message;
    element.className = type;
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString + "T00:00:00");

    return date.toLocaleDateString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric"
    });
}

// Load school events
async function loadEvents() {
    try {
        const response = await fetch("/api/events");

        if (!response.ok) {
            throw new Error("Unable to load events.");
        }

        const events = await response.json();

        eventList.innerHTML = "";
        eventSelect.innerHTML =
            '<option value="">Select an event</option>';

        events.forEach(event => {

            const card = document.createElement("div");

            card.className = "event-card";

            const category = document.createElement("span");
            category.className = "category";
            category.textContent = event.category;

            const title = document.createElement("h3");
            title.textContent = event.title;

            const description = document.createElement("p");
            description.textContent = event.description;

            const date = document.createElement("p");
            date.textContent = "Date: " + formatDate(event.date);

            const time = document.createElement("p");
            time.textContent = "Time: " + event.time;

            const venue = document.createElement("p");
            venue.textContent = "Venue: " + event.venue;

            const count = document.createElement("p");
            count.textContent =
                "Registered: " +
                event.registeredCount +
                " / " +
                event.capacity;

            card.append(
                category,
                title,
                description,
                date,
                time,
                venue,
                count
            );

            eventList.appendChild(card);

            const option = document.createElement("option");

            option.value = event._id;
            option.textContent = event.title;

            eventSelect.appendChild(option);
        });

        if (events.length === 0) {
            eventList.textContent = "No available events.";
        }

        document.getElementById("totalEvents").textContent =
            events.length;

    } catch (error) {
        eventList.textContent =
            "Could not connect to the server.";
    }
}

// Submit student registration
registrationForm.addEventListener("submit", async function(e) {

    e.preventDefault();

    showMessage(
        "registrationMessage",
        "Submitting registration...",
        ""
    );

    const data = Object.fromEntries(
        new FormData(registrationForm).entries()
    );

    try {

        const response = await fetch("/api/registrations", {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message);
        }

        showMessage(
            "registrationMessage",
            result.message,
            "success"
        );

        registrationForm.reset();

        await loadEvents();
        await loadRegistrations();

    } catch (error) {

        showMessage(
            "registrationMessage",
            error.message,
            "error"
        );

    }
});

// Add new event
eventForm.addEventListener("submit", async function(e) {

    e.preventDefault();

    showMessage(
        "eventMessage",
        "Adding event...",
        ""
    );

    const data = Object.fromEntries(
        new FormData(eventForm).entries()
    );

    data.capacity = Number(data.capacity);

    try {

        const response = await fetch("/api/events", {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message);
        }

        showMessage(
            "eventMessage",
            result.message,
            "success"
        );

        eventForm.reset();

        await loadEvents();

    } catch (error) {

        showMessage(
            "eventMessage",
            error.message,
            "error"
        );

    }
});

// Load registration records
async function loadRegistrations() {

    try {

        const response = await fetch("/api/registrations");

        if (!response.ok) {
            throw new Error("Could not load records.");
        }

        const registrations = await response.json();

        registrationRows.innerHTML = "";

        document.getElementById("totalRegistrations").textContent =
            registrations.length;

        const presentCount = registrations.filter(
            item => item.attendance === "Present"
        ).length;

        document.getElementById("totalPresent").textContent =
            presentCount;

        if (registrations.length === 0) {

            registrationRows.innerHTML =
                '<tr><td colspan="4">No registrations yet.</td></tr>';

            return;
        }

        registrations.forEach(item => {

            const row = document.createElement("tr");

            const student = document.createElement("td");
            student.textContent =
                item.studentName + " (" + item.studentId + ")";

            const event = document.createElement("td");
            event.textContent =
                item.event ? item.event.title : "Unavailable";

            const attendance = document.createElement("td");
            attendance.textContent = item.attendance;

            const action = document.createElement("td");

            const button = document.createElement("button");

            button.className = "small-action";

            button.textContent =
                item.attendance === "Present"
                ? "Undo"
                : "Mark Present";

            button.addEventListener("click", function() {

                const newStatus =
                    item.attendance === "Present"
                    ? "Not Yet Attended"
                    : "Present";

                updateAttendance(item._id, newStatus);

            });

            action.appendChild(button);

            row.append(
                student,
                event,
                attendance,
                action
            );

            registrationRows.appendChild(row);

        });

    } catch (error) {

        registrationRows.innerHTML =
            '<tr><td colspan="4">Could not load records.</td></tr>';

    }
}

// Update attendance
async function updateAttendance(id, attendance) {

    try {

        const response = await fetch(
            `/api/registrations/${id}/attendance`,
            {
                method: "PATCH",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({ attendance })
            }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message);
        }

        await loadRegistrations();

    } catch (error) {

        alert(error.message);

    }
}

// Refresh records
document.getElementById("refreshButton")
    .addEventListener("click", async function() {

        await loadEvents();
        await loadRegistrations();

    });

// Start website functions
async function initializePage() {

    await loadEvents();

    await loadRegistrations();

}

initializePage();
// EMAIL SUBSCRIPTION

const subscribeForm =
    document.getElementById("subscribeForm");

subscribeForm.addEventListener("submit", async function(e) {

    e.preventDefault();

    const formData = new FormData(subscribeForm);

    const data = Object.fromEntries(
        formData.entries()
    );

    data.consent = formData.get("consent") === "on";

    try {

        const response = await fetch("/api/subscribe", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(data)

        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message);
        }

        showMessage(
            "subscribeMessage",
            result.message,
            "success"
        );

        subscribeForm.reset();

    } catch (error) {

        showMessage(
            "subscribeMessage",
            error.message,
            "error"
        );

    }

});