# ImportScore Chrome Extension

Manifest V3 extension that extracts vehicle data from the currently open listing page and opens ImportScore with a prefilled import form.

## Supported Sources

- mobile.de
- AutoScout24
- leboncoin.fr
- lacentrale.fr

## How It Works

1. Open a supported vehicle listing in Chrome.
2. Click the ImportScore extension action.
3. The background service worker injects the content extractors into the active tab.
4. The content script reads the open page DOM in this order:
   - JSON-LD and structured data
   - meta and Open Graph tags
   - visible DOM facts and selectors
   - page title as weak fallback
   - URL slug as last weak fallback
5. The extension opens ImportScore with an encoded extraction payload.
6. The SaaS reads the payload and prefills the form.

Confirmed fields only come from JSON-LD, meta tags, or visible DOM content. Title and URL-derived fields are sent as inferred fields and never overwrite confirmed fields.

## Load Unpacked In Chrome

1. Open `chrome://extensions`.
2. Enable `Developer mode`.
3. Click `Load unpacked`.
4. Select this repository's `extension` folder.
5. Pin the extension if desired.
6. Visit a supported listing page and click the extension icon.

## App URL

The extension currently opens:

```text
https://importscore.app/
```

If you need to test against local development, change `APP_URL` in `extension/background.ts` and `extension/background.js` to:

```text
http://localhost:3000/
```

Chrome loads the `.js` files. The `.ts` files are kept beside them as typed source for maintainability.
