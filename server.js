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
    ];

    if (protectedPaths.includes(req.path)) {
        if (req.session && req.session.loggedIn) {
            next();
        } else {
            res.redirect("/app/");
        }
    } else {
        next();
    }
});

// 4. SERVE STATIC FILES (Only accessible if the Bouncer let them pass)
app.use(express.static(path.join(__dirname, "public")));

// Root route
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "login.html"));
});

// Dashboard route (Secondary safety catch)
app.get("/dashboard", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

app.get("/locker-room", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "locker-room.html"));
});
// 5. THE LOGIN DOORWAY (With our Nginx array fix)
app.post(["/api/login", "/app/api/login"], (req, res) => {
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
app.post(["/api/logout", "/app/api/logout"], (req, res) => {
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

// 7. THE USER INFO ENDPOINT
app.get(["/api/user", "/app/api/user"], (req, res) => {
    // Check if the user is actually logged in
    if (req.session && req.session.loggedIn) {
        // Send back just the parts of the user data the frontend needs
        res.json({
            success: true,
            firstName: req.session.user.first_name,
            lastName: req.session.user.last_name,
            tries: req.session.user.tries,
            avgReview: req.session.user.avg_review,
        });
    } else {
        res.status(401).json({ success: false, message: "Not logged in" });
    }
});

// 8. ADD RECENT PHOTOS
app.get(["/api/latest-photos", "/app/api/latest-photos"], (req, res) => {
    // 1. Find the latest event in the DB
    const query =
        "SELECT event_name, folder_name, event_type FROM events ORDER BY event_date DESC LIMIT 1";

    db.query(query, (err, results) => {
        if (err || results.length === 0) {
            return res.json({ success: false, message: "No events found." });
        }

        const event = results[0];

        // 2. Build the exact physical path to that folder on the hard drive
        const folderPath = path.join(
            __dirname,
            "public",
            "photos",
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

// 9. THE FULL LOCKER ROOM GALLERY
app.get(["/api/gallery", "/app/api/gallery"], (req, res) => {
    // Grab ALL events, ordered by newest first
    const query =
        "SELECT event_name, folder_name, event_type FROM events ORDER BY event_date DESC";

    db.query(query, (err, results) => {
        if (err)
            return res.json({ success: false, message: "Database error." });

        const galleryData = [];

        // We use a synchronous loop here so we can pack the box neatly before sending it
        for (let event of results) {
            const folderPath = path.join(
                __dirname,
                "public",
                "photos",
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

// 10. START THE SERVER
const PORT = 3000;
app.listen(PORT, "0.0.0.0", () => {
    console.log(`Efrei Rugby Server is running on port ${3000}`);
});

// A. GET FULL PROFILE & REVIEWS
app.get(["/api/profile", "/app/api/profile"], (req, res) => {
    if (!req.session || !req.session.loggedIn) {
        return res
            .status(401)
            .json({ success: false, message: "Not logged in" });
    }

    const userId = req.session.user.id;

    // Query 1: Get the player's full details
    const playerQuery = "SELECT * FROM players WHERE id = ?";

    // Query 2: JOIN reviews with events to get the event name and date
    const reviewsQuery = `
        SELECT r.rating, r.comment, e.event_name, e.event_type
        FROM reviews r
        LEFT JOIN events e ON r.event_id = e.id
        WHERE r.player_id = ?
    `;

    db.query(playerQuery, [userId], (err, playerResults) => {
        if (err || playerResults.length === 0)
            return res.json({ success: false, message: "Player not found." });

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
                player: playerResults[0],
                reviews: reviewResults,
            });
        });
    });
});

// A. GET FULL PROFILE & REVIEWS
app.get(["/api/profile", "/app/api/profile"], (req, res) => {
    // 1. Check if the user is logged in
    if (!req.session || !req.session.loggedIn) {
        return res
            .status(401)
            .json({ success: false, message: "Not logged in" });
    }

    const userId = req.session.user.id;

    // 2. Query 1: Get the player's full details
    const playerQuery = "SELECT * FROM players WHERE id = ?";

    // 3. Query 2: Get their reviews, linking to the events table to get the match name
    // (Assuming your events table primary key is 'id'. If it's 'event_id', change e.id to e.event_id)
    const reviewsQuery = `
        SELECT r.rating, r.comment, e.event_name, e.event_type
        FROM reviews r
        LEFT JOIN events e ON r.event_id = e.id
        WHERE r.player_id = ?
        ORDER BY r.id DESC
    `;

    // Execute the first query (Player Info)
    db.query(playerQuery, [userId], (err, playerResults) => {
        if (err || playerResults.length === 0) {
            console.error("Error fetching player:", err);
            return res.json({ success: false, message: "Player not found." });
        }

        // Execute the second query (Reviews)
        db.query(reviewsQuery, [userId], (err, reviewResults) => {
            if (err) {
                console.error("Review fetch error:", err);
                return res.json({
                    success: false,
                    message: "Error fetching reviews.",
                });
            }

            // Package both results together and send them to the frontend
            res.json({
                success: true,
                player: playerResults[0],
                reviews: reviewResults,
            });
        });
    });
});
