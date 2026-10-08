document.addEventListener("DOMContentLoaded", function () {
    const loginForm = document.getElementById("loginForm");
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");

    const errors = {
        username: document.getElementById("usernameError"),
        password: document.getElementById("passwordError"),
    };

    // Theme Elements
    const themeToggleBtn = document.getElementById("themeToggleBtn");
    const sunIcon = document.getElementById("sunIcon");
    const moonIcon = document.getElementById("moonIcon");

    // Theme Logic
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

    // Front-End Validation
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

    loginForm.addEventListener("submit", function (e) {
        clearErrors();
        let isValid = true;

        if (!usernameInput.value.trim()) {
            setError(usernameInput, errors.username, "Please enter your email or username");
            isValid = false;
        }

        if (!passwordInput.value) {
            setError(passwordInput, errors.password, "Please enter your password");
            isValid = false;
        }

        if (!isValid) {
            e.preventDefault();
        }
    });
});