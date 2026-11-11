# Verification record

## Passed in this development environment

- Production Vite build.
- Four Node tests: invalid canvas allocation rejection, size/extension formatting, exactly ten unique styles, ZIP payload/CRC/directory integrity.
- Browser image upload with a synthetic 640 × 480 transparent PNG.
- Local WebP export at 320 × 240: 3.8 KB versus 550.6 KB input.
- Actual WebP download, verified by the operating system's file-type inspection.
- PNG export and preview at 320 × 240: 6.2 KB.
- Multiple-file picker accepted a landscape and portrait image together.
- Batch 50% WebP resize: 640 × 480 → 320 × 240; 320 × 640 → 160 × 320.
- Batch JPEG exports: 6.5 KB and 4.5 KB, both preserving per-image proportions.
- Downloaded batch ZIP; `unzip -t` validated both entries without errors.
- Browser correctly disabled unsupported AVIF encoding.
- Creative style selection changed the active card; Generate remained disabled with no endpoint configured.
- Responsive viewport checks at 390 px and 768 px: document width matched viewport width, with no horizontal overflow. Desktop visual inspection at 1280 × 900.
- A React empty-preview-src warning found during testing was fixed by omitting unset image URLs.

## Limits and release checks

- No real AI endpoint or credentials were supplied. Real generation, provider-side cancellation, provider errors, and AI batch output have not been end-to-end tested. The adapter and UI are implemented; they do not simulate AI results.
- No GitHub repository was supplied. Actual GitHub Actions execution and live Pages hosting were not tested. The workflow, lockfile, static build and relative asset base are included.
- No physical iOS, Android or tablet hardware was available. Viewport checks are not a substitute for device testing.
- Native drag/drop, corrupt-file UI handling, all quality levels, every preset and mixed partial-failure batches were not individually exercised in the browser. Dimension guards have automated tests.
- Before release, test your own representative photographs and mobile devices, and, if connecting AI, validate the gateway contract and spending/abuse limits from README.
