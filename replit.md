# StarVote - Talent Competition & Voting Platform

## Overview
A comprehensive talent competition and voting platform where artists, models, bodybuilders, and performers compete for public votes. Features dark entertainment-themed UI inspired by the "One Music" HTML template.

## Architecture
- **Frontend**: React + TypeScript + Vite, Tailwind CSS, shadcn/ui, Framer Motion
- **Backend**: Express.js with Replit Auth (OIDC)
- **Database**: PostgreSQL (Neon) via Drizzle ORM
- **Styling**: Dark theme with orange/amber (#FF5A09) primary colors, Poppins/Playfair Display fonts

## Project Structure
- `shared/schema.ts` - Database models: users, sessions, talentProfiles, competitions, contestants, votes
- `server/storage.ts` - DatabaseStorage class with all CRUD operations
- `server/routes.ts` - API routes with auth middleware
- `server/seed.ts` - Sample data seeder (runs on startup)
- `client/src/components/site-navbar.tsx` - Shared transparent fixed navbar (One Music style)
- `client/src/components/site-footer.tsx` - Shared dark minimal footer
- `client/src/pages/` - Landing, Competitions, CompetitionDetail, TalentProfilePublic, Dashboard, AdminDashboard, TalentDashboard

## Key Features
- **Public**: Browse competitions, view contestants, cast votes (IP-based daily limits)
- **Talent Users**: Create profiles (bio, images, videos), apply to competitions
- **Admin Users**: Create/manage competitions, review applications, view analytics
- **Auth**: Replit Auth (OIDC) - login via /api/login, logout via /api/logout

## API Routes
- `GET /api/competitions` - List all competitions
- `GET /api/competitions/:id` - Competition detail with contestants & vote counts
- `POST /api/competitions/:id/vote` - Cast vote (public, IP-limited)
- `POST /api/competitions/:id/apply` - Apply as contestant (auth required)
- `GET/POST/PATCH /api/talent-profiles/*` - Profile management
- `GET /api/admin/*` - Admin stats, contestant management

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

## Recent Changes
- Feb 2026: Full platform implementation with database, API, and One Music dark theme UI
- Feb 2026: Complete UI redesign to match One Music HTML template patterns (hero, breadcrumbs, event cards, section headings, navbar, footer)
