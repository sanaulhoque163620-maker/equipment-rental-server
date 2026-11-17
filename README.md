# Equipment Rental Platform - Server

This is the backend server for the Equipment Rental Platform, built with Express.js and MongoDB.

## Live URL
- Server Live Link: (Add your deployed Vercel/Render link here later)

## Key Features
- Role-Based Access Control (RBAC) using custom JWT middlewares (`verifyToken`, `verifyAdmin`, `verifyOwner`, `verifyRenter`)
- Server-side search, filtering, sorting, and pagination for equipment
- Secure payment processing via Stripe Checkout
- Dynamic analytics APIs for Admin and Equipment Owners
- Automated cron job to update expired rentals and send email notifications

## NPM Packages Used
- express
- cors
- dotenv
- mongodb
- jsonwebtoken
- stripe
- node-cron
- nodemailer
## API Structure
- `/users` - User registration, role management, and profile updates
- `/requipment` - Equipment listing, search, filtering, and approval workflows
- `/bookings` - Rental booking creation and status tracking
- `/create-checkout-session` - Stripe payment integration
- `/analytics` - Platform and owner business performance metrics
