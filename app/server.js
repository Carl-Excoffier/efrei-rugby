process.env.TZ = "Europe/Paris";

const mysql = require("mysql2");
const express = require("express");
const path = require("path");
const session = require("express-session");
const fs = require("fs");

const app = express();

const db = mysql.createPool({
    host: "localhost",
    user: "app_user",
    password: "rugby2026",
    database: "efreirugby",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

db.getConnection((err, connection) => {
    if (err) {
        console.error("Database connection failed:", err);
    } else {
        console.log("Successfully connected to the MySQL database!");
        connection.release();
    }
});

app.use(express.json());
app.use(
    session({
        secret: "efrei-rugby-super-secret-key",
        resave: false,
        saveUninitialized: false,
    }),
);

// MUST sit before express.static to prevent direct unauthenticated access to physical .html files
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

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "html", "login.html"));
});

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

app.post("/api/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Error destroying session:", err);
            return res.json({ success: false, message: "Could not log out." });
        }
        res.clearCookie("connect.sid");
        res.json({ success: true });
    });
});

app.get("/api/user", (req, res) => {
    if (!req.session || !req.session.loggedIn || !req.session.user) {
        return res
            .status(401)
            .json({ success: false, message: "Not logged in" });
    }

    // Forces a DB query to bypass stale session data and catch changes instantly
    const query = "SELECT * FROM players WHERE id = ?";
    db.query(query, [req.session.user.id], (err, results) => {
        if (err || results.length === 0) {
            return res.json({
                success: false,
                message: "Could not fetch user data.",
            });
        }

        req.session.user = results[0];
        res.json({ success: true, user: results[0] });
    });
});

app.get("/api/latest-photos", (req, res) => {
    const query =
        "SELECT event_name, folder_name, event_type, date FROM events WHERE folder_name IS NOT NULL ORDER BY date DESC LIMIT 1";

    db.query(query, (err, results) => {
        if (err || results.length === 0) {
            return res.json({ success: false, message: "No events found." });
        }

        const event = results[0];
        const folderPath = path.join(
            __dirname,
            "public",
            "photos/events",
            event.folder_name,
        );

        fs.readdir(folderPath, (err, files) => {
            if (err) {
                return res.json({ success: true, event: event, photos: [] });
            }

            const images = files.filter((file) =>
                file.match(/\.(jpg|jpeg|png|gif|webp)$/i),
            );

            // Shuffles array layout elements on index mapping before array slicing
            const randomPhotos = images
                .sort(() => 0.5 - Math.random())
                .slice(0, 5);

            res.json({ success: true, event: event, photos: randomPhotos });
        });
    });
});

app.get("/api/latest-review", (req, res) => {
    const query = `SELECT r.*, e.event_name, e.event_type, e.date
                   FROM reviews r
                   JOIN events e ON r.event_id = e.id
                   WHERE r.player_id = ?
                   ORDER BY e.date DESC LIMIT 1`;

    db.query(query, [req.session.user.id], (err, results) => {
        if (err || results.length === 0) {
            return res.json({ success: false, message: "No review found." });
        }
        res.json({ success: true, review: results[0] });
    });
});

app.get("/api/next-training", (req, res) => {
    const query = `SELECT event_name, date FROM events WHERE event_type = 'training' AND date >= NOW() ORDER BY date ASC LIMIT 1`;
    db.query(query, (err, results) => {
        if (err) {
            console.error("Error fetching next training:", err);
            return res.json({ success: false, message: "Database error." });
        }
        if (results.length === 0) {
            return res.json({ success: true, training: null });
        }
        res.json({ success: true, training: results[0] });
    });
});

app.get("/api/gallery", (req, res) => {
    const query =
        "SELECT event_name, folder_name, event_type, date FROM events WHERE folder_name IS NOT NULL ORDER BY date DESC";

    db.query(query, (err, results) => {
        if (err)
            return res.json({ success: false, message: "Database error." });

        const galleryData = [];

        // Synchronous loop handles I/O file checks safely before firing final response payload
        for (let event of results) {
            const folderPath = path.join(
                __dirname,
                "public",
                "photos/events",
                event.folder_name,
            );

            try {
                if (fs.existsSync(folderPath)) {
                    const files = fs.readdirSync(folderPath);
                    const images = files.filter((file) =>
                        file.match(/\.(jpg|jpeg|png|gif|webp)$/i),
                    );

                    if (images.length > 0) {
                        galleryData.push({
                            date: event.date,
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
        res.json({ success: true, events: galleryData });
    });
});

app.get("/api/profile", (req, res) => {
    if (!req.session || !req.session.loggedIn || !req.session.user) {
        return res.json({ success: false, message: "Not logged in" });
    }

    const userId = req.session.user.id;
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
        req.session.user = freshUserData;

        const reviewsQuery = `
            SELECT r.*, e.event_name, e.event_type, e.date
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

        res.json({ success: true, roster: formatedRoster });
    });
});

app.get("/api/coach/players", requireCoachAPI, (req, res) => {
    const query = `SELECT * FROM players WHERE roster_category IN ('forwards', 'backs', 'staff', 'benched', 'unassigned') ORDER BY first_name ASC`;
    db.query(query, (err, results) => {
        if (err) return res.json({ success: false, message: "Database error" });
        res.json({ success: true, players: results });
    });
});

app.post("/api/coach/update-player-full", requireCoachAPI, (req, res) => {
    const { playerId, position, tries, yellow, red } = req.body;
    const query = `UPDATE players SET preferred_position = ?, tries = ?, yellow_cards = ?, red_cards = ? WHERE id = ?`;

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

// Assignment Scripting Component: Chained queries driving an aggregate subquery math calculation directly inside MySQL
app.post("/api/coach/add-review", requireCoachAPI, (req, res) => {
    const { playerId, eventId, rating, comment } = req.body;

    const insertQuery = `INSERT INTO reviews (player_id, event_id, rating, comment) VALUES (?, ?, ?, ?)`;

    db.query(
        insertQuery,
        [playerId, eventId, rating, comment],
        (err, results) => {
            if (err) {
                console.error(err);
                return res.json({ success: false, message: "Database error." });
            }

            const updateAvgQuery = `
            UPDATE players
            SET avg_review = (SELECT ROUND(AVG(rating), 1) FROM reviews WHERE player_id = ?)
            WHERE id = ?
        `;

            db.query(updateAvgQuery, [playerId, playerId], (updateErr) => {
                if (updateErr) {
                    console.error("Failed to update average:", updateErr);
                    return res.json({
                        success: true,
                        message: "Review posted, but average failed to update.",
                    });
                }
                res.json({
                    success: true,
                    message: "Review posted & player average updated!",
                });
            });
        },
    );
});

app.post("/api/coach/add-player", requireCoachAPI, (req, res) => {
    const { firstName, lastName, email, password } = req.body;
    const query = `INSERT INTO players (first_name, last_name, email, password, preferred_position) VALUES (?, ?, ?, ?, 'Unassigned')`;
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
    const query = `DELETE FROM players WHERE id = ?;`;
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

app.post("/api/coach/add-event", requireCoachAPI, (req, res) => {
    const { eventName, eventType, eventDate, eventTime } = req.body;
    const mysqlDateTime = `${eventDate} ${eventTime}:00`;
    const query = `INSERT INTO events (event_name, event_type, date) VALUES (?, ?, ?)`;
    db.query(query, [eventName, eventType, mysqlDateTime], (err, results) => {
        if (err) {
            console.error(err);
            return res.json({
                success: false,
                message: "Database error while scheduling.",
            });
        }
        res.json({ success: true, message: "Event added to the schedule!" });
    });
});

app.get("/api/schedule-events", (req, res) => {
    const query = `SELECT * FROM events ORDER BY date ASC`;

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

const PORT = 3000;
app.listen(PORT, "0.0.0.0", () => {
    console.log(`Efrei Rugby Server is running on port ${3000}`);
});

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

// Blocks non-privileged account tiers at the REST data-layer level
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
