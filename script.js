
// =====================================
// SHADDRACK ADMIN - SUPABASE CONNECTION
// =====================================

const SUPABASE_URL = "https://tofrlyutxxfkxmdevsvk.supabase.co";

const SUPABASE_KEY = "sb_publishable_XINQAzfUeVG19m8wBiuE5w_jMTtMAzm";

const client = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

// =====================================
// GET HTML ELEMENTS
// =====================================

const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const togglePassword = document.getElementById("togglePassword");
const loginButton = document.getElementById("loginButton");
const loginMessage = document.getElementById("loginMessage");

const forgotPassword = document.getElementById("forgotPassword");

const resetForm = document.getElementById("resetForm");
const newPassword = document.getElementById("newPassword");
const resetMessage = document.getElementById("resetMessage");

// =====================================
// SHOW / HIDE PASSWORD
// =====================================

togglePassword.addEventListener("click", function () {
    if (passwordInput.type === "password") {
        passwordInput.type = "text";
        togglePassword.textContent = "Hide";
    } else {
        passwordInput.type = "password";
        togglePassword.textContent = "Show";
    }
});

// =====================================
// CHECK WHETHER USER IS AN ADMIN
// =====================================

async function checkAdmin(userId) {
    const { data, error } = await client
        .from("gallery_admins")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();

    if (error) {
        console.error("Admin verification error:", error);
        return false;
    }

    return !!data;
}

// =====================================
// ADMIN LOGIN
// =====================================

loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    loginMessage.textContent = "";
    loginButton.disabled = true;
    loginButton.textContent = "Signing in...";

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    try {
        const { data, error } = await client.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            throw error;
        }

        const isAdmin = await checkAdmin(data.user.id);

        if (!isAdmin) {
            await client.auth.signOut();

            throw new Error(
                "This account is not registered as an administrator."
            );
        }

        loginMessage.style.color = "#00d6b2";
        loginMessage.textContent = "Login successful! Opening dashboard...";

        window.location.href = "dashboard.html";

    } catch (error) {
        loginMessage.style.color = "#ff8585";
        loginMessage.textContent = error.message;

        loginButton.disabled = false;
        loginButton.textContent = "Sign In";
    }
});

// =====================================
// FORGOT PASSWORD
// =====================================

forgotPassword.addEventListener("click", async function () {
    const email = emailInput.value.trim();

    if (!email) {
        loginMessage.textContent =
            "Enter your email address first, then click Forgot password.";
        return;
    }

    forgotPassword.disabled = true;
    loginMessage.style.color = "#d9e2f1";
    loginMessage.textContent = "Sending password recovery email...";

    try {
        const { error } = await client.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + window.location.pathname
        });

        if (error) {
            throw error;
        }

        loginMessage.style.color = "#00d6b2";
        loginMessage.textContent =
            "Recovery email sent. Check your inbox.";

    } catch (error) {
        loginMessage.style.color = "#ff8585";
        loginMessage.textContent = error.message;
    } finally {
        forgotPassword.disabled = false;
    }
});

// =====================================
// HANDLE PASSWORD RECOVERY LINK
// =====================================

client.auth.onAuthStateChange(function (event) {
    if (event === "PASSWORD_RECOVERY") {
        loginForm.classList.add("hidden");
        resetForm.classList.remove("hidden");
        document.querySelector(".security-note").classList.add("hidden");
    }
});

// =====================================
// SAVE NEW PASSWORD
// =====================================

resetForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    resetMessage.textContent = "";

    if (newPassword.value.length < 8) {
        resetMessage.textContent =
            "Your password must contain at least 8 characters.";
        return;
    }

    try {
        const { error } = await client.auth.updateUser({
            password: newPassword.value
        });

        if (error) {
            throw error;
        }

        resetMessage.style.color = "#00d6b2";
        resetMessage.textContent =
            "Password updated successfully. You can now sign in.";

        await client.auth.signOut();

        resetForm.classList.add("hidden");
        loginForm.classList.remove("hidden");
        document.querySelector(".security-note").classList.remove("hidden");

    } catch (error) {
        resetMessage.style.color = "#ff8585";
        resetMessage.textContent = error.message;
    }
});
