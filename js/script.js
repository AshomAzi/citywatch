document.addEventListener("DOMContentLoaded", function () {
  // ==========================================
  // 1. UI ELEMENTS SELECTION
  // ==========================================
  const statusTabs = document.querySelectorAll(".status-tab");
  const categoryFilter = document.getElementById("categoryFilter");
  const sortFilter = document.getElementById("sortFilter");
  const searchInput = document.getElementById("searchInput");
  const mobileSearchInput = document.getElementById("mobileSearchInput");
  const issuesContainer = document.getElementById("issuesContainer");
  const issueCards = Array.from(document.querySelectorAll(".issue-card"));
  const issuesCountEl = document.getElementById("issuesCount");
  const noResultsEl = document.getElementById("noResults");

  // Modal elements
  const reportModal = document.getElementById("reportModal");
  const openReportModalBtn = document.getElementById("openReportModalBtn");
  const closeReportModalBtn = document.getElementById("closeReportModalBtn");
  const cancelReportModalBtn = document.getElementById("cancelReportModalBtn");
  const issueUploadForm = document.getElementById("issueUploadForm");

  // ==========================================
  // 2. STATE MANAGEMENT
  // ==========================================
  let currentStatus = "all";
  let currentCategory = "all";
  let currentSearchQuery = "";
  let currentSortOrder = "recent";

  // ==========================================
  // 3. CORE FILTER & SORT ENGINE
  // ==========================================
  function filterAndSortIssues() {
    let visibleCount = 0;

    // Step 1: Filter loop
    issueCards.forEach((card) => {
      const cardStatus = (card.getAttribute("data-status") || "").toLowerCase().trim();
      const cardCategory = (card.getAttribute("data-category") || "").toLowerCase().trim();
      const cardText = card.textContent.toLowerCase();

      // Match conditions
      const matchesStatus =
        currentStatus === "all" || cardStatus === currentStatus.toLowerCase();

      const matchesCategory =
        currentCategory === "all" || cardCategory === currentCategory.toLowerCase();

      const matchesSearch =
        currentSearchQuery === "" || cardText.includes(currentSearchQuery.toLowerCase());

      // Apply visibility
      if (matchesStatus && matchesCategory && matchesSearch) {
        card.style.display = "flex";
        visibleCount++;
      } else {
        card.style.display = "none";
      }
    });

    // Step 2: Sorting active cards in DOM
    const visibleCards = issueCards.filter((card) => card.style.display !== "none");

    visibleCards.sort((a, b) => {
      const timeA = parseInt(a.getAttribute("data-timestamp") || "0", 10);
      const timeB = parseInt(b.getAttribute("data-timestamp") || "0", 10);

      return currentSortOrder === "recent" ? timeB - timeA : timeA - timeB;
    });

    // Re-append cards in sorted order
    visibleCards.forEach((card) => issuesContainer.appendChild(card));

    // Step 3: Update count UI & Empty state display
    if (issuesCountEl) {
      issuesCountEl.textContent = `${visibleCount} public issue${visibleCount === 1 ? "" : "s"}`;
    }

    if (noResultsEl) {
      noResultsEl.style.display = visibleCount === 0 ? "block" : "none";
    }
  }

  // ==========================================
  // 4. EVENT LISTENERS
  // ==========================================

  // A. Status Tabs Click Event
  statusTabs.forEach((tab) => {
    tab.addEventListener("click", function () {
      // Remove active class from all tabs
      statusTabs.forEach((t) => t.classList.remove("active"));

      // Add active class to clicked tab
      this.classList.add("active");

      // Update state & execute filtering
      currentStatus = this.getAttribute("data-status") || "all";
      filterAndSortIssues();
    });
  });

  // B. Category Select Event
  if (categoryFilter) {
    categoryFilter.addEventListener("change", function () {
      currentCategory = this.value;
      filterAndSortIssues();
    });
  }

  // C. Sort Select Event
  if (sortFilter) {
    sortFilter.addEventListener("change", function () {
      currentSortOrder = this.value;
      filterAndSortIssues();
    });
  }

  // D. Synchronized Search Input Events
  function handleSearch(e) {
    currentSearchQuery = e.target.value.trim();

    // Sync desktop and mobile search inputs
    if (searchInput && e.target !== searchInput) searchInput.value = currentSearchQuery;
    if (mobileSearchInput && e.target !== mobileSearchInput) mobileSearchInput.value = currentSearchQuery;

    filterAndSortIssues();
  }

  if (searchInput) searchInput.addEventListener("input", handleSearch);
  if (mobileSearchInput) mobileSearchInput.addEventListener("input", handleSearch);

  // ==========================================
  // 5. MODAL INTERACTION LOGIC
  // ==========================================
  function openModal() {
    if (reportModal) {
      reportModal.classList.add("active");
      document.body.style.overflow = "hidden"; // Prevent scrolling behind modal
    }
  }

  function closeModal() {
    if (reportModal) {
      reportModal.classList.remove("active");
      document.body.style.overflow = "auto";
      if (issueUploadForm) issueUploadForm.reset();
    }
  }

  if (openReportModalBtn) openReportModalBtn.addEventListener("click", openModal);
  if (closeReportModalBtn) closeReportModalBtn.addEventListener("click", closeModal);
  if (cancelReportModalBtn) cancelReportModalBtn.addEventListener("click", closeModal);

  // Close modal when clicking outside of backdrop
  if (reportModal) {
    reportModal.addEventListener("click", function (e) {
      if (e.target === reportModal) {
        closeModal();
      }
    });
  }

  // Modal CSS state rule addition
  const modalStyle = document.createElement("style");
  modalStyle.innerHTML = `
        .modal-backdrop.active {
            display: flex !important;
            opacity: 1 !important;
            pointer-events: auto !important;
        }
        .modal-backdrop {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background-color: rgba(15, 23, 42, 0.6);
            backdrop-filter: blur(4px);
            z-index: 100;
            align-items: center;
            justify-content: center;
            padding: 1rem;
        }
    `;
  document.head.appendChild(modalStyle);

  // Initial Filter Run on load
  filterAndSortIssues();
});

// ==========================================
// MOBILE MENU HAMBURGER INTERACTION
// ==========================================
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const mobileNavMenu = document.getElementById('mobileNavMenu');
const hamburgerIcon = document.getElementById('hamburgerIcon');
const closeMenuIcon = document.getElementById('closeMenuIcon');

if (mobileMenuBtn && mobileNavMenu) {
  mobileMenuBtn.addEventListener('click', function () {
    const isOpen = mobileNavMenu.classList.toggle('open');

    // Toggle icon visibility (hamburger vs close icon)
    if (hamburgerIcon && closeMenuIcon) {
      hamburgerIcon.style.display = isOpen ? 'none' : 'block';
      closeMenuIcon.style.display = isOpen ? 'block' : 'none';
    }
  });

  // Close mobile menu when clicking outside
  document.addEventListener('click', function (e) {
    if (!mobileNavMenu.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
      mobileNavMenu.classList.remove('open');
      if (hamburgerIcon && closeMenuIcon) {
        hamburgerIcon.style.display = 'block';
        closeMenuIcon.style.display = 'none';
      }
    }
  });
}

// ==========================================
// LIGHT / DARK THEME SWITCHER
// ==========================================
const themeToggleBtn = document.getElementById('themeToggleBtn');
const sunIcon = document.getElementById('sunIcon');
const moonIcon = document.getElementById('moonIcon');

// Check saved theme from localStorage or fallback to system preference
const savedTheme = localStorage.getItem('citywatch-theme');
const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

let currentTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);

  if (theme === 'dark') {
    document.body.classList.add('dark-mode');
  } else {
    document.body.classList.remove('dark-mode');
  }

  localStorage.setItem('citywatch-theme', theme);

  if (theme === 'dark') {
    if (sunIcon) sunIcon.style.display = 'block';
    if (moonIcon) moonIcon.style.display = 'none';
  } else {
    if (sunIcon) sunIcon.style.display = 'none';
    if (moonIcon) moonIcon.style.display = 'block';
  }
}

// Apply theme immediately on load
applyTheme(currentTheme);

// Toggle event handler
if (themeToggleBtn) {
  themeToggleBtn.addEventListener('click', function () {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyTheme(currentTheme);
  });
}