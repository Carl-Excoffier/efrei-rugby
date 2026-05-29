// Global memory store for client-side state filtration tracking
let currentSelectedPlayerId = null;
let realPlayers = [];

const playerListContainer = document.getElementById("player-list");
const searchInput = document.getElementById("player-search");
const actionPanel = document.getElementById("action-panel");
const emptyState = document.getElementById("empty-state");

const modalAddPlayer = document.getElementById("modal-add-player");
const modalAddEvent = document.getElementById("modal-add-event");

document
    .getElementById("btn-open-add-player")
    .addEventListener("click", () => (modalAddPlayer.style.display = "flex"));
document
    .getElementById("btn-open-add-event")
    .addEventListener("click", () => (modalAddEvent.style.display = "flex"));
document
    .getElementById("close-add-player")
    .addEventListener("click", () => (modalAddPlayer.style.display = "none"));
document
    .getElementById("close-add-event")
    .addEventListener("click", () => (modalAddEvent.style.display = "none"));

// Checks if the click target is the modal container element itself rather than its content box children
window.addEventListener("click", (e) => {
    if (e.target === modalAddPlayer) modalAddPlayer.style.display = "none";
    if (e.target === modalAddEvent) modalAddEvent.style.display = "none";
});

function renderList(playersArray) {
    playerListContainer.innerHTML = "";

    playersArray.forEach((player) => {
        const formattedFirstName = player.first_name.toLowerCase().trim();
        const formattedLastName = player.last_name.toLowerCase().trim();
        const photoName = `${formattedFirstName}_${formattedLastName}.jpg`;

        const item = document.createElement("div");
        item.className = "player-list-item";
        if (player.id === currentSelectedPlayerId) item.classList.add("active");

        const img = document.createElement("img");
        img.className = "list-img";
        img.src = `photos/profiles/${photoName}`;

        // Sets handler reference to null immediately to break infinite loops if fallback image file breaks/fails
        img.onerror = function () {
            this.onerror = null;
            this.src = "photos/profiles/billy.jpg";
        };

        const textContainer = document.createElement("div");
        const nameP = document.createElement("p");
        nameP.className = "list-name";
        nameP.textContent = `${player.first_name} ${player.last_name}`;

        const posP = document.createElement("p");
        posP.className = "list-pos";
        posP.textContent = player.roster_category || "Unassigned";

        textContainer.append(nameP, posP);
        item.append(img, textContainer);

        item.addEventListener("click", () => {
            currentSelectedPlayerId = player.id;
            renderList(playersArray);
            openPlayerDashboard(player, photoName);
        });

        playerListContainer.appendChild(item);
    });
}

const reviewEventSelect = document.getElementById("review-event-id");

fetch("api/schedule-events")
    .then((res) => res.json())
    .then((data) => {
        if (data.success) {
            reviewEventSelect.innerHTML =
                '<option value="">-- Select a Match --</option>';

            const matchesOnly = data.allEvents.filter(
                (e) => e.event_type && e.event_type.toLowerCase() === "match",
            );

            // Employs spread operator cloning to reverse array display layout order without mutating original state source
            const reversedEvents = [...matchesOnly].reverse();

            reversedEvents.forEach((event) => {
                const dateObj = new Date(event.date);
                const month = String(dateObj.getMonth() + 1).padStart(2, "0");
                const year = dateObj.getFullYear();
                const dateStr = `${month}-${year}`;

                const option = document.createElement("option");
                option.value = event.id;
                option.textContent = `${dateStr} - ${event.event_name}`;
                reviewEventSelect.appendChild(option);
            });
        }
    });

function openPlayerDashboard(player, photoName) {
    emptyState.style.display = "none";
    actionPanel.style.display = "block";

    const img = document.getElementById("selected-player-img");
    img.src = `photos/profiles/${photoName}`;
    img.onerror = function () {
        this.onerror = null;
        this.src = "photos/profiles/billy.jpg";
    };

    document.getElementById("selected-player-name").textContent =
        `${player.first_name} ${player.last_name}`;
    document.getElementById("selected-player-pos").textContent =
        player.roster_category || "Unassigned";
    document.getElementById("edit-position").value =
        player.preferred_position || "Unassigned";

    document.getElementById("coach-review-form").reset();
    document.getElementById("edit-tries").value = player.tries || 0;
    document.getElementById("edit-yellow").value = player.yellow_cards || 0;
    document.getElementById("edit-red").value = player.red_cards || 0;
}

fetch("api/coach/players")
    .then((res) => res.json())
    .then((data) => {
        if (data.success) {
            realPlayers = data.players;
            renderList(realPlayers);
        }
    });

searchInput.addEventListener("input", (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = realPlayers.filter((p) => {
        const fullName = `${p.first_name} ${p.last_name}`.toLowerCase();
        return fullName.includes(term);
    });
    renderList(filtered);
});

document.getElementById("coach-edit-form").addEventListener("submit", (e) => {
    e.preventDefault();

    fetch("api/coach/update-player-full", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            playerId: currentSelectedPlayerId,
            position: document.getElementById("edit-position").value,
            tries: document.getElementById("edit-tries").value,
            yellow: document.getElementById("edit-yellow").value,
            red: document.getElementById("edit-red").value,
        }),
    })
        .then((res) => res.json())
        .then((data) => {
            alert(data.message);
            location.reload();
        });
});

document.getElementById("coach-review-form").addEventListener("submit", (e) => {
    e.preventDefault();
    fetch("api/coach/add-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            playerId: currentSelectedPlayerId,
            eventId: document.getElementById("review-event-id").value,
            rating: document.getElementById("review-rating").value,
            comment: document.getElementById("review-comment").value,
        }),
    })
        .then((res) => res.json())
        .then((data) => {
            alert(data.message);
            document.getElementById("coach-review-form").reset();
        });
});

document.getElementById("add-player-form").addEventListener("submit", (e) => {
    e.preventDefault();
    fetch("api/coach/add-player", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            firstName: document.getElementById("new-player-first").value,
            lastName: document.getElementById("new-player-last").value,
            email: document.getElementById("new-player-email").value,
            password: document.getElementById("new-player-password").value,
        }),
    })
        .then((res) => res.json())
        .then((data) => {
            alert(data.message);
            document.getElementById("new-player-first").value = "";
            document.getElementById("new-player-last").value = "";
            document.getElementById("new-player-email").value = "";
            document.getElementById("modal-add-player").style.display = "none";
            location.reload();
        });
});

document.getElementById("remove-player").addEventListener("click", (e) => {
    e.preventDefault();
    fetch("api/coach/remove-player", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            id: currentSelectedPlayerId,
        }),
    })
        .then((res) => res.json())
        .then((data) => {
            alert(data.message);
            currentSelectedPlayerId = null;
            emptyState.style.display = "block";
            actionPanel.style.display = "none";
            location.reload();
        });
});

document.getElementById("add-event-form").addEventListener("submit", (e) => {
    e.preventDefault();
    fetch("api/coach/add-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            eventName: document.getElementById("new-event-name").value,
            eventType: document.getElementById("new-event-type").value,
            eventDate: document.getElementById("new-event-date").value,
            eventTime: document.getElementById("new-event-time").value,
        }),
    })
        .then((res) => res.json())
        .then((data) => {
            alert(data.message);
            location.reload();
        });
});

const logoutBtn = document.getElementById("logout-btn");
if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
        fetch("api/logout", { method: "POST" }).then(
            () => (window.location.href = "./"),
        );
    });
}
