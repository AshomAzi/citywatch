document.addEventListener("DOMContentLoaded", function () {
    const registerForm = document.getElementById("registerForm");

    // Inputs
    const firstNameInput = document.getElementById("firstName");
    const lastNameInput = document.getElementById("lastName");
    const emailInput = document.getElementById("email");
    const neighborhoodInput = document.getElementById("neighborhood");
    const passwordInput = document.getElementById("password");
    const confirmPasswordInput = document.getElementById("confirmPassword");
    const termsInput = document.getElementById("terms");

    // Error Message Elements
    const errors = {
        firstName: document.getElementById("firstNameError"),
        lastName: document.getElementById("lastNameError"),
        email: document.getElementById("emailError"),
        neighborhood: document.getElementById("neighborhoodError"),
        password: document.getElementById("passwordError"),
        confirmPassword: document.getElementById("confirmPasswordError"),
        terms: document.getElementById("termsError"),
    };

    // Theme Elements
    const themeToggleBtn = document.getElementById("themeToggleBtn");
    const sunIcon = document.getElementById("sunIcon");
    const moonIcon = document.getElementById("moonIcon");

    // Theme Switcher Logic
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

    // Form Validation Logic
    function clearErrors() {
        Object.keys(errors).forEach((key) => {
            if (errors[key]) errors[key].textContent = "";
        });
        document.querySelectorAll(".form-input").forEach((input) => {
            input.classList.remove("input-error");
        });
    }

    function setError(inputEl, errorEl, message) {
        if (errorEl) errorEl.textContent = message;
        if (inputEl) inputEl.classList.add("input-error");
    }

    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    registerForm.addEventListener("submit", function (e) {
        e.preventDefault();
        clearErrors();

        let isValid = true;

        if (!firstNameInput.value.trim()) {
            setError(firstNameInput, errors.firstName, "First name is required");
            isValid = false;
        }

        if (!lastNameInput.value.trim()) {
            setError(lastNameInput, errors.lastName, "Last name is required");
            isValid = false;
        }

        if (!emailInput.value.trim()) {
            setError(emailInput, errors.email, "Email address is required");
            isValid = false;
        } else if (!validateEmail(emailInput.value.trim())) {
            setError(emailInput, errors.email, "Please enter a valid email address");
            isValid = false;
        }

        if (!neighborhoodInput.value.trim()) {
            setError(neighborhoodInput, errors.neighborhood, "Neighborhood is required");
            isValid = false;
        }

        if (!passwordInput.value) {
            setError(passwordInput, errors.password, "Password is required");
            isValid = false;
        } else if (passwordInput.value.length < 8) {
            setError(passwordInput, errors.password, "Password must be at least 8 characters");
            isValid = false;
        }

        if (!confirmPasswordInput.value) {
            setError(confirmPasswordInput, errors.confirmPassword, "Please confirm your password");
            isValid = false;
        } else if (passwordInput.value !== confirmPasswordInput.value) {
            setError(confirmPasswordInput, errors.confirmPassword, "Passwords do not match");
            isValid = false;
        }

        if (!termsInput.checked) {
            if (errors.terms) errors.terms.textContent = "Accept the terms and conditions first";
            isValid = false;
        }

        if (isValid) {
            alert("Registration successful! Redirecting to home page...");
            window.location.href = "index.html";
        }
    });
});