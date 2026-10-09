document.addEventListener("DOMContentLoaded", function () {
    // Theme Switcher
    const themeToggleBtn = document.getElementById("themeToggleBtn");
    const sunIcon = document.getElementById("sunIcon");
    const moonIcon = document.getElementById("moonIcon");

    const savedTheme = localStorage.getItem("citywatch-theme");
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: light)").matches;
    let currentTheme = savedTheme || (systemPrefersDark ? "light" : "dark");

    function applyTheme(theme) {
        document.documentElement.setAttribute("data-theme", theme);
        document.body.classList.toggle("dark-mode", theme === "dark");
        localStorage.setItem("citywatch-theme", theme);

        if (sunIcon && moonIcon) {
            sunIcon.style.display = theme === "dark" ? "block" : "none";
            moonIcon.style.display = theme === "dark" ? "none" : "block";
        }
    }

    applyTheme(currentTheme);

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener("click", function () {
            currentTheme = currentTheme === "light" ? "dark" : "light";
            applyTheme(currentTheme);
        });
    }

    // Side Drawer Modal Elements
    const detailDrawer = document.getElementById("detailDrawer");
    const drawerBackdrop = document.getElementById("drawerBackdrop");
    const closeDrawerBtn = document.getElementById("closeDrawerBtn");
    const closeDrawerFooterBtn = document.getElementById("closeDrawerFooterBtn");

    // Drawer Content Elements
    const drawerTitle = document.getElementById("drawerTitle");
    const drawerCategory = document.getElementById("drawerCategory");
    const drawerLocation = document.getElementById("drawerLocation");
    const drawerDescription = document.getElementById("drawerDescription");
    const drawerSubmittedDate = document.getElementById("drawerSubmittedDate");

    function openDrawer(cardData) {
        drawerTitle.textContent = cardData.title;
        drawerCategory.textContent = cardData.category;
        drawerLocation.textContent = cardData.location;
        drawerDescription.textContent = cardData.description;
        drawerSubmittedDate.textContent = cardData.date;

        // Timeline Step Highlighting (1 to 4)
        const activeStep = parseInt(cardData.step, 10) || 1;
        for (let i = 1; i <= 4; i++) {
            const stepEl = document.getElementById(`timeStep${i}`);
            if (stepEl) {
                stepEl.classList.remove("active", "completed");
                if (i < activeStep) {
                    stepEl.classList.add("completed");
                } else if (i === activeStep) {
                    stepEl.classList.add("active");
                }
            }
        }

        detailDrawer.classList.add("open");
        drawerBackdrop.classList.add("active");
        detailDrawer.setAttribute("aria-hidden", "false");
    }

    function closeDrawer() {
        detailDrawer.classList.remove("open");
        drawerBackdrop.classList.remove("active");
        detailDrawer.setAttribute("aria-hidden", "true");
    }

    // Attach Click Handler to Issue Cards
    document.querySelectorAll(".clickable-card").forEach((card) => {
        card.addEventListener("click", function () {
            const cardData = {
                id: this.dataset.id,
                title: this.dataset.title,
                category: this.dataset.category,
                date: this.dataset.date,
                statusText: this.dataset.statusText,
                step: this.dataset.step,
                location: this.dataset.location,
                description: this.dataset.description,
            };
            openDrawer(cardData);
        });
    });

    if (closeDrawerBtn) closeDrawerBtn.addEventListener("click", closeDrawer);
    if (closeDrawerFooterBtn) closeDrawerFooterBtn.addEventListener("click", closeDrawer);
    if (drawerBackdrop) drawerBackdrop.addEventListener("click", closeDrawer);

    // Client-Side Status Filter
    const statusFilter = document.getElementById("statusFilter");
    if (statusFilter) {
        statusFilter.addEventListener("change", function () {
            const filterValue = this.value;
            document.querySelectorAll(".issue-item").forEach((item) => {
                const itemStatus = item.getAttribute("data-status");
                if (filterValue === "all" || itemStatus === filterValue) {
                    item.style.display = "flex";
                } else {
                    item.style.display = "none";
                }
            });
        });
    }
});