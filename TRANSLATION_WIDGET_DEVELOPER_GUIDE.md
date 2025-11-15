# 🌐 Translation Widget - Developer Guide

## Overview

The **Translation Widget** is a powerful development tool for managing multi-language support on the Paxi iTechnologies website and applications. It provides both manual translation (via CLS - Centralized Language System) and automatic translation (via Google Translate) in a user-friendly floating widget interface.

---

## 🎯 Features

### **Dual Translation Methods**

1. **Manual Translation (CLS)** - Professional, curated translations
   - High-quality, context-aware translations
   - Maintained by developers/translators
   - Consistent terminology
   - Full control over content

2. **Automatic Translation (Google Translate)** - Instant translation
   - Real-time translation for any language
   - No maintenance required
   - Quick solution for unsupported languages
   - Fallback option

### **User Experience**

- **Floating Widget**: Fixed position, always accessible
- **Responsive Design**: Works on all screen sizes
- **Smart Positioning**: Avoids overlap with other widgets (chat widget)
- **Visual Feedback**: Clear language selection interface
- **Persistent Selection**: Remembers user's language preference

---

## 📁 File Structure

```
frontend/src/
├── components/
│   └── translation-plugin.js      # Main translation widget component
├── cls/
│   ├── translations/
│   │   ├── en.js                  # English translations
│   │   ├── fr.js                  # French translations
│   │   ├── ar.js                  # Arabic translations
│   │   ├── de.js                  # German translations
│   │   └── es.js                  # Spanish translations
│   ├── lang-core.js               # CLS core functionality
│   └── lang-switcher.js           # Language switching logic
```

---

## 🚀 Quick Start

### **1. Basic Integration**

The translation widget is automatically initialized on all pages. To manually initialize:

```javascript
// Initialize translation widget
window.translationPlugin = new TranslationPlugin({
    position: 'bottom-left',        // Widget position
    clsEnabled: true,               // Enable CLS translations
    googleTranslateEnabled: true,  // Enable Google Translate
    showWidget: true                // Show floating widget
});

// Initialize the plugin
await window.translationPlugin.initialize();
```

### **2. Configuration Options**

```javascript
const options = {
    // Position: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right'
    position: 'bottom-left',
    
    // Enable CLS (Centralized Language System)
    clsEnabled: true,
    
    // Enable Google Translate
    googleTranslateEnabled: true,
    
    // Show floating widget UI
    showWidget: true
};
```

### **3. Current Implementation**

The widget is initialized in `index.html` and other pages:

```javascript
// In index.html or other pages
window.translationPlugin = new TranslationPlugin({
    position: 'bottom-left',  // Bottom-left to avoid chat widget (bottom-right)
    clsEnabled: true,
    googleTranslateEnabled: true,
    showWidget: true
});

// Initialize after DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.translationPlugin.initialize();
    });
} else {
    window.translationPlugin.initialize();
}
```

---

## 🔧 Configuration

### **Widget Positioning**

The widget supports 4 positions:

- **`bottom-left`** (Current) - Bottom-left corner
- **`bottom-right`** - Bottom-right corner
- **`top-left`** - Top-left corner
- **`top-right`** - Top-right corner

**Current Setup:**
- Translation Widget: `bottom-left`
- Chat Widget: `bottom-right`
- No overlap, both visible

### **CSS Positioning**

The widget uses fixed positioning with viewport constraints:

```css
.translation-plugin-bottom-left {
    position: fixed;
    bottom: 20px;
    left: 20px;
    z-index: 9999;
    max-width: calc(100vw - 40px);  /* Prevents overflow */
}
```

### **Mobile Responsive**

On mobile devices, the widget automatically adjusts:

```css
@media (max-width: 768px) {
    .translation-plugin-bottom-left {
        bottom: 90px;  /* Above chat button */
        left: 10px;
        z-index: 9997;  /* Below chat widget */
    }
}
```

---

## 📝 Adding New Languages

### **Step 1: Create Translation File**

Create a new translation file in `frontend/src/cls/translations/`:

```javascript
// frontend/src/cls/translations/it.js (Italian example)
export const translations = {
    // Common
    common: {
        welcome: "Benvenuto",
        hello: "Ciao",
        // ... more translations
    },
    
    // Homepage
    homepage: {
        hero: {
            title: "Gestione IT Intelligente. Risultati Chiari.",
            // ... more translations
        }
    },
    
    // Chat Widget
    chat: {
        title: "Chatta con noi",
        welcome: "👋 Ciao! Sono il tuo assistente IA...",
        // ... all chat translations
    },
    
    // ... all other sections
};

export default translations;
```

### **Step 2: Register Language in CLS**

Update `frontend/src/cls/lang-core.js`:

```javascript
// Add to supported languages
const SUPPORTED_LANGUAGES = {
    'en': { name: 'English', flag: '🇬🇧', rtl: false },
    'fr': { name: 'Français', flag: '🇫🇷', rtl: false },
    'ar': { name: 'العربية', flag: '🇸🇦', rtl: true },
    'de': { name: 'Deutsch', flag: '🇩🇪', rtl: false },
    'es': { name: 'Español', flag: '🇪🇸', rtl: false },
    'it': { name: 'Italiano', flag: '🇮🇹', rtl: false }  // NEW
};
```

### **Step 3: Update Translation Widget**

The widget automatically detects new languages from CLS. No additional code needed!

### **Step 4: Test**

1. Open the website
2. Click the translation widget (🌐)
3. Select the new language
4. Verify all translations appear correctly

---

## 🎨 Styling & Customization

### **Custom Colors**

The widget uses CSS variables for easy customization:

```css
.translation-plugin-toggle {
    background: var(--primary-color, #006d77);
    color: white;
}

.translation-plugin-toggle:hover {
    background: var(--secondary-color, #83c5be);
}
```

### **Custom Positioning**

Modify the CSS in `translation-plugin.js`:

```javascript
// In addWidgetStyles() method
.translation-plugin-bottom-left {
    bottom: 20px;
    left: 20px;
    /* Add custom styles */
}
```

### **Menu Styling**

```css
.translation-plugin-menu {
    min-width: 320px;
    max-width: 400px;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.15);
}
```

---

## 🔌 Integration with CLS

### **How It Works**

1. **CLS Initialization**: Widget initializes CLS system
2. **Translation Loading**: Loads translation files dynamically
3. **Language Switching**: Updates all `[data-translate]` elements
4. **Persistence**: Saves language preference to localStorage

### **Using Translations in HTML**

```html
<!-- Automatic translation via data-translate attribute -->
<h1 data-translate="homepage.hero.title"></h1>
<p data-translate="homepage.hero.subtitle"></p>

<!-- With parameters -->
<span data-translate="footer.copyright" data-translate-params='{"year": 2024}'></span>
```

### **Using Translations in JavaScript**

```javascript
// Get translation
const title = window.CLS.translate('homepage.hero.title');

// With parameters
const message = window.CLS.translate('contact.welcome', { name: 'John' });

// Listen for language changes
window.CLS.onLanguageChange((lang) => {
    console.log('Language changed to:', lang);
    // Update UI
});
```

---

## 🧪 Testing

### **Manual Testing Checklist**

- [ ] Widget appears in correct position
- [ ] Widget doesn't overlap with chat widget
- [ ] All languages are selectable
- [ ] CLS translations work correctly
- [ ] Google Translate works correctly
- [ ] Language preference persists on page reload
- [ ] Mobile responsive positioning
- [ ] Menu opens and closes correctly
- [ ] All translations display correctly
- [ ] RTL languages (Arabic) display correctly

### **Browser Testing**

Test in:
- Chrome/Edge (Chromium)
- Firefox
- Safari
- Mobile browsers

### **Language Testing**

Test all supported languages:
- English (en)
- French (fr)
- Arabic (ar) - RTL
- German (de)
- Spanish (es)

---

## 🐛 Troubleshooting

### **Widget Not Visible**

**Problem**: Widget is not displaying

**Solutions**:
1. Check if `showWidget: true` is set
2. Check browser console for errors
3. Verify CSS is loaded
4. Check z-index conflicts

### **Translations Not Updating**

**Problem**: Language changes but translations don't update

**Solutions**:
1. Verify CLS is initialized: `window.CLS.initialized`
2. Check translation files are loaded
3. Verify `[data-translate]` attributes are present
4. Check browser console for errors

### **Widget Overlaps with Other Elements**

**Problem**: Widget overlaps with chat widget or other elements

**Solutions**:
1. Adjust `position` option
2. Modify z-index values
3. Update mobile responsive CSS
4. Check viewport constraints

### **Google Translate Not Working**

**Problem**: Google Translate widget doesn't appear

**Solutions**:
1. Check internet connection
2. Verify `googleTranslateEnabled: true`
3. Check browser console for Google Translate errors
4. Verify Google Translate script is loaded

---

## 📊 Current Status

### **Supported Languages (CLS)**

✅ **English (en)** - Complete
✅ **French (fr)** - Complete
✅ **Arabic (ar)** - Complete (RTL support)
✅ **German (de)** - Complete
✅ **Spanish (es)** - Complete

### **Translation Coverage**

- ✅ Homepage content
- ✅ Navigation menu
- ✅ Footer
- ✅ Contact form
- ✅ Chat widget (48 translation keys)
- ✅ Services pages
- ✅ About page
- ✅ All static content

### **Features Implemented**

- ✅ Floating widget UI
- ✅ CLS integration
- ✅ Google Translate integration
- ✅ Language persistence
- ✅ Responsive design
- ✅ Mobile optimization
- ✅ RTL support (Arabic)
- ✅ Smart positioning
- ✅ Viewport constraints

---

## 🚀 Best Practices

### **1. Translation File Organization**

Organize translations by page/section:

```javascript
export const translations = {
    homepage: { /* ... */ },
    services: { /* ... */ },
    contact: { /* ... */ },
    chat: { /* ... */ }
};
```

### **2. Consistent Naming**

Use consistent key naming:

```javascript
// Good
homepage.hero.title
contact.form.submit
chat.widget.welcome

// Bad
homepageTitle
contactSubmitButton
chatWelcome
```

### **3. Parameter Usage**

Use parameters for dynamic content:

```javascript
// Translation: "Welcome, {{name}}!"
window.CLS.translate('welcome', { name: 'John' });
// Result: "Welcome, John!"
```

### **4. RTL Support**

For RTL languages (Arabic), ensure:
- Text alignment is correct
- Icons/buttons are positioned correctly
- Layout adapts to RTL direction

### **5. Testing**

Always test:
- All languages
- All pages
- Mobile devices
- Different browsers

---

## 📚 API Reference

### **TranslationPlugin Class**

```javascript
class TranslationPlugin {
    constructor(options = {})
    async initialize()
    async initializeCLS()
    async initializeGoogleTranslate()
    createWidget()
    createCLSControls()
    attachWidgetEvents()
    addWidgetStyles()
}
```

### **CLS API**

```javascript
// Initialize
await window.CLS.initialize('en');

// Translate
window.CLS.translate(key, params);

// Set language
await window.CLS.setLanguage('fr');

// Get current language
const lang = window.CLS.getCurrentLanguage();

// Listen for changes
window.CLS.onLanguageChange(callback);
```

---

## 🔄 Updates & Maintenance

### **Adding New Translation Keys**

1. Add key to `en.js` (base language)
2. Add translations to all other language files
3. Use key in HTML: `data-translate="new.key"`
4. Test in all languages

### **Updating Existing Translations**

1. Edit translation file: `frontend/src/cls/translations/[lang].js`
2. Update the specific key
3. Test the change
4. Verify in browser

### **Removing Languages**

1. Remove translation file
2. Update `lang-core.js` (remove from SUPPORTED_LANGUAGES)
3. Test to ensure no errors

---

## 📖 Related Documentation

- [Centralized Language System (CLS)](./TECH_STACK_DOCUMENTATION.md#centralized-language-system-cls)
- [Translation Files Structure](./TECH_STACK_DOCUMENTATION.md#translation-files)
- [Translations Verification](./TRANSLATIONS_VERIFICATION.md)
- [Development Rules](./DEVELOPMENT_RULES.md)

---

## ✅ Summary

The **Translation Widget** is a comprehensive development tool that provides:

- ✅ **Dual Translation Methods** - CLS + Google Translate
- ✅ **5 Supported Languages** - en, fr, ar, de, es
- ✅ **Smart Positioning** - No overlap with other widgets
- ✅ **Responsive Design** - Works on all devices
- ✅ **Easy Integration** - Simple initialization
- ✅ **Developer Friendly** - Easy to extend and customize

**Perfect for:**
- Multi-language website development
- International application support
- Quick language switching during development
- Testing translations across languages
- Providing users with language options

---

**Last Updated**: Current Session  
**Status**: ✅ Production Ready  
**Maintained By**: Development Team

