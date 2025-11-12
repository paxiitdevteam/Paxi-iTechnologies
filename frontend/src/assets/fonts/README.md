# Fonts Folder

## Location
`frontend/src/assets/fonts/`

## Purpose
Store custom font files here if you want to use them in the project.

## Supported Font Formats
- `.woff2` (recommended - best compression)
- `.woff` (fallback)
- `.ttf` (TrueType)
- `.otf` (OpenType)

## Current Setup
The project currently uses **system fonts only** (no downloads required):
- macOS/iOS: San Francisco (SF Pro)
- Windows: Segoe UI
- Android: Roboto
- Linux: System default
- Fallback: Helvetica Neue, Arial

## How to Add Custom Fonts

1. **Place font files** in this folder (`frontend/src/assets/fonts/`)

2. **Update `frontend/src/assets/css/fonts.css`** with `@font-face` declarations:

```css
@font-face {
    font-family: 'YourFontName';
    src: url('../fonts/YourFont-Regular.woff2') format('woff2'),
         url('../fonts/YourFont-Regular.woff') format('woff');
    font-weight: 400;
    font-style: normal;
    font-display: swap;
}

@font-face {
    font-family: 'YourFontName';
    src: url('../fonts/YourFont-Bold.woff2') format('woff2'),
         url('../fonts/YourFont-Bold.woff') format('woff');
    font-weight: 700;
    font-style: normal;
    font-display: swap;
}
```

3. **Update CSS variables** in `fonts.css`:

```css
:root {
    --font-primary: 'YourFontName', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
```

## Font File Naming Convention
Recommended naming:
- `FontName-Regular.woff2`
- `FontName-Bold.woff2`
- `FontName-Light.woff2`
- `FontName-Medium.woff2`

## Notes
- **No downloads required** - System fonts work perfectly
- Custom fonts are optional
- Always include system fonts as fallback
- Use `font-display: swap` for better performance

