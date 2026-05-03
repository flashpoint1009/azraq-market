# Installation

1. Create a Supabase project.
2. Copy `.env.example` to `.env`.
3. Fill `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4. Run SQL files in `supabase/schema.sql`, then the migration files in order.
5. Install dependencies:

```bash
npm install
```

6. Run locally:

```bash
npm run dev
```

7. Build:

```bash
npm run build
```
