# Build Small

Small, reproducible AI builds that live inside the tools you already use. Built with [Astro](https://astro.build), deployed to GitHub Pages.

## Write a post

1. Copy `src/content/blog/_post-template.md` to `src/content/blog/your-post.md` (no leading underscore).
2. Fill it in. Put downloadable files (templates, Shortcut exports) in `public/downloads/` and link to `/downloads/<file>`.
3. Commit and push to `main`. The site redeploys automatically.

Files that start with `_` in `src/content/blog/` are ignored, so drafts stay private until you rename them.

## Run locally

```sh
npm install
npm run dev
```

## One-time GitHub setup

Repo Settings, Pages, Source: **GitHub Actions**.
