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
                to;
            }
        }
    });

// 1. FETCH AND POPULATE PROFILE DATA
fetch("api/profile")
    .then((res) => res.json())
    .then((data) => {
        const player = data.player;

        // --- Profile Photo ---
        const formattedFirstName = player.first_name.toLowerCase().trim();
        const formattedLastName = player.last_name.toLowerCase().trim();
        const expectedPhotoName = `${formattedFirstName}_${formattedLastName}.jpg`;

        const profileImg = document.getElementById("profile-img");
        profileImg.src = `photos/profiles/${expectedPhotoName}`;

        // Fallback if image doesn't exist
        profileImg.onerror = function () {
            this.onerror = null;
            this.src = "photos/profiles/billy.jpg";
        };

        // --- Details Card ---
        document.getElementById("profile-name").textContent =
            `${player.first_name} ${player.last_name}`;
        document.getElementById("display-email").textContent =
            player.email || "N/A";
        document.getElementById("display-phone").textContent =
            player.phone || "N/A";
        document.getElementById("display-position").textContent =
            player.preferred_position || "N/A";

        // --- Stats Card ---
        document.getElementById("display-tries").textContent =
            player.tries || 0;
        document.getElementById("display-rating").textContent =
            player.avg_review ? `${player.avg_review}` : "0.0";

        // NEW: Populate the Yellow and Red cards from the database
        document.getElementById("display-yellow").textContent =
            player.yellow_cards || 0;
        document.getElementById("display-red").textContent =
            player.red_cards || 0;

        // --- Pre-fill Edit Modal Form ---
        const editEmailInput = document.getElementById("edit-email");
        if (editEmailInput) editEmailInput.value = player.email || "";

        const editPhoneInput = document.getElementById("edit-phone");
        if (editPhoneInput) editPhoneInput.value = player.phone || "";

        const editPositionInput = document.getElementById("edit-position");
        if (editPositionInput)
            editPositionInput.value = player.preferred_position || "";

        // --- Coach Reviews ---
        const reviewsContainer = document.getElementById("reviews-container");

        if (data.reviews && data.reviews.length > 0) {
            reviewsContainer.innerHTML = "";

            data.reviews.forEach((review) => {
                const reviewEl = document.createElement("div");
                reviewEl.className = "review-card";

                // 1. Create the Title (H4)
                const title = document.createElement("h4");
                title.textContent = `${review.event_name} (${review.event_type})`;

                // 2. Create the Rating (P) with a bold <strong> tag inside it
                const ratingP = document.createElement("p");
                ratingP.className = "rating";
                const strongTag = document.createElement("strong");
                strongTag.textContent = "Rating: ";
                // .append() lets you mix raw text and HTML elements together perfectly!
                ratingP.append(
                    "⭐ ",
                    strongTag,
                    `${parseFloat(review.rating).toFixed(1)} / 5.0`,
                );

                // 3. Create the Comment (P)
                const commentP = document.createElement("p");
                commentP.className = "comment";
                commentP.textContent = `"${review.comment}"`;

                // 4. Attach them all to the main card
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

// 2. MODAL LOGIC (Opening and Closing the Edit Form)
const modal = document.getElementById("edit-modal");
const openModalBtn = document.getElementById("open-edit-modal");
const closeModalBtn = document.getElementById("close-modal");

// Open modal
openModalBtn.addEventListener("click", () => {
    modal.style.display = "flex";
});

// Close modal with X button
closeModalBtn.addEventListener("click", () => {
    modal.style.display = "none";
});

// Close modal by clicking outside the box
window.addEventListener("click", (e) => {
    if (e.target === modal) {
        modal.style.display = "none";
    }
});

// 3. HANDLE LOGOUT
document.getElementById("logout-btn").addEventListener("click", () => {
    fetch("api/logout", { method: "POST" })
        .then((res) => res.json())
        .then((data) => {
            if (data.success) window.location.href = "./";
        });
});
