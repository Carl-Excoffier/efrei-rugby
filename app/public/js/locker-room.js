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

const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightbox-img");
let currentImages = [];
let currentIndex = 0;

fetch("api/gallery")
    .then((res) => res.json())
    .then((data) => {
        const container = document.getElementById("photo-gallery");
        container.innerHTML = "";

        if (data.success && data.events.length > 0) {
            data.events.forEach((event) => {
                const eventSection = document.createElement("div");
                eventSection.className = "card";

                const title = document.createElement("h2");
                title.className = "section-title";
                const date = new Date(event.date);
                const dateStr = date.toLocaleDateString("en-GB", {
                    month: "short",
                    year: "numeric",
                });
                title.textContent = `${event.eventType}: ${event.eventName} - ${dateStr}`;

                const photoGrid = document.createElement("div");
                photoGrid.className = "gallery-grid";
                Object.assign(photoGrid.style, {
                    display: "grid",
                    gridTemplateColumns:
                        "repeat(auto-fill, minmax(200px, 1fr))",
                    gap: "15px",
                    marginTop: "15px",
                });

                event.photos.forEach((file) => {
                    const img = document.createElement("img");
                    img.src = `photos/events/${event.folderName}/${file}`;
                    img.className = "gallery-image";
                    Object.assign(img.style, {
                        width: "100%",
                        height: "200px",
                        objectFit: "cover",
                        borderRadius: "6px",
                    });
                    photoGrid.appendChild(img);
                });

                eventSection.append(title, photoGrid);
                container.appendChild(eventSection);
            });
        }
    });

function updateLightbox() {
    lightboxImg.src = currentImages[currentIndex].src;
}
function showNext(e) {
    if (e) e.stopPropagation();
    currentIndex = (currentIndex + 1) % currentImages.length;
    updateLightbox();
}
function showPrev(e) {
    if (e) e.stopPropagation();
    currentIndex =
        (currentIndex - 1 + currentImages.length) % currentImages.length;
    updateLightbox();
}

document.addEventListener("click", (e) => {
    const clickedImg = e.target.closest(".gallery-image");
    if (clickedImg) {
        currentImages = Array.from(
            clickedImg
                .closest(".gallery-grid, #photo-gallery")
                .querySelectorAll(".gallery-image"),
        );
        currentIndex = currentImages.indexOf(clickedImg);
        updateLightbox();
        lightbox.style.display = "flex";
    }
});

document.getElementById("next-btn").onclick = showNext;
document.getElementById("prev-btn").onclick = showPrev;
document.getElementById("close-lightbox").onclick = () =>
    (lightbox.style.display = "none");
lightbox.onclick = () => {
    lightbox.style.display = "none";
    lightboxImg.src = "";
};

document.addEventListener("keydown", (e) => {
    if (lightbox.style.display === "flex") {
        if (e.key === "ArrowRight") showNext();
        if (e.key === "ArrowLeft") showPrev();
        if (e.key === "Escape") lightbox.onclick();
    }
});

const logoutBtn = document.getElementById("logout-btn");
if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
        fetch("api/logout", { method: "POST" })
            .then((res) => res.json())
            .then((data) => {
                if (data.success) window.location.href = "./";
            });
    });
}
