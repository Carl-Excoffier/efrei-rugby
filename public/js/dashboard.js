fetch("/app/api/user")
    .then((res) => res.json())
    .then((data) => {
        if (data.success) {
            document.getElementById("welcome-text").textContent =
                `Welcome back, ${data.firstName}!`;
            document.getElementById("quick-stats-tries").textContent =
                data.tries;
            document.getElementById("quick-stats-review").textContent =
                data.avgReview;
        }
    });

document.getElementById("logout-btn").addEventListener("click", () => {
    fetch("/app/api/logout", { method: "POST" })
        .then((res) => res.json())
        .then((data) => {
            if (data.success) window.location.href = "/app/";
        });
});

fetch("/app/api/latest-photos")
    .then((res) => res.json())
    .then((data) => {
        if (data.success && data.photos.length > 0) {
            document.getElementById("event-title").textContent =
                `${data.eventType}: ${data.eventName}`;

            const gallery = document.getElementById("photo-gallery");
            gallery.innerHTML = "";
            gallery.className = "gallery-grid"; // Force the grid class

            data.photos.forEach((file) => {
                const img = document.createElement("img");
                img.src = `photos/${data.folderName}/${file}`;
                img.className = "gallery-image"; // Apply the class we styled in CSS
                gallery.appendChild(img);
            });
        }
    });
