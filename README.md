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
├── server.py            # Python development server (alternative)
└── package.json         # Node.js dependencies
```

## 🛠️ Setup & Installation

### Prerequisites
- Node.js (v14 or higher) OR Python 3.7+
- Git

### Quick Start

**Using Node.js:**
```bash
# Install dependencies
npm install

# Start server
node server.js
# or
npm start
```

**Using Python:**
```bash
# Start server
python3 server.py
# or
python server.py
```

**Using Startup Scripts:**
- **Linux/Mac**: `./start.sh`
- **Windows (CMD.exe)**: `start.bat` (PowerShell is NOT supported)

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

Currently supported languages:
- English (en)
- French (fr)

More languages can be added via the Centralized Language System (CLS).

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
- Password hashing (TODO: implement proper bcrypt)
- Role-based permissions
- File upload validation
- CORS protection

## 📦 Media Management

- Upload images, videos, audio, PDFs
- Max file size: 50MB
- Storage: `frontend/src/assets/media/`
- Insert media into pages via page editor

## 🚧 Development

### Adding New Pages
1. Create HTML file in `frontend/src/pages/`
2. Use PMS for all paths
3. Include header and footer components
4. Add to navigation in `frontend/src/components/header.html`

### Adding New Services
1. Use Admin Dashboard → Services Management
2. Or edit `backend/data/services.json` directly

### Adding New Languages
1. Create translation file in `frontend/src/cls/lang/en.js` (copy structure)
2. Update `frontend/src/cls/lang-core.js` to include new language

## 📄 License

Copyright © 2025 Paxi iTechnologies. All rights reserved.

## 🔗 Links

- **Website**: https://paxiit.com
- **GitHub**: https://github.com/paxiitdevteam/Paxi-iTechnologies

## 👥 Contributing

This is a private repository. For contributions, please contact the development team.

---

**Built with ❤️ by Paxi iTechnologies**
