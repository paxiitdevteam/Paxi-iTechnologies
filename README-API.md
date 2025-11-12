# API Path Management System

## Overview

The API Path Management System provides standardized API endpoint management for the Paxiit website. It ensures consistent API paths across frontend and backend.

## Structure

```
backend/
├── config/
│   └── api-config.js          # API configuration
├── routes/
│   ├── api-router.js          # Centralized API router
│   └── example-handler.js     # Example route handlers

frontend/src/services/
└── api-path-manager.js        # Frontend API path manager

shared/utils/
└── api-endpoints.js           # Shared endpoint definitions
```

## Features

- ✅ **Standardized Endpoints**: Consistent API paths across frontend and backend
- ✅ **Type Safety**: Clear endpoint definitions
- ✅ **Dynamic Routes**: Support for parameters (e.g., `/api/users/:id`)
- ✅ **Error Handling**: Built-in error handling and response formatting
- ✅ **Authentication**: Automatic token handling
- ✅ **CORS Support**: Configured CORS for development

## Frontend Usage

### Basic Usage

```javascript
// Include API Path Manager
<script src="/frontend/src/services/api-path-manager.js"></script>

// GET request
const users = await APIM.get('users', 'list');

// GET with ID
const user = await APIM.get('users', 'get', { id: 1 });

// POST request
const newUser = await APIM.post('users', 'create', {
    name: 'John Doe',
    email: 'john@example.com'
});

// PUT request
await APIM.put('users', 'update', { id: 1, name: 'Jane Doe' });

// DELETE request
await APIM.delete('users', 'delete', { id: 1 });
```

### Custom Requests

```javascript
// Custom request with options
const response = await APIM.request('contact', 'send', {
    method: 'POST',
    data: {
        name: 'John',
        email: 'john@example.com',
        message: 'Hello'
    },
    headers: {
        'Custom-Header': 'value'
    }
});
```

### Authentication

```javascript
// Set authentication token
APIM.setAuthToken('your-token-here');

// Token is automatically included in requests
const data = await APIM.get('users', 'profile');

// Remove token
APIM.setAuthToken(null);
```

## Backend Usage

### Register Route Handler

```javascript
const apiRouter = require('./routes/api-router');

// Register handler
apiRouter.registerRoute('users', 'list', async (req, res) => {
    // Handle GET /api/users
    const users = await getUsersFromDatabase();
    apiRouter.sendSuccess(res, users);
});

apiRouter.registerRoute('users', 'get', async (req, res) => {
    // Handle GET /api/users/:id
    const userId = req.params.id;
    const user = await getUserFromDatabase(userId);
    apiRouter.sendSuccess(res, user);
});
```

### Response Formatting

```javascript
// Success response
apiRouter.sendSuccess(res, data, 'Success message', 200);

// Error response
apiRouter.sendError(res, {
    message: 'Error message',
    statusCode: 400,
    errors: { field: 'Error details' }
});
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `POST /api/auth/register` - Register
- `POST /api/auth/refresh` - Refresh token
- `GET /api/auth/verify` - Verify token

### Users
- `GET /api/users` - List users
- `GET /api/users/:id` - Get user
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `GET /api/users/profile` - Get profile

### Projects
- `GET /api/projects` - List projects
- `GET /api/projects/:id` - Get project
- `POST /api/projects` - Create project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project
- `GET /api/projects/search` - Search projects

### Contact
- `POST /api/contact` - Send contact message
- `POST /api/contact/inquiry` - Send inquiry

## Configuration

### API Config (`backend/config/api-config.js`)

```javascript
{
    version: 'v1',
    basePath: '/api',
    cors: {
        enabled: true,
        origin: '*'
    },
    rateLimit: {
        enabled: true,
        windowMs: 15 * 60 * 1000,
        max: 100
    }
}
```

## Error Handling

### Frontend

```javascript
try {
    const data = await APIM.get('users', 'list');
} catch (error) {
    if (error instanceof APIError) {
        console.error('API Error:', error.message);
        console.error('Status:', error.status);
        console.error('Data:', error.data);
    }
}
```

### Backend

```javascript
try {
    // Process request
    apiRouter.sendSuccess(res, data);
} catch (error) {
    apiRouter.sendError(res, {
        message: error.message,
        statusCode: 500
    });
}
```

## Best Practices

1. ✅ **Always use APIM** for API calls - Never hardcode API URLs
2. ✅ **Use consistent endpoint names** - Follow the defined categories
3. ✅ **Handle errors properly** - Use try/catch blocks
4. ✅ **Validate data** - Validate on both frontend and backend
5. ✅ **Use TypeScript** - For better type safety (optional)

## Integration with Server

The server (`server.js` or `server.py`) automatically handles API requests:

```javascript
// Server automatically routes /api/* requests
// to backend/routes/ handlers
```

## Testing

See `frontend/src/pages/api-demo.html` for a live demo of the API Path Manager.

