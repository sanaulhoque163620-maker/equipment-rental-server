# GearVault — Backend REST API Server

Backend REST API server for **GearVault**, built with Node.js, Express, MongoDB, JWT Authentication, and Stripe Checkout integration.

## Core Endpoints
- `GET /equipment` — Server-side search, category/availability/price filtering, sorting & pagination
- `POST /jwt` — Issue signed JWT access tokens
- `POST /bookings` & `POST /create-checkout-session` — Rental booking & Stripe payment gateway
- `GET /admin/stats` & `GET /owner/stats/:email` — Real-time platform & owner analytics
-