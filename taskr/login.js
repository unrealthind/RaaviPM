// This function will be called by the Turnstile script once it's loaded.
// It uses the site key from utils.js to render the widget.
function renderTurnstileWidget() {
    // Check if the container element and the turnstile object are available
    if (document.getElementById('turnstile-container') && typeof turnstile !== 'undefined') {
        turnstile.render('#turnstile-container', {
            sitekey: TURNSTILE_SITE_KEY, // This variable comes from utils.js
            theme: 'dark', // Optional: 'light' or 'dark' to match your design
        });
    }
}

// This script handles the login and signup functionality.
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const showSignupBtn = document.getElementById('show-signup');
    const showLoginBtn = document.getElementById('show-login');
    const authView = document.getElementById('auth-view');
    const signupView = document.getElementById('signup-view');
    const messageContainer = document.getElementById('message-container');

    /**
     * Displays a feedback message to the user.
     * @param {string} message - The message to display.
     * @param {boolean} isError - True if the message is an error, false for success.
     */
    const showMessage = (message, isError = false) => {
        messageContainer.textContent = message;
        messageContainer.className = `text-center mt-4 font-medium ${isError ? 'text-red-400' : 'text-green-300'}`;
    };

    // --- Event Listeners ---

    // Toggle between the login and signup forms
    showSignupBtn.addEventListener('click', (e) => {
        e.preventDefault();
        authView.classList.add('hidden');
        signupView.classList.remove('hidden');
        messageContainer.textContent = ''; // Clear previous messages
    });

    showLoginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        signupView.classList.add('hidden');
        authView.classList.remove('hidden');
        messageContainer.textContent = ''; // Clear previous messages
    });

    // Handle the login form submission
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const loginButton = loginForm.querySelector('button');

        loginButton.disabled = true;
        loginButton.textContent = 'Logging in...';

        const { error } = await _supabase.auth.signInWithPassword({ email, password });

        if (error) {
            showMessage(error.message, true);
        } else {
            // On success, redirect to the main index file.
            window.location.href = 'index.html'; 
        }

        loginButton.disabled = false;
        loginButton.textContent = 'Login';
    });

    // Handle the signup form submission (Updated with Turnstile)
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Get values from all form fields
        const name = document.getElementById('signup-name').value;
        const company = document.getElementById('signup-company').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const confirmPassword = document.getElementById('signup-confirm-password').value;
        const signupButton = signupForm.querySelector('button');

        // Get the Turnstile token from the form data
        const formData = new FormData(signupForm);
        const token = formData.get('cf-turnstile-response');

        // --- Validation ---
        if (password !== confirmPassword) {
            showMessage("Passwords do not match.", true);
            return;
        }

        if (!token) {
            showMessage("Please complete the human verification check.", true);
            return;
        }

        signupButton.disabled = true;
        signupButton.textContent = 'Signing up...';

        try {
            // Call the 'signup' Supabase Edge Function
            const { data, error } = await _supabase.functions.invoke('signup', {
                body: {
                    name,
                    company,
                    email,
                    password,
                    token, // Send the token for server-side verification
                },
            });

            if (error) {
                // If the edge function returns an error, show it
                showMessage(error.message, true);
            } else {
                // Show the success message from the edge function
                showMessage(data.message, false);
                signupForm.reset();
            }
        } catch (error) {
            // Catch any unexpected network errors
            showMessage(error.message, true);
        } finally {
            // This block runs whether the try succeeds or fails
            signupButton.disabled = false;
            signupButton.textContent = 'Sign Up';
            // Reset the Turnstile widget
            if (typeof turnstile !== 'undefined') {
                turnstile.reset();
            }
        }
    });
});