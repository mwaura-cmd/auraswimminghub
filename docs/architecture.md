# Aura Swimming Hub Architecture

## Tech Stack
- Frontend: Next.js 15 App Router, TailwindCSS, Framer Motion, Recharts
- Backend Services: Firebase Auth, Firestore, Cloud Functions, Firebase Storage
- Payments: Paystack transaction initialize and verify routes

## Firestore Collections
- users
- students
- programs
- sessions
- bookings
- payments
- assessments
- badges
- certificates
- resources
- notifications

## Route Map
- /: Marketing website
- /programs: Programs grid
- /about: Academy details
- /gallery: Media gallery preview
- /book: Booking and payment flow
- /login: Signup/login role entry
- /portal: Learner and parent dashboard (student,parent)
- /instructor: Instructor dashboard (instructor)
- /admin: Mission control dashboard (admin)

## Backend Automations
- bookingConfirmation: adds booking confirmation notification
- inviteAfterTwoBookings: creates portal invite after second booking
- assessmentReminder: scheduled reminder to instructors
- certificateGeneration: creates certificates when assessment marks pro level
- paymentReminders: weekly payment reminder notifications
