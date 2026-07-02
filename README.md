# React Admin Dashboard

A polished, production-ready admin dashboard template built with React and Material UI. Ideal for internal tools, analytics, and management portals.

Demo & Resources
- Video walkthrough: https://www.youtube.com/watch?v=wYpCWwD1oz0
- Community / Support: https://discord.gg/2FfPeEk2mX

Key Features
- React (Create React App) starter with modern patterns
- Material UI components and theming (light + dark)
- Responsive layout with sidebar, topbar and charts
- Data grids, charts, and reusable components (Bar, Line, Pie, StatBox)
- Authentication pages (login, signup)

Quick Start
Prerequisites
- Node.js 14+ and npm or Yarn

Install and run locally
```bash
# install
npm install

# start dev server
npm start
```

Build for production
```bash
npm run build
```

Project Structure (top-level)
- `public/` - static assets and HTML template
- `src/` - application source
	- `authentication/` - login and signup pages
	- `components/` - reusable UI components
	- `scenes/` - page views (dashboard, reports, supply, maintenance, etc.)
	- `utils/` - helpers and utilities

Available npm Scripts
- `npm start` - development server
- `npm run build` - production build
- `npm test` - run tests (if configured)

Branding & Assets
- The app title and icons are configured in `public/index.html` and `public/manifest.json`.

Tips for Development
- Keep imports case-consistent to avoid issues on case-sensitive hosts.
- Use the provided `eventbus` utilities to broadcast cross-page updates (notifications, supply, store, etc.).

Contributing
- Suggestions, bug reports, and pull requests are welcome. Please open issues with reproduction steps and environment details.

License
- See `LICENSE` (if present) for license details.

Contact
- For questions and discussion join the Discord linked above.

Enjoy building with the Zutrad-themed React Admin Dashboard!
