#!/usr/bin/env python3
"""
Development Server - Python
Serves frontend files and handles API requests
"""

import os
import sys
import json
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import mimetypes
from pathlib import Path

# Configuration
CONFIG = {
    'port': int(os.environ.get('PORT', 8000)),
    'host': os.environ.get('HOST', 'localhost'),
    'frontend_path': Path(__file__).parent / 'frontend' / 'src',
    'backend_path': Path(__file__).parent / 'backend',
    'enable_cors': True,
    'enable_logging': True
}

# MIME types
MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.css': 'text/css',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.pdf': 'application/pdf',
    '.zip': 'application/zip'
}


class RequestHandler(BaseHTTPRequestHandler):
    """HTTP Request Handler"""

    def log_message(self, format, *args):
        """Custom logging"""
        if CONFIG['enable_logging']:
            super().log_message(format, *args)

    def do_OPTIONS(self):
        """Handle CORS preflight"""
        self.send_response(200)
        self.send_cors_headers()
        self.end_headers()

    def send_cors_headers(self):
        """Send CORS headers"""
        if CONFIG['enable_cors']:
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    def get_mime_type(self, file_path):
        """Get MIME type for file"""
        ext = Path(file_path).suffix.lower()
        if ext in MIME_TYPES:
            return MIME_TYPES[ext]
        
        # Try mimetypes module
        mime_type, _ = mimetypes.guess_type(str(file_path))
        return mime_type or 'application/octet-stream'

    def resolve_file_path(self, request_path):
        """Resolve file path from request"""
        # Remove query string
        clean_path = request_path.split('?')[0]
        
        # Default to index.html for root
        if clean_path == '/' or clean_path == '':
            index_path = CONFIG['frontend_path'] / 'pages' / 'index.html'
            if index_path.exists():
                return index_path
            return None

        # Remove leading slash
        relative_path = clean_path.lstrip('/')
        
        # Try pages directory first
        file_path = CONFIG['frontend_path'] / 'pages' / relative_path
        if file_path.exists() and file_path.is_file():
            return file_path

        # Try with .html extension
        file_path = CONFIG['frontend_path'] / 'pages' / (relative_path + '.html')
        if file_path.exists():
            return file_path

        # Try frontend/src directory
        file_path = CONFIG['frontend_path'] / relative_path
        if file_path.exists() and file_path.is_file():
            return file_path

        # Try root directory
        file_path = Path(__file__).parent / relative_path
        if file_path.exists() and file_path.is_file():
            return file_path

        return None

    def handle_api(self, pathname):
        """Handle API requests"""
        if not pathname.startswith('/api/'):
            return False

        endpoint = pathname.replace('/api/', '')
        
        # Try to load backend route handler
        route_path = CONFIG['backend_path'] / 'routes' / f'{endpoint}.py'
        
        if route_path.exists():
            try:
                # Import and call route handler
                sys.path.insert(0, str(CONFIG['backend_path']))
                module_name = f'routes.{endpoint}'
                route_module = __import__(module_name, fromlist=['handler'])
                
                if hasattr(route_module, 'handler'):
                    route_module.handler(self)
                    return True
            except Exception as e:
                self.send_error_response(500, {'error': 'Internal server error', 'message': str(e)})
                return True

        # Default API response
        response = {
            'message': 'API endpoint',
            'endpoint': endpoint,
            'method': self.command,
            'timestamp': json.dumps({'timestamp': str(Path(__file__).stat().st_mtime)})
        }
        self.send_json_response(200, response)
        return True

    def send_file_response(self, file_path):
        """Send file as HTTP response"""
        try:
            with open(file_path, 'rb') as f:
                content = f.read()
            
            mime_type = self.get_mime_type(file_path)
            self.send_response(200)
            self.send_header('Content-Type', mime_type)
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(content)
        except Exception as e:
            self.send_error_response(500, {'error': 'File read error', 'message': str(e)})

    def send_json_response(self, status_code, data):
        """Send JSON response"""
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_cors_headers()
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

    def send_error_response(self, status_code, error_data):
        """Send error response"""
        self.send_json_response(status_code, error_data)

    def send_404(self):
        """Send 404 response"""
        index_path = CONFIG['frontend_path'] / 'pages' / 'index.html'
        if index_path.exists():
            self.send_file_response(index_path)
        else:
            html = """
            <!DOCTYPE html>
            <html>
            <head>
                <title>404 - Not Found</title>
                <style>
                    body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                    h1 { color: #e74c3c; }
                </style>
            </head>
            <body>
                <h1>404 - File Not Found</h1>
                <p>The requested file could not be found.</p>
                <p><a href="/">Go to Homepage</a></p>
            </body>
            </html>
            """
            self.send_response(404)
            self.send_header('Content-Type', 'text/html')
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(html.encode('utf-8'))

    def do_GET(self):
        """Handle GET requests"""
        parsed_url = urlparse(self.path)
        pathname = parsed_url.path

        # Handle API requests
        if self.handle_api(pathname):
            return

        # Serve static files
        file_path = self.resolve_file_path(pathname)
        
        if file_path and file_path.exists():
            self.send_file_response(file_path)
        else:
            self.send_404()

    def do_POST(self):
        """Handle POST requests"""
        parsed_url = urlparse(self.path)
        pathname = parsed_url.path

        # Handle API requests
        if self.handle_api(pathname):
            return

        self.send_error_response(404, {'error': 'Endpoint not found'})

    def do_PUT(self):
        """Handle PUT requests"""
        self.do_POST()

    def do_DELETE(self):
        """Handle DELETE requests"""
        self.do_POST()


def start_server():
    """Start the HTTP server"""
    server_address = (CONFIG['host'], CONFIG['port'])
    httpd = HTTPServer(server_address, RequestHandler)

    print('=' * 50)
    print('🚀 Development Server Started')
    print('=' * 50)
    print(f'📍 Server running at: http://{CONFIG["host"]}:{CONFIG["port"]}')
    print(f'📁 Frontend path: {CONFIG["frontend_path"]}')
    print(f'🔧 Backend path: {CONFIG["backend_path"]}')
    print(f'🌐 CORS: {"Enabled" if CONFIG["enable_cors"] else "Disabled"}')
    print(f'📝 Logging: {"Enabled" if CONFIG["enable_logging"] else "Disabled"}')
    print('=' * 50)
    print('Press Ctrl+C to stop the server')
    print('=' * 50)

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print('\n🛑 Server stopped')
        httpd.server_close()


if __name__ == '__main__':
    start_server()

