# Centralized Language System (CLS)

## Overview

The Centralized Language System (CLS) is a comprehensive language management solution for the Paxiit website. All language-related files are stored in this dedicated folder.

## Structure

```
cls/
├── lang-core.js          # Core language system
├── lang-switcher.js      # Language switcher UI component
├── translations/         # Translation files (one per language)
│   ├── en.js            # English
│   ├── fr.js            # French
│   ├── es.js            # Spanish
│   ├── de.js            # German
│   └── ar.js            # Arabic
└── README.md            # This file
```

## Features

- ✅ **Centralized**: All language files in one location
- ✅ **Separate Files**: Each language has its own translation file
- ✅ **Auto-detection**: Automatically detects browser language
- ✅ **Dynamic Loading**: Loads translations on demand
- ✅ **Fallback Support**: Falls back to default language if translation missing
- ✅ **Parameter Replacement**: Supports dynamic values in translations
- ✅ **Easy Switching**: Simple API for language switching

## Usage

### 1. Include CLS in HTML

```html
<!-- Load CLS Core first -->
<script type="module" src="/frontend/src/cls/lang-core.js"></script>

<!-- Then load language switcher if needed -->
<script src="/frontend/src/cls/lang-switcher.js"></script>
```

### 2. Use Translations in JavaScript

```javascript
// Wait for CLS to initialize
CLS.onLanguageChange(() => {
    // Get translation
    const welcomeText = CLS.translate('home.title');
    console.log(welcomeText); // "Welcome to Paxiit"
    
    // With parameters
    const copyright = CLS.translate('footer.copyright', { year: 2024 });
    console.log(copyright); // "© 2024 Paxiit. All rights reserved."
});
```

### 3. Use Translations in HTML

```html
<!-- Add data-translate attribute -->
<h1 data-translate="home.title"></h1>
<p data-translate="home.description"></p>

<!-- With parameters -->
<span data-translate="footer.copyright" data-translate-params='{"year": 2024}'></span>
```

### 4. Add Language Switcher

```html
<!-- Add container for language switcher -->
<div id="lang-switcher"></div>

<script>
    // Initialize language switcher
    const switcher = new LanguageSwitcher('lang-switcher');
    switcher.initialize();
</script>
```

### 5. Change Language Programmatically

```javascript
// Set language
await CLS.setLanguage('fr');

// Get current language
const currentLang = CLS.getCurrentLanguage();

// Get available languages
const availableLangs = CLS.getAvailableLanguages();
```

## Translation File Format

Each translation file exports a `translations` object:

```javascript
export const translations = {
    common: {
        welcome: "Welcome",
        hello: "Hello"
    },
    home: {
        title: "Welcome to Paxiit",
        subtitle: "Smart IT Management"
    }
};
```

## Translation Keys

Use dot notation to access nested translations:

- `common.welcome` → "Welcome"
- `home.title` → "Welcome to Paxiit"
- `nav.home` → "Home"

## Parameter Replacement

Use `{{parameter}}` syntax in translations:

```javascript
// Translation
footer: {
    copyright: "© {{year}} Paxiit. All rights reserved."
}

// Usage
CLS.translate('footer.copyright', { year: 2024 })
// Result: "© 2024 Paxiit. All rights reserved."
```

## Adding New Languages

1. Create a new translation file in `translations/` folder (e.g., `it.js` for Italian)
2. Follow the same structure as existing translation files
3. Add language code to available languages in `lang-core.js`
4. Add language name and flag to `lang-switcher.js` if needed

## Best Practices

- ✅ Always use absolute paths: `/frontend/src/cls/...`
- ✅ Never use relative import paths
- ✅ Keep translation keys consistent across all languages
- ✅ Use descriptive key names (e.g., `home.title` not `title`)
- ✅ Group related translations (e.g., all navigation items under `nav`)
- ✅ Test all languages after adding new translations

## Rules

- 🔴 **NEVER use relative import paths** - Always use absolute paths starting with `/frontend/src/cls/`
- 🔴 **NEVER add duplicate export statements** - Only ONE export: `export const translations = {`
- 🔴 **NEVER modify working language configuration** - Keep current setup exactly as is
- ✅ **ALWAYS verify translations.js has single export** - Check for duplicate exports before changes
- ✅ **ALWAYS use absolute paths** - `/frontend/src/cls/scripts/lang/lang-core.js`
- ✅ **ALWAYS verify Path Manager System configuration** - Ensure translations paths are correct

