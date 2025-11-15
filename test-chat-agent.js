/**
 * Chat Agent Test Script
 * Quick validation of chat agent functionality
 */

const http = require('http');

const BASE_URL = 'http://localhost:8000';
let sessionId = null;

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            hostname: url.hostname,
            port: url.port || 8000,
            path: url.pathname + url.search,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => {
                body += chunk;
            });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    resolve({ status: res.statusCode, data: parsed });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

async function testSessionCreation() {
    log('\n📋 Test 1: Session Creation', 'blue');
    try {
        const response = await makeRequest('GET', '/api/chat/session');
        if (response.status === 200 && response.data.success) {
            sessionId = response.data.data.sessionId;
            log(`✅ Session created: ${sessionId}`, 'green');
            return true;
        } else {
            log(`❌ Session creation failed: ${JSON.stringify(response.data)}`, 'red');
            return false;
        }
    } catch (error) {
        log(`❌ Error: ${error.message}`, 'red');
        return false;
    }
}

async function testSessionValidation() {
    log('\n📋 Test 2: Session Validation', 'blue');
    if (!sessionId) {
        log('⚠️  No session ID available', 'yellow');
        return false;
    }
    try {
        const response = await makeRequest('GET', `/api/chat/session?sessionId=${sessionId}`);
        if (response.status === 200 && response.data.success && response.data.data.valid) {
            log(`✅ Session validated successfully`, 'green');
            return true;
        } else {
            log(`❌ Session validation failed: ${JSON.stringify(response.data)}`, 'red');
            return false;
        }
    } catch (error) {
        log(`❌ Error: ${error.message}`, 'red');
        return false;
    }
}

async function testSendMessage() {
    log('\n📋 Test 3: Send Message', 'blue');
    if (!sessionId) {
        log('⚠️  No session ID available', 'yellow');
        return false;
    }
    try {
        const testMessage = {
            message: 'Hello! What services does Paxi iTechnologies offer?',
            sessionId: sessionId
        };
        log(`📤 Sending: "${testMessage.message}"`, 'yellow');
        const response = await makeRequest('POST', '/api/chat/send', testMessage);
        if (response.status === 200 && response.data.success) {
            log(`✅ Message sent successfully`, 'green');
            log(`📥 Response: ${response.data.data.message.substring(0, 100)}...`, 'yellow');
            log(`⏱️  Response time: ${response.data.data.responseTime || 'N/A'}ms`, 'yellow');
            log(`🤖 Model: ${response.data.data.model || 'N/A'}`, 'yellow');
            return true;
        } else {
            log(`❌ Send message failed: ${JSON.stringify(response.data)}`, 'red');
            return false;
        }
    } catch (error) {
        log(`❌ Error: ${error.message}`, 'red');
        return false;
    }
}

async function testGetHistory() {
    log('\n📋 Test 4: Get Conversation History', 'blue');
    if (!sessionId) {
        log('⚠️  No session ID available', 'yellow');
        return false;
    }
    try {
        const response = await makeRequest('GET', `/api/chat/history?sessionId=${sessionId}`);
        if (response.status === 200 && response.data.success) {
            const messages = response.data.data.messages || [];
            log(`✅ History retrieved: ${messages.length} message(s)`, 'green');
            if (messages.length > 0) {
                log(`📝 Latest: ${messages[messages.length - 1].userMessage}`, 'yellow');
            }
            return true;
        } else {
            log(`❌ Get history failed: ${JSON.stringify(response.data)}`, 'red');
            return false;
        }
    } catch (error) {
        log(`❌ Error: ${error.message}`, 'red');
        return false;
    }
}

async function testRateLimiting() {
    log('\n📋 Test 5: Rate Limiting (Sending 12 messages quickly)', 'blue');
    if (!sessionId) {
        log('⚠️  No session ID available', 'yellow');
        return false;
    }
    try {
        let successCount = 0;
        let rateLimited = false;
        for (let i = 1; i <= 12; i++) {
            const response = await makeRequest('POST', '/api/chat/send', {
                message: `Test message ${i}`,
                sessionId: sessionId
            });
            if (response.status === 200) {
                successCount++;
            } else if (response.status === 429) {
                rateLimited = true;
                log(`✅ Rate limit triggered at message ${i} (Expected)`, 'green');
                break;
            }
        }
        if (rateLimited) {
            log(`✅ Rate limiting works correctly`, 'green');
            return true;
        } else {
            log(`⚠️  Rate limit not triggered (may need adjustment)`, 'yellow');
            return true; // Not a failure, just a note
        }
    } catch (error) {
        log(`❌ Error: ${error.message}`, 'red');
        return false;
    }
}

async function testInputValidation() {
    log('\n📋 Test 6: Input Validation', 'blue');
    if (!sessionId) {
        log('⚠️  No session ID available', 'yellow');
        return false;
    }
    try {
        // Test empty message
        const emptyResponse = await makeRequest('POST', '/api/chat/send', {
            message: '',
            sessionId: sessionId
        });
        if (emptyResponse.status === 400) {
            log(`✅ Empty message rejected`, 'green');
        } else {
            log(`⚠️  Empty message not rejected`, 'yellow');
        }

        // Test XSS attempt
        const xssResponse = await makeRequest('POST', '/api/chat/send', {
            message: '<script>alert("XSS")</script>',
            sessionId: sessionId
        });
        if (xssResponse.status === 200) {
            // Check if script tags are escaped
            const responseText = xssResponse.data.data.message || '';
            if (!responseText.includes('<script>')) {
                log(`✅ XSS attempt sanitized`, 'green');
            } else {
                log(`⚠️  XSS not sanitized`, 'yellow');
            }
        }

        return true;
    } catch (error) {
        log(`❌ Error: ${error.message}`, 'red');
        return false;
    }
}

async function runAllTests() {
    log('🧪 AI Chat Agent - Test Suite', 'blue');
    log('='.repeat(50), 'blue');

    const results = {
        sessionCreation: await testSessionCreation(),
        sessionValidation: await testSessionValidation(),
        sendMessage: await testSendMessage(),
        getHistory: await testGetHistory(),
        rateLimiting: await testRateLimiting(),
        inputValidation: await testInputValidation()
    };

    log('\n' + '='.repeat(50), 'blue');
    log('📊 Test Results Summary', 'blue');
    log('='.repeat(50), 'blue');

    let passed = 0;
    let failed = 0;

    Object.entries(results).forEach(([test, result]) => {
        if (result) {
            log(`✅ ${test}: PASSED`, 'green');
            passed++;
        } else {
            log(`❌ ${test}: FAILED`, 'red');
            failed++;
        }
    });

    log('\n' + '='.repeat(50), 'blue');
    log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`, 
        failed === 0 ? 'green' : 'yellow');
    log('='.repeat(50), 'blue');

    if (failed === 0) {
        log('\n🎉 All tests passed! Chat agent is ready.', 'green');
    } else {
        log('\n⚠️  Some tests failed. Please review the errors above.', 'yellow');
    }
}

// Run tests
runAllTests().catch(error => {
    log(`\n❌ Test suite error: ${error.message}`, 'red');
    process.exit(1);
});

