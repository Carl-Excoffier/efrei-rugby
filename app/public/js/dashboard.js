document.addEventListener("DOMContentLoaded", () => {
    function loadDashboard() {
        // 1. FETCH USER STATS
        fetch("api/user")
            .then((res) => res.json())
            .then((data) => {
                if (data.success) {
                    document.getElementById("welcome-text").textContent =
                        `Welcome back, ${data.user.first_name}!`;
                    document.getElementById("quick-stats-tries").textContent =
                        data.user.tries || 0;
                    document.getElementById("quick-stats-review").textContent =
                        data.user.avg_review || "N/A";

                    if (
                        data.user.roster_category === "coaches" ||
                        data.user.preferred_position === "Admin"
                    ) {
                        const sideBar = document.getElementById("sidebar-list");
                        // Prevent adding duplicates if it already exists
                        if (!document.getElementById("coach-panel-link")) {
                            const listElem = document.createElement("li");
                            listElem.id = "coach-panel-link";
                            listElem.textContent = "Coach Panel";
                            listElem.onclick = () => {
                                location.href = "coach";
                            };
                            sideBar.appendChild(listElem);
                        }
                    }
                }
            });

        // 2. FETCH NEXT TRAINING
        fetch("api/next-training")
            .then((res) => res.json())
            .then((data) => {
                if (data.success) {
                    const nextTraining =
                        document.getElementById("next-training");
                    if (data.training) {
                        const date = new Date(data.training.date);
                        const dateStr = date.toLocaleDateString("en-GB", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                            hour: "numeric",
                            minute: "2-digit",
                        });
                        nextTraining.textContent = dateStr;
                    } else {
                        nextTraining.textContent = "Not Scheduled yet";
                    }
                }
            });

        // 3. FETCH LATEST PHOTOS
        fetch("api/latest-photos")
            .then((res) => res.json())
            .then((data) => {
                if (data.success && data.photos.length > 0) {
                    document.getElementById("event-title").textContent =
                        `${data.eventType}: ${data.eventName}`;

                    const gallery = document.getElementById("photo-gallery");
                    gallery.innerHTML = "";
                    gallery.className = "gallery-grid";

                    data.photos.forEach((file) => {
                        const img = document.createElement("img");
                        img.src = `photos/events/${data.folderName}/${file}`;
                        img.className = "gallery-image";
                        gallery.appendChild(img);
                    });
                }
            });

        // 4. FETCH LATEST REVIEW
        fetch("api/latest-review")
            .then((res) => res.json())
            .then((data) => {
                const reviewsContainer =
                    document.getElementById("reviews-container");
                if (data.success && data.review) {
                    reviewsContainer.innerHTML = "";
                    const reviewEl = document.createElement("div");
                    reviewEl.className = "review-card";

                    const title = document.createElement("h4");
                    title.textContent = `${data.review.event_name} (${data.review.event_type})`;

                    const ratingP = document.createElement("p");
                    ratingP.className = "rating";
                    const strongTag = document.createElement("strong");
                    strongTag.textContent = "Rating: ";
                    ratingP.append(
                        "⭐ ",
                        strongTag,
                        `${parseFloat(data.review.rating).toFixed(1)} / 5.0`,
                    );

                    const commentP = document.createElement("p");
                    commentP.className = "comment";
                    commentP.textContent = `"${data.review.comment}"`;

                    reviewEl.append(title, ratingP, commentP);
                    reviewsContainer.appendChild(reviewEl);
                } else {
                    reviewsContainer.innerHTML =
                        "<p>No coach reviews posted yet.</p>";
                }
            });

        // 5. FETCH UPCOMING MATCHES (Optional Dashboard Widget)
        fetch("api/schedule-events")
            .then((res) => res.json())
            .then((data) => {
                if (data.success) {
                    // Filter to ONLY matches
                    const matchesOnly = data.upcomingEvents.filter(
                        (e) =>
                            e.event_type &&
                            e.event_type.toLowerCase() === "match",
                    );

                    matchesOnly.forEach((match) => {
                        // Format to MM-YYYY
                        const dateObj = new Date(match.date);
                        const month = String(dateObj.getMonth() + 1).padStart(
                            2,
                            "0",
                        );
                        const year = dateObj.getFullYear();
                        const dateStr = `${month}-${year}`;

                        // You can append this data to whatever HTML element you want here!
                        // console.log(`Upcoming Match: ${match.event_name} on ${dateStr}`);
                    });
                }
            });
    }

    // RUN EVERYTHING ON LOAD
    loadDashboard();

    // LOGOUT EVENT
    document.getElementById("logout-btn").addEventListener("click", () => {
        fetch("api/logout", { method: "POST" })
            .then((res) => res.json())
            .then((data) => {
                if (data.success) window.location.href = "./";
            });
    });
});
