fetch("api/user")
    .then((res) => res.json())
    .then((data) => {
        if (data.success) {
            if (
                data.user.roster_category === "coaches" ||
                data.user.preferred_position === "Admin"
            ) {
                const sideBar = document.getElementById("sidebar-list");
                const listElem = document.createElement("li");
                listElem.textContent = "Coach Panel";
                listElem.onclick = () => {
                    location.href = "coach";
                };
                sideBar.appendChild(listElem);
            }
        }
    });

fetch("api/profile")
    .then((res) => res.json())
    .then((data) => {
        const player = data.player;

        const formattedFirstName = player.first_name.toLowerCase().trim();
        const formattedLastName = player.last_name.toLowerCase().trim();
        const expectedPhotoName = `${formattedFirstName}_${formattedLastName}.jpg`;

        const profileImg = document.getElementById("profile-img");
        profileImg.src = `photos/profiles/${expectedPhotoName}`;

        // Explicit null assignment breaks recursive error loops if fallback asset itself is missing
        profileImg.onerror = function () {
            this.onerror = null;
            this.src = "photos/profiles/billy.jpg";
        };

        document.getElementById("profile-name").textContent =
            `${player.first_name} ${player.last_name}`;
        document.getElementById("display-email").textContent =
            player.email || "N/A";
        document.getElementById("display-phone").textContent =
            player.phone || "N/A";
        document.getElementById("display-position").textContent =
            player.preferred_position || "N/A";

        document.getElementById("display-tries").textContent =
            player.tries || 0;
        document.getElementById("display-rating").textContent =
            player.avg_review ? `${player.avg_review}` : "0.0";
        document.getElementById("display-yellow").textContent =
            player.yellow_cards || 0;
        document.getElementById("display-red").textContent =
            player.red_cards || 0;

        const editEmailInput = document.getElementById("edit-email");
        if (editEmailInput) editEmailInput.value = player.email || "";

        const editPhoneInput = document.getElementById("edit-phone");
        if (editPhoneInput) editPhoneInput.value = player.phone || "";

        const editPositionInput = document.getElementById("edit-position");
        if (editPositionInput)
            editPositionInput.value = player.preferred_position || "";

        const reviewsContainer = document.getElementById("reviews-container");

        if (data.reviews && data.reviews.length > 0) {
            reviewsContainer.innerHTML = "";

            data.reviews.forEach((review) => {
                const reviewEl = document.createElement("div");
                reviewEl.className = "review-card";

                const title = document.createElement("h4");
                title.textContent = `${review.event_name} (${review.event_type})`;

                const ratingP = document.createElement("p");
                ratingP.className = "rating";
                const strongTag = document.createElement("strong");
                strongTag.textContent = "Rating: ";

                // .append() cleanly interpolates structural elements alongside plain text nodes
                ratingP.append(
                    "⭐ ",
                    strongTag,
                    `${parseFloat(review.rating).toFixed(1)} / 5.0`,
                );

                const commentP = document.createElement("p");
                commentP.className = "comment";
                commentP.textContent = `"${review.comment}"`;

                reviewEl.append(title, ratingP, commentP);
                reviewsContainer.appendChild(reviewEl);
            });
        } else {
            reviewsContainer.innerHTML = "<p>No coach reviews posted yet.</p>";
        }
    })
    .catch((err) => {
        console.error("Error fetching profile:", err);
        document.getElementById("profile-name").textContent =
            "Error loading profile data.";
    });

const modal = document.getElementById("edit-modal");
const openModalBtn = document.getElementById("open-edit-modal");
const closeModalBtn = document.getElementById("close-modal");

openModalBtn.addEventListener("click", () => {
    modal.style.display = "flex";
});
closeModalBtn.addEventListener("click", () => {
    modal.style.display = "none";
});

window.addEventListener("click", (e) => {
    if (e.target === modal) {
        modal.style.display = "none";
    }
});

document.getElementById("logout-btn").addEventListener("click", () => {
    fetch("api/logout", { method: "POST" })
        .then((res) => res.json())
        .then((data) => {
            if (data.success) window.location.href = "./";
        });
});
