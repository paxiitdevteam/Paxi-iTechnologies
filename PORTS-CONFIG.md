# 🔌 Fixed Port Configuration System

## Overview

All resources use **FIXED PORTS** to prevent loading issues and conflicts. Port configuration is integrated with Path Manager System (PMS).

## Port Assignments

### Main Server Port
- **Port**: `8000` (FIXED)
- **Purpose**: Main development server
- **Used for**: All frontend, backend, API, and shared resources

### Resource Ports (All use port 8000)
- **Frontend**: Port 8000
  - Pages, components, assets, CSS, JS, images, fonts
- **Backend**: Port 8000
  - Routes, config, models
- **API**: Port 8000
  - All API endpoints (auth, users, projects, services, contact, analytics, files)
- **Shared**: Port 8000
  - Constants, utils

### Reserved Ports (For Future Use)
- **WebSocket**: Port 8001
- **Database**: Port 8002
- **Redis**: Port 8003
- **Elasticsearch**: Port 8004

## Configuration Files

### Backend (`backend/config/ports-config.js`)
```javascript
const portsConfig = require('./backend/config/ports-config.js');
const port = portsConfig.getPort('server', 'development'); // Returns 8000
```

### Frontend (`frontend/src/services/port-manager.js`)
```javascript
// Auto-detects port from current location
// Falls back to 8000 if not detected
window.PortM.getPort('server'); // Returns 8000
window.PortM.getBaseURL('api'); // Returns http://localhost:8000
```

### Shared (`shared/constants/ports-config.js`)
```javascript
import { getPort, getBaseURL } from '/shared/constants/ports-config.js';
const port = getPort('server'); // Returns 8000
```

## Integration with PMS

All port configurations are loaded via **Path Manager System (PMS)**:

```javascript
// Server loads port config via PMS
const portsConfig = require(PMS.backend('config', 'ports-config.js'));

// Frontend uses Port Manager (integrated with PMS)
window.PortM.getBaseURL('api');
```

## Usage Examples

### Server Side
```javascript
const portsConfig = require('./backend/config/ports-config.js');
const serverPort = portsConfig.getPort('server', 'development');
// Returns: 8000
```

### Frontend Side
```javascript
// Using Port Manager
const apiURL = window.PortM.getResourceURL('api', '/api/test');
// Returns: http://localhost:8000/api/test

// Using PMS
const apiURL = window.PMS.getBaseURL('api') + '/api/test';
// Returns: http://localhost:8000/api/test
```

## Benefits

✅ **No Port Conflicts**: Fixed ports prevent conflicts
✅ **Consistent Loading**: All resources use same port
✅ **PMS Integration**: Ports loaded via PMS paths
✅ **Easy Configuration**: Single source of truth
✅ **Future Ready**: Reserved ports for expansion

## Rules

- ✅ **ALL resources use port 8000** (main server)
- ✅ **Port config loaded via PMS** (no hardcoded paths)
- ✅ **Port Manager integrated with PMS** (frontend)
- ❌ **NO hardcoded ports** (use port config)
- ❌ **NO port conflicts** (fixed assignments)

## Changing Ports

To change the main server port:

1. **Environment Variable**:
   ```bash
   PORT=8001 node server.js
   ```

2. **Port Config File**:
   Edit `backend/config/ports-config.js`:
   ```javascript
   server: {
       default: 8001,  // Change here
       development: 8001
   }
   ```

## Verification

When server starts, you'll see:
```
🔌 Fixed Port Configuration:
   Server: 8000
   API: 8000
   Frontend: 8000
   Backend: 8000
   Reserved ports: 8001, 8002, 8003, 8004
```

## Files Created

1. ✅ `backend/config/ports-config.js` - Backend port configuration
2. ✅ `shared/constants/ports-config.js` - Shared port configuration
3. ✅ `frontend/src/services/port-manager.js` - Frontend port manager
4. ✅ Server integrated with port config via PMS
5. ✅ Frontend integrated with port manager
6. ✅ API Path Manager uses fixed ports

All ports are now **FIXED and CONFIGURED** to prevent loading issues!

