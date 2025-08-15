// --- 1. SUPABASE CLIENT INITIALIZATION ---
// This initializes the Supabase client for any application that includes this script.
// It relies on env.js being loaded first.

let _supabase;
if (window.APP_CONFIG) {
    const { supabaseUrl, supabaseKey } = window.APP_CONFIG;
    _supabase = supabase.createClient(supabaseUrl, supabaseKey);
    // Make it globally accessible for your app scripts
    window._supabase = _supabase;
} else {
    console.error('Supabase configuration not found. Make sure env.js is loaded correctly.');
}


// --- 2. UNIVERSAL THEME SWITCHER ---
// This function can be called by any application to set up its theme switcher.

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
