# Manual Instructions: Adding Users to Premium Mode

This guide explains how to manually add users to premium mode using Firebase custom claims.

## Prerequisites

1. Access to your Firebase project
2. Backend environment variables configured (Firebase Admin SDK credentials)
3. Terminal access to run Python scripts

---

## Method 1: Using User UID (Recommended)

### Step 1: Activate Virtual Environment

If you have a virtual environment (`.venv`), activate it first:

```bash
cd backend
source .venv/bin/activate  # On macOS/Linux
# OR
.venv\Scripts\activate     # On Windows
```

### Step 2: Find the User's UID

**Option A: From Firebase Console**
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to **Authentication** → **Users**
4. Find the user you want to make premium
5. Click on the user to view details
6. Copy the **User UID** (looks like: `abc123xyz456...`)

**Option B: Find by Email (Using the Script) - Recommended**
```bash
cd backend
source .venv/bin/activate  # If using virtual environment
python3 set_premium_claim.py --find user@example.com
```
This will display the user's UID and current custom claims.

### Step 3: Set Premium Claim

Run the script with the UID:

```bash
cd backend
source .venv/bin/activate  # If using virtual environment
python3 set_premium_claim.py <USER_UID>
```

Example:
```bash
python set_premium_claim.py abc123xyz456def789
```

Expected output:
```
✅ Successfully set premium claim to True for user abc123xyz456def789
   User email: user@example.com
   Custom claims: {'premium': True}
```

### Step 4: Verify the Claim

You can verify by finding the user again:
```bash
source .venv/bin/activate  # If using virtual environment
python3 set_premium_claim.py --find user@example.com
```

Or check in Firebase Console:
1. Go to Authentication → Users
2. Click on the user
3. Scroll down to see custom claims (may not be visible in UI, but it's set)

### Step 5: User Must Refresh Token

**Important**: After setting the custom claim, the user needs to get a new ID token:

**Option A: User logs out and logs back in** (simplest)

**Option B: Force token refresh** (if you've updated the frontend code)
- The user just needs to reload the page

**Option C: Verify in browser console** (for testing)
```javascript
const user = firebase.auth().currentUser;
const tokenResult = await user.getIdTokenResult(true);
console.log('Premium claim:', tokenResult.claims.premium); // Should be true
```

---

## Method 2: Find User by Email First

If you only know the email address:

```bash
cd backend
source .venv/bin/activate  # If using virtual environment

# Step 1: Find the UID
python3 set_premium_claim.py --find user@example.com

# Step 2: Copy the UID from the output, then set premium
python3 set_premium_claim.py <UID_FROM_STEP_1>
```

---

## Removing Premium Access

To remove premium access from a user:

```bash
cd backend
source .venv/bin/activate  # If using virtual environment
python3 set_premium_claim.py <USER_UID> --remove
```

This sets the premium claim to `False`.

---

## Troubleshooting

### Error: "Firebase Admin SDK not initialized"
- Check that your environment variables are set:
  - `FIREBASE_SERVICE_ACCOUNT_JSON` or
  - `FIREBASE_SERVICE_ACCOUNT_KEY_PATH`
- Make sure you're in the `backend` directory when running the script
- Ensure your virtual environment is activated (if using one)

### Error: "User not found"
- Verify the UID is correct
- Try finding the user by email first using `--find` flag
- Check that the user exists in Firebase Authentication

### User still doesn't have premium after setting claim
1. Verify the claim was set: `python set_premium_claim.py --find user@example.com`
2. Make sure the user has logged out and logged back in
3. Check browser console for the token claims (see Step 4 above)
4. Clear browser cache/localStorage if needed

### Script not found or permission denied
```bash
# Make sure you're in the backend directory
cd backend

# Make script executable (if needed)
chmod +x set_premium_claim.py

# Run with Python
python set_premium_claim.py <USER_UID>
```

---

## Quick Reference

```bash
# Activate virtual environment first (if using one)
source .venv/bin/activate

# Find user by email
python3 set_premium_claim.py --find user@example.com

# Add premium access
python3 set_premium_claim.py <USER_UID>

# Remove premium access
python3 set_premium_claim.py <USER_UID> --remove
```

---

## Security Notes

- Only run this script in a secure environment
- Don't commit service account keys to version control
- Custom claims are included in ID tokens, so users must refresh their token after changes
- Claims have a maximum size of 1000 bytes

---

## Additional Notes

- Custom claims are different from Firestore data - setting `isPremium` in Firestore won't grant premium access
- The frontend checks `tokenResult?.claims?.premium` from the ID token
- After setting the claim, the user must get a new token (logout/login) for changes to take effect

