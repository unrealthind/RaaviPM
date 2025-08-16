// --- 1. API KEYS & CONFIGURATION ---
// These keys are safe to be public. Security is handled by Supabase's Row Level
// Security (RLS) and by restricting the Google API key to your specific domain.

// Replace with your actual Supabase URL and public anon key
const supabaseUrl = 'https://mevoynnthdyemlilzlxs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ldm95bm50aGR5ZW1saWx6bHhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyMTEzMzQsImV4cCI6MjA3MDc4NzMzNH0.NK6QkJb_i0UotsLX0ubkjw-4ZMqI3b7kljCRBjiagps';

// Replace with your actual Google Maps API Key
const googleApiKey = 'AIzaSyAof8jhlreSU2LKhrtavlrbvyoJM-RDhhM';


// --- 2. SUPABASE CLIENT INITIALIZATION ---
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

// Make the Supabase client and Google API key globally accessible for app scripts
window._supabase = _supabase;
window.googleApiKey = googleApiKey; // The form/app.js needs this


// --- 3. UNIVERSAL THEME SWITCHER ---
// This function remains unchanged.

function setupThemeSwitcher(buttonId, storageKey, themes = ['theme-rainbow', 'theme-dark-mono']) {
    const themeSwitcherBtn = document.getElementById(buttonId);
    if (!themeSwitcherBtn) {
        // Silently return if the button isn't on the current page
        return;
    }

    let currentTheme = localStorage.getItem(storageKey) || themes[0];

    const applyTheme = (theme) => {
        document.body.className = theme;
        localStorage.setItem(storageKey, theme);
    };

    // Apply the initial theme as soon as the script loads
    applyTheme(currentTheme);

    // Add the click event listener to the button
    themeSwitcherBtn.addEventListener('click', () => {
        const nextIndex = (themes.indexOf(currentTheme) + 1) % themes.length;
        currentTheme = themes[nextIndex];
        applyTheme(currentTheme);
    });
}