# Rojlo (रोजलो)

> **"Rojlo Moj lo na Mile Chog Lo"**  
> A modern, full-stack classifieds and local services discovery platform built for Indian cities.

[![Next.js](https://img.shields.io/badge/Next.js-16.3.4-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.8-blue?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green?style=flat-square&logo=mongodb)](https://www.mongodb.com/)
[![Cloudinary](https://img.shields.io/badge/Cloudinary-Media-blueviolet?style=flat-square&logo=cloudinary)](https://cloudinary.com/)

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
  - [Public & User Portal](#public--user-portal)
  - [Comprehensive Admin Dashboard](#comprehensive-admin-dashboard)
- [Tech Stack](#-tech-stack)
- [Project Architecture](#-project-architecture)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Configuration](#environment-configuration)
  - [Running the App](#running-the-app)
- [Environment Variables Guide](#-environment-variables-guide)
- [Deployment (Vercel)](#-deployment-vercel)
- [Security & Performance](#-security--performance)
- [License](#-license)

---

## 🌟 Overview

**Rojlo** is an end-to-end classified ads and city services marketplace. Users can easily discover services and local attractions across major Indian states, cities, and micro-localities. The platform offers a seamless ad posting workflow with client-side image compression, a coin-based monetization system, UPI payment verification, and an extensive admin management suite.

---

## ✨ Key Features

### Public & User Portal

- **City & Area Explorer**: Hierarchical discovery organized by State &rarr; City &rarr; Local Area with search filtering.
- **Service Categories**: Dedicated listings for Wellness, Companionship, Escorts, and Local Hotspots.
- **Classified Ads System**:
  - Multi-image uploads with automatic canvas-based image compression.
  - Interactive image carousel viewer on ad detail pages.
  - Direct contact actions (Phone call, WhatsApp, Telegram).
  - Ad status workflow: Pending Review, Approved, Active, Rejected.
- **Coin-Based Ad Posting**:
  - Posting ads costs coins based on package configuration.
  - Integrated **Buy Coins** section with dynamic UPI QR code generator and UPI ID display.
  - User submits payment screenshot/reference ID &rarr; Admin verifies and credits coins.
  - **Coupon Codes**: Apply promotional codes for instant discounts or bonus coins.
- **Passwordless Authentication**:
  - Secure email-based 6-digit OTP verification via Nodemailer/SMTP.
  - Cryptographically secure HMAC token binding with cooldown protection.
  - JWT session tokens stored in secure, `httpOnly`, `SameSite=Lax` cookies.
- **User Dashboard**:
  - View published ads, pending submissions, coin balance, and profile details.
  - Edit or renew existing ads.
- **Safety & Compliance**:
  - Modal **Age Gate** requiring 18+ user confirmation before browsing.
  - Standard legal pages: Terms of Service, Privacy Policy, Disclaimer, Refund Policy, and Return Policy.

---

### Comprehensive Admin Dashboard (`/admin`)

- **Role-Based Access Control (RBAC)**:
  - **Main Admin**: Full administrative privileges, user management, and sub-admin creation.
  - **Sub-Admins**: Fine-grained permissions per section (Ads, Cities, SEO, Payments, etc.).
- **Live Metrics & Stats**: Overview of total ads, active users, pending payments, and supported cities.
- **Ads Moderation**: Review submitted ads with photo previews, approve, reject with feedback, or edit details.
- **State, City & Local Area Management**:
  - Create and manage states, cities, and micro-localities.
  - Batch import / export state data via JSON/CSV.
- **City SEO Management**: Configure custom SEO titles, meta descriptions, H1 headers, and rich content per city for search indexing.
- **Payment Request Approvals**: View incoming UPI transactions with payment proof, verify against bank statement, and approve coin top-ups in one click.
- **Coin Packages Manager**: Configure coin amounts, bonus coins, and INR pricing.
- **Coupon Code Engine**: Create coupon codes with flat/percent discounts, minimum spends, maximum uses, and expiration dates.
- **VIP Placement Control**: Feature premium ads in high-visibility VIP sections.
- **Dynamic UPI Settings**: Change the official UPI ID, payee name, and upload new QR codes directly from the admin panel without redeploying.

---

## 🛠 Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | [Next.js 16.3](https://nextjs.org/) (App Router, Turbopack, Server Actions) |
| **Frontend UI** | [React 19](https://react.dev/), Tailwind CSS 4, Custom Pastel Color System |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) (Strict Mode) |
| **Database** | [MongoDB Atlas](https://www.mongodb.com/) (Native driver with persistent file store fallback) |
| **File Storage** | [Cloudinary](https://cloudinary.com/) (Automated image upload & CDN delivery) |
| **Authentication** | Custom JWT (`jsonwebtoken`) + HMAC-SHA256 OTP (`crypto`) + Bcrypt (`bcryptjs`) |
| **Email Service** | [Nodemailer](https://nodemailer.com/) (SMTP with HTML email verification templates) |
| **Deployment** | [Vercel](https://vercel.com/) |

---

## 📁 Project Architecture

```plaintext
Rojloo/
├── public/                     # Static assets (favicons, banners, placeholders)
├── src/
│   ├── app/
│   │   ├── (site)/             # Public customer-facing routes
│   │   │   ├── about/          # About page
│   │   │   ├── contact/        # Contact us page
│   │   │   ├── login/          # User login & signup page
│   │   │   ├── places/         # Explore states, cities, and local areas
│   │   │   ├── post-ad/        # Ad posting wizard, profile, buy coins
│   │   │   ├── services/       # Service category listings
│   │   │   └── ...legal/       # Terms, privacy, disclaimer, refund policies
│   │   ├── admin/              # Dedicated Admin Portal
│   │   │   ├── ads/            # Manage and moderate classified ads
│   │   │   ├── city/           # Manage cities and localities
│   │   │   ├── city-seo/       # City-specific SEO tags & content
│   │   │   ├── coupon/         # Coupon codes generator & manager
│   │   │   ├── payment-request/# Review and approve user UPI payments
│   │   │   ├── set-coins/      # Coin package pricing settings
│   │   │   ├── sub-admins/     # RBAC sub-admin team management
│   │   │   ├── upi/            # Manage QR code and UPI details
│   │   │   └── vip/            # Manage VIP ad tier assignments
│   │   ├── api/                # Next.js Serverless Route Handlers
│   │   │   ├── admin/          # Protected admin API routes
│   │   │   ├── ads/            # CRUD operations for ads
│   │   │   ├── auth/           # OTP verification, JWT auth, sessions
│   │   │   ├── coin-packages/  # Packages and wallet routes
│   │   │   └── upload/         # Cloudinary media upload endpoint
│   │   ├── layout.tsx          # Root layout with providers & fonts
│   │   └── globals.css         # Global styles with Tailwind CSS 4
│   ├── components/             # Reusable UI component library
│   │   ├── ad-detail/          # Ad carousel and detail widgets
│   │   ├── admin/              # Admin navigation, layout & context
│   │   ├── post-ad/            # Ad posting form, coin purchase, profile
│   │   ├── age-gate.tsx        # 18+ Age verification gate modal
│   │   ├── navbar.tsx          # Site header & responsive navigation
│   │   └── footer.tsx          # Site footer & quick links
│   ├── lib/                    # Shared business logic and utilities
│   │   ├── models/             # Data models (User, Ad, City, UPI, VIP, etc.)
│   │   ├── admin-access.ts     # Admin RBAC permission validators
│   │   ├── cloudinary.ts       # Cloudinary SDK wrapper
│   │   ├── compress.ts         # Client canvas image compressor
│   │   ├── db.ts               # MongoDB client singleton & connection pool
│   │   ├── email.ts            # Nodemailer transport & HTML templates
│   │   ├── jwt.ts              # JWT signing, verification & token extraction
│   │   └── otp.ts              # HMAC secure OTP generation & verification
│   └── proxy.ts                # Middleware protecting admin routes & sessions
├── next.config.ts              # Next.js security headers, image domains & redirects
├── tsconfig.json               # TypeScript compiler configurations
└── package.json                # Project dependencies and npm scripts
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: `v20.x` or higher
- **npm** or **yarn** / **pnpm**
- **MongoDB**: A free cluster on [MongoDB Atlas](https://www.mongodb.com/atlas) or a local MongoDB server
- **Cloudinary Account**: For media uploads ([cloudinary.com](https://cloudinary.com/))
- **SMTP Account**: Gmail App Password or custom SMTP server for sending OTPs

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/surajchandr1c/Rojloo.git
   cd Rojloo
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```
   Fill in your credentials in `.env.local` (see [Environment Variables Guide](#-environment-variables-guide)).

### Running the App

```bash
# Start development server with Turbopack
npm run dev

# Run production build
npm run build

# Start production server
npm start

# Run ESLint check
npm run lint
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

---

## 🔑 Environment Variables Guide

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `MONGODB_URI` | **Required**. MongoDB connection string. | `mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority` |
| `MONGODB_DB` | Database name. | `rojlo` |
| `JWT_SECRET` | **Required**. Minimum 32-character random secret key for signing tokens. | `openssl rand -base64 32` |
| `JWT_TOKEN_EXPIRY` | User JWT expiration time. | `30d` |
| `OTP_HASH_SECRET` | Secret used to HMAC-hash OTPs (falls back to `JWT_SECRET`). | Random 32+ char string |
| `ADMIN_EMAIL` | **Required**. Email used for main admin panel access. | `admin@example.com` |
| `ADMIN_PASSWORD` | **Required**. Password for main admin. Supports plain text or bcrypt hash (`$2a$12$...`). | `vanni12` or `$2a$12$...` |
| `ADMIN_TOKEN` | **Required**. Secret token stored in admin session cookie. | `rojlo_admin_secret_token` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name for image uploads. | `your_cloud_name` |
| `CLOUDINARY_API_KEY` | Cloudinary API Key. | `1234567890` |
| `CLOUDINARY_API_SECRET` | Cloudinary API Secret. | `abcde-secret` |
| `SMTP_HOST` | SMTP server host for sending verification emails. | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP port (`465` for SSL, `587` for TLS). | `587` |
| `SMTP_USER` | SMTP username / sender email address. | `your_email@gmail.com` |
| `SMTP_PASS` | SMTP password (or Gmail App Password). | `your_app_password` |
| `SMTP_FROM` | "From" header display name and email. | `Rojlo <noreply@rojlo.com>` |
| `NEXT_PUBLIC_SITE_NAME`| Public display name for the site. | `Rojlo` |
| `NEXT_PUBLIC_SITE_URL` | Public production URL. | `https://rojlo.vercel.app` |
| `NEXT_PUBLIC_UPI_ID`   | Default UPI VPA for coin payments. | `rojloofficial@bank` |
| `NEXT_PUBLIC_UPI_NAME` | Default Payee name for UPI transactions. | `Rojlo Official` |

---

## 🌐 Deployment (Vercel)

1. Push your repository to GitHub.
2. Import the repository into **[Vercel](https://vercel.com/)**.
3. Under **Project Settings &rarr; Environment Variables**, add all the variables listed in the table above.
4. In **MongoDB Atlas**: Ensure your Network Access includes `0.0.0.0/0` (allow access from anywhere) so Vercel's serverless functions can connect.
5. Trigger deployment. Next.js will compile and deploy automatically.

---

## 🛡️ Security & Performance

- **Security Headers**: Configured in `next.config.ts` including Content Security Policy (`CSP`), `Strict-Transport-Security` (`HSTS`), `X-Frame-Options` (`SAMEORIGIN`), and `X-Content-Type-Options`.
- **Client-Side Image Compression**: Compresses photos before uploading to save bandwidth and Cloudinary storage.
- **Strict Rate Limiting**: In-memory rate limiting on sensitive endpoints (`/api/auth/start-register`, `/api/admin/login`).
- **Timing-Safe OTP Verification**: Uses byte-level comparison to mitigate timing attacks against OTP hashes.
- **Protected Admin Routes**: Proxied via Next.js middleware ensuring unauthenticated requests cannot access admin endpoints or UI.

---

## 📄 License

This project is private and proprietary. All rights reserved.