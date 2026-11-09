# Banner

`banner.html` is the source of the Resubuild banner: a 1200×600 page drawn with the tokens in
`apps/web/DESIGN.md` (desk `#EEF1EF`, ledger green `#1E6B52`, marker `#F2D04B`, IBM Plex Sans, the
CV in the export serif). Edit the HTML, then render it.

## Where the image is used

| File                                   | Size     | Used by                                                                    |
| -------------------------------------- | -------- | -------------------------------------------------------------------------- |
| `apps/web/public/resubuild-banner.jpg` | 1800×900 | Landing page hero, `og:image` (`apps/web/src/lib/site.ts`), README, GitHub |
| `yorty.info` portfolio                 | 1800×900 | `src/assets/projects/resubuild-banner.jpg`                                 |

GitHub has no API for the repository social preview. Upload the JPG by hand in
**Settings → General → Social preview**.

## Render

Run from this folder. Chrome headless loads the Google Fonts; raise `--virtual-time-budget` if the
text comes out in a system font.

```sh
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

"$CHROME" --headless --hide-scrollbars --virtual-time-budget=6000 \
  --window-size=1200,600 --force-device-scale-factor=1.5 \
  --screenshot="$PWD/banner.png" "file://$PWD/banner.html"
sips -s format jpeg -s formatOptions 92 banner.png --out ../../apps/web/public/resubuild-banner.jpg
rm banner.png
```

For a 1200×630 Open Graph image, use `--window-size=1200,630 --force-device-scale-factor=1`. The
canvas centers itself, so the extra height becomes an even band above and below.

## Before you change it

- Follow `apps/web/DESIGN.md`: no gradients, no all-caps labels, no pill buttons; yellow only for
  text the AI changed.
- Keep the stack line and the features in step with the README.
- After replacing the JPG, copy it to the portfolio and refresh the LinkedIn and X caches.
