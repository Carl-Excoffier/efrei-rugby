document.addEventListener("DOMContentLoaded", () => {
    // 1. Fetch Profile Data & Reviews on Load
    fetch("/api/profile")
        .then((response) => response.json())
        .then((data) => {
            if (!data.success) {
                // If not logged in, kick to login page
                window.location.href = "/";
                return;
            }

            const player = data.player;

            // Populate text displays
            document.getElementById("profile-name").textContent =
                `${player.first_name} ${player.last_name}'s Profile`;
            document.getElementById("display-email").textContent =
                player.email || "N/A";
            document.getElementById("display-phone").textContent =
                player.phone || "N/A";
            document.getElementById("display-position").textContent =
                player.preferred_position || "N/A";
            document.getElementById("display-tries").textContent =
                player.tries || 0;
            document.getElementById("display-rating").textContent =
                player.avg_review || "0.0";

            // Populate form inputs
            document.getElementById("edit-email").value = player.email || "";
            document.getElementById("edit-phone").value = player.phone || "";
            document.getElementById("edit-position").value =
                player.preferred_position || "";

            // Populate Reviews
            const reviewsContainer =
                document.getElementById("reviews-container");
            if (data.reviews && data.reviews.length > 0) {
                reviewsContainer.innerHTML = ""; // Clear loading text

                data.reviews.forEach((review) => {
                    const reviewEl = document.createElement("div");
                    reviewEl.style.cssText =
                        "border-left: 4px solid #0d4a22; padding-left: 15px; margin-bottom: 20px; background: #f9f9f9; padding: 15px;";

                    reviewEl.innerHTML = `
                        <h4 style="margin: 0 0 5px 0; color: #0d4a22;">Match: ${review.event_name}</h4>
                        <p style="margin: 0 0 10px 0; font-size: 0.9em; color: #555;"><strong>Rating:</strong> ${review.rating} / 5.0</p>
                        <p style="margin: 0; font-style: italic;">"${review.comment}"</p>
                    `;
                    reviewsContainer.appendChild(reviewEl);
                });
            } else {
                reviewsContainer.innerHTML = "<p>No reviews posted yet.</p>";
            }
        })
        .catch((err) => console.error("Error fetching profile:", err));

    // 2. Handle Profile Edit Form Submission
    const editForm = document.getElementById("edit-profile-form");
    editForm.addEventListener("submit", (e) => {
        e.preventDefault();

        const messageEl = document.getElementById("update-message");
        messageEl.textContent = "Saving...";
        messageEl.style.color = "black";

        // Gather data
        const updateData = {
            email: document.getElementById("edit-email").value,
            phone: document.getElementById("edit-phone").value,
            position: document.getElementById("edit-position").value,
            password: document.getElementById("edit-password").value, // Handled by backend (if blank, don't update)
        };

        // Send to backend
        fetch("/api/profile/update", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(updateData),
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.success) {
                    messageEl.textContent = "Profile updated successfully!";
                    messageEl.style.color = "green";
                    // Optionally clear password field
                    document.getElementById("edit-password").value = "";

                    // Update text displays immediately without refreshing
                    document.getElementById("display-email").textContent =
                        updateData.email;
                    document.getElementById("display-phone").textContent =
                        updateData.phone;
                    document.getElementById("display-position").textContent =
                        updateData.position;
                } else {
                    messageEl.textContent =
                        data.message || "Error updating profile.";
                    messageEl.style.color = "red";
                }
            })
            .catch((err) => {
                console.error(err);
                messageEl.textContent = "Network error. Try again.";
                messageEl.style.color = "red";
            });
    });

    // 3. Handle Logout
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            fetch("/api/logout", { method: "POST" })
                .then(() => (window.location.href = "/"))
                .catch((err) => console.error("Error logging out", err));
        });
    }
});
