# Real Firebase Setup

## 1) Create Firebase Project
- Open Firebase Console.
- Create/select your project.
- Add a Web App and copy SDK config values.

## 2) Enable Authentication
- Go to Authentication -> Sign-in method.
- Enable Email/Password provider.

## 3) Fill Local Environment
- Edit .env.local in project root.
- Set these values:
  - NEXT_PUBLIC_FIREBASE_API_KEY
  - NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
  - NEXT_PUBLIC_FIREBASE_PROJECT_ID
  - NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  - NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
  - NEXT_PUBLIC_FIREBASE_APP_ID
  - PAYSTACK_SECRET_KEY
  - PAYSTACK_PUBLIC_KEY

## 4) Configure Firestore + Storage
- In Firebase Console, create Firestore database (production mode recommended).
- Create Storage bucket.
- Deploy rules from this repo:
  - firebase deploy --only firestore:rules,storage

## 5) Create Role Profiles
The app reads role from users/{uid}.role.

- student and parent can self-signup in UI.
- instructor/admin should be provisioned by admin:
  1. Create auth user in Firebase Authentication.
  2. Create Firestore doc users/{uid} with:
     - uid: string
     - email: string
     - role: instructor or admin
     - displayName: string

## 6) Run Locally
- Restart dev server after .env.local updates:
  - npm run dev
- Login at /login using real Firebase credentials.

## Notes
- Demo login only appears when Firebase config is missing.
- Once Firebase keys are valid, real authentication is used automatically.
