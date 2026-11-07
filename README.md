# Personal Site

A site for tracking what the next bin pickup is, built in Remix.

## Shape

- `app/actions/controller.tsx` owns the top-level route actions.
- `app/actions/home-page.tsx` and `app/actions/document.tsx` render the page.
- `app/data/collection-schedule.ts` loads the ReCollect schedule and decides what the page shows.
- `app/ui/` holds the view pieces the page is built from.
- `app/actions/public/` contains the browser runtime entry.
- `app/routes.ts` defines the shared route contract used by server and browser modules for type-safe hrefs.
- `app/router.ts` wires routes to handlers and installs the standard Remix component renderer used by actions.
- `app/assets.ts` owns the server-side asset pipeline used by the asset route and render middleware.
- Root `public/` contains static files served unchanged from the app root.

## Commands

```sh
npm i
npm run dev
npm run start
npm run lint
npm run lint:fix
npm run format
npm run format:check
npm run type-check
npm run test
```
