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
12. [International Standards & Best Practices](#international-standards--best-practices)
13. [Project Management Standards](#project-management-standards)
14. [Information Security Management (ISM) Model](#information-security-management-ism-model)
15. [Quality Management & ISO Standards](#quality-management--iso-standards)

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

**24/7 Operation Configuration** - Ensures server never goes down:

```ini
[Unit]
Description=Paxiit Website Server - 24/7 Operation
After=network.target network-online.target
Wants=network-online.target

[Service]
Type=simple
User=superpulpax
WorkingDirectory=/volume1/web/paxiit.com
Environment=NODE_ENV=production
Environment=PORT=8000
Environment=HOST=0.0.0.0
Environment=PATH=/var/packages/Node.js_v20/target/usr/local/bin:/usr/local/bin:/usr/bin:/bin
ExecStart=/var/packages/Node.js_v20/target/usr/local/bin/node /volume1/web/paxiit.com/server.js
Restart=always
RestartSec=10
StartLimitInterval=0
StartLimitBurst=0
StandardOutput=append:/volume1/web/paxiit.com/server.log
StandardError=append:/volume1/web/paxiit.com/server.log

[Install]
WantedBy=multi-user.target
```

**Key 24/7 Configuration Options:**
- `Restart=always` - Automatically restarts on any failure (crash, exit, etc.)
- `RestartSec=10` - Waits 10 seconds before restarting
- `StartLimitInterval=0` - No time limit for restart attempts (unlimited)
- `StartLimitBurst=0` - No burst limit for restart attempts (unlimited)
- `WantedBy=multi-user.target` - Starts automatically on system boot
- `After=network.target` - Waits for network to be available before starting
- `Wants=network-online.target` - Ensures network is online before starting

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

# Enable auto-start on boot (REQUIRED for 24/7 operation)
sudo systemctl enable paxiit-website.service

# Disable auto-start (NOT RECOMMENDED - breaks 24/7 operation)
sudo systemctl disable paxiit-website.service

# Verify 24/7 configuration
systemctl show paxiit-website.service | grep -E 'Restart|StartLimit|WantedBy'
# Should show:
# Restart=always
# StartLimitInterval=0
# StartLimitBurst=0
# WantedBy=multi-user.target

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

## International Standards & Best Practices

### Overview

Paxi iTechnologies adheres to international standards and best practices to ensure quality, security, and consistency across all projects and SaaS platforms. This section outlines the standards we follow and how they are implemented.

### Standards Framework

Our development and operations follow these international standards:

1. **ISO/IEC 27001** - Information Security Management System (ISMS)
2. **ISO/IEC 9001** - Quality Management System
3. **ISO/IEC 20000** - IT Service Management
4. **PMI PMP** - Project Management Professional standards
5. **ITIL** - IT Infrastructure Library framework
6. **Agile/Scrum** - Agile project management methodologies
7. **GDPR** - General Data Protection Regulation compliance
8. **OSI Model** - Network architecture standards

### Implementation Strategy

All standards are integrated into our development lifecycle:

- **Planning Phase**: Standards compliance requirements defined
- **Development Phase**: Standards applied during coding and testing
- **Deployment Phase**: Standards verification before production
- **Operations Phase**: Continuous monitoring and compliance

---

## Project Management Standards

### PMI PMP (Project Management Professional)

#### Overview

Paxi iTechnologies follows PMI PMP methodologies for project management, ensuring structured, predictable, and successful project delivery.

#### PMP Process Groups

**1. Initiating**
- Project charter development
- Stakeholder identification
- Project kickoff meetings
- Scope definition

**2. Planning**
- Project management plan creation
- Scope, schedule, and budget planning
- Risk identification and planning
- Resource allocation
- Quality planning

**3. Executing**
- Team management
- Communication management
- Quality assurance
- Stakeholder engagement
- Procurement management

**4. Monitoring & Controlling**
- Performance monitoring
- Change management
- Risk monitoring
- Quality control
- Schedule and budget tracking

**5. Closing**
- Project closure documentation
- Lessons learned
- Final deliverables
- Resource release
- Project archive

#### PMP Knowledge Areas

1. **Project Integration Management**
   - Project charter
   - Project management plan
   - Direct and manage project work
   - Monitor and control project work
   - Perform integrated change control
   - Close project or phase

2. **Project Scope Management**
   - Plan scope management
   - Collect requirements
   - Define scope
   - Create WBS (Work Breakdown Structure)
   - Validate scope
   - Control scope

3. **Project Schedule Management**
   - Plan schedule management
   - Define activities
   - Sequence activities
   - Estimate activity durations
   - Develop schedule
   - Control schedule

4. **Project Cost Management**
   - Plan cost management
   - Estimate costs
   - Determine budget
   - Control costs

5. **Project Quality Management**
   - Plan quality management
   - Manage quality
   - Control quality

6. **Project Resource Management**
   - Plan resource management
   - Estimate activity resources
   - Acquire resources
   - Develop team
   - Manage team
   - Control resources

7. **Project Communications Management**
   - Plan communications management
   - Manage communications
   - Monitor communications

8. **Project Risk Management**
   - Plan risk management
   - Identify risks
   - Perform qualitative risk analysis
   - Perform quantitative risk analysis
   - Plan risk responses
   - Implement risk responses
   - Monitor risks

9. **Project Procurement Management**
   - Plan procurement management
   - Conduct procurements
   - Control procurements

10. **Project Stakeholder Management**
    - Identify stakeholders
    - Plan stakeholder engagement
    - Manage stakeholder engagement
    - Monitor stakeholder engagement

#### PMP Best Practices in Our Projects

**Documentation Standards:**
- All projects maintain a project charter
- WBS created for all projects
- Risk register maintained and updated
- Change requests documented and approved
- Lessons learned captured

**Communication:**
- Weekly status reports
- Stakeholder meetings scheduled
- Issue escalation procedures defined
- Communication plan documented

**Quality:**
- Quality metrics defined
- Quality assurance reviews
- Testing procedures documented
- Acceptance criteria defined

### Agile/Scrum Framework

#### Overview

For software development projects, we use Agile/Scrum methodologies for iterative, incremental delivery.

#### Scrum Roles

**1. Product Owner**
- Defines product backlog
- Prioritizes features
- Accepts/rejects deliverables
- Represents stakeholders

**2. Scrum Master**
- Facilitates Scrum process
- Removes impediments
- Protects team from distractions
- Ensures Scrum ceremonies

**3. Development Team**
- Self-organizing and cross-functional
- Commits to sprint goals
- Delivers working software
- Participates in all Scrum ceremonies

#### Scrum Ceremonies

**1. Sprint Planning**
- Duration: 2-4 hours for 2-week sprint
- Product Owner presents backlog
- Team estimates and commits to sprint goal
- Sprint backlog created

**2. Daily Standup**
- Duration: 15 minutes
- What did I do yesterday?
- What will I do today?
- Are there any impediments?

**3. Sprint Review**
- Duration: 2-4 hours
- Demonstrate completed work
- Stakeholder feedback
- Product backlog refinement

**4. Sprint Retrospective**
- Duration: 1-2 hours
- What went well?
- What could be improved?
- Action items for next sprint

#### Scrum Artifacts

**1. Product Backlog**
- Prioritized list of features
- User stories with acceptance criteria
- Estimated effort (story points)
- Continuously refined

**2. Sprint Backlog**
- Items selected for current sprint
- Tasks broken down
- Team commits to completion
- Updated daily

**3. Increment**
- Working software delivered
- Potentially shippable
- Meets definition of done
- Integrated and tested

#### Agile Best Practices

**User Stories Format:**
```
As a [user type]
I want [functionality]
So that [benefit]

Acceptance Criteria:
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3
```

**Definition of Done:**
- Code written and reviewed
- Unit tests written and passing
- Integration tests passing
- Documentation updated
- Deployed to staging
- Product Owner acceptance

**Sprint Planning:**
- Velocity-based planning
- Capacity consideration
- Risk assessment
- Dependencies identified

### ITIL Framework

#### Overview

ITIL (IT Infrastructure Library) provides best practices for IT service management, ensuring alignment between IT services and business needs.

#### ITIL Service Lifecycle

**1. Service Strategy**
- Service portfolio management
- Financial management
- Demand management
- Business relationship management

**2. Service Design**
- Service catalog management
- Service level management
- Capacity management
- Availability management
- IT service continuity management
- Information security management
- Supplier management

**3. Service Transition**
- Change management
- Service asset and configuration management
- Release and deployment management
- Knowledge management

**4. Service Operation**
- Event management
- Incident management
- Request fulfillment
- Problem management
- Access management

**5. Continual Service Improvement**
- Service measurement
- Service reporting
- Service improvement

#### ITIL Processes in Our Operations

**Change Management:**
- All changes require approval
- Change advisory board (CAB) for major changes
- Change documentation
- Rollback procedures

**Incident Management:**
- Incident logging and categorization
- Priority assignment
- Escalation procedures
- Resolution and closure

**Problem Management:**
- Root cause analysis
- Known error database
- Problem resolution
- Prevention measures

**Service Level Management:**
- SLA definition
- Service level monitoring
- Performance reporting
- Service improvement

---

## Information Security Management (ISM) Model

### Overview

Paxi iTechnologies implements a comprehensive Information Security Management System (ISMS) based on ISO/IEC 27001 standards to protect information assets and ensure data security.

### ISO/IEC 27001 ISMS Framework

#### ISMS Structure

**1. Context of the Organization**
- Understanding organization and context
- Understanding needs and expectations of interested parties
- Determining scope of ISMS
- ISMS and its processes

**2. Leadership**
- Leadership and commitment
- Policy
- Organizational roles, responsibilities, and authorities

**3. Planning**
- Actions to address risks and opportunities
- Information security objectives and planning
- Planning of changes

**4. Support**
- Resources
- Competence
- Awareness
- Communication
- Documented information

**5. Operation**
- Operational planning and control
- Information security risk assessment
- Information security risk treatment

**6. Performance Evaluation**
- Monitoring, measurement, analysis, and evaluation
- Internal audit
- Management review

**7. Improvement**
- Nonconformity and corrective action
- Continual improvement

### ISO 27001 Control Domains

#### A.5 Information Security Policies
- **A.5.1** Management direction for information security
- Policies reviewed at planned intervals
- Policies communicated to all personnel

#### A.6 Organization of Information Security
- **A.6.1** Internal organization
- Roles and responsibilities defined
- Segregation of duties
- Contact with authorities and special interest groups

#### A.7 Human Resource Security
- **A.7.1** Prior to employment
- Background verification
- Terms and conditions of employment

- **A.7.2** During employment
- Management responsibilities
- Information security awareness, education, and training
- Disciplinary process

- **A.7.3** Termination and change of employment
- Termination responsibilities
- Return of assets
- Removal of access rights

#### A.8 Asset Management
- **A.8.1** Responsibility for assets
- Inventory of assets
- Ownership of assets
- Acceptable use of assets
- Return of assets

- **A.8.2** Information classification
- Classification of information
- Labeling of information
- Handling of assets

- **A.8.3** Media handling
- Management of removable media
- Disposal of media
- Physical media transfer

#### A.9 Access Control
- **A.9.1** Business requirements of access control
- Access control policy
- Access to networks and network services

- **A.9.2** User access management
- User registration and de-registration
- User access provisioning
- Management of privileged access rights
- Management of secret authentication information
- Review of user access rights
- Removal or adjustment of access rights

- **A.9.3** User responsibilities
- Use of secret authentication information

- **A.9.4** System and application access control
- Information access restriction
- Secure log-on procedures
- Password management system
- Use of privileged utility programs
- Access control to program source code

#### A.10 Cryptography
- **A.10.1** Cryptographic controls
- Cryptographic policy
- Key management

#### A.11 Physical and Environmental Security
- **A.11.1** Secure areas
- Physical security perimeter
- Physical entry controls
- Securing offices, rooms, and facilities
- Protecting against external and environmental threats
- Working in secure areas
- Delivery and loading areas

- **A.11.2** Equipment
- Equipment siting and protection
- Supporting utilities
- Cabling security
- Equipment maintenance
- Removal of assets
- Security of equipment and assets off-premises
- Secure disposal or re-use of equipment
- Unattended user equipment
- Clear desk and clear screen policy

#### A.12 Operations Security
- **A.12.1** Operational procedures and responsibilities
- Documented operating procedures
- Change management
- Capacity management
- Separation of development, testing, and operational environments

- **A.12.2** Protection from malware
- Controls against malware

- **A.12.3** Backup
- Information backup

- **A.12.4** Logging and monitoring
- Event logging
- Protection of log information
- Administrator and operator logs
- Clock synchronization

- **A.12.5** Control of operational software
- Installation of software on operational systems

- **A.12.6** Technical vulnerability management
- Management of technical vulnerabilities
- Restrictions on software installation

- **A.12.7** Information systems audit considerations
- Information systems audit controls

#### A.13 Communications Security
- **A.13.1** Network security management
- Network controls
- Security of network services
- Segregation in networks

- **A.13.2** Information transfer
- Information transfer policies and procedures
- Agreements on information transfer
- Electronic messaging
- Confidentiality or non-disclosure agreements

#### A.14 System Acquisition, Development, and Maintenance
- **A.14.1** Security requirements of information systems
- Information security requirements analysis and specification
- Securing application services on public networks
- Protecting application services transactions

- **A.14.2** Security in development and support processes
- Secure development policy
- System change control procedures
- Technical review of applications after operating platform changes
- Restrictions on changes to software packages
- Secure system engineering principles
- Secure development environment
- Outsourced development
- System security testing
- System acceptance testing

- **A.14.3** Test data
- Protection of test data

#### A.15 Supplier Relationships
- **A.15.1** Information security in supplier relationships
- Information security policy for supplier relationships
- Addressing security within supplier agreements
- Information and communication technology supply chain

- **A.15.2** Supplier service delivery management
- Monitoring and review of supplier services
- Managing changes to supplier services

#### A.16 Information Security Incident Management
- **A.16.1** Management of information security incidents and improvements
- Responsibilities and procedures
- Reporting information security events
- Reporting information security weaknesses
- Assessment of and decision on information security events
- Response to information security incidents
- Learning from information security incidents
- Collection of evidence

#### A.17 Information Security Aspects of Business Continuity Management
- **A.17.1** Information security continuity
- Planning information security continuity
- Implementing information security continuity
- Verify, review, and evaluate information security continuity

- **A.17.2** Redundancies
- Availability of information processing facilities

#### A.18 Compliance
- **A.18.1** Compliance with legal and contractual requirements
- Identification of applicable legislation and contractual requirements
- Intellectual property rights
- Protection of records
- Privacy and protection of personally identifiable information
- Regulation of cryptographic controls

- **A.18.2** Information security reviews
- Independent review of information security
- Compliance with security policies and standards
- Technical compliance review

### ISMS Implementation in Our Systems

#### Security Controls Applied

**Access Control:**
- Role-based access control (RBAC)
- Multi-factor authentication (MFA) where applicable
- Regular access reviews
- Principle of least privilege

**Data Protection:**
- Encryption at rest and in transit
- Data classification (Public, Internal, Confidential, Restricted)
- Secure data disposal procedures
- Backup and recovery procedures

**Network Security:**
- Firewall configuration
- Network segmentation
- Intrusion detection/prevention
- Secure communication protocols (HTTPS, TLS)

**Application Security:**
- Input validation and sanitization
- XSS prevention (as implemented in contact form)
- SQL injection prevention
- Secure session management
- Error handling without information disclosure

**Incident Management:**
- Incident response procedures
- Security event logging
- Forensic capabilities
- Communication plans

**Change Management:**
- Security impact assessment for changes
- Change approval process
- Testing before production
- Rollback procedures

#### Security Monitoring

**Logging:**
- All security events logged
- Log retention policies
- Log analysis and review
- Alert mechanisms

**Vulnerability Management:**
- Regular vulnerability assessments
- Patch management procedures
- Security updates
- Penetration testing

**Compliance:**
- Regular security audits
- Compliance reviews
- Gap analysis
- Corrective actions

---

## Quality Management & ISO Standards

### ISO/IEC 9001 Quality Management System

#### Overview

Paxi iTechnologies implements ISO 9001 quality management principles to ensure consistent quality in all deliverables and processes.

#### Quality Management Principles

**1. Customer Focus**
- Understand customer needs
- Meet customer requirements
- Exceed customer expectations
- Enhance customer satisfaction

**2. Leadership**
- Establish unity of purpose
- Create conditions for engagement
- Set clear direction
- Lead by example

**3. Engagement of People**
- Competent, empowered, and engaged people
- Recognition and reward
- Open communication
- Continuous improvement culture

**4. Process Approach**
- Understand processes
- Manage processes as a system
- Optimize process performance
- Consistent and predictable results

**5. Improvement**
- Continuous improvement
- Learning culture
- Innovation
- Change management

**6. Evidence-Based Decision Making**
- Data and information analysis
- Fact-based decisions
- Performance evaluation
- Risk assessment

**7. Relationship Management**
- Supplier relationships
- Partner collaboration
- Stakeholder engagement
- Mutual benefit

#### Quality Management System Structure

**1. Context of the Organization**
- Understanding organization and context
- Understanding needs and expectations
- Determining scope of QMS
- QMS and its processes

**2. Leadership**
- Leadership and commitment
- Policy
- Organizational roles, responsibilities, and authorities

**3. Planning**
- Actions to address risks and opportunities
- Quality objectives and planning
- Planning of changes

**4. Support**
- Resources
- Competence
- Awareness
- Communication
- Documented information

**5. Operation**
- Operational planning and control
- Requirements for products and services
- Design and development of products and services
- Control of externally provided processes, products, and services
- Production and service provision
- Release of products and services
- Control of nonconforming outputs

**6. Performance Evaluation**
- Monitoring, measurement, analysis, and evaluation
- Internal audit
- Management review

**7. Improvement**
- Nonconformity and corrective action
- Continual improvement

### Quality Assurance in Development

#### Code Quality Standards

**1. Code Review Process**
- All code reviewed before merge
- Review checklist
- Automated code analysis
- Security review

**2. Testing Standards**
- Unit testing
- Integration testing
- System testing
- User acceptance testing
- Test coverage requirements

**3. Documentation Standards**
- Code documentation
- API documentation
- User documentation
- Technical documentation

**4. Version Control**
- Git workflow
- Branching strategy
- Commit message standards
- Tagging and releases

#### Quality Metrics

**Code Quality:**
- Code complexity metrics
- Code duplication
- Test coverage percentage
- Technical debt

**Process Quality:**
- Defect density
- Defect removal efficiency
- Mean time to resolution
- Customer satisfaction

**Performance Quality:**
- Response time
- Throughput
- Availability
- Reliability

### ISO/IEC 20000 IT Service Management

#### Overview

ISO 20000 provides standards for IT service management, ensuring effective and efficient IT services.

#### Service Management Processes

**1. Service Delivery Processes**
- Service level management
- Service reporting
- Service continuity and availability management
- Budgeting and accounting for IT services
- Capacity management
- Information security management

**2. Relationship Processes**
- Business relationship management
- Supplier management

**3. Resolution Processes**
- Incident management
- Problem management

**4. Control Processes**
- Configuration management
- Change management
- Release and deployment management

**5. Process Groups**
- Service portfolio management
- Financial management for IT services
- Demand management

### GDPR Compliance

#### Overview

General Data Protection Regulation (GDPR) compliance ensures protection of personal data and privacy rights.

#### GDPR Principles

**1. Lawfulness, Fairness, and Transparency**
- Legal basis for processing
- Transparent processing
- Clear privacy notices

**2. Purpose Limitation**
- Specific, explicit, and legitimate purposes
- Not further processed incompatibly

**3. Data Minimization**
- Adequate, relevant, and limited to what is necessary
- No excessive data collection

**4. Accuracy**
- Accurate and kept up to date
- Inaccurate data erased or rectified

**5. Storage Limitation**
- Kept in identifiable form no longer than necessary
- Retention policies

**6. Integrity and Confidentiality**
- Appropriate security measures
- Protection against unauthorized access
- Protection against loss or destruction

**7. Accountability**
- Responsibility and compliance demonstration
- Documentation of processing activities

#### GDPR Implementation

**Data Protection Measures:**
- Encryption of personal data
- Access controls
- Data breach procedures
- Data subject rights implementation

**Privacy by Design:**
- Privacy considerations in system design
- Data minimization
- Purpose limitation
- Security measures

**Data Subject Rights:**
- Right to access
- Right to rectification
- Right to erasure
- Right to restrict processing
- Right to data portability
- Right to object
- Rights related to automated decision making

**Data Processing Records:**
- Processing activities documented
- Legal basis recorded
- Retention periods defined
- Security measures documented

### OSI Model Standards

#### Overview

Our structured delivery approach follows the OSI (Open Systems Interconnection) Model for network architecture and service delivery.

#### OSI Model Layers

**1. Physical Layer**
- Physical transmission of data
- Cabling, connectors, signals
- Hardware specifications

**2. Data Link Layer**
- Error detection and correction
- Frame synchronization
- Flow control
- MAC addressing

**3. Network Layer**
- Routing
- Logical addressing (IP)
- Path determination
- Packet forwarding

**4. Transport Layer**
- End-to-end communication
- Error recovery
- Flow control
- Segmentation and reassembly

**5. Session Layer**
- Session establishment
- Session maintenance
- Session termination
- Dialog control

**6. Presentation Layer**
- Data translation
- Encryption/decryption
- Data compression
- Character encoding

**7. Application Layer**
- User interface
- Application services
- Network services
- Protocols (HTTP, SMTP, FTP)

#### OSI Model in Our Services

**Layer-by-Layer Transparency:**
- Each layer documented
- Layer-specific monitoring
- Layer-specific troubleshooting
- End-to-end traceability

**Structured Delivery:**
- Services structured by OSI layers
- Clear layer boundaries
- Layer-specific expertise
- Comprehensive documentation

---

## Summary

This documentation outlines the complete technical stack and development procedures for Paxi iTechnologies. Key principles:

### Technical Architecture
1. **PMS**: Single source of truth for all paths
2. **CLS**: Centralized language management
3. **APIM**: Standardized API endpoint management
4. **Reverse Proxy Bypass**: Direct file serving for specific paths
5. **CI/CD**: Automated deployment with validation
6. **Git Workflow**: Feature branches with clear commit messages
7. **Server Management**: Systemd service with auto-restart

### International Standards & Best Practices
1. **ISO/IEC 27001**: Complete ISMS (Information Security Management System) with all 18 control domains
2. **ISO/IEC 9001**: Quality Management System with 7 quality principles
3. **ISO/IEC 20000**: IT Service Management standards
4. **PMI PMP**: Project Management Professional standards (10 knowledge areas, 5 process groups)
5. **Agile/Scrum**: Iterative development with Scrum ceremonies and artifacts
6. **ITIL**: IT Infrastructure Library framework for service lifecycle management
7. **GDPR**: General Data Protection Regulation compliance
8. **OSI Model**: Network architecture standards for structured delivery

### Implementation Approach
- **Standards Integration**: All standards integrated into development lifecycle
- **Security First**: ISO 27001 controls applied across all systems
- **Quality Assurance**: ISO 9001 principles in all deliverables
- **Structured Project Management**: PMP and Agile methodologies for predictable delivery
- **Continuous Improvement**: Regular audits, reviews, and improvements

All systems work together to provide a robust, maintainable, scalable, secure, and standards-compliant development and deployment process that meets international best practices.

---

**Last Updated:** November 15, 2025  
**Version:** 1.0  
**Maintained By:** Paxi iTechnologies Development Team

