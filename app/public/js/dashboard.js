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
                    const date = new Date(data.event.date);
                    const dateStr = date.toLocaleDateString("en-GB", {
                        month: "short",
                        year: "numeric",
                    });
                    document.getElementById("event-title").textContent =
                        `${data.event.event_type}: ${data.event.event_name} - ${dateStr}`;

                    const gallery = document.getElementById("photo-gallery");
                    gallery.innerHTML = "";
                    gallery.className = "gallery-grid";

                    data.photos.forEach((file) => {
                        const img = document.createElement("img");
                        img.src = `photos/events/${data.event.folder_name}/${file}`;
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
                    const date = new Date(data.review.date);
                    const dateStr = date.toLocaleDateString("en-GB", {
                        month: "short",
                        year: "numeric",
                    });
                    title.textContent = `${data.review.event_name} - ${dateStr} (${data.review.event_type})`;

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
