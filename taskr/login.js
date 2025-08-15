// This script handles the login and signup functionality for the Taskr Manager.
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
            // On success, redirect to the main index file, which will route to the app.
            window.location.href = 'index.html'; 
        }

        loginButton.disabled = false;
        loginButton.textContent = 'Login';
    });

    // Handle the signup form submission
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const signupButton = signupForm.querySelector('button');

        signupButton.disabled = true;
        signupButton.textContent = 'Signing up...';

        const { data, error } = await _supabase.auth.signUp({ email, password });

        if (error) {
            showMessage(error.message, true);
        } else {
            showMessage('Success! Check your email for a confirmation link.', false);
            signupForm.reset();
        }

        signupButton.disabled = false;
        signupButton.textContent = 'Sign Up';
    });
});