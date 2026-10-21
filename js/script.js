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
  const locationStatus = document.getElementById("locationStatus");
  const mapUnavailableNote = document.getElementById("mapUnavailableNote");
  const imageInput = document.getElementById("file-upload");
  const imagePreview = document.getElementById("reportImagePreview");
  const reportFormMessage = document.getElementById("reportFormMessage");

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
  let previewUrl = null;
  let previouslyFocusedElement = null;
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
    if (mapUnavailableNote) mapUnavailableNote.hidden = true;

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
    const latValue = parseFloat(lat);
    const lngValue = parseFloat(lng);

    if (!Number.isFinite(latValue) || !Number.isFinite(lngValue)) return;

    const pos = { lat: latValue, lng: lngValue };

    // Store coordinates in hidden form inputs even when Google Maps is not configured.
    if (latitudeInput) latitudeInput.value = pos.lat.toFixed(6);
    if (longitudeInput) longitudeInput.value = pos.lng.toFixed(6);

    if (typeof google !== "undefined" && google.maps && modalMap) {
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
    }

    // Reverse geocoding via Google Maps Geocoder Service when available.
    if (doReverseGeocode && locationInput && typeof google !== "undefined" && google.maps && geocoder) {
      geocoder.geocode({ location: pos }, (results, status) => {
        if (status === "OK" && results[0]) {
          locationInput.value = results[0].formatted_address;
        }
      });
    } else if (locationInput && !locationInput.value.trim()) {
      locationInput.value = `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`;
    }
    if (locationStatus) {
      locationStatus.textContent = modalMap
        ? "Coordinates added. Adjust the pin or edit the address if needed."
        : "Coordinates detected. Add an address if you know one; the map needs a Google Maps API key.";
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
            const message = error.code === error.PERMISSION_DENIED
              ? "Location permission was denied. Enter an address manually."
              : error.code === error.TIMEOUT
                ? "Location detection timed out. Enter an address manually."
                : "Unable to detect location. Enter an address manually.";
            if (locationStatus) locationStatus.textContent = message;
            detectLocationBtn.disabled = false;
            detectLocationBtn.innerHTML = originalBtnContent;
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      } else {
        if (locationStatus) locationStatus.textContent = "Location detection is not supported by this browser. Enter an address manually.";
      }
    });
  }

  if (imageInput && imagePreview) {
    imageInput.addEventListener("change", function () {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      previewUrl = null;
      imagePreview.classList.remove("visible");
      imagePreview.removeAttribute("src");

      const file = imageInput.files && imageInput.files[0];
      if (!file) return;

      if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) {
        if (reportFormMessage) {
          reportFormMessage.textContent = file.size > 10 * 1024 * 1024
            ? "Choose an image smaller than 10 MB. Your report has not been submitted."
            : "Choose an image file. Your report has not been submitted.";
          reportFormMessage.classList.add("visible");
        }
        imageInput.value = "";
        return;
      }

      previewUrl = URL.createObjectURL(file);
      imagePreview.src = previewUrl;
      imagePreview.classList.add("visible");
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
        card.style.display = "";
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
      issuesCountEl.textContent = `${visibleCount} sample report${visibleCount === 1 ? "" : "s"}`;
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
      previouslyFocusedElement = document.activeElement;
      reportModal.classList.add("open");
      reportModal.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
      initModalMap(); // Initialize/resize Google Map on open
      const titleInput = reportModal.querySelector('input[name="title"]');
      if (titleInput) titleInput.focus();
    }
  }

  function closeModal() {
    if (reportModal) {
      reportModal.classList.remove("open");
      reportModal.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "auto";
      if (issueUploadForm) {
        issueUploadForm.reset();
        if (reportFormMessage) {
          reportFormMessage.textContent = "";
          reportFormMessage.classList.remove("visible");
        }
        if (locationStatus) locationStatus.textContent = "";
        if (imagePreview) {
          imagePreview.classList.remove("visible");
          imagePreview.removeAttribute("src");
        }
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        previewUrl = null;
      }
      if (previouslyFocusedElement && typeof previouslyFocusedElement.focus === "function") {
        previouslyFocusedElement.focus();
      }
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

  if (issueUploadForm) {
    issueUploadForm.addEventListener("submit", function (e) {
      const titleInput = issueUploadForm.querySelector('input[name="title"]');
      const locationField = issueUploadForm.querySelector('input[name="location"]');
      const descriptionField = issueUploadForm.querySelector('textarea[name="description"]');

      const requiredFields = [titleInput, locationField, descriptionField];
      const missingField = requiredFields.find((field) => !field || !field.value.trim());

      if (missingField) {
        e.preventDefault();
        if (reportFormMessage) {
          reportFormMessage.textContent = "Complete the issue title, location, and description before continuing.";
          reportFormMessage.classList.add("visible");
        }
        missingField.focus();
        return;
      }

      e.preventDefault();
      if (reportFormMessage) {
        reportFormMessage.textContent = "Your report was not sent. This demo has no connected report-submission service.";
        reportFormMessage.classList.add("visible");
      }
    });
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && reportModal && reportModal.classList.contains("open")) {
      closeModal();
    }
  });

  window.addEventListener("citywatchmapsready", function () {
    if (reportModal && reportModal.classList.contains("open")) {
      initModalMap();
      if (latitudeInput && longitudeInput && latitudeInput.value && longitudeInput.value) {
        setMapLocation(latitudeInput.value, longitudeInput.value);
      }
    }
  });

  document.querySelectorAll(".report-photo, .hero-visual img, .issue-thumb").forEach((image) => {
    image.addEventListener("error", function () {
      image.hidden = true;
      const figure = image.closest(".hero-visual");
      const caption = figure && figure.querySelector("figcaption");
      if (caption) caption.textContent = "City image unavailable · sample content";
      const photoCaption = image.closest(".photo-placeholder-bg")?.querySelector(".photo-text");
      if (photoCaption) photoCaption.textContent = "Illustrative photo unavailable · sample report";
    }, { once: true });
    if (image.complete && image.naturalWidth === 0) image.dispatchEvent(new Event("error"));
  });

  // ==========================================
  // 8. MOBILE MENU INTERACTION
  // ==========================================
  if (mobileMenuBtn && mobileNavMenu) {
    mobileMenuBtn.addEventListener("click", function () {
      const isOpen = mobileNavMenu.classList.toggle("open");
      mobileMenuBtn.classList.toggle("active", isOpen);
      mobileMenuBtn.setAttribute("aria-expanded", String(isOpen));
    });

    document.addEventListener("click", function (e) {
      if (!mobileNavMenu.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
        mobileNavMenu.classList.remove("open");
        mobileMenuBtn.classList.remove("active");
        mobileMenuBtn.setAttribute("aria-expanded", "false");
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