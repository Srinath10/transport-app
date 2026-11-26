# Trip Manager

Mobile-first trip, expense and profit tracker for small transport businesses (lorries, tippers, buses…) in Sri Lanka. English and Tamil.

## Run

```sh
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/ (installable PWA, works offline)
npm run lint
```

## How it works

- **Local-first:** all data lives in the browser (`localStorage`; receipt photos in IndexedDB). No backend yet.
- **Multi-tenant model:** every record carries an `orgId`, ready for Supabase. Draft schema with row-level security: [`supabase/schema.sql`](supabase/schema.sql).
- **Roles:** owner (everything), driver (adds entries on assigned vehicles, never sees money), accountant (read-only). Until sign-in exists, owners can preview other roles from Settings.

## Code map

| Path | What |
| --- | --- |
| `src/types.ts` | Data model |
| `src/store.ts` | State, persistence, v1 → v2 migration, actions |
| `src/calc.ts` | Trip totals, mileage, profit split per leg |
| `src/viewer.ts` | Role permissions |
| `src/i18n.ts` | English + Tamil strings |
| `src/format.ts` | Rs / number / date formatting |
| `src/screens/` | One file per screen |
