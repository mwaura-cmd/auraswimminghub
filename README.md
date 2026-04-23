# Aura Swimming Hub

 Premium full-stack swimming academy platform built with Next.js 15, Firebase, Cloudinary, and Paystack.

## Platform Modules
- Marketing website with cinematic dark visuals and conversion sections
- Multi-step booking flow with Paystack payment initialization
- Learner + parent portal dashboard
- Instructor dashboard for classes, attendance, and assessments
- Admin mission control dashboard for analytics and operations
- Firebase Cloud Functions automation for booking and notification workflows

## Local Setup
1. Install dependencies:
	npm install

2. Copy environment template:
	cp .env.example .env.local

3. Fill Firebase, Cloudinary, and Paystack credentials in .env.local

4. Run the Next app:
	npm run dev

5. Optional: run Firebase Functions locally:
	cd functions
	npm install
	npm run build

## Key Routes
- /
- /programs
- /about
- /gallery
- /book
- /login
- /portal
- /instructor
- /admin

## Firebase Components
- Firestore security rules in firestore.rules
- Realtime Database rules in database.rules.json
- Cloud functions in functions/src/index.ts

## Cloudinary
- Gallery uploads use unsigned uploads to Cloudinary from the browser.
- Required env vars: NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET.
- Optional env var: NEXT_PUBLIC_CLOUDINARY_UPLOAD_FOLDER (defaults to gallery).

## Paystack
- Initialize endpoint: app/api/paystack/initialize/route.ts
- Verify endpoint: app/api/paystack/verify/route.ts

## Notes
- Route access control is role-based (student, parent, instructor, admin).
- The second booking triggers a learner portal invite notification.
- Collection architecture is documented in docs/architecture.md.
