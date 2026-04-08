# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server (Next.js on http://localhost:3000)
npm run build    # Production build
npm run lint     # Run ESLint
```

No test suite is configured.

## Architecture

Single-page Next.js app (App Router) with one API route:

- **`app/page.tsx`** — The entire UI. Manages file list state, drag-and-drop upload, drag-to-reorder, and triggers the merge. All PDF ordering happens client-side; the file array order is what gets sent to the API.
- **`app/api/merge/route.ts`** — POST endpoint. Receives `multipart/form-data` with a `files` field (multiple PDFs), merges them in the order received using `pdf-lib`, and streams back the merged PDF.

## Key details

- **pdf-lib** does all PDF manipulation server-side; no external service is involved.
- File reordering is done via drag-and-drop on the client. The merge order is determined solely by the order of files in the `files` state array.
- Alphabetical sort uses `localeCompare` with `{ numeric: true }` so natural ordering is respected (e.g. `pdf-10` after `pdf-9`, not after `pdf-1`).
- Tailwind CSS v4 is used (PostCSS plugin, no `tailwind.config.*` file needed).
