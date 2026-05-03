# Deployment

## Netlify

Build command:

```bash
npm run build
```

Publish directory:

```text
dist
```

Add environment variables from `.env.example`.

## Vercel

Use the Vite preset and set the output directory to `dist`.

## Android

Use `SETUP_ANDROID.md`.

## Custom Domain

Point the client domain to Netlify or Vercel, then configure Supabase Auth allowed redirect URLs.
