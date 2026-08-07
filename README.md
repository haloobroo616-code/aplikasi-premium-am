# Up AM Premium - Vercel Deployment Guide

To deploy this app to Vercel and fix the login error, you must follow these steps:

## 1. Set Environment Variables
In your Vercel project settings, go to **Environment Variables** and add the following keys with values from your `firebase-applet-config.json`:

- `VITE_FIREBASE_API_KEY`: The `apiKey` field.
- `VITE_FIREBASE_PROJECT_ID`: The `projectId` field.
- `VITE_FIREBASE_AUTH_DOMAIN`: The `authDomain` field.
- `VITE_FIREBASE_STORAGE_BUCKET`: The `storageBucket` field.
- `VITE_FIREBASE_MESSAGING_SENDER_ID`: The `messagingSenderId` field.
- `VITE_FIREBASE_APP_ID`: The `appId` field.
- `VITE_FIREBASE_FIRESTORE_DATABASE_ID`: Usually `(default)`.

Also add these if you use them:
- `AM_API_URL`: Your Alight Motion API URL.
- `AM_API_KEY`: Your Alight Motion API Key.

## 2. Why Login Failed?
The login failed because Vercel doesn't have access to your `firebase-applet-config.json` file by default (it's often gitignored or not included in the build). By setting the environment variables above, the server can connect to the database.

## 3. Deployment
After setting the variables, redeploy your app on Vercel.

---
Built with Google AI Studio.
