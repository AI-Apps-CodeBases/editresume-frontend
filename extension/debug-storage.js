// Debug script to check and fix extension storage
// Run this in the extension popup's DevTools console

console.log('=== EditResume Extension Debug ===');

// Check current storage
chrome.storage.sync.get(null, (data) => {
    console.log('Current storage:', data);
    console.log('API Base:', data.apiBase || 'NOT SET');
    console.log('App Base:', data.appBase || 'NOT SET');
    console.log('Token:', data.token ? 'SET (length: ' + data.token.length + ')' : 'NOT SET');

    // Fix if needed
    if (!data.apiBase || data.apiBase === 'http://localhost:8000') {
        console.log('\n⚠️  FIXING: Setting API base to staging...');
        chrome.storage.sync.set({
            apiBase: 'https://editresume-staging.onrender.com',
            appBase: data.appBase || 'https://staging.editresume.io'
        }, () => {
            console.log('✅ Fixed! API base now set to staging.');
            console.log('Please close and reopen the extension popup.');
        });
    } else {
        console.log('\n✅ Storage looks good!');
    }
});
