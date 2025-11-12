/**
 * Services API Route Handler
 * Handles service-related API requests
 */

const apiRouter = require('./api-router');

// Services data
const servicesData = [
    {
        id: 1,
        name: "IT Project Management",
        icon: "🚀",
        category: "management",
        description: "PMI and Agile frameworks. End-to-end project management from planning to deployment, ensuring systems are delivered on time, within scope, and ready for real-world performance.",
        details: [
            "PMI (Project Management Institute) certified methodologies",
            "Agile and Scrum frameworks",
            "End-to-end project lifecycle management",
            "Risk management and mitigation",
            "Stakeholder communication and reporting",
            "Budget and timeline tracking"
        ],
        certifications: ["PMP", "Scrum", "ITIL"]
    },
    {
        id: 2,
        name: "Cloud & Infrastructure Solutions",
        icon: "☁️",
        category: "infrastructure",
        description: "Digital infrastructure design (LAN, WAN, Wi-Fi, Server Rooms) and cloud optimization (Azure, Synology NAS). Scalable solutions to support your business growth.",
        details: [
            "LAN, WAN, and Wi-Fi network design",
            "Server room planning and setup",
            "Azure cloud migration and optimization",
            "Synology NAS configuration and management",
            "Network security and monitoring",
            "Infrastructure scalability planning"
        ],
        technologies: ["Azure", "Synology NAS", "Cisco", "Ubiquiti"]
    },
    {
        id: 3,
        name: "Enterprise Device Lifecycle",
        icon: "🔧",
        category: "operations",
        description: "Device refresh and lifecycle projects. CRM and ITSM integration (Salesforce, Jira, ServiceNow) for seamless operations.",
        details: [
            "Device procurement and deployment",
            "Lifecycle management and refresh planning",
            "Salesforce CRM integration",
            "Jira project management integration",
            "ServiceNow ITSM implementation",
            "Asset tracking and inventory management"
        ],
        platforms: ["Salesforce", "Jira", "ServiceNow"]
    },
    {
        id: 4,
        name: "AI-Driven Automation",
        icon: "🤖",
        category: "automation",
        description: "Business operations automation using AI technologies. Transform operational challenges into digital performance with measurable KPIs.",
        details: [
            "AI-powered workflow automation",
            "Business process optimization",
            "KPI tracking and analytics",
            "Predictive maintenance systems",
            "Intelligent data processing",
            "Custom AI solution development"
        ],
        technologies: ["Machine Learning", "Natural Language Processing", "RPA"]
    },
    {
        id: 5,
        name: "Event Technology",
        icon: "🎫",
        category: "events",
        description: "Access control and ticketing systems. Proven experience delivering large-scale technology programs including the Paris 2024 Olympic Games.",
        details: [
            "Access control system design",
            "Ticketing platform integration",
            "Large-scale event technology management",
            "Real-time monitoring and support",
            "Multi-venue coordination",
            "Security and compliance for events"
        ],
        experience: ["Paris 2024 Olympic Games", "Large-scale international events"]
    },
    {
        id: 6,
        name: "Structured Delivery",
        icon: "🎯",
        category: "methodology",
        description: "Services structured following the OSI Model, ensuring transparency, alignment, and traceability across every technical layer.",
        details: [
            "OSI Model-based service structure",
            "Layer-by-layer transparency",
            "End-to-end traceability",
            "Technical documentation and alignment",
            "Cross-layer integration testing",
            "Comprehensive system monitoring"
        ],
        methodology: ["OSI Model", "ITIL", "ISO Standards"]
    },
    {
        id: 7,
        name: "IT Consulting",
        icon: "📋",
        category: "consulting",
        description: "Strategic IT consulting services that help organizations transform their technology infrastructure, optimize operations, and achieve their business goals.",
        details: [
            "Strategic IT blueprints and roadmaps",
            "Technology assessment and planning",
            "Business-IT alignment strategies",
            "Cost optimization analysis",
            "Risk assessment and mitigation",
            "Implementation planning and execution"
        ],
        certifications: ["ITIL", "PMP", "Strategic Planning"]
    },
    {
        id: 8,
        name: "Device Refresh Projects",
        icon: "🔄",
        category: "consulting",
        description: "Comprehensive device refresh and lifecycle projects. We integrate CRM and ITSM systems for seamless operations and efficient asset management.",
        details: [
            "Device procurement and deployment",
            "Asset management and inventory",
            "CRM integration (Salesforce)",
            "ITSM integration (Jira, ServiceNow)",
            "Endpoint security and compliance",
            "Lifecycle planning and optimization"
        ],
        platforms: ["Salesforce", "Jira", "ServiceNow", "Asset Management"]
    }
];

/**
 * Services API handler
 */
function servicesHandler(req, res) {
    const method = req.method;
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;
    const pathParts = pathname.split('/').filter(p => p);

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle OPTIONS request
    if (method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    switch (method) {
        case 'GET':
            // Get services list or single service
            if (pathname === '/api/services' || pathname === '/api/services/') {
                // List all services
                apiRouter.sendSuccess(res, {
                    services: servicesData,
                    count: servicesData.length
                }, 'Services retrieved successfully');
            } else if (pathname.startsWith('/api/services/')) {
                // Get single service by ID
                const serviceId = parseInt(pathParts[pathParts.length - 1]);
                const service = servicesData.find(s => s.id === serviceId);
                
                if (service) {
                    apiRouter.sendSuccess(res, service, 'Service retrieved successfully');
                } else {
                    apiRouter.sendError(res, {
                        message: 'Service not found',
                        statusCode: 404
                    });
                }
            } else if (pathname === '/api/services/categories' || pathname === '/api/services/categories/') {
                // Get service categories
                const categories = [...new Set(servicesData.map(s => s.category))];
                apiRouter.sendSuccess(res, {
                    categories: categories,
                    count: categories.length
                }, 'Categories retrieved successfully');
            } else {
                apiRouter.send404(res);
            }
            break;

        default:
            apiRouter.send404(res);
    }
}

module.exports = servicesHandler;

