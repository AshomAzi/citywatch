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

  // Geolocation elements
  const detectLocationBtn = document.getElementById("detectLocationBtn");
  const locationInput = document.getElementById("locationInput");
  const latitudeInput = document.getElementById("latitudeInput");
  const longitudeInput = document.getElementById("longitudeInput");

  // Navigation and Theme elements
  const mobileMenuBtn = document.getElementById("mobileMenuBtn");
  const mobileNavMenu = document.getElementById("mobileNavMenu");
  const themeToggleBtn = document.getElementById("themeToggleBtn");
  const sunIcon = document.getElementById("sunIcon");
  const moonIcon = document.getElementById("moonIcon");

  // ==========================================
  // 2. STATE & GOOGLE MAPS INSTANCE
  // ==========================================
  let currentStatus = "all";
  let currentCategory = "all";
  let currentSearchQuery = "";
  let currentSortOrder = "recent";

  let modalMap = null;
  let mapMarker = null;
  let geocoder = null;
  const defaultCoords = { lat: 9.8965, lng: 8.8583 }; // Default coordinates (Jos center)

  // User Upvote Storage (Persisted in LocalStorage)
  const UPVOTE_STORAGE_KEY = "citywatch_user_upvotes";
  let userUpvotes = JSON.parse(localStorage.getItem(UPVOTE_STORAGE_KEY) || "[]");

  // High Impact Threshold (Issues with >= 10 upvotes receive High Impact Verification)
  const HIGH_IMPACT_THRESHOLD = 10;

  // ==========================================
  // 3. UPVOTE & COMMUNITY VERIFICATION SYSTEM
  // ==========================================
  function updateCardVerificationState(card, count) {
    const verifiedBadge = card.querySelector(".badge-verified");
    if (count >= HIGH_IMPACT_THRESHOLD) {
      card.classList.add("high-impact");
      if (verifiedBadge) verifiedBadge.style.display = "inline-flex";
    } else {
      card.classList.remove("high-impact");
      if (verifiedBadge) verifiedBadge.style.display = "none";
    }
  }

  function initUpvoteButtons() {
    issueCards.forEach((card) => {
      const issueId = card.getAttribute("data-id");
      const upvoteBtn = card.querySelector(".upvote-btn");
      const countEl = card.querySelector(".upvote-count");
      const labelEl = card.querySelector(".upvote-label");

      if (!upvoteBtn || !countEl || !issueId) return;

      let count = parseInt(card.getAttribute("data-upvotes") || "0", 10);
      const isUpvoted = userUpvotes.includes(issueId);

      if (isUpvoted) {
        upvoteBtn.classList.add("upvoted");
        if (labelEl) labelEl.textContent = "Report confirmed";
      }

      updateCardVerificationState(card, count);

      upvoteBtn.addEventListener("click", function (e) {
        e.stopPropagation();

        const alreadyVoted = userUpvotes.includes(issueId);

        if (alreadyVoted) {
          // Remove Upvote
          userUpvotes = userUpvotes.filter((id) => id !== issueId);
          count = Math.max(0, count - 1);
          upvoteBtn.classList.remove("upvoted");
          if (labelEl) labelEl.textContent = "I'm experiencing this too";
        } else {
          // Add Upvote
          userUpvotes.push(issueId);
          count++;
          upvoteBtn.classList.add("upvoted");
          if (labelEl) labelEl.textContent = "Report confirmed";
        }

        // Update DOM and Data Attributes
        card.setAttribute("data-upvotes", count.toString());
        countEl.textContent = count.toString();
        localStorage.setItem(UPVOTE_STORAGE_KEY, JSON.stringify(userUpvotes));

        // Verification threshold check
        updateCardVerificationState(card, count);

        // Button pulse animation
        upvoteBtn.classList.add("animate-pulse");
        setTimeout(() => upvoteBtn.classList.remove("animate-pulse"), 300);

        // Re-sort if current sort mode is upvotes
        if (currentSortOrder === "upvotes") {
          filterAndSortIssues();
        }
      });
    });
  }

  // ==========================================
  // 4. GEOLOCATION & GOOGLE MAPS LOGIC
  // ==========================================
  function initModalMap() {
    const mapContainer = document.getElementById("modalMap");
    if (!mapContainer || typeof google === "undefined" || !google.maps) return;

    if (!geocoder) {
      geocoder = new google.maps.Geocoder();
    }

    if (!modalMap) {
      modalMap = new google.maps.Map(mapContainer, {
        center: defaultCoords,
        zoom: 13,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false
      });

      // Map click handler to relocate pin
      modalMap.addListener("click", function (e) {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        setMapLocation(lat, lng, true);
      });
    }

    // Trigger map resize event for modal layout stability
    setTimeout(() => {
      if (modalMap && google.maps.event) {
        google.maps.event.trigger(modalMap, "resize");
        modalMap.setCenter(mapMarker ? mapMarker.getPosition() : defaultCoords);
      }
    }, 200);
  }

  function setMapLocation(lat, lng, doReverseGeocode = false) {
    if (!modalMap || typeof google === "undefined") return;

    const pos = { lat: parseFloat(lat), lng: parseFloat(lng) };

    if (!mapMarker) {
      mapMarker = new google.maps.Marker({
        position: pos,
        map: modalMap,
        draggable: true,
        animation: google.maps.Animation.DROP
      });

      mapMarker.addListener("dragend", function () {
        const position = mapMarker.getPosition();
        setMapLocation(position.lat(), position.lng(), true);
      });
    } else {
      mapMarker.setPosition(pos);
    }

    modalMap.panTo(pos);

    // Store coordinates in hidden form inputs for Django
    if (latitudeInput) latitudeInput.value = pos.lat.toFixed(6);
    if (longitudeInput) longitudeInput.value = pos.lng.toFixed(6);

    // Reverse geocoding via Google Maps Geocoder Service
    if (doReverseGeocode && locationInput && geocoder) {
      geocoder.geocode({ location: pos }, (results, status) => {
        if (status === "OK" && results[0]) {
          locationInput.value = results[0].formatted_address;
        }
      });
    }
  }

  if (detectLocationBtn) {
    detectLocationBtn.addEventListener("click", function () {
      if ("geolocation" in navigator) {
        const originalBtnContent = detectLocationBtn.innerHTML;
        detectLocationBtn.disabled = true;
        detectLocationBtn.innerText = "Locating...";

        navigator.geolocation.getCurrentPosition(
          (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            setMapLocation(lat, lng, true);

            detectLocationBtn.disabled = false;
            detectLocationBtn.innerHTML = originalBtnContent;
          },
          (error) => {
            alert("Unable to acquire location. Please pick your position on the map directly.");
            detectLocationBtn.disabled = false;
            detectLocationBtn.innerHTML = originalBtnContent;
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      } else {
        alert("Geolocation is not supported by your browser.");
      }
    });
  }

  // ==========================================
  // 5. CORE FILTER & SORT ENGINE
  // ==========================================
  function filterAndSortIssues() {
    let visibleCount = 0;

    issueCards.forEach((card) => {
      const cardStatus = (card.getAttribute("data-status") || "").toLowerCase().trim();
      const cardCategory = (card.getAttribute("data-category") || "").toLowerCase().trim();
      const cardText = card.textContent.toLowerCase();

      const matchesStatus =
        currentStatus === "all" || cardStatus === currentStatus.toLowerCase();

      const matchesCategory =
        currentCategory === "all" || cardCategory === currentCategory.toLowerCase();

      const matchesSearch =
        currentSearchQuery === "" || cardText.includes(currentSearchQuery.toLowerCase());

      if (matchesStatus && matchesCategory && matchesSearch) {
        card.style.display = "flex";
        visibleCount++;
      } else {
        card.style.display = "none";
      }
    });

    const visibleCards = issueCards.filter((card) => card.style.display !== "none");

    visibleCards.sort((a, b) => {
      if (currentSortOrder === "upvotes") {
        const upvotesA = parseInt(a.getAttribute("data-upvotes") || "0", 10);
        const upvotesB = parseInt(b.getAttribute("data-upvotes") || "0", 10);
        return upvotesB - upvotesA;
      }

      const timeA = parseInt(a.getAttribute("data-timestamp") || "0", 10);
      const timeB = parseInt(b.getAttribute("data-timestamp") || "0", 10);

      return currentSortOrder === "recent" ? timeB - timeA : timeA - timeB;
    });

    visibleCards.forEach((card) => issuesContainer.appendChild(card));

    if (issuesCountEl) {
      issuesCountEl.textContent = `${visibleCount} public issue${visibleCount === 1 ? "" : "s"}`;
    }

    if (noResultsEl) {
      noResultsEl.style.display = visibleCount === 0 ? "block" : "none";
    }
  }

  // ==========================================
  // 6. FILTER LISTENERS
  // ==========================================
  statusTabs.forEach((tab) => {
    tab.addEventListener("click", function () {
      statusTabs.forEach((t) => t.classList.remove("active"));
      this.classList.add("active");
      currentStatus = this.getAttribute("data-status") || "all";
      filterAndSortIssues();
    });
  });

  if (categoryFilter) {
    categoryFilter.addEventListener("change", function () {
      currentCategory = this.value;
      filterAndSortIssues();
    });
  }

  if (sortFilter) {
    sortFilter.addEventListener("change", function () {
      currentSortOrder = this.value;
      filterAndSortIssues();
    });
  }

  function handleSearch(e) {
    currentSearchQuery = e.target.value.trim();

    if (searchInput && e.target !== searchInput) searchInput.value = currentSearchQuery;
    if (mobileSearchInput && e.target !== mobileSearchInput) mobileSearchInput.value = currentSearchQuery;

    filterAndSortIssues();
  }

  if (searchInput) searchInput.addEventListener("input", handleSearch);
  if (mobileSearchInput) mobileSearchInput.addEventListener("input", handleSearch);

  // ==========================================
  // 7. MODAL INTERACTION LOGIC
  // ==========================================
  function openModal() {
    if (reportModal) {
      reportModal.classList.add("open");
      document.body.style.overflow = "hidden";
      initModalMap(); // Initialize/resize Google Map on open
    }
  }

  function closeModal() {
    if (reportModal) {
      reportModal.classList.remove("open");
      document.body.style.overflow = "auto";
      if (issueUploadForm) issueUploadForm.reset();
    }
  }

  if (openReportModalBtn) openReportModalBtn.addEventListener("click", openModal);
  if (closeReportModalBtn) closeReportModalBtn.addEventListener("click", closeModal);
  if (cancelReportModalBtn) cancelReportModalBtn.addEventListener("click", closeModal);

  if (reportModal) {
    reportModal.addEventListener("click", function (e) {
      if (e.target === reportModal) closeModal();
    });
  }

  // ==========================================
  // 8. MOBILE MENU INTERACTION
  // ==========================================
  if (mobileMenuBtn && mobileNavMenu) {
    mobileMenuBtn.addEventListener("click", function () {
      const isOpen = mobileNavMenu.classList.toggle("open");
      mobileMenuBtn.classList.toggle("active", isOpen);
    });

    document.addEventListener("click", function (e) {
      if (!mobileNavMenu.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
        mobileNavMenu.classList.remove("open");
        mobileMenuBtn.classList.remove("active");
      }
    });
  }

  // ==========================================
  // 9. LIGHT / DARK THEME SWITCHER
  // ==========================================
  const savedTheme = localStorage.getItem("citywatch-theme");
  const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  let currentTheme = savedTheme || (systemPrefersDark ? "dark" : "light");

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

  // Initial Execution
  initUpvoteButtons();
  filterAndSortIssues();
});