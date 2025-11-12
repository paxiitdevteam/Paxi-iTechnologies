# Font System Documentation

## Overview
The font system uses **system fonts only** - no font files need to be downloaded. All fonts are already available on most devices.

## Font File Location
`frontend/src/assets/css/fonts.css`

## How to Use

### Option 1: Include in HTML `<head>` (Recommended)
```html
<link rel="stylesheet" href="/frontend/src/assets/css/fonts.css">
```

### Option 2: Using Path Manager System (PMS)
```html
<link rel="stylesheet" href="/frontend/src/assets/css/fonts.css">
<!-- Or use PMS path if available -->
```

## Available Font Variables

### Font Families
- `--font-primary`: System fonts (default for body text)
- `--font-display`: System fonts (for headings)
- `--font-serif`: Web-safe serif fonts
- `--font-mono`: Monospace fonts (for code)

### Font Weights
- `--font-weight-light`: 300
- `--font-weight-normal`: 400
- `--font-weight-medium`: 500
- `--font-weight-semibold`: 600
- `--font-weight-bold`: 700

### Font Sizes
- `--font-size-xs`: 0.75rem (12px)
- `--font-size-sm`: 0.875rem (14px)
- `--font-size-base`: 1rem (16px)
- `--font-size-lg`: 1.125rem (18px)
- `--font-size-xl`: 1.25rem (20px)
- `--font-size-2xl`: 1.5rem (24px)
- `--font-size-3xl`: 1.875rem (30px)
- `--font-size-4xl`: 2.25rem (36px)
- `--font-size-5xl`: 3rem (48px)

## Usage Examples

### Using CSS Variables
```css
.my-heading {
    font-family: var(--font-display);
    font-weight: var(--font-weight-bold);
    font-size: var(--font-size-3xl);
}
```

### Using Utility Classes
```html
<h1 class="font-display font-bold">Heading</h1>
<p class="font-primary font-normal">Body text</p>
<code class="font-mono">Code example</code>
```

## System Fonts Used
- **macOS/iOS**: San Francisco (SF Pro)
- **Windows**: Segoe UI
- **Android**: Roboto
- **Linux**: System default sans-serif
- **Fallback**: Helvetica Neue, Arial, sans-serif

## Benefits
✅ No downloads required  
✅ Fast loading (fonts already on device)  
✅ Consistent appearance across platforms  
✅ Professional look  
✅ Easy to maintain  

