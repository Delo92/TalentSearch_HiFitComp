# HiFitComp - Talent Competition & Voting Platform

## Overview
A comprehensive talent competition and voting platform where artists, models, bodybuilders, and performers compete for public votes. Features dark entertainment-themed UI inspired by the "One Music" HTML template.

## Architecture
- **Frontend**: React + TypeScript + Vite, Tailwind CSS, shadcn/ui, Framer Motion
- **Backend**: Express.js with Firebase Auth (JWT Bearer tokens)
- **Database**: PostgreSQL (Neon) via Drizzle ORM (users, profiles, competitions, votes, livery)
- **Firebase**: Auth + Firestore (project: hifitcomp) - users/brands/orders stored in Firestore, auth via Firebase Admin SDK
- **Google Drive**: Talent images hosted in HiFitComp > [talent] > images folder structure
- **Vimeo**: Talent videos hosted in HiFitComp > [talent] folder structure, TUS upload protocol
- **Styling**: Dark theme with orange/amber (#FF5A09) primary colors, Poppins/Playfair Display fonts

## Project Structure
- `shared/schema.ts` - Database models: users, sessions, talentProfiles, competitions, contestants, votes, votePurchases, siteLivery
- `shared/models/auth.ts` - User and session table definitions
- `server/firebase-admin.ts` - Firebase Admin SDK initialization, Firestore CRUD for users
- `server/auth-middleware.ts` - Firebase JWT auth middleware, role/level guards (requireAdmin, requireTalent)
- `server/google-drive.ts` - Google Drive API: upload/list/delete images, proxy file streaming
- `server/vimeo.ts` - Vimeo API: list videos, create TUS upload tickets, delete videos
- `server/storage.ts` - DatabaseStorage class with all PostgreSQL CRUD operations
- `server/routes.ts` - API routes with Firebase auth middleware
- `server/seed.ts` - Sample data seeder + test account seeder (runs on startup)
- `client/src/lib/firebase.ts` - Firebase client SDK: Auth + Analytics initialization
- `client/src/hooks/use-auth.ts` - Firebase Auth hook with login/register/logout/resetPassword
- `client/src/lib/queryClient.ts` - TanStack Query client with auth token injection
- `client/src/components/site-navbar.tsx` - Shared transparent fixed navbar (One Music style)
- `client/src/components/site-footer.tsx` - Shared dark minimal footer
- `client/src/pages/login.tsx` - Login/Register/Password Reset page
- `client/src/pages/` - Landing, Login, Competitions, CompetitionDetail, TalentProfilePublic, Dashboard, AdminDashboard, HostDashboard, TalentDashboard

## Key Features
- **Public**: Browse competitions, view contestants, cast votes (IP-based daily limits)
- **Talent Users (Level 2)**: Create profiles, upload images to Google Drive, upload videos to Vimeo, apply to competitions
- **Host Users (Level 3)**: Create/manage own competitions, review applications for own events, view analytics for own events
- **Admin Users (Level 4)**: Full platform management, review all applications, view all analytics, manage site branding (Livery), manage user levels
- **Auth**: Firebase Auth (email/password) - JWT Bearer tokens, password reset via Firebase

## User Levels
- Level 1: Viewer (voter registration, name/email, purchase votes, purchase history)
- Level 2: Talent/Creator (profile management with stage name & social links, competition applications)
- Level 3: Host (create/manage own competitions, review applications, view analytics for own events)
- Level 4: Admin (full platform management, user level management, site livery, all competitions)

## Test Accounts (seeded on startup)
- viewer@test.com / TestPass123 (Level 1 - Viewer)
- talent@test.com / TestPass123 (Level 2 - Talent, stage name: "The Star")
- host@test.com / TestPass123 (Level 3 - Host)
- admin@test.com / TestPass123 (Level 4 - Admin)

## API Routes
### Auth
- `POST /api/auth/register` - Register new user (creates Firebase + Firestore + PostgreSQL user)
- `POST /api/auth/sync` - Sync Firebase user with backend on login
- `GET /api/auth/user` - Get current user info (requires Bearer token)
- `POST /api/auth/set-admin` - Set first admin (or existing admin grants access)

### Competitions
- `GET /api/competitions` - List competitions (supports ?category=X&status=Y filters)
- `GET /api/competitions/:id` - Competition detail with contestants & vote counts
- `GET /api/competitions/:id/leaderboard` - Public leaderboard with rankings & vote percentages
- `POST /api/competitions` - Create competition (host+ only, stores createdBy UID)
- `PATCH /api/competitions/:id` - Update competition (admin only)
- `DELETE /api/competitions/:id` - Delete competition (admin only)
- `POST /api/competitions/:id/vote` - Cast vote (public, IP-limited)
- `POST /api/competitions/:id/apply` - Apply as contestant (auth required)

### Talent Profiles
- `GET /api/talent-profiles/me` - Get own profile
- `POST /api/talent-profiles` - Create profile
- `PATCH /api/talent-profiles/me` - Update profile
- `GET /api/talent-profiles/:id` - Get public profile

### Google Drive (Images)
- `POST /api/drive/upload` - Upload image to talent's Drive folder
- `GET /api/drive/images` - List images from talent's Drive folder
- `DELETE /api/drive/images/:fileId` - Delete image from Drive
- `GET /api/drive/proxy/:fileId` - Proxy/stream file from Drive

### Vimeo (Videos)
- `GET /api/vimeo/videos` - List talent's videos from Vimeo folder
- `POST /api/vimeo/upload-ticket` - Get TUS upload ticket for video upload
- `DELETE /api/vimeo/videos/:videoId` - Delete video from Vimeo

### Host
- `GET /api/host/competitions` - List host's own competitions
- `GET /api/host/stats` - Host-specific analytics (own events only)
- `GET /api/host/competitions/:id/contestants` - Contestants for host's competition
- `PATCH /api/host/contestants/:id/status` - Approve/reject application (own competitions only)
- `PATCH /api/host/competitions/:id` - Update own competition
- `DELETE /api/host/competitions/:id` - Delete own competition
- `GET /api/host/competitions/:id/report` - Report for host's competition

### Invitations
- `POST /api/invitations` - Send invitation (level ≥2, can only invite lower levels)
- `GET /api/invitations/sent` - List own sent invitations (level ≥2)
- `GET /api/invitations/all` - List all invitations (admin only)
- `GET /api/invitations/token/:token` - Get invitation details (public, for accept flow)
- `DELETE /api/invitations/:id` - Delete invitation (level ≥2)

### Admin
- `GET /api/admin/stats` - Platform analytics (breakdowns by status/category, per-competition stats)
- `GET /api/admin/competitions/:id/report` - Competition report (leaderboard, revenue, purchase stats)
- `GET /api/admin/contestants` - All contestants with profiles
- `PATCH /api/admin/contestants/:id/status` - Approve/reject applications
- `GET /api/admin/users` - List all talent profiles
- `PATCH /api/admin/users/:uid/level` - Update user level
- `POST /api/admin/users/create` - Directly create user at level 1-3 (admin only)

### Livery
- `GET /api/livery` - Get all livery items
- `PUT /api/admin/livery/:imageKey` - Upload replacement image
- `DELETE /api/admin/livery/:imageKey` - Reset to default

## Secrets
- `FIREBASE_API_KEY` - Firebase client API key
- `FIREBASE_SERVICE_ACCOUNT` - Firebase Admin SDK service account JSON (also used for Google Drive)
- `GOOGLE_DRIVE_CREDENTIALS` - Same as FIREBASE_SERVICE_ACCOUNT (same service account)
- `VIMEO_ACCESS_TOKEN` - Vimeo API access token
- `VIMEO_CLIENT_ID` - Vimeo OAuth client ID
- `VIMEO_CLIENT_SECRET` - Vimeo OAuth client secret
- `SESSION_SECRET` - Express session secret

## Design System (One Music Template)
- **Section Headings**: "See what's new" subtitle + UPPERCASE h2 with letter-spacing: 10px
- **Breadcrumb Headers**: Background image with dark overlay, white box at bottom center with title
- **Event/Competition Cards**: Image on top, black bg text area below, hover inverts to #f5f9fa bg + dark text
- **Buttons**: Rectangular (no border-radius), bordered, white/black color inversion on hover (oneMusic-btn style)
- **Hero**: Full-screen with textsonar ghost text animation (CSS @keyframes textsonar)
- **Parallax Sections**: bg-fixed with dark overlay for feature highlights
- **Navbar**: Transparent fixed, logo left, nav links center, Login/Register text right
- **Footer**: Dark bg (#111), logo + nav links in single row

## User Preferences
- Dark entertainment theme matching "One Music" HTML template exactly
- Orange/amber color scheme (#FF5A09) as accent
- Black (#000) primary background
- Uppercase headings with wide letter-spacing throughout
- Animations and parallax effects
- Template images stored in client/public/images/template/
- Firebase for all auth (NOT Replit Auth)
- Google Drive for talent images, Vimeo for talent videos

## Recent Changes
- Feb 2026: Full platform implementation with database, API, and One Music dark theme UI
- Feb 2026: Complete UI redesign to match One Music HTML template patterns
- Feb 2026: Added Livery system for admin-managed site images across all pages
- Feb 2026: Integrated Firebase (hifitcomp project) with Analytics
- Feb 13, 2026: Replaced Replit Auth with Firebase Auth (email/password, JWT Bearer tokens)
- Feb 13, 2026: Added Firebase Admin SDK backend (server/firebase-admin.ts) with Firestore user CRUD
- Feb 13, 2026: Added Google Drive integration (server/google-drive.ts) for talent image management
- Feb 13, 2026: Added Vimeo integration (server/vimeo.ts) for talent video management
- Feb 13, 2026: Created login/register page with password reset support
- Feb 13, 2026: Updated all dashboard components to use Firebase auth (Bearer tokens, logout)
- Feb 13, 2026: Updated user levels: Level 1=Viewer, Level 2=Talent, Level 3=Admin
- Feb 13, 2026: Added stageName field to talent profiles, enhanced social links support
- Feb 13, 2026: Added vote_purchases table for tracking vote purchases with billing history
- Feb 13, 2026: Added billing address fields to users table and Firestore user model
- Feb 13, 2026: Created 3 test accounts (viewer/talent/admin @test.com, password: TestPass123)
- Feb 13, 2026: Added PATCH /api/auth/profile for updating user profile (name, stage name, social links, billing)
- Feb 13, 2026: Added GET/POST /api/vote-purchases for purchase history and vote buying
- Feb 13, 2026: Integrated Authorize.Net payment processing with Accept.js client-side tokenization (server/authorize-net.ts)
- Feb 13, 2026: Added guest viewer system: viewerProfiles Firestore collection for passwordless Level 1 users
- Feb 13, 2026: Built guest checkout API (POST /api/guest/checkout) with payment processing, viewer profile creation, vote purchase recording
- Feb 13, 2026: Built guest lookup API (POST /api/guest/lookup) for purchase history retrieval by name+email
- Feb 13, 2026: Created checkout page (client/src/pages/checkout.tsx) with Accept.js card form, package selection, account opt-in
- Feb 13, 2026: Created my-purchases page (client/src/pages/my-purchases.tsx) for guest viewer purchase history lookup
- Feb 13, 2026: Added "Buy Votes" button on competition detail page contestant cards
- Feb 13, 2026: Updated login page with guest viewer purchase lookup link
- Feb 13, 2026: Added Join/Host system with Firestore collections (joinSettings, joinSubmissions, hostSettings, hostSubmissions)
- Feb 13, 2026: Built Join page (client/src/pages/join.tsx) - dynamic form with admin-configurable fields, optional payment
- Feb 13, 2026: Built Host page (client/src/pages/host.tsx) - event proposal form with admin-configurable fields, optional payment
- Feb 13, 2026: Added admin dashboard tabs for Join and Host management (settings configuration + submission review)
- Feb 13, 2026: Added Join and Host links to navbar (desktop + mobile)
- Feb 13, 2026: Updated login page with guest viewer purchase lookup link
- Feb 13, 2026: Extended livery system with text content support (itemType, textContent, defaultText fields)
- Feb 13, 2026: Added hero_summary text livery item displayed below hero buttons on landing page
- Feb 13, 2026: Added text editor UI in admin livery tab with save/reset for text-type livery items
- Feb 13, 2026: Added closed-loop navigation with deep linking via query params
- Feb 14, 2026: Updated user levels: Level 3=Host, Level 4=Admin (4-level hierarchy)
- Feb 14, 2026: Added admin level management UI with color-coded role badges (red=Admin, purple=Host, blue=Talent, gray=Viewer)
- Feb 14, 2026: Added invitation system (invitations Firestore collection) with token-based invite links
- Feb 14, 2026: Invitation hierarchy: Admin invites L1-3, Host invites L1-2, Talent invites L1
- Feb 14, 2026: Admin can directly create users (POST /api/admin/users/create) at levels 1-3
- Feb 14, 2026: All other roles can only invite (not create) lower-level users
- Feb 14, 2026: Added invite dialog UI to all dashboards (admin, host, talent) with sent invitations list
- Feb 14, 2026: Added /register route with invite token support, pre-fills name/email from invitation
- Feb 14, 2026: Registration accepts inviteToken to set user level from invitation
