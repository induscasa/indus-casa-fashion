# AGENTS.md

## Project overview

This repository is a single-page luxury storefront for Indus Casa Fashion. The site is intentionally static and lightweight: most presentation logic lives in `index.html`, with embedded CSS and a small amount of JavaScript for UI polish.

## Working conventions

- Keep changes minimal and consistent with the existing premium brand direction.
- Prefer editing `index.html` for markup, style, and interactions; do not introduce frameworks, bundlers, or package dependencies unless explicitly requested.
- Preserve the current visual language: deep navy backgrounds, warm gold accents, serif editorial typography, and refined luxury styling.
- Treat the supplied image assets as source material; do not redraw, alter, or overwrite the provided logo or product imagery.
- All enquiry/contact CTAs should point to the Instagram account listed in the README unless there is an explicit requirement to change it.
- When adding sections or content, keep the page responsive and polished across desktop, tablet, and mobile viewports.

## File and asset guidance

- Primary implementation file: `index.html`
- Brand assets live at the repository root as PNG files such as `indus-casa-logo.png` and `product-*.png`
- If a visual change is needed, prefer updating the existing CSS and structure rather than creating additional asset files.

## Local preview

There is no build step for this project. Use one of these options:

- Open `index.html` directly in a browser.
- Or run: `python3 -m http.server 8000` from the repo root and visit `http://localhost:8000`.

## Completion checklist

Before finishing a change, verify:

- The page still renders without broken asset references.
- Layout remains readable and balanced on mobile and desktop sizes.
- Brand colors, typography, and luxury styling are preserved.
- Any CTA links still point to the intended destination and do not regress the brand message.
