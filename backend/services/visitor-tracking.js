/**
 * Visitor Tracking Service
 * Tracks page views and visitor statistics
 * ALL PATHS USE PMS - NO HARDCODED PATHS
 */

const fs = require('fs');
const PMS = require('../utils/pms');

/**
 * Load visitor analytics from JSON file
 */
function loadVisitorAnalytics() {
    const analyticsPath = PMS.backend('data', 'visitor-analytics.json');
    
    if (!fs.existsSync(analyticsPath)) {
        return {
            totalVisitors: 0,
            totalPageViews: 0,
            uniqueVisitors: 0,
            pageViews: {},
            visitors: [],
            firstVisit: new Date().toISOString(),
            lastVisit: null,
            dailyStats: {}
        };
    }
    
    try {
        const fileContent = fs.readFileSync(analyticsPath, 'utf8');
        return JSON.parse(fileContent);
    } catch (error) {
        console.error('[VISITOR TRACKING] Error loading analytics:', error);
        return {
            totalVisitors: 0,
            totalPageViews: 0,
            uniqueVisitors: 0,
            pageViews: {},
            visitors: [],
            firstVisit: new Date().toISOString(),
            lastVisit: null,
            dailyStats: {}
        };
    }
}

/**
 * Save visitor analytics to JSON file
 */
function saveVisitorAnalytics(analytics) {
    const analyticsPath = PMS.backend('data', 'visitor-analytics.json');
    
    try {
        // Ensure directory exists
        const dataDir = PMS.backend('data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        fs.writeFileSync(analyticsPath, JSON.stringify(analytics, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('[VISITOR TRACKING] Error saving analytics:', error);
        return false;
    }
}

/**
 * Get or create visitor ID from request
 */
function getVisitorId(req) {
    // Try to get visitor ID from cookie
    const cookies = req.headers.cookie || '';
    const visitorIdMatch = cookies.match(/visitor_id=([^;]+)/);
    
    if (visitorIdMatch) {
        return visitorIdMatch[1];
    }
    
    // Generate new visitor ID
    return `visitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get IP address from request
 */
function getIPAddress(req) {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
           req.headers['x-real-ip'] ||
           req.connection?.remoteAddress ||
           req.socket?.remoteAddress ||
           'Unknown';
}

/**
 * Get location from IP address (simple geolocation)
 * Uses free IP geolocation API - ip-api.com (no API key required for basic usage)
 */
async function getLocationFromIP(ip) {
    // Skip for localhost/private IPs
    if (!ip || ip === 'Unknown' || ip.startsWith('127.') || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
        return { country: 'Local', city: 'Local', countryCode: 'LOC' };
    }
    
    try {
        const https = require('https');
        const url = `https://ip-api.com/json/${ip}?fields=status,message,country,countryCode,city,region,lat,lon,timezone,isp`;
        
        return new Promise((resolve) => {
            https.get(url, { timeout: 2000 }, (res) => {
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    try {
                        const geo = JSON.parse(data);
                        if (geo.status === 'success') {
                            resolve({
                                country: geo.country || 'Unknown',
                                countryCode: geo.countryCode || 'XX',
                                city: geo.city || 'Unknown',
                                region: geo.region || '',
                                lat: geo.lat,
                                lon: geo.lon,
                                timezone: geo.timezone || '',
                                isp: geo.isp || ''
                            });
                        } else {
                            resolve({ country: 'Unknown', city: 'Unknown', countryCode: 'XX' });
                        }
                    } catch (error) {
                        resolve({ country: 'Unknown', city: 'Unknown', countryCode: 'XX' });
                    }
                });
            }).on('error', () => {
                resolve({ country: 'Unknown', city: 'Unknown', countryCode: 'XX' });
            }).on('timeout', () => {
                resolve({ country: 'Unknown', city: 'Unknown', countryCode: 'XX' });
            });
        });
    } catch (error) {
        return { country: 'Unknown', city: 'Unknown', countryCode: 'XX' };
    }
}

/**
 * Get referrer source type (for SEO analysis)
 */
function getReferrerSource(referrer) {
    if (!referrer || referrer === '') {
        return { type: 'Direct', source: 'Direct', isSearch: false };
    }
    
    try {
        const url = new URL(referrer);
        const hostname = url.hostname.toLowerCase();
        
        // Search engines
        if (hostname.includes('google.com') || hostname.includes('google.')) {
            const query = url.searchParams.get('q') || '';
            return { type: 'Search Engine', source: 'Google', query: query, isSearch: true };
        }
        if (hostname.includes('bing.com')) {
            const query = url.searchParams.get('q') || '';
            return { type: 'Search Engine', source: 'Bing', query: query, isSearch: true };
        }
        if (hostname.includes('yahoo.com')) {
            const query = url.searchParams.get('p') || '';
            return { type: 'Search Engine', source: 'Yahoo', query: query, isSearch: true };
        }
        if (hostname.includes('duckduckgo.com')) {
            const query = url.searchParams.get('q') || '';
            return { type: 'Search Engine', source: 'DuckDuckGo', query: query, isSearch: true };
        }
        if (hostname.includes('yandex.com')) {
            const query = url.searchParams.get('text') || '';
            return { type: 'Search Engine', source: 'Yandex', query: query, isSearch: true };
        }
        
        // Social media
        if (hostname.includes('facebook.com') || hostname.includes('fb.com')) {
            return { type: 'Social Media', source: 'Facebook', isSearch: false };
        }
        if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
            return { type: 'Social Media', source: 'Twitter/X', isSearch: false };
        }
        if (hostname.includes('linkedin.com')) {
            return { type: 'Social Media', source: 'LinkedIn', isSearch: false };
        }
        if (hostname.includes('instagram.com')) {
            return { type: 'Social Media', source: 'Instagram', isSearch: false };
        }
        if (hostname.includes('youtube.com')) {
            return { type: 'Social Media', source: 'YouTube', isSearch: false };
        }
        if (hostname.includes('reddit.com')) {
            return { type: 'Social Media', source: 'Reddit', isSearch: false };
        }
        
        // Same domain (internal navigation)
        if (hostname.includes('paxiit.com') || hostname.includes('localhost')) {
            return { type: 'Internal', source: 'Internal Navigation', isSearch: false };
        }
        
        // External website
        return { type: 'External', source: hostname, isSearch: false };
    } catch (error) {
        return { type: 'Unknown', source: referrer.substring(0, 50), isSearch: false };
    }
}

/**
 * Track page view (async to support geolocation)
 */
async function trackPageView(req, pathname) {
    try {
        // Skip tracking for:
        // - API requests
        // - Static assets (images, CSS, JS, etc.)
        // - Admin pages (unless specifically needed)
        // - Favicon
        if (pathname.startsWith('/api/') || 
            pathname.startsWith('/assets/') ||
            pathname === '/favicon.ico' ||
            pathname === '/favicon.svg' ||
            pathname === '/robots.txt' ||
            pathname === '/sitemap.xml') {
            return null;
        }
        
        const analytics = loadVisitorAnalytics();
        const visitorId = getVisitorId(req);
        const now = new Date();
        const dateKey = now.toISOString().split('T')[0]; // YYYY-MM-DD
        const ip = getIPAddress(req);
        
        // Get referrer information
        const referrer = req.headers.referer || req.headers.referrer || '';
        const referrerInfo = getReferrerSource(referrer);
        
        // Update total page views
        analytics.totalPageViews = (analytics.totalPageViews || 0) + 1;
        
        // Track page-specific views
        if (!analytics.pageViews[pathname]) {
            analytics.pageViews[pathname] = 0;
        }
        analytics.pageViews[pathname] += 1;
        
        // Track unique visitors
        const isNewVisitor = !analytics.visitors.some(v => v.id === visitorId);
        if (isNewVisitor) {
            analytics.uniqueVisitors = (analytics.uniqueVisitors || 0) + 1;
            
            // Get location from IP (async, but don't block)
            const location = await getLocationFromIP(ip);
            
            analytics.visitors.push({
                id: visitorId,
                firstVisit: now.toISOString(),
                lastVisit: now.toISOString(),
                pageViews: 1,
                userAgent: req.headers['user-agent'] || 'Unknown',
                ip: ip,
                country: location.country,
                countryCode: location.countryCode,
                city: location.city,
                region: location.region,
                timezone: location.timezone,
                isp: location.isp,
                referrer: referrer,
                referrerType: referrerInfo.type,
                referrerSource: referrerInfo.source,
                searchQuery: referrerInfo.query || null,
                visitedPages: [pathname] // Track pages visited
            });
        } else {
            // Update existing visitor
            const visitor = analytics.visitors.find(v => v.id === visitorId);
            if (visitor) {
                visitor.lastVisit = now.toISOString();
                visitor.pageViews = (visitor.pageViews || 0) + 1;
                
                // Track visited pages (avoid duplicates, keep last 20)
                if (!visitor.visitedPages) {
                    visitor.visitedPages = [];
                }
                if (!visitor.visitedPages.includes(pathname)) {
                    visitor.visitedPages.push(pathname);
                    // Keep only last 20 pages
                    if (visitor.visitedPages.length > 20) {
                        visitor.visitedPages = visitor.visitedPages.slice(-20);
                    }
                }
                
                // Update referrer only if this is first visit (entry point)
                if (!visitor.referrer || visitor.referrer === '') {
                    visitor.referrer = referrer;
                    visitor.referrerType = referrerInfo.type;
                    visitor.referrerSource = referrerInfo.source;
                    visitor.searchQuery = referrerInfo.query || null;
                }
                
                // Update location if not set or IP changed
                if (!visitor.country || visitor.ip !== ip) {
                    const location = await getLocationFromIP(ip);
                    visitor.ip = ip;
                    visitor.country = location.country;
                    visitor.countryCode = location.countryCode;
                    visitor.city = location.city;
                    visitor.region = location.region;
                    visitor.timezone = location.timezone;
                    visitor.isp = location.isp;
                }
            }
        }
        
        // Track daily stats
        if (!analytics.dailyStats[dateKey]) {
            analytics.dailyStats[dateKey] = {
                date: dateKey,
                pageViews: 0,
                uniqueVisitors: [] // Use array instead of Set for JSON serialization
            };
        }
        analytics.dailyStats[dateKey].pageViews += 1;
        if (isNewVisitor) {
            // Add visitor ID to array if not already present
            if (!analytics.dailyStats[dateKey].uniqueVisitors.includes(visitorId)) {
                analytics.dailyStats[dateKey].uniqueVisitors.push(visitorId);
            }
        }
        
        // Update first and last visit
        if (!analytics.firstVisit) {
            analytics.firstVisit = now.toISOString();
        }
        analytics.lastVisit = now.toISOString();
        
        // Save analytics
        saveVisitorAnalytics(analytics);
        
        return visitorId;
    } catch (error) {
        console.error('[VISITOR TRACKING] Error tracking page view:', error);
        return null;
    }
}

/**
 * Get visitor statistics
 */
function getVisitorStats() {
    const analytics = loadVisitorAnalytics();
    
    // Convert daily stats arrays to counts
    const dailyStatsArray = Object.keys(analytics.dailyStats || {}).map(date => {
        const stat = analytics.dailyStats[date];
        return {
            date: stat.date,
            pageViews: stat.pageViews,
            uniqueVisitors: Array.isArray(stat.uniqueVisitors) ? stat.uniqueVisitors.length : (stat.uniqueVisitorsCount || 0)
        };
    }).sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Get top pages
    const topPages = Object.entries(analytics.pageViews || {})
        .map(([path, views]) => ({ path, views }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 10);
    
    return {
        totalVisitors: analytics.uniqueVisitors || 0,
        totalPageViews: analytics.totalPageViews || 0,
        uniqueVisitors: analytics.uniqueVisitors || 0,
        firstVisit: analytics.firstVisit,
        lastVisit: analytics.lastVisit,
        topPages: topPages,
        dailyStats: dailyStatsArray,
        pageViews: analytics.pageViews || {},
        visitors: analytics.visitors || [] // Include full visitor list with location data
    };
}

/**
 * Get visitor ID cookie header
 */
function getVisitorIdCookie(visitorId) {
    // Set cookie to expire in 1 year
    const expires = new Date();
    expires.setFullYear(expires.getFullYear() + 1);
    return `visitor_id=${visitorId}; Path=/; Expires=${expires.toUTCString()}; SameSite=Lax`;
}

module.exports = {
    trackPageView,
    getVisitorStats,
    getVisitorIdCookie,
    loadVisitorAnalytics,
    saveVisitorAnalytics
};

