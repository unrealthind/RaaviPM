// sync.js
const fs = require('fs');
const path = require('path');

// --- Configuration ---
// The single source of truth for our shared code
const sharedSourcePath = path.join(__dirname, 'shared', 'utils.js');

// An array of all the places we need to copy the shared code to
const destinations = [
    path.join(__dirname, 'taskr', 'shared', 'utils.js'),
    path.join(__dirname, 'form', 'shared', 'utils.js')
];
// --- End Configuration ---

try {
    console.log('🔄 Starting sync...');
    
    // Read the content from the central utils.js file
    const sharedContent = fs.readFileSync(sharedSourcePath, 'utf8');

    // Loop through each destination and write the content
    destinations.forEach(destPath => {
        // Ensure the destination directory exists
        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        
        // Write the file
        fs.writeFileSync(destPath, sharedContent, 'utf8');
        
        // Log a success message for this destination
        console.log(`✅ Synced to: ${path.relative(__dirname, destPath)}`);
    });

    console.log('\n✨ Sync complete! Your projects are up-to-date.');

} catch (error) {
    console.error('❌ Error during sync:', error);
}
