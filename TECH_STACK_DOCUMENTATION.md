# Paxi iTechnologies - Technical Stack Documentation

## Table of Contents
1. [Overview](#overview)
2. [Contact Form to Roundcube Integration](#contact-form-to-roundcube-integration)
3. [Reverse Proxy Configuration (Nginx Bypass)](#reverse-proxy-configuration-nginx-bypass)
4. [Path Manager System (PMS)](#path-manager-system-pms)
5. [Centralized Language System (CLS)](#centralized-language-system-cls)
6. [API Path Manager (APIM)](#api-path-manager-apim)
7. [CI/CD Process](#cicd-process)
8. [Git Workflow](#git-workflow)
9. [Server Management](#server-management)
10. [Deployment Process](#deployment-process)
11. [Standard Development Procedures](#standard-development-procedures)

---

## Overview

This documentation outlines the complete technical architecture and development procedures for Paxi iTechnologies applications and SaaS platforms. All systems are designed to work seamlessly across development and production environments while maintaining path consistency, language support, and automated deployment.

### Core Principles
- **Single Source of Truth**: All paths managed through PMS
- **No Hardcoded Paths**: All file operations use PMS
- **Environment Agnostic**: Same code works in dev and production
- **Automated Deployment**: CI/CD with validation before production
- **Reverse Proxy Bypass**: Direct file serving for specific paths (e.g., `/mail`)

---

## Contact Form to Roundcube Integration

### Architecture Overview

The contact form integration connects the website's contact form directly to Roundcube webmail via Mail Station SMTP, bypassing the reverse proxy for email delivery while maintaining all website paths intact.

### Implementation Details

#### 1. Frontend Contact Form (`frontend/src/pages/contact.html`)

**Key Features:**
- Uses APIM (API Path Manager) for endpoint resolution
- Integrates with CLS for translations
- Validates form data before submission
- Handles errors gracefully with user-friendly messages

**Code Pattern:**
```javascript
// API endpoint resolution using APIM
let apiUrl = '/api/contact';
if (window.APIM) {
    if (window.APIM.endpoints && window.APIM.endpoints.contact && window.APIM.endpoints.contact.send) {
        apiUrl = window.APIM.endpoints.contact.send;
    } else if (typeof window.APIM.getURL === 'function') {
        apiUrl = window.APIM.getURL('contact', 'send') || apiUrl;
    }
}

// Submit to API
const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData)
});
```

#### 2. Backend Contact Handler (`backend/routes/contact.js`)

**Key Features:**
- Environment detection (production vs. local dev)
- SMTP configuration for Mail Station
- Email sanitization (XSS prevention)
- Message persistence to JSON file
- Error handling with detailed logging

**SMTP Configuration:**
```javascript
// Environment detection
const isProduction = process.env.NODE_ENV === 'production' || 
                     process.env.NAS_ENV === 'true' ||
                     os.hostname().toLowerCase().includes('nas') ||
                     process.env.SMTP_HOST !== undefined;

// SMTP transporter for Mail Station/Roundcube
const transporter = nodemailer.createTransport({
    host: smtpHost, // 'localhost' in production (NAS)
    port: smtpPort, // 25 (Mail Station default)
    secure: false, // Mail Station uses non-SSL port 25
    tls: {
        rejectUnauthorized: false // For localhost SMTP
    },
    connectionTimeout: 10000,
    greetingTimeout: 5000,
    socketTimeout: 10000
});
```

**Email Sending:**
```javascript
const mailOptions = {
    from: `"Website Contact Form" <website@paxiit.com>`,
    to: 'contact@paxiit.com', // Roundcube inbox
    replyTo: `"${safeName}" <${contactData.email}>`, // Reply goes to sender
    subject: `[Website Contact] ${contactData.subject || 'General Inquiry'}`,
    text: emailBody,
    html: formattedHtmlEmail
};

await transporter.sendMail(mailOptions);
```

**Path Management:**
```javascript
// ALL PATHS USE PMS - NO HARDCODED PATHS
const PMS = require('../utils/pms');

// Load/save contact messages using PMS
const messagesPath = PMS.backend('data', 'contact-messages.json');
const dataDir = PMS.backend('data');
```

#### 3. Integration Flow

```
User submits form
    ↓
Frontend validates data
    ↓
Frontend sends POST to /api/contact (via APIM)
    ↓
Backend contact.js handler receives request
    ↓
Backend validates and sanitizes data
    ↓
Backend sends email via SMTP to Mail Station
    ↓
Mail Station delivers to Roundcube inbox (contact@paxiit.com)
    ↓
Backend saves message to JSON file (using PMS)
    ↓
Backend returns success response
    ↓
Frontend displays success message (via CLS translation)
```

### Critical Implementation Notes

1. **No Path Breaking**: All paths use PMS, ensuring consistency across environments
2. **Environment Detection**: Automatically detects production (NAS) vs. local dev
3. **SMTP Configuration**: Uses localhost SMTP in production (Mail Station on NAS)
4. **Error Handling**: Graceful degradation - saves message even if email fails
5. **Security**: All user input sanitized to prevent XSS in emails

---

## Reverse Proxy Configuration (Nginx Bypass)

### Overview

The Nginx reverse proxy configuration allows specific paths (e.g., `/mail` for Roundcube) to bypass the reverse proxy and be served directly from the file system, while maintaining the main website's reverse proxy to the Node.js backend.

### Configuration Location

**File:** `/etc/nginx/sites-enabled/server.ReverseProxy.conf`

### Key Concept: Location Block Priority

Nginx processes location blocks in a specific order:
1. Exact match (`=`)
2. Prefix match with `^~` (stops regex processing)
3. Regex match (`~` or `~*`)
4. Prefix match (longest match wins)

### Roundcube Webmail Bypass Configuration

```nginx
# Roundcube Webmail bypass - MUST BE BEFORE location / block
location = /mail {
    return 301 /mail/;
}

location ^~ /mail/ {
    alias /volume1/@appstore/MailStation/mail/;
    index index.php;

    location ~ \.php$ {
        include fastcgi_params;
        fastcgi_pass unix:/run/MailStation/php-fpm/php74-fpm.MailStation.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $request_filename;
        fastcgi_param HTTP_HOST paxiit.com;
        fastcgi_param SERVER_NAME paxiit.com;
        fastcgi_param HTTPS on;
        fastcgi_param REQUEST_SCHEME https;
    }
}

# Main website reverse proxy - MUST BE AFTER /mail blocks
location / {
    proxy_connect_timeout 60;
    proxy_read_timeout 60;
    proxy_send_timeout 60;
    proxy_intercept_errors off;
    proxy_http_version 1.1;
    proxy_set_header Host $http_host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_pass http://localhost:8000;
}
```

### Critical Configuration Elements

#### 1. Location Block Order
- `/mail` blocks **MUST** appear **BEFORE** the main `location /` block
- This ensures `/mail` requests are caught before the reverse proxy

#### 2. Alias vs. Root
- `alias` is used because `/mail/` maps to a different directory
- `alias /volume1/@appstore/MailStation/mail/` means:
  - Request: `https://paxiit.com/mail/index.php`
  - Served from: `/volume1/@appstore/MailStation/mail/index.php`

#### 3. PHP-FPM Configuration
- `fastcgi_pass`: Points to Mail Station's PHP-FPM socket
- `SCRIPT_FILENAME`: Must be `$request_filename` (not `$document_root$fastcgi_script_name`) when using `alias`
- **Critical Headers**: Set `HTTP_HOST`, `SERVER_NAME`, `HTTPS`, `REQUEST_SCHEME` to prevent Roundcube from redirecting to internal IP

#### 4. FastCGI Parameters for Roundcube
```nginx
fastcgi_param HTTP_HOST paxiit.com;
fastcgi_param SERVER_NAME paxiit.com;
fastcgi_param HTTPS on;
fastcgi_param REQUEST_SCHEME https;
```
These parameters ensure Roundcube receives the correct external domain and HTTPS scheme, preventing redirects to internal IPs.

### Roundcube Configuration

**File:** `/volume1/@appstore/MailStation/mail/config/config.inc.php`

```php
$config['default_host'] = '127.0.0.1'; // IMAP on localhost
$config['force_https'] = true; // Force HTTPS
$config["base_url"] = "https://paxiit.com/mail/"; // External URL
```

### Testing the Configuration

1. **Test Nginx syntax:**
   ```bash
   sudo nginx -t
   ```

2. **Reload Nginx:**
   ```bash
   sudo nginx -s reload
   # OR
   sudo systemctl reload nginx
   ```

3. **Verify Roundcube:**
   - Access: `https://paxiit.com/mail`
   - Should load Roundcube login page
   - Should NOT redirect to internal IP

4. **Verify Main Website:**
   - Access: `https://paxiit.com`
   - Should load Node.js backend (port 8000)
   - Should NOT interfere with `/mail` path

### Troubleshooting

**Issue:** PHP files download instead of executing
- **Solution:** Check `fastcgi_pass` socket path and `SCRIPT_FILENAME` parameter

**Issue:** Roundcube redirects to internal IP
- **Solution:** Add `fastcgi_param HTTP_HOST`, `SERVER_NAME`, `HTTPS`, `REQUEST_SCHEME` headers

**Issue:** Main website returns 404
- **Solution:** Verify Node.js backend is running on port 8000

**Issue:** `/mail` returns 404
- **Solution:** Check `alias` path and file permissions

---

## Path Manager System (PMS)

### Overview

The Path Manager System (PMS) is the **single source of truth** for all file paths in the application. It ensures consistent path resolution across development and production environments without hardcoded paths.

### Architecture

#### Frontend PMS (`frontend/src/services/path-manager.js`)

**Key Features:**
- Automatic base path detection
- Environment-agnostic path resolution
- Backend connectivity verification
- API endpoint management
- Port configuration (fixed: 8000)

**Core Methods:**
```javascript
// Get frontend path
PMS.frontend('src', 'pages', 'about.html')
// Returns: '/frontend/src/pages/about.html' (absolute path)

// Get backend path
PMS.backend('routes', 'contact.js')
// Returns: '/backend/routes/contact.js' (absolute path)

// Get API endpoint
PMS.api('/contact')
// Returns: '/api/contact'

// Navigate to page
PMS.navigateTo('about')
// Navigates to: '/about.html'

// Get asset path
PMS.asset('image', 'logo.png')
// Returns: '/assets/images/logo.png'
```

#### Backend PMS (`backend/utils/pms.js`)

**Key Features:**
- Node.js path resolution
- File system operations
- Consistent with frontend PMS structure

**Core Methods:**
```javascript
const PMS = require('../utils/pms');

// Get backend path
PMS.backend('data', 'contact-messages.json')
// Returns: '/absolute/path/to/backend/data/contact-messages.json'

// Get frontend path
PMS.frontend('src', 'index.html')
// Returns: '/absolute/path/to/frontend/src/index.html'
```

#### Server PMS (`server.js`)

**Key Features:**
- Server-side path resolution
- File serving logic
- API route resolution

**Usage:**
```javascript
// Resolve file path
const filePath = PMS.frontend('src', 'index.html');

// Check if file exists
if (fs.existsSync(filePath)) {
    // Serve file
}
```

### Path Resolution Strategy

1. **Absolute Paths**: All paths returned are absolute (start with `/`)
2. **Environment Detection**: Automatically detects browser vs. Node.js environment
3. **No Hardcoding**: Never use `__dirname`, `process.cwd()`, or relative paths directly
4. **Consistent Structure**: Same path structure in dev and production

### Best Practices

#### ✅ DO:
```javascript
// Use PMS for all paths
const messagesPath = PMS.backend('data', 'contact-messages.json');
const pagePath = PMS.frontend('pages', 'about.html');
const apiUrl = PMS.api('/contact');
```

#### ❌ DON'T:
```javascript
// Never hardcode paths
const messagesPath = './backend/data/contact-messages.json'; // ❌
const pagePath = '../frontend/src/pages/about.html'; // ❌
const apiUrl = 'http://localhost:8000/api/contact'; // ❌
```

### Backend Connectivity

PMS includes backend connectivity verification:

```javascript
// Test backend connection
const result = await PMS.testBackendConnection();
if (result.success) {
    console.log('Backend connected');
} else {
    console.error('Backend not reachable:', result.message);
}

// Get backend status
const status = PMS.getBackendStatus();
console.log('Backend status:', status);
```

---

## Centralized Language System (CLS)

### Overview

The Centralized Language System (CLS) provides multi-language support across the entire application with a single, consistent translation interface.

### Architecture

#### Core System (`frontend/src/cls/lang-core.js`)

**Key Features:**
- Automatic language detection
- Dynamic translation loading
- Nested key support (dot notation)
- Parameter replacement
- Language change callbacks

#### Translation Files

**Location:** `frontend/src/cls/translations/`

**Supported Languages:**
- `en.js` - English (default)
- `fr.js` - French
- `ar.js` - Arabic
- `de.js` - German
- `es.js` - Spanish

#### Translation File Structure

```javascript
// frontend/src/cls/translations/en.js
export const translations = {
    homepage: {
        title: "Welcome to Paxi iTechnologies",
        subtitle: "Smart IT Management Solutions"
    },
    contact: {
        title: "Contact Us",
        successMessage: "Your message has been sent successfully!",
        connectionError: "Failed to send message. Please try again."
    }
};
```

### Usage

#### 1. Initialize CLS

```javascript
// CLS is auto-initialized by page-loader.js
// Manual initialization (if needed):
await window.CLS.initialize('en'); // or 'fr', 'ar', 'de', 'es'
```

#### 2. Translate Text

```javascript
// Simple translation
const title = window.CLS.translate('homepage.title');
// Returns: "Welcome to Paxi iTechnologies"

// Translation with parameters
const message = window.CLS.translate('contact.welcome', { name: 'John' });
// Translation: "Welcome, {{name}}!"
// Returns: "Welcome, John!"

// Nested keys
const subtitle = window.CLS.translate('homepage.sections.hero.subtitle');
```

#### 3. HTML Integration

```html
<!-- Using data-translate attribute -->
<h1 data-translate="homepage.title"></h1>

<!-- Using JavaScript -->
<script>
    document.getElementById('title').textContent = window.CLS.translate('homepage.title');
</script>
```

#### 4. Language Switching

```javascript
// Change language
await window.CLS.setLanguage('fr');

// Listen for language changes
window.CLS.onLanguageChange((lang) => {
    console.log('Language changed to:', lang);
    // Update UI with new translations
});
```

### Translation Plugin

**File:** `frontend/src/components/translation-plugin.js`

Automatically applies translations to elements with `data-translate` attribute:

```html
<div data-translate="homepage.title"></div>
```

### Best Practices

1. **Use Descriptive Keys**: `homepage.sections.hero.title` not `title1`
2. **Group Related Translations**: Keep related translations in the same object
3. **Provide Fallbacks**: Always include English translations
4. **Test All Languages**: Verify translations in all supported languages
5. **Use Parameters**: For dynamic content, use parameter replacement

---

## API Path Manager (APIM)

### Overview

The API Path Manager (APIM) provides standardized API endpoint management, working seamlessly with PMS and providing backend connectivity verification.

### Architecture

**File:** `frontend/src/services/api-path-manager.js`

**Key Features:**
- Standardized endpoint definitions
- PMS integration for path resolution
- Backend connectivity verification
- Automatic base URL detection
- Authentication token management

### Endpoint Configuration

```javascript
// APIM automatically loads endpoints
window.APIM.endpoints = {
    contact: {
        send: '/api/contact',
        inquiry: '/api/contact/inquiry'
    },
    services: {
        list: '/api/services',
        get: (id) => `/api/services/${id}`
    }
};
```

### Usage

#### 1. Get API URL

```javascript
// Using category and endpoint
const url = window.APIM.getURL('contact', 'send');
// Returns: '/api/contact' (or full URL with base)

// Using direct endpoint
const url = window.APIM.getURL('contact', '/api/contact');
```

#### 2. Make API Requests

```javascript
// GET request
const services = await window.APIM.get('services', 'list');

// POST request
const result = await window.APIM.post('contact', 'send', {
    name: 'John Doe',
    email: 'john@example.com',
    message: 'Hello!'
});

// With options
const result = await window.APIM.post('contact', 'send', data, {
    headers: { 'Custom-Header': 'value' },
    checkBackend: true // Verify backend before request
});
```

#### 3. Backend Connectivity

```javascript
// Verify backend connection
const isConnected = await window.APIM.verifyBackendConnection();

// Get backend status
const status = window.APIM.getBackendStatus();
console.log('Backend status:', status);
```

### Integration with PMS

APIM automatically uses PMS for:
- Base URL detection
- Path resolution
- Backend connectivity verification

```javascript
// APIM uses PMS internally
const url = window.APIM.getURL('contact', 'send');
// Internally calls: window.PMS.api('/contact')
```

---

## CI/CD Process

### Overview

The CI/CD process ensures all changes are validated locally before deployment to production, with automated testing and deployment scripts.

### Workflow

```
Local Development
    ↓
Git Commit & Push
    ↓
GitHub Repository
    ↓
Local Validation (deploy.sh)
    ↓
Production Deployment
    ↓
Systemd Service Management
```

### Deployment Script (`deploy.sh`)

**Location:** Root directory

**Key Steps:**

1. **Verify Local Files**
   ```bash
   # Check required files exist
   if [ ! -f "server.js" ]; then
       echo "Error: server.js not found"
       exit 1
   fi
   ```

2. **Stop Production Server**
   ```bash
   # Stop systemd service
   ssh -p $NAS_PORT $NAS_USER@$NAS_HOST "sudo systemctl stop paxiit-website.service"
   ```

3. **Create Backup**
   ```bash
   # Backup existing deployment
   ssh -p $NAS_PORT $NAS_USER@$NAS_HOST "tar -czf paxiit.com_backup_${DATE}.tar.gz paxiit.com"
   ```

4. **Clean Production Directory**
   ```bash
   # Remove old files
   ssh -p $NAS_PORT $NAS_USER@$NAS_HOST "cd $NAS_PATH && rm -rf * .[^.]*"
   ```

5. **Deploy Files**
   ```bash
   # Transfer files (exclude node_modules, .git, logs)
   tar --exclude='node_modules' --exclude='.git' -czf - . | \
       ssh -p $NAS_PORT $NAS_USER@$NAS_HOST "cd $NAS_PATH && tar -xzf -"
   ```

6. **Install Dependencies**
   ```bash
   # Install production dependencies
   ssh -p $NAS_PORT $NAS_USER@$NAS_HOST "cd $NAS_PATH && npm install --production"
   ```

7. **Verify Deployment**
   ```bash
   # Check critical files exist
   for file in "${VERIFY_FILES[@]}"; do
       ssh -p $NAS_PORT $NAS_USER@$NAS_HOST "test -f $NAS_PATH/$file"
   done
   ```

8. **Start Production Server**
   ```bash
   # Start systemd service
   ssh -p $NAS_PORT $NAS_USER@$NAS_HOST "sudo systemctl start paxiit-website.service"
   ```

9. **Test Endpoints**
   ```bash
   # Verify endpoints respond
   test_endpoint "http://localhost:8000/" "Homepage"
   test_endpoint "http://localhost:8000/api/test" "API Test"
   ```

### GitHub Actions Workflow (`.github/workflows/deploy.yml`)

**Key Features:**
- Manual trigger only (no automatic deployment)
- Requires explicit confirmation ("DEPLOY")
- Runs tests and builds before deployment

```yaml
on:
  workflow_dispatch: # Manual trigger only
    inputs:
      confirm_deploy:
        description: 'Type "DEPLOY" to confirm'
        required: true
        type: string

jobs:
  deploy:
    if: github.event.inputs.confirm_deploy == 'DEPLOY'
    steps:
      - uses: actions/checkout@v3
      - name: Install dependencies
        run: npm ci
      - name: Build
        run: npm run build
      - name: Deploy
        run: npm run deploy
```

### Best Practices

1. **Always Test Locally First**: Never deploy untested code
2. **Use Git Branches**: Develop in feature branches, merge to main
3. **Commit Frequently**: Small, logical commits
4. **Write Clear Commit Messages**: Describe what and why
5. **Verify After Deployment**: Test production endpoints after deployment

---

## Git Workflow

### Branch Strategy

```
main (production)
    ↑
feature/feature-name (development)
```

### Workflow Steps

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/ai-training-section
   ```

2. **Make Changes**
   - Develop locally
   - Test thoroughly
   - Use PMS for all paths
   - Add CLS translations

3. **Commit Changes**
   ```bash
   git add .
   git commit -m "Add AI Learning & Training section to homepage"
   ```

4. **Push to GitHub**
   ```bash
   git push origin feature/ai-training-section
   ```

5. **Merge to Main**
   ```bash
   git checkout main
   git merge feature/ai-training-section
   git push origin main
   ```

6. **Deploy to Production**
   ```bash
   bash deploy.sh
   ```

### Commit Message Format

```
Type: Brief description

Detailed explanation of changes:
- What was changed
- Why it was changed
- Any breaking changes
```

**Examples:**
```
feat: Add AI Learning & Training section to homepage

- Added new section between hero and services preview
- Includes "Why AI Training Matters", examples, and programs
- Added CLS translations for all languages
- Updated backend services.json with new AI services
```

```
fix: Resolve contact form SMTP connection issue

- Fixed SMTP host configuration for Mail Station
- Added environment detection for production vs. dev
- Improved error handling and logging
```

### Git Configuration

**Required Settings:**
```bash
# Set user name and email
git config --global user.name "Your Name"
git config --global user.email "your.email@paxiit.com"

# Set default branch name
git config --global init.defaultBranch main

# Enable color output
git config --global color.ui auto
```

---

## Server Management

### Systemd Service

**Service File:** `/etc/systemd/system/paxiit-website.service`

```ini
[Unit]
Description=Paxiit Website Server
After=network.target

[Service]
Type=simple
User=superpulpax
WorkingDirectory=/volume1/web/paxiit.com
Environment="PATH=/volume1/@appstore/Node.js_v20/usr/local/bin:/usr/local/bin"
Environment="HOST=0.0.0.0"
Environment="PORT=8000"
ExecStart=/volume1/@appstore/Node.js_v20/usr/local/bin/node server.js
Restart=always
RestartSec=10
StandardOutput=append:/volume1/web/paxiit.com/server.log
StandardError=append:/volume1/web/paxiit.com/server.log

[Install]
WantedBy=multi-user.target
```

### Service Management

```bash
# Start service
sudo systemctl start paxiit-website.service

# Stop service
sudo systemctl stop paxiit-website.service

# Restart service
sudo systemctl restart paxiit-website.service

# Check status
sudo systemctl status paxiit-website.service

# Enable auto-start on boot
sudo systemctl enable paxiit-website.service

# Disable auto-start
sudo systemctl disable paxiit-website.service

# View logs
sudo journalctl -u paxiit-website.service -f
# OR
tail -f /volume1/web/paxiit.com/server.log
```

### Port Configuration

**Fixed Port:** 8000

- Development: `http://localhost:8000`
- Production: `https://paxiit.com` (via Nginx reverse proxy)

**Port Management:**
- All systems use port 8000
- PMS handles port configuration
- No hardcoded ports in code

### Environment Variables

**Production (NAS):**
```bash
export NODE_ENV=production
export NAS_ENV=true
export HOST=0.0.0.0
export PORT=8000
export PATH=/volume1/@appstore/Node.js_v20/usr/local/bin:/usr/local/bin
```

**Development (Local PC):**
```bash
export NODE_ENV=development
export HOST=localhost
export PORT=8000
```

---

## Deployment Process

### Pre-Deployment Checklist

- [ ] All changes tested locally
- [ ] All paths use PMS (no hardcoded paths)
- [ ] CLS translations added for all languages
- [ ] Git commits are clean and descriptive
- [ ] No console.log statements in production code
- [ ] Error handling is comprehensive
- [ ] Backend connectivity verified

### Deployment Steps

1. **Verify Local Environment**
   ```bash
   # Test server locally
   npm start
   # Test in browser: http://localhost:8000
   ```

2. **Commit and Push Changes**
   ```bash
   git add .
   git commit -m "Description of changes"
   git push origin main
   ```

3. **Run Deployment Script**
   ```bash
   bash deploy.sh
   ```

4. **Verify Deployment**
   ```bash
   # Check server status
   ssh -p 2222 superpulpax@192.168.1.3 "sudo systemctl status paxiit-website.service"
   
   # Test endpoints
   curl https://paxiit.com/
   curl https://paxiit.com/api/test
   ```

5. **Monitor Logs**
   ```bash
   ssh -p 2222 superpulpax@192.168.1.3 "tail -f /volume1/web/paxiit.com/server.log"
   ```

### Rollback Procedure

If deployment fails:

1. **Stop Service**
   ```bash
   ssh -p 2222 superpulpax@192.168.1.3 "sudo systemctl stop paxiit-website.service"
   ```

2. **Restore Backup**
   ```bash
   ssh -p 2222 superpulpax@192.168.1.3 "cd /volume1/web && tar -xzf paxiit.com_backup_YYYYMMDD_HHMMSS.tar.gz"
   ```

3. **Start Service**
   ```bash
   ssh -p 2222 superpulpax@192.168.1.3 "sudo systemctl start paxiit-website.service"
   ```

---

## Standard Development Procedures

### 1. Adding New Features

**Steps:**
1. Create feature branch: `git checkout -b feature/feature-name`
2. Develop locally using PMS for all paths
3. Add CLS translations for all languages
4. Test thoroughly in local environment
5. Commit with descriptive message
6. Push to GitHub
7. Merge to main
8. Deploy to production using `deploy.sh`

### 2. Adding New Pages

**Steps:**
1. Create HTML file in `frontend/src/pages/`
2. Use component loader for header/footer
3. Add CLS translations
4. Update navigation (if needed)
5. Test locally
6. Deploy

**Example:**
```html
<!-- frontend/src/pages/new-page.html -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title data-translate="newPage.title">New Page</title>
</head>
<body>
    <div id="header-container"></div>
    <main>
        <h1 data-translate="newPage.title"></h1>
    </main>
    <div id="footer-container"></div>
    <script src="/services/path-manager.js"></script>
    <script src="/components/component-loader.js"></script>
    <script>
        // Load components
        ComponentLoader.loadComponent('header', '#header-container');
        ComponentLoader.loadComponent('footer', '#footer-container');
        
        // Initialize CLS
        window.CLS.initialize();
    </script>
</body>
</html>
```

### 3. Adding New API Endpoints

**Steps:**
1. Create route file in `backend/routes/`
2. Use PMS for all paths
3. Follow existing route patterns
4. Add error handling
5. Test with API client
6. Update APIM endpoints (if needed)
7. Deploy

**Example:**
```javascript
// backend/routes/new-endpoint.js
const apiRouter = require('./api-router');
const PMS = require('../utils/pms');
const fs = require('fs');

function newEndpointHandler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    if (req.method === 'GET') {
        // Use PMS for paths
        const dataPath = PMS.backend('data', 'data.json');
        const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        
        apiRouter.sendSuccess(res, data, 'Data retrieved successfully');
    } else {
        apiRouter.send404(res);
    }
}

module.exports = newEndpointHandler;
```

### 4. Adding New Translations

**Steps:**
1. Add translation key to `frontend/src/cls/translations/en.js`
2. Add same key to all other language files
3. Use in HTML with `data-translate` or JavaScript with `CLS.translate()`
4. Test all languages
5. Deploy

**Example:**
```javascript
// en.js
export const translations = {
    newSection: {
        title: "New Section Title",
        description: "New section description"
    }
};

// fr.js
export const translations = {
    newSection: {
        title: "Titre de la nouvelle section",
        description: "Description de la nouvelle section"
    }
};
```

### 5. Debugging

**Frontend:**
- Use browser DevTools console
- Check PMS backend status: `window.PMS.getBackendStatus()`
- Check CLS: `window.CLS.getCurrentLanguage()`
- Check APIM: `window.APIM.getBackendStatus()`

**Backend:**
- Check server logs: `tail -f server.log`
- Check systemd logs: `sudo journalctl -u paxiit-website.service -f`
- Verify paths: Check PMS paths in server.js startup logs

**Nginx:**
- Check error logs: `sudo tail -f /var/log/nginx/error.log`
- Test configuration: `sudo nginx -t`
- Reload: `sudo nginx -s reload`

---

## Summary

This documentation outlines the complete technical stack and development procedures for Paxi iTechnologies. Key principles:

1. **PMS**: Single source of truth for all paths
2. **CLS**: Centralized language management
3. **APIM**: Standardized API endpoint management
4. **Reverse Proxy Bypass**: Direct file serving for specific paths
5. **CI/CD**: Automated deployment with validation
6. **Git Workflow**: Feature branches with clear commit messages
7. **Server Management**: Systemd service with auto-restart

All systems work together to provide a robust, maintainable, and scalable development and deployment process.

---

**Last Updated:** November 15, 2025  
**Version:** 1.0  
**Maintained By:** Paxi iTechnologies Development Team

