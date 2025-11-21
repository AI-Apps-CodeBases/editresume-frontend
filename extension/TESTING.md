# Extension Testing Guide

## Issue: "Error loading jobs" / "Failed to fetch"

### Quick Fix Steps

1. **Reload Extension**
   - Open Chrome and go to `chrome://extensions/`
   - Find "EditResume" extension
   - Click the reload icon 🔄

2. **Debug Extension Storage**
   - Right-click the extension icon → "Inspect popup"
   - In the DevTools Console, paste and run:
   ```javascript
   chrome.storage.sync.get(null, (data) => {
     console.log('Current storage:', data);
     console.log('API Base:', data.apiBase || 'NOT SET');
   });
   ```

3. **Fix Storage (if API Base is localhost or NOT SET)**
   ```javascript
   chrome.storage.sync.set({
     apiBase: 'https://editresume-staging.onrender.com',
     appBase: 'https://staging.editresume.io'
   }, () => {
     console.log('✅ Fixed! Close and reopen the popup.');
   });
   ```

4. **Verify the Fix**
   - Close the popup
   - Reopen it
   - Try loading saved jobs again

### Alternative: Use debug-storage.js

Copy and paste the entire contents of `debug-storage.js` into the popup's DevTools console. It will automatically check and fix the storage.

### Expected Behavior

After fixing:
- **API Base URL**: `https://editresume-staging.onrender.com`
- **App Base URL**: `https://staging.editresume.io`
- **Saved Jobs**: Should load without errors
- **Save Job**: Should work on LinkedIn job postings

### For Local Development

To test against localhost:
```javascript
chrome.storage.sync.set({
  apiBase: 'http://localhost:8000',
  appBase: 'http://localhost:3000'
});
```

### Common Issues

**"Failed to fetch"**
- Extension storage still has `localhost:8000`
- Extension wasn't reloaded after code changes
- CORS issue (check browser console for details)

**"Error loading jobs"**
- No auth token (sign in at staging.editresume.io first)
- API endpoint not responding
- Network connectivity issue

### Debugging Tips

1. **Check Network Tab**
   - Open popup DevTools → Network tab
   - Try loading jobs
   - Look for failed requests
   - Check the request URL (should be staging, not localhost)

2. **Check Console for Errors**
   - Look for CORS errors
   - Look for authentication errors
   - Look for network errors

3. **Test API Directly**
   ```bash
   curl https://editresume-staging.onrender.com/health
   ```
   Should return `{"status":"ok",...}`
