# AI Image Studio

A lightweight React + Vite image toolkit, deployable entirely to GitHub Pages. Runtime dependencies: React and React DOM only. The optimiser works independently of AI configuration.

## Local setup

Install Node.js 22.12+ (or Node 24), then from this directory:

```sh
npm ci
npm run dev
```

Run `npm test` for validation unit tests, `npm run build` for the production bundle, and `npm run preview` to serve that bundle locally. Commit `package-lock.json` for reproducible installs.

## GitHub Pages deployment

1. Create a GitHub repository and put **the contents of this directory at its root**, including `.github`, `.gitignore`, and `package-lock.json`.
2. Push to the `main` branch.
3. In repository **Settings → Pages → Build and deployment**, choose **GitHub Actions**.
4. In **Actions**, run **Deploy to GitHub Pages** (or push another commit). The workflow installs, tests, builds and deploys. Its `github-pages` environment shows the website URL.

No separate hosting provider is required for the website or optimiser. Relative Vite base `./` supports both `https://USER.github.io/REPO/` and root/custom-domain hosting. Navigation uses in-page hashes, with no server routes or history fallback. Optionally set the repository Actions variable `VITE_BASE_PATH` to `/REPO/` or `/` if an explicit absolute base is preferred. All assets use Vite's base handling.

Official deployment reference: https://vite.dev/guide/static-deploy#github-pages

## Image Optimiser

- Drag/drop or browse JPG, PNG, WebP or AVIF; maximum 30 MB and 24 megapixels, with 8,192 px per side.
- Convert, resize, compress, preview and download locally with Canvas. Files are never sent by this tool.
- JPEG uses a white background for transparency. PNG quality is fixed/lossless at the pixel encoding level; resizing still changes pixels. JPEG/WebP/AVIF quality settings use lossy encoding.
- Detects actual encoder support, including AVIF; unsupported formats are disabled. Browsers may decode AVIF without being able to export it.
- Debounced estimates encode the current settings; final output reports actual bytes and percentage change. Some outputs can be larger than the input.
- Presets fit the image inside the named box, preserving its original aspect ratio. Percentage resizing uses original dimensions. Custom dimensions can be unlocked.
- Canvas exports strip metadata and flatten animation to one frame. Colour profiles and HDR may change. No promise of byte-for-byte losslessness is made.
- Unsupported/corrupt files and excessive dimensions produce errors. Mobile memory limits vary; reduce image dimensions if a browser cannot process a large file.

## Creative Studio and secure integration

Exactly ten selectable aesthetics, source preview, upload replacement, progress/cancel, side-by-side before/after and download. Thumbnails are original vector mood illustrations, **not generated output examples**. There is no affiliation with named studios.

**AI generation is unconfigured by default.** GitHub Pages cannot execute a backend or protect secrets. Never store an API key in frontend code, a `VITE_` environment variable, GitHub repository, URL, or browser storage. GitHub Actions secrets embedded in a frontend bundle also become public.

To enable real transformations, connect an existing secure gateway that calls your chosen image-editing provider. This project does not subscribe to or deploy a paid service. Gateway hosting/provider selection is intentionally left to you. Without one, all local tools still work and the studio honestly displays configuration required.

1. Implement the gateway contract below on your secure server, using its server-side secret store for provider credentials.
2. Copy `.env.example` to `.env.local` for local development and set `VITE_AI_ENDPOINT=https://YOUR-GATEWAY/transform`.
3. For Pages, set the **public endpoint URL only** in repository **Settings → Secrets and variables → Actions → Variables → VITE_AI_ENDPOINT**, then rerun the deployment.

### Gateway contract

`POST <VITE_AI_ENDPOINT>` with multipart form data:

- `image`: binary uploaded image
- `style`: one of `ghibli`, `pixar`, `disney`, `anime`, `watercolour`, `oil`, `cyberpunk`, `comic`, `pencil`, `clay`

Return HTTP 200 with binary `image/png`, `image/jpeg`, `image/webp` or `image/avif`. The client validates type, size and decodability. Non-2xx responses show a safe error, and HTTP 429 asks the user to retry later. The browser timeout is two minutes. Client cancellation does not guarantee cancellation of provider billing; propagate cancellation in your gateway where supported.

The gateway must validate MIME type/signature, dimensions, file size and style allowlist server-side; map the style ID to a server-owned transformation prompt; invoke an **actual image-editing model** with the uploaded image; and return image bytes. Keep provider SDKs and keys on that server. Set CORS to the exact deployed origin, handle OPTIONS if needed, enforce request/time/response limits and rate limits, and cap provider spending. CORS is not authentication or abuse protection. Use quotas or an appropriate challenge mechanism if exposing the gateway publicly. Do not accept arbitrary upstream URLs or client-supplied provider credentials.

The sole frontend integration seam is `src/ai.js` (`transformImage(file, style, signal) → Promise<Blob>`). Swap this adapter or your gateway provider without changing the UI. Uploading/selecting styles never calls the gateway; only Generate does. The UI discloses that generation uploads the image.

## Project structure

- `src/main.jsx`: shared upload/preview components and both independent workflows
- `src/image.js`: local image validation, encoding and capability detection
- `src/ai.js`: provider-neutral gateway adapter
- `src/styles.js`: ten style definitions
- `src/style.css`: responsive layout, accessible focus states, reduced motion
- `.github/workflows/deploy.yml`: main-branch Pages deployment
- `tests/image.test.js`: allocation safeguards, size formatting and style count

## Verification

See `TESTING.md` for checks performed and remaining device/API verification. No live AI provider is configured or tested. Deploying the workflow requires a repository owned by you with Pages enabled.

## Batch processing

Both upload zones accept multiple files via browse or drag/drop: up to 20 images, 30 MB each, 100 MB combined. Invalid files are reported while valid files remain usable. Replacing images replaces the entire batch.

The optimiser processes sequentially to limit peak canvas memory. Original dimensions are retained initially; percentage and fit presets apply relative to each image. Custom width with aspect lock recalculates each image's height; unlocked custom dimensions apply exactly to all. The estimate is labelled for the first image; each completed output has its actual size and reduction. Each result can be downloaded separately, or use **Prepare all downloads (ZIP)** and download the archive. Filenames include sequence numbers to avoid collisions. ZIP packaging uses stored entries, because image data is already compressed; archives over 300 MB are blocked to limit memory use.

Creative Studio applies the selected aesthetic to every image sequentially after the explicit Generate action. It reports progress, individual failures and successful comparisons/downloads. Cancel stops the current request and prevents subsequent requests; completed outputs are retained. Each API request may incur provider charges. No live AI batch requests were made during development.

Decoded batch input is also limited to 60 megapixels in total to reduce memory pressure. Files beyond that limit are reported individually. The application uses system fallbacks if its optional Google Fonts stylesheet is unavailable; image processing does not depend on fonts.
