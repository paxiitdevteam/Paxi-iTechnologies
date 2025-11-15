# Paxi iTechnologies Website

Official website for Paxi iTechnologies - Smart IT Management. Clear Results.

## 🚀 Features

- **Modern Frontend**: Responsive, multi-language website
- **Admin Dashboard**: Complete content management system
- **Media Management**: Upload and manage images, videos, and documents
- **Page Management**: Create, edit, and manage website pages
- **Services Management**: Manage IT services and offerings
- **Content Editor**: Multi-language content management
- **User Management**: Admin user accounts with role-based access
- **Settings Management**: Website configuration and settings

## 📁 Project Structure

```
paxiit_website/
├── backend/
│   ├── config/          # Backend configuration
│   ├── data/            # JSON data files (services, content, users, settings)
│   ├── models/          # Database models
│   └── routes/          # API route handlers
├── frontend/
│   └── src/
│       ├── assets/      # Static assets (images, CSS, fonts, media)
│       ├── cls/         # Centralized Language System
│       ├── components/  # Reusable components (header, footer)
│       ├── pages/       # HTML pages
│       └── services/    # Frontend services (PMS, API manager)
├── shared/              # Shared utilities and constants
├── server.js            # Node.js development server
└── package.json         # Node.js dependencies
```

## 🛠️ Setup & Installation

### Prerequisites
- Node.js (v14 or higher)
- Git
- AI API Key (OpenAI or Anthropic) - See [AI_API_KEYS_SETUP.md](./AI_API_KEYS_SETUP.md)

### Quick Start

**Option 1: Using npm (Recommended)**
```bash
# Install dependencies (first time only)
npm install

# Start the server
npm start
```

**Option 2: Using start script (Windows)**
```bash
# Run the start script:
./start.sh
```

**Option 3: Using start script (Linux/Mac)**
```bash
# Make executable (first time only)
chmod +x start.sh
```

### AI Chat Agent Setup

The AI Chat Agent requires API keys to function. Follow these steps:

1. **Get API Key** (choose one):
   - **OpenAI**: Visit [OpenAI Platform](https://platform.openai.com/) → API keys
   - **Anthropic**: Visit [Anthropic Console](https://console.anthropic.com/) → Get API Key
   
   📖 **Detailed instructions**: See [AI_API_KEYS_SETUP.md](./AI_API_KEYS_SETUP.md)

2. **Set Environment Variable** (Git Bash):
```bash
# For OpenAI
export OPENAI_API_KEY="sk-proj-your-key-here"

# OR for Anthropic
export ANTHROPIC_API_KEY="sk-ant-api03-your-key-here"

# Set platform preference
export AI_PLATFORM="openai"  # or "anthropic"
```

3. **Restart Server**:
```bash
npm start
```

4. **Verify**: Check console for `[AI Service] OpenAI client initialized` or similar message.

**Note**: Without API keys, the chat agent will use fallback messages. See [AI_API_KEYS_SETUP.md](./AI_API_KEYS_SETUP.md) for complete setup guide.

# Run the script
./start.sh
```

**Option 4: Direct Node.js command**
```bash
node server.js
```

The server will start on http://localhost:8000

**Troubleshooting:**
- If port 8000 is in use, use: `PORT=8001 npm start` (Linux/Mac) or `set PORT=8001 && npm start` (Windows)
- Make sure Node.js is installed: `node --version` (should show v14 or higher)
- Make sure you're in the project directory: `cd paxiit_website`
### Configuration

- **Port**: 8000 (default)
- **URL**: http://localhost:8000
- **Admin Dashboard**: http://localhost:8000/admin.html

## 🔐 Admin Dashboard

### Default Credentials
- **Username**: `admin`
- **Password**: `admin123`

**⚠️ IMPORTANT**: Change the default password after first login!

### Features
- 📊 **Dashboard Overview**: Statistics and analytics
- 📄 **Pages Management**: Create, edit, delete HTML pages
- 🛠️ **Services Management**: Manage IT services
- ✏️ **Content Editor**: Multi-language content blocks
- 🎬 **Media Library**: Upload and manage media files
- 👥 **User Management**: Admin user accounts
- ⚙️ **Settings**: Website configuration
- 🔒 **Password Management**: Change password, reset password
- 🛡️ **Permissions**: Role-based access control

## 🌐 Multi-Language Support

### Supported Languages
- **English (en)** - Default
- **French (fr)** - Français
- **Arabic (ar)** - العربية (RTL support)
- **German (de)** - Deutsch
- **Spanish (es)** - Español

### Translation Widget

The website includes a **Translation Widget** - a powerful development tool for language configuration:

- **Dual Translation Methods**: CLS (manual) + Google Translate (automatic)
- **Floating Widget**: Always accessible, smart positioning
- **5 Languages Supported**: Full translation coverage
- **Easy Integration**: Simple initialization and configuration

📖 **Developer Guide**: See [TRANSLATION_WIDGET_DEVELOPER_GUIDE.md](./TRANSLATION_WIDGET_DEVELOPER_GUIDE.md) for complete documentation.

### Adding New Languages

1. Create translation file in `frontend/src/cls/translations/[lang].js`
2. Register language in `frontend/src/cls/lang-core.js`
3. Add translations for all keys
4. Widget automatically detects new languages

See [TRANSLATION_WIDGET_DEVELOPER_GUIDE.md](./TRANSLATION_WIDGET_DEVELOPER_GUIDE.md) for detailed instructions.

## 📝 Path Manager System (PMS)

All file paths use the Path Manager System - **NO HARDCODED PATHS**.

```javascript
// Frontend paths
PMS.frontend('pages', 'index.html')
PMS.frontend('assets', 'images', 'logo.png')

// Backend paths
PMS.backend('routes', 'admin.js')
PMS.backend('data', 'services.json')
```

## 🔒 Security

- Session-based authentication
- Password hashing (bcrypt with 10 salt rounds)
- Role-based permissions
- File upload validation
- CORS protection

## 📦 Media Management

- Upload images, videos, audio, PDFs
- Max file size: 50MB
- Storage: `frontend/src/assets/media/`
- Insert media into pages via page editor

## 🚧 Development

### ⚠️ CRITICAL: Development Rules

**🔴 MANDATORY RULE: DEV vs LIVE ENVIRONMENT**

- **ALL development work** must be done in the **DEV FOLDER** (`C:\Users\PC-PAXIIT\Desktop\paxiit_website`)
- **NEVER** modify files in **LIVE/PRODUCTION** folder directly (`/volume1/web/paxiit.com` on NAS)
- **NEVER** auto-deploy to production - **ALWAYS** wait for explicit user approval
- **ALWAYS** validate changes in dev folder before any deployment

**See [DEVELOPMENT_RULES.md](DEVELOPMENT_RULES.md) for complete rules and procedures.**

### Production Deployment

**Single Deployment Method**: `deploy.sh`

This is the **ONLY** method for deploying to production. The script handles:
- ✅ Server stop/start (systemd or manual)
- ✅ Automatic backup creation
- ✅ File deployment via SSH
- ✅ Dependency installation
- ✅ Deployment verification
- ✅ Endpoint testing

**Usage:**
```bash
# Make executable (first time only)
chmod +x deploy.sh

# Deploy to production
./deploy.sh
```

**Requirements:**
- SSH access to NAS (192.168.1.3:2222)
- Production path: `/volume1/web/paxiit.com`
- Git Bash terminal (not PowerShell/CMD)

**⚠️ Important:**
- Always test in dev (`http://localhost:8000`) before deploying
- Wait for explicit user approval before running deploy script
- The script creates automatic backups before deployment

### Standardized Tools System

**🔴 MANDATORY: Use Only Standardized Tools**

This project follows a **"One Tool, One Purpose"** principle to avoid confusion and errors:

| Tool | Purpose | Usage |
|------|---------|-------|
| `start.sh` | Server startup | `./start.sh` |
| `deploy.sh` | Production deployment | `./deploy.sh` (after approval) |
| `setup-api-keys.sh` | API key configuration | `./setup-api-keys.sh` |

**Rules:**
- ✅ **ONE** deployment method (`deploy.sh`)
- ✅ **ONE** server startup (`start.sh`)
- ✅ **NO** duplicate scripts
- ✅ **NO** test files in root
- ✅ **NO** temporary log files
- ✅ Clean git repository

**See [DEVELOPMENT_RULES.md](DEVELOPMENT_RULES.md) for complete standardized tools documentation.**

### Adding New Pages
1. Create HTML file in `frontend/src/pages/`
2. Use PMS for all paths
3. Include header and footer components
4. Add to navigation in `frontend/src/components/header.html`

### Adding New Services
1. Use Admin Dashboard → Services Management
2. Or edit `backend/data/services.json` directly

### Adding New Languages
1. Create translation file in `frontend/src/cls/translations/[lang].js` (copy from `en.js`)
2. Update `frontend/src/cls/lang-core.js` to register new language
3. Add all translation keys (see existing language files for structure)
4. Test in browser - widget automatically detects new language

📖 **Complete Guide**: See [TRANSLATION_WIDGET_DEVELOPER_GUIDE.md](./TRANSLATION_WIDGET_DEVELOPER_GUIDE.md)

## 📄 License

Copyright © 2025 Paxi iTechnologies. All rights reserved.

## 🔗 Links

- **Website**: https://paxiit.com
- **GitHub**: https://github.com/paxiitdevteam/Paxi-iTechnologies

## 👥 Contributing

This is a private repository. For contributions, please contact the development team.

---

**Built with ❤️ by Paxi iTechnologies**
