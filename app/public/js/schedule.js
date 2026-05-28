document.addEventListener("DOMContentLoaded", () => {
    const modal = document.getElementById("rsvp-modal");
    const modalTitle = document.getElementById("modal-title");
    const modalDetails = document.getElementById("modal-details");
    const btnAttend = document.getElementById("btn-attend");
    const btnDecline = document.getElementById("btn-decline");
    const listContainer = document.getElementById("upcoming-events-list");
    const monthYearDisplay = document.getElementById("month-year-display");
    const grid = document.getElementById("calendar-grid");

    let upcomingEvents = [];
    let allEvents = [];
    let currentDate = new Date();
    let today = new Date();

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

    // --- 1. FETCH EVENTS FROM MYSQL ---
    fetch("api/schedule-events")
        .then((res) => res.json())
        .then((data) => {
            if (data.success) {
                upcomingEvents = data.upcomingEvents.map((e) => ({
                    ...e,
                    date: new Date(e.date),
                }));
                allEvents = data.allEvents.map((e) => ({
                    ...e,
                    date: new Date(e.date),
                }));
                today = new Date(data.today);
                currentDate = new Date(data.today);
                // Send the split data to their respective rendering functions
                renderUpcomingList(upcomingEvents);
                renderCalendar();
            } else {
                listContainer.textContent = "Failed to load schedule.";
            }
        });

    function renderUpcomingList(upcoming) {
        listContainer.innerHTML = "";

        if (upcoming.length === 0) {
            listContainer.textContent = "No upcoming events. Rest up!";
            return;
        }

        upcoming.forEach((event) => {
            const dateStr = event.date.toLocaleDateString("en-GB", {
                weekday: "short",
                day: "numeric",
                month: "short",
                hour: "numeric",
                minute: "2-digit",
            });

            const card = document.createElement("div");
            card.className = `event-card ${(event.event_type || "").toLowerCase()}`;
            card.classList.add(`${event.event_type || ""}`.toLowerCase());

            const titleH4 = document.createElement("h4");
            titleH4.textContent = event.event_name;

            const detailsP = document.createElement("p");
            detailsP.textContent = `📅 ${dateStr}`;

            card.append(titleH4, detailsP);
            card.addEventListener("click", () => openModal(event));
            listContainer.appendChild(card);
        });
    }

    // --- 3. RENDER THE CALENDAR (Right Column - All Events) ---
    function renderCalendar() {
        grid.innerHTML = "";
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        monthYearDisplay.textContent = currentDate.toLocaleDateString("en-GB", {
            month: "long",
            year: "numeric",
        });

        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const emptyBoxes = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
        // Empty cells for the start of the month
        for (let i = 0; i < emptyBoxes; i++) {
            const emptyCell = document.createElement("div");
            emptyCell.className = "calendar-cell empty";
            grid.appendChild(emptyCell);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const cell = document.createElement("div");
            cell.className = "calendar-cell";
            cell.textContent = day;

            // Highlight current day
            if (
                day === today.getDate() &&
                month === today.getMonth() &&
                year === today.getFullYear()
            ) {
                cell.classList.add("today");
            }

            // Find ALL events that land on this calendar square
            const eventsToday = allEvents.filter(
                (e) =>
                    e.date.getDate() === day &&
                    e.date.getMonth() === month &&
                    e.date.getFullYear() === year,
            );

            eventsToday.forEach((e) => {
                const badge = document.createElement("span");
                // Assign a CSS class based on the type (match, practice, etc.)
                badge.className = `event-badge ${(e.event_type || "").toLowerCase()}`;
                badge.textContent = e.event_name;
                badge.addEventListener("click", () => openModal(e));
                cell.appendChild(badge);
            });

            grid.appendChild(cell);
        }
    }

    // Calendar Navigation Buttons
    document.getElementById("prev-month").addEventListener("click", () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });

    document.getElementById("next-month").addEventListener("click", () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });

    // --- 4. MODAL LOGIC ---
    function openModal(eventObj) {
        currentSelectedEventId = eventObj.id;
        const dateStr = eventObj.date.toLocaleDateString("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long",
            hour: "numeric",
            minute: "2-digit",
        });

        modalTitle.textContent = eventObj.event_name;
        modalTitle.classList.add(`${eventObj.event_type || ""}`.toLowerCase());
        modalDetails.textContent = `📅 ${dateStr}`;
        modal.style.display = "flex";
    }

    function closeModal() {
        modal.style.display = "none";
        currentSelectedEventId = null;
    }

    document
        .getElementById("close-modal")
        .addEventListener("click", closeModal);
    window.addEventListener("click", (e) => {
        if (e.target === modal) closeModal();
    });

    // Handle RSVP Clicks
    btnAttend.addEventListener("click", () => {
        alert(
            "Awesome! You marked YES for event ID: " + currentSelectedEventId,
        );
        closeModal();
    });

    btnDecline.addEventListener("click", () => {
        alert("Bummer! You marked NO for event ID: " + currentSelectedEventId);
        closeModal();
    });

    // --- 5. LOGOUT LOGIC ---
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
});
