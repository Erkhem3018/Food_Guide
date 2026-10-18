# figma-make-app

React + Vite + Tailwind CSS project running inside Figma Make.

## Development Server

A Vite development server is **already running** on `$PORT` (default 8443). You don't need to start it manually.

- Preview URL: The user can access the running app through the preview panel
- Hot reload: Changes to source files are reflected immediately

## Project Structure

This is the canonical project structure. Start with task-relevant files below. Only follow imports or inspect other files when required, when a documented path is missing, or when the repository contradicts this guide.

- `src/main.tsx` - React entrypoint; imports `src/index.css` and mounts `src/App.tsx` into the `#root` element
- `src/App.tsx` - Primary application component and the usual starting point for UI work
- `src/data/recipes.ts` - Recipe data and the `Recipe` type; recipes without inline steps get them from `src/data/recipeSteps.ts`
- `src/i18n/` - English/Mongolian translations. Every user-facing string goes through `tr("English text")`; the Mongolian is in `mn.ts` (UI) and `mn-recipes-*.ts` (recipe descriptions and steps, by recipe id and step order). When you add or change English text, add the Mongolian too. In dev, missing keys log `[i18n] missing mn` in the console.
- `src/data/nominCatalog.ts` + `server/nomin.ts` - Live grocery prices from nomin.mn (used as the price guide for every store). The catalog maps recipe ingredients to a Nomin search term plus must/exclude words; the server reads Nomin's public search data route and caches results. Ingredients Nomin doesn't sell online fall back to labelled estimates.
- `src/lib/api.ts` - Client for the Mise API. `API_URL` defaults to the Railway deployment; set `VITE_API_URL` to use another backend (e.g. `http://localhost:8080`).
- `src/lib/ratings.ts` - Community ratings from the API (recipes carry no built-in ratings). `src/lib/units.ts` converts ingredient amounts between metric and imperial.
- `server/` - The Mise API (Hono + Postgres), deployed to Railway project `mise-backend`, service `mise-api` (built from `server/Dockerfile` via `railway.json`). It handles accounts (password + Google), bearer-token sessions, each user's synced app data (one JSON document), ratings, weekly-plan email via Resend (sent only to the signed-in account's own address) and Nomin prices. Schema is created on boot in `server/db.ts`; rate limits are stored in Postgres. It reuses `src/data/*` and `src/i18n/mn.ts`, so keep those free of browser-only code. Env vars on Railway: `DATABASE_URL`, `RESEND_API_KEY`, `EMAIL_FROM`, `GOOGLE_CLIENT_ID`, `NOMIN_CONTACT`. The Railway database is private-network only; to run the server locally, point `DATABASE_URL` at a local Postgres (`cd server && npm install && DATABASE_URL=postgres://... npm run dev`) and set `VITE_API_URL=http://localhost:8080` for the app. Deploy with `railway up --service mise-api`.
- Guests use the app without an account; their data stays in localStorage and moves into the account if they sign up.
- `src/index.css` - Global CSS entrypoint and Tailwind CSS v4 import
- `index.html` - Vite HTML shell containing the `#root` element and loading `src/main.tsx`
- `package.json` - Project dependencies and the Vite build, development, preview, and formatting scripts
- `vite.config.ts` - Vite configuration with React, Tailwind CSS v4, and Figma Make plugins plus the `@` alias for `src`
- `.mise.toml` - Toolchain versions for Node.js and pnpm

## Dependencies

- Runtime: React 19 and React DOM 19
- Styling: Tailwind CSS v4 with the `@tailwindcss/vite` plugin
- Build tooling: Vite 8, TypeScript 5.7, and `@vitejs/plugin-react`
- Formatting: oxfmt

## Styling

This project uses **Tailwind CSS v4** through the `@tailwindcss/vite` plugin configured in `vite.config.ts`. `src/index.css` imports Tailwind with `@import 'tailwindcss';`. Use Tailwind utility classes directly in JSX and put global CSS or Tailwind v4 theme customization in `src/index.css`. This scaffold does not need a Tailwind config file or PostCSS config.

`src/main.tsx` imports `src/index.css`, so global font wiring belongs in `src/index.css`. Keep CSS `@import` statements first, then add any `@font-face` rules and font-family defaults there.

## Code quality

- Use double quotes for strings containing apostrophes (`"We're here to help"`), or escape them in single-quoted strings. An unescaped apostrophe in a single-quoted string breaks the build.
- Ensure JSX tags are closed and braces are balanced.
- Export components as default exports.
