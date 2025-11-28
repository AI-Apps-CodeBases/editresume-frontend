// Debug script to check and fix extension storage
// Run this in the extension popup's DevTools console

console.log('=== EditResume Extension Debug ===');

// Check current storage
chrome.storage.sync.get(null, (data) => {
    console.log('Current storage:', data);
    console.log('API Base:', data.apiBase || 'NOT SET');
    console.log('App Base:', data.appBase || 'NOT SET');
    console.log('Token:', data.token ? 'SET (length: ' + data.token.length + ')' : 'NOT SET');

    // Fix if needed - force production
    const needsFix = !data.apiBase || 
                     !data.appBase || 
                     data.apiBase.includes('staging') || 
                     data.apiBase.includes('localhost') ||
                     data.appBase.includes('staging') || 
                     data.appBase.includes('localhost');
    
    if (needsFix) {
        console.log('\n⚠️  FIXING: Setting to production...');
        const getApiBase = (appBase) => {
            if (!appBase || appBase.includes('staging') || appBase.includes('localhost')) {
                return 'https://editresume-api-prod.onrender.com';
            }
            if (appBase.includes('editresume.io') && !appBase.includes('staging')) {
                return 'https://editresume-api-prod.onrender.com';
            }
            return 'https://editresume-api-prod.onrender.com';
        };
        
        chrome.storage.sync.set({
            apiBase: getApiBase(data.appBase),
            appBase: 'https://editresume.io'
        }, () => {
            console.log('✅ Fixed! Now using production URLs.');
            console.log('Please close and reopen the extension popup.');
        });
    } else {
        console.log('\n✅ Storage looks good!');
    }
});
