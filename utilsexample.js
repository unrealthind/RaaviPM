// --- 1. API KEYS & CONFIGURATION ---
// These keys are safe to be public. Security is handled by Supabase's Row Level
// Security (RLS) and by restricting the Google API key to your specific domain.

// Replace with your actual Supabase URL and public anon key
const supabaseUrl = 'https://xxx.supabase.co';
const supabaseKey = 'xxx';

// Replace with your actual Google Maps API Key
const googleApiKey = 'xxx';


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