process.env.TZ = "Europe/Paris";

const mysql = require("mysql2");
const express = require("express");
const path = require("path");
const session = require("express-session");
const fs = require("fs");

const app = express();

// 1. Create the Database Connection Pool
const db = mysql.createPool({
    host: "localhost",
    user: "app_user",
    password: "rugby2026",
    database: "efreirugby",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

// Test the connection on startup
db.getConnection((err, connection) => {
    if (err) {
        console.error("Database connection failed:", err);
    } else {
        console.log("Successfully connected to the MySQL database!");
        connection.release();
    }
});

// 2. TURN ON TRANSLATORS & SESSIONS FIRST
app.use(express.json()); // Reads JSON data
app.use(
    session({
        secret: "efrei-rugby-super-secret-key",
        resave: false,
        saveUninitialized: false,
    }),
);

// 3. THE BOUNCER MIDDLEWARE (Must be BEFORE express.static!)
app.use((req, res, next) => {
    const protectedPaths = [
        "/dashboard.html",
        "/dashboard",
        "/profile.html",
        "/profile",
        "/locker-room.html",
        "/locker-room",
        "/schedule.html",
        "/schedule",
        "/roster.html",
        "/roster",
        "/coach",
        "/coach.html",
    ];

    if (protectedPaths.includes(req.path)) {
        if (req.session && req.session.loggedIn) {
            next();
        } else {
            res.redirect("./");
        }
    } else {
        next();
    }
});

// 4. SERVE STATIC FILES (Only accessible if the Bouncer let them pass)
app.use(express.static(path.join(__dirname, "public")));

// Root route
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "html", "login.html"));
});

// Dashboard route (Secondary safety catch)
app.get("/dashboard", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "html", "dashboard.html"));
});

app.get("/locker-room", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "html", "locker-room.html"));
});

app.get("/profile", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "html", "profile.html"));
});

app.get("/schedule", (req, res) =>
    res.sendFile(path.join(__dirname, "public", "html", "schedule.html")),
);

app.get("/roster", (req, res) =>
    res.sendFile(path.join(__dirname, "public", "html", "roster.html")),
);

app.get("/coach", requireCoach, (req, res) =>
    res.sendFile(path.join(__dirname, "public", "html", "coach.html")),
);

// 5. THE LOGIN DOORWAY (With our Nginx array fix)
app.post("/api/login", (req, res) => {
    const userEmail = req.body.email;
    const userPassword = req.body.password;

    const query = "SELECT * FROM players WHERE email = ? AND password = ?";

    db.query(query, [userEmail, userPassword], (err, results) => {
        if (err) {
            console.error(err);
            return res.json({
                success: false,
                message: "Server error. Please try again later.",
            });
        }

        if (results.length > 0) {
            // GIVE THEM THE WRISTBAND!
            req.session.loggedIn = true;
            req.session.user = results[0];

            res.json({ success: true });
        } else {
            res.json({
                success: false,
                message: "Incorrect email or password.",
            });
        }
    });
});

// 6. THE LOGOUT DOORWAY
app.post("/api/logout", (req, res) => {
    // This built-in function shreds the VIP wristband!
    req.session.destroy((err) => {
        if (err) {
            console.error("Error destroying session:", err);
            return res.json({ success: false, message: "Could not log out." });
        }

        // Tells the browser to delete the cookie on their end too
        res.clearCookie("connect.sid");
        res.json({ success: true });
    });
});

app.get("/api/user", (req, res) => {
    // Check if the user is actually logged in
    if (!req.session || !req.session.loggedIn || !req.session.user) {
        return res
            .status(401)
            .json({ success: false, message: "Not logged in" });
    }

    // FRESH DATA QUERY: Ask the DB for the absolute latest player stats
    const query = "SELECT * FROM players WHERE id = ?";
    db.query(query, [req.session.user.id], (err, results) => {
        if (err || results.length === 0) {
            return res.json({
                success: false,
                message: "Could not fetch user data.",
            });
        }

        // Overwrite the old session snapshot with the fresh data
        req.session.user = results[0];

        // Send back the fresh data to the dashboard
        res.json({
            success: true,
            user: results[0],
        });
    });
});
// 8. ADD RECENT PHOTOS
app.get("/api/latest-photos", (req, res) => {
    // 1. Find the latest event in the DB
    const query =
        "SELECT event_name, folder_name, event_type FROM events WHERE folder_name IS NOT NULL ORDER BY date DESC LIMIT 1";

    db.query(query, (err, results) => {
        if (err || results.length === 0) {
            return res.json({ success: false, message: "No events found." });
        }

        const event = results[0];

        // 2. Build the exact physical path to that folder on the hard drive
        const folderPath = path.join(
            __dirname,
            "public",
            "photos/events",
            event.folder_name,
        );

        // 3. Ask Node.js to look inside that folder
        fs.readdir(folderPath, (err, files) => {
            if (err) {
                // If the folder doesn't exist or is empty, just send an empty array
                return res.json({
                    success: true,
                    eventName: event.event_name,
                    eventType: event.event_type,
                    folderName: event.folder_name,
                    photos: [],
                });
            }

            // 4. Filter out any junk files (like hidden Mac .DS_Store files), keep only images
            const images = files.filter((file) =>
                file.match(/\.(jpg|jpeg|png|gif|webp)$/i),
            );

            const randomPhotos = images
                .sort(() => 0.5 - Math.random()) // Randomly shuffles the array
                .slice(0, 5); // Grabs exactly the first 5 items (or fewer, if the folder has less than 5)

            // 5. Send the list of file names to the frontend!
            res.json({
                success: true,
                eventName: event.event_name,
                eventType: event.event_type,
                folderName: event.folder_name,
                photos: randomPhotos,
            });
        });
    });
});

app.get("/api/latest-review", (req, res) => {
    const query = `SELECT
        r.*,
        e.event_name,
        e.event_type,
        e.date
    FROM reviews r
    JOIN events e ON r.event_id = e.id
    WHERE r.player_id = ?
    ORDER BY e.date DESC LIMIT 1`;

    db.query(query, [req.session.user.id], (err, results) => {
        if (err || results.length === 0) {
            return res.json({ success: false, message: "No review found." });
        }

        res.json({
            success: true,
            review: results[0],
        });
    });
});

app.get("/api/next-training", (req, res) => {
    const query = `SELECT event_name, date FROM events WHERE event_type = 'training' AND date >=NOW() ORDER BY date ASC LIMIT 1`;
    db.query(query, (err, results) => {
        if (err) {
            console.error("Error fetching next training:", err);
            return res.json({ success: false, message: "Database error." });
        }

        if (results.length === 0) {
            return res.json({ success: true, training: null });
        }
        res.json({
            success: true,
            training: results[0],
        });
    });
});
// 9. THE FULL LOCKER ROOM GALLERY
app.get("/api/gallery", (req, res) => {
    // Grab ALL events, ordered by newest first
    const query =
        "SELECT event_name, folder_name, event_type FROM events WHERE folder_name IS NOT NULL ORDER BY date DESC";

    db.query(query, (err, results) => {
        if (err)
            return res.json({ success: false, message: "Database error." });

        const galleryData = [];

        // We use a synchronous loop here so we can pack the box neatly before sending it
        for (let event of results) {
            const folderPath = path.join(
                __dirname,
                "public",
                "photos/events",
                event.folder_name,
            );

            try {
                // If the folder actually exists on the hard drive...
                if (fs.existsSync(folderPath)) {
                    const files = fs.readdirSync(folderPath);
                    const images = files.filter((file) =>
                        file.match(/\.(jpg|jpeg|png|gif|webp)$/i),
                    );

                    // Only add the event to the gallery if it actually has photos in it!
                    if (images.length > 0) {
                        galleryData.push({
                            eventName: event.event_name,
                            eventType: event.event_type,
                            folderName: event.folder_name,
                            photos: images,
                        });
                    }
                }
            } catch (e) {
                console.error("Could not read folder:", event.folder_name);
            }
        }

        // Send the massive payload to the frontend
        res.json({ success: true, events: galleryData });
    });
});

/// A. GET FULL PROFILE & REVIEWS
app.get("/api/profile", (req, res) => {
    if (!req.session || !req.session.loggedIn || !req.session.user) {
        return res.json({ success: false, message: "Not logged in" });
    }

    const userId = req.session.user.id;

    // 1. FRESH DATA QUERY: Ask the DB for the absolute latest stats
    const playerQuery = "SELECT * FROM players WHERE id = ?";

    db.query(playerQuery, [userId], (err, playerResults) => {
        if (err || playerResults.length === 0) {
            console.error("Profile fetch error:", err);
            return res.json({
                success: false,
                message: "Error fetching latest profile data.",
            });
        }

        const freshUserData = playerResults[0];

        // Bonus: Update the snapshot in memory so other pages get the fresh data too!
        req.session.user = freshUserData;

        // 2. REVIEWS QUERY: JOIN reviews with events
        const reviewsQuery = `
            SELECT
                r.*,
                e.event_name,
                e.event_type,
                e.date
            FROM reviews r
            JOIN events e ON r.event_id = e.id
            WHERE r.player_id = ?
            ORDER BY e.date DESC
        `;

        db.query(reviewsQuery, [userId], (err, reviewResults) => {
            if (err) {
                console.error("Review fetch error:", err);
                return res.json({
                    success: false,
                    message: "Error fetching reviews.",
                });
            }

            // Send the perfectly fresh data to the frontend
            res.json({
                success: true,
                player: freshUserData,
                reviews: reviewResults,
            });
        });
    });
});

app.get("/api/roster", (req, res) => {
    const query = "SELECT * FROM players ";

    db.query(query, (err, result) => {
        if (err)
            return res.json({ success: false, message: "Database error." });

        const formatedRoster = [
            {
                title: "Coaching Staff",
                players: result.filter((p) => p.roster_category === "coaches"),
            },
            {
                title: "Helping Staff",
                players: result.filter((p) => p.roster_category === "staff"),
            },
            {
                title: "Forwards",
                players: result.filter((p) => p.roster_category === "forwards"),
            },
            {
                title: "Backs",
                players: result.filter((p) => p.roster_category === "backs"),
            },
            {
                title: "Benched or Unassigned",
                players: result.filter((p) => p.roster_category === "benched"),
            },
        ];

        res.json({
            success: true,
            roster: formatedRoster,
        });
    });
});

app.get("/api/coach/players", requireCoachAPI, (req, res) => {
    // Get everyone except other coaches and staff, sorted alphabetically
    const query = `
        SELECT *
        FROM players
        WHERE roster_category IN ('forwards', 'backs', 'staff', 'benched', 'unassigned')
        ORDER BY first_name ASC
    `;

    db.query(query, (err, results) => {
        if (err) return res.json({ success: false, message: "Database error" });
        res.json({ success: true, players: results });
    });
});

app.post("/api/coach/update-player-full", requireCoachAPI, (req, res) => {
    const { playerId, position, tries, yellow, red } = req.body;

    const query = `
        UPDATE players
        SET preferred_position = ?,
            tries = ?,
            yellow_cards = ?,
            red_cards = ?
        WHERE id = ?
    `;

    db.query(
        query,
        [position, tries, yellow, red, playerId],
        (err, results) => {
            if (err) {
                console.error(err);
                return res.json({
                    success: false,
                    message: "Database update error.",
                });
            }
            res.json({
                success: true,
                message: "Player updated successfully!",
            });
        },
    );
});

app.post("/api/coach/add-review", requireCoachAPI, (req, res) => {
    const { playerId, eventId, rating, comment } = req.body;

    const query = `
        INSERT INTO reviews (player_id, event_id, rating, comment)
        VALUES (?, ?, ?, ?)
    `;

    db.query(query, [playerId, eventId, rating, comment], (err, results) => {
        if (err) {
            console.error(err);
            return res.json({ success: false, message: "Database error." });
        }
        res.json({ success: true, message: "Review posted successfully!" });
    });
});

// 2. CREATE NEW PLAYER
app.post("/api/coach/add-player", requireCoachAPI, (req, res) => {
    const { firstName, lastName, email, password } = req.body;

    const query = `
        INSERT INTO players (first_name, last_name, email, password, preferred_position)
        VALUES (?, ?, ?, ?, 'Unassigned')
    `;
    db.query(query, [firstName, lastName, email, password], (err, results) => {
        if (err) {
            console.error(err);
            return res.json({
                success: false,
                message: "Error creating player. Email may already exist.",
            });
        }
        res.json({ success: true, message: "New player added to the system!" });
    });
});

app.post("/api/coach/remove-player", requireCoachAPI, (req, res) => {
    const { id } = req.body;

    const query = `
        DELETE FROM players WHERE id = ?;
    `;
    db.query(query, id, (err, results) => {
        if (err) {
            console.error(err);
            return res.json({
                success: false,
                message: "Error removing player.",
            });
        }
        res.json({ success: true, message: "Player removed from the system!" });
    });
});

// 3. SCHEDULE NEW EVENT
app.post("/api/coach/add-event", requireCoachAPI, (req, res) => {
    const { eventName, eventType, eventDate, eventTime } = req.body;
    const mysqlDateTime = `${eventDate} ${eventTime}:00`;
    const query = `
        INSERT INTO events (event_name, event_type, date)
        VALUES (?, ?, ?)
    `;
    db.query(query, [eventName, eventType, mysqlDateTime], (err, results) => {
        if (err) {
            console.error(err);
            return res.json({
                success: false,
                message: "Database error while scheduling.",
            });
        }
        res.json({
            success: true,
            message: "Event added to the schedule!",
        });
    });
});

// --- GET FULL SCHEDULE ---
app.get("/api/schedule-events", (req, res) => {
    const query = `
        SELECT
        *
        FROM events
        ORDER BY date ASC
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error(err);
            return res.json({ success: false, message: "Database error." });
        }
        const now = new Date();
        res.json({
            success: true,
            upcomingEvents: results.filter((e) => new Date(e.date) >= now),
            allEvents: results,
            today: now.toISOString(),
        });
    });
});

// 10. START THE SERVER
const PORT = 3000;
app.listen(PORT, "0.0.0.0", () => {
    console.log(`Efrei Rugby Server is running on port ${3000}`);
});

// SECURE HTML BOUNCER: Kicks non-coaches back to the dashboard
function requireCoach(req, res, next) {
    if (!req.session || !req.session.loggedIn) return res.redirect("./");
    if (
        req.session.user.roster_category !== "coaches" &&
        req.session.user.preferred_position !== "Admin"
    ) {
        return res.redirect("dashboard");
    }
    next();
}

// SECURE API BOUNCER: Blocks non-coaches from fetching/editing data
function requireCoachAPI(req, res, next) {
    if (
        !req.session ||
        !req.session.loggedIn ||
        (req.session.user.roster_category !== "coaches" &&
            req.session.user.preferred_position !== "Admin")
    ) {
        return res.json({
            success: false,
            message: "Unauthorized. Coach access only.",
        });
    }
    next();
}
