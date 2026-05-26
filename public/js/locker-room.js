const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightbox-img");
let currentImages = [];
let currentIndex = 0;

fetch("/app/api/gallery")
    .then((res) => res.json())
    .then((data) => {
        const container = document.getElementById("photo-gallery");
        container.innerHTML = "";

        if (data.success && data.events.length > 0) {
            data.events.forEach((event) => {
                const eventSection = document.createElement("div");
                eventSection.className = "card";
                eventSection.style.marginBottom = "30px";

                const title = document.createElement("h2");
                title.textContent = `${event.eventType}: ${event.eventName}`;
                title.style.borderBottom = "2px solid #105b3f";

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
                    img.src = `photos/${event.folderName}/${file}`;
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
