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

## User Preferences
- Dark entertainment theme matching "One Music" HTML template
- Orange/amber color scheme (#FF5A09)
- Animations and gradient effects throughout
- Parallax hero sections on landing page

## Recent Changes
- Feb 2026: Full platform implementation with database, API, and One Music dark theme UI
