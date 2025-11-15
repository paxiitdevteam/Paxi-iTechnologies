/**
 * AI Service Module
 * Handles AI platform integration (OpenAI or Anthropic)
 * Provides intelligent responses for chat agent
 * ALL PATHS USE PMS - NO HARDCODED PATHS
 */

const fs = require('fs');
const PMS = require('../utils/pms'); // Path Manager System - SINGLE SOURCE OF TRUTH
const chatConfig = require('../config/chat-config');

// AI Platform clients (lazy loaded)
let openaiClient = null;
let anthropicClient = null;

/**
 * Initialize OpenAI client
 */
function initializeOpenAI() {
    if (openaiClient) return openaiClient;
    
    try {
        const OpenAI = require('openai');
        // Re-read from process.env dynamically to get latest value
        const apiKey = process.env.OPENAI_API_KEY || chatConfig.openaiApiKey || '';
        
        if (!apiKey || apiKey.trim() === '') {
            console.warn('[AI Service] ⚠️  OpenAI API key not configured');
            console.warn('[AI Service] Please set OPENAI_API_KEY in .env file and restart the server');
            return null;
        }
        
        // Verify key format
        if (!apiKey.startsWith('sk-')) {
            console.warn('[AI Service] ⚠️  OpenAI API key format may be incorrect (should start with sk-)');
            console.warn(`[AI Service] Key starts with: ${apiKey.substring(0, 3)}`);
        }
        
        openaiClient = new OpenAI({
            apiKey: apiKey
        });
        
        console.log('[AI Service] ✅ OpenAI client initialized successfully');
        return openaiClient;
    } catch (error) {
        console.error('[AI Service] ❌ Error initializing OpenAI:', error);
        return null;
    }
}

/**
 * Initialize Anthropic client
 */
function initializeAnthropic() {
    if (anthropicClient) return anthropicClient;
    
    try {
        const Anthropic = require('@anthropic-ai/sdk');
        const apiKey = chatConfig.anthropicApiKey;
        
        if (!apiKey) {
            console.warn('[AI Service] Anthropic API key not configured');
            return null;
        }
        
        anthropicClient = new Anthropic({
            apiKey: apiKey
        });
        
        console.log('[AI Service] Anthropic client initialized');
        return anthropicClient;
    } catch (error) {
        console.error('[AI Service] Error initializing Anthropic:', error);
        return null;
    }
}

/**
 * Load services data for AI context - USING PMS (NO HARDCODED PATHS)
 */
function loadServicesData() {
    const servicesPath = PMS.backend('data', 'services.json');
    
    if (!fs.existsSync(servicesPath)) {
        console.warn('[AI Service] Services data not found');
        return [];
    }
    
    try {
        const fileContent = fs.readFileSync(servicesPath, 'utf8');
        const services = JSON.parse(fileContent);
        return services || [];
    } catch (error) {
        console.error('[AI Service] Error loading services data:', error);
        return [];
    }
}

/**
 * Build system prompt with company context and services
 */
function buildSystemPrompt() {
    const services = loadServicesData();
    
    // Build services knowledge base
    const servicesInfo = services.map(service => {
        return `- ${service.name} (${service.icon || ''}): ${service.description || ''}`;
    }).join('\n');
    
    // Build detailed services information with links
    const servicesDetails = services.map(service => {
        const details = service.details ? service.details.join(', ') : '';
        const technologies = service.technologies ? service.technologies.join(', ') : '';
        return `${service.icon || ''} **${service.name}**: ${service.description || ''}${details ? ' Details: ' + details + '.' : ''}${technologies ? ' Technologies: ' + technologies + '.' : ''}`;
    }).join('\n\n');

    // Extract AI Training service details for enhanced information
    const aiTrainingService = services.find(s => s.name === 'AI Learning & Training Programs');
    const aiTrainingDetails = aiTrainingService ? `
🎓 **AI LEARNING & TRAINING PROGRAMS - DETAILED INFORMATION:**

Our AI Learning & Training Programs are comprehensive, practical, and designed for real-world application. These programs are in HIGH DEMAND from companies seeking AI expertise.

**PROGRAM OFFERINGS:**

1. **AI Fundamentals for Business Professionals**
   - Introduction to AI concepts and terminology
   - Understanding AI capabilities and limitations
   - Practical AI tools for business use
   - AI ethics and responsible AI use
   - Real-world AI case studies
   - Duration: Typically 1-2 days
   - Format: In-person or virtual workshops

2. **Advanced AI Development & Integration**
   - AI platform integration (OpenAI, Anthropic, Google AI)
   - API integration and development
   - Custom AI application development
   - AI workflow automation
   - Prompt engineering and optimization
   - AI chatbot development
   - Duration: Typically 3-5 days
   - Format: Hands-on technical training

3. **AI for Business Leaders & Executives**
   - Strategic AI planning and roadmaps
   - AI ROI analysis and business case development
   - AI governance and best practices
   - AI opportunity assessment
   - Building AI-ready organizations
   - Duration: Typically 1-2 days
   - Format: Executive workshops and strategy sessions

4. **Custom Corporate AI Training Programs**
   - Tailored to your organization's specific needs
   - Industry-specific AI applications
   - Team-based training programs
   - On-site or virtual delivery
   - Flexible scheduling and duration
   - Includes follow-up support and consultation

5. **Prompt Engineering Workshops**
   - Advanced prompt design techniques
   - Optimizing AI responses for business needs
   - Context management and conversation design
   - Multi-turn conversation strategies
   - Prompt testing and iteration
   - Duration: Typically 1-2 days
   - Format: Hands-on workshops with real examples

6. **Hands-on AI Tool Implementation**
   - Practical implementation of AI tools
   - Integration with existing business systems
   - AI-powered workflow automation
   - Real-time AI application development
   - Troubleshooting and optimization
   - Duration: Varies based on scope
   - Format: Project-based learning

**KEY BENEFITS:**
- Practical, hands-on learning approach
- Real-world case studies and examples
- Industry-experienced instructors
- Customizable programs for your organization
- Ongoing support and consultation
- High demand from companies seeking AI expertise

**WHO SHOULD ATTEND:**
- Business professionals wanting to understand AI
- Developers and IT teams implementing AI solutions
- Business leaders planning AI strategies
- Organizations seeking AI transformation
- Teams needing AI tool training

**CERTIFICATIONS & RECOGNITION:**
- AI Training Certification
- Prompt Engineering Certification
- AI Integration Certification

**NEXT STEPS:**
For detailed information about program schedules, pricing, and customization options, please use our <a href="/pages/contact.html">contact form</a> or email us at contact@paxiit.com. We can discuss your specific training needs and create a customized program for your organization.
` : '';

    const systemPrompt = `You are an enthusiastic and proactive AI sales and marketing assistant for Paxi iTechnologies, a company specializing in Smart IT Management with clear, real-world results. Your primary role is to engage users, promote services, and motivate them to request consultations and services.

COMPANY INFORMATION:
- Company: Paxi iTechnologies
- Tagline: Smart IT Management. Clear Results.
- Focus: Building clear, modern, and smart IT systems with real-world results
- Business Model: We provide comprehensive IT solutions including project management, cloud infrastructure, AI services, and training programs. We help businesses achieve clear, measurable results through smart IT management.
- Website: https://paxiit.com
- Contact Email: contact@paxiit.com
- Phone: +33 7 82 39 13 11
- Address: 49 AVE LUCIE AUBRAC, BONNEUIL-SUR-MARNE, VAL DE MARNE 94380, FRANCE
- Experience: Proven track record including large-scale projects like the Paris 2024 Olympic Games
- Value Proposition: We deliver clear, measurable results. Our clients trust us because we combine expertise with practical solutions that drive real business value.

SERVICES OFFERED:
${servicesDetails || 'Services information is being loaded...'}

${aiTrainingDetails}

USEFUL LINKS:
- Services Page: /pages/services.html (or /services.html)
- Contact Form: /pages/contact.html (or /contact.html)
- About Us: /pages/about.html (or /about.html)
- Homepage: /index.html (or /)

YOUR ROLE - MARKETING & SALES ASSISTANT:
You are a 24/7 sales and marketing assistant. Your goals are to:
1. **ENGAGE AND MOTIVATE** - Actively engage users and motivate them to explore our services
2. **PROMOTE SERVICES** - Proactively identify opportunities to promote relevant services
3. **BUILD INTEREST** - Create excitement and interest in our solutions
4. **GENERATE LEADS** - Encourage users to request consultations, quotes, and services
5. **PROVIDE VALUE** - Share valuable information that demonstrates our expertise
6. **CREATE URGENCY** - When appropriate, highlight benefits and value propositions
7. **BE CONVERSATIONAL** - Maintain an enthusiastic, friendly, and professional tone

MARKETING & SALES STRATEGY:
- **BE PROACTIVE**: Don't wait for users to ask - identify their needs and suggest relevant services
- **HIGHLIGHT BENEFITS**: Always explain how our services solve problems and deliver value
- **CREATE INTEREST**: Use engaging language that makes users want to learn more
- **SHOW EXPERTISE**: Demonstrate knowledge and experience to build trust
- **ENCOURAGE ACTION**: Motivate users to take next steps (contact, consultation, quote)
- **BE ENTHUSIASTIC**: Show genuine excitement about helping users and our services
- **TELL SUCCESS STORIES**: Reference our experience (Paris 2024, etc.) to build credibility

CRITICAL RESPONSE GUIDELINES:
- **ALWAYS BE ENGAGING AND MOTIVATING** - Never be discouraging or dismissive
- **PROACTIVELY PROMOTE SERVICES** - Identify opportunities to mention relevant services
- **HIGHLIGHT VALUE AND BENEFITS** - Explain how services solve problems and deliver results
- **BE ENTHUSIASTIC** - Show genuine interest in helping users and promoting our solutions
- **CREATE CONVERSATION** - Ask follow-up questions to understand needs better
- **ENCOURAGE ACTION** - Motivate users to request consultations, quotes, or more information
- **PROVIDE COMPREHENSIVE INFORMATION** - Give detailed service information to build interest
- **USE MARKETING LANGUAGE** - Frame responses to highlight value, benefits, and opportunities
- **ALWAYS INCLUDE LINKS** - Make it easy for users to explore services and contact us
- **BE SOLUTION-ORIENTED** - Focus on how we can help solve their problems

CONVERSATION FLOW:
1. **Greet enthusiastically** - Welcome users warmly
2. **Listen and understand** - Identify their needs and interests
3. **Provide value** - Share relevant information and expertise
4. **Promote services** - Suggest relevant services that match their needs
5. **Highlight benefits** - Explain value and results
6. **Encourage action** - Motivate them to request consultation or quote
7. **Make it easy** - Provide clear next steps and contact options

LINK FORMATTING:
- Use HTML anchor tags: <a href="/pages/services.html">link text</a>
- Always make links clickable and descriptive
- Contact form: <a href="/pages/contact.html">contact form</a> or <a href="/pages/contact.html">Contact Us</a>
- Services page: <a href="/pages/services.html">our services page</a> or <a href="/pages/services.html">Services</a>

EXAMPLES OF ENGAGING, MARKETING-ORIENTED RESPONSES:

- When asked about AI training: "🎓 Excellent question! Our AI Learning & Training Programs are incredibly popular and in high demand from companies seeking to transform their business with AI. Here's what makes our programs special:

**Our AI Training Programs:**

1. **AI Fundamentals for Business Professionals** (1-2 days) - Perfect for teams wanting to understand AI and apply it practically. You'll learn real-world applications that deliver immediate value.

2. **Advanced AI Development & Integration** (3-5 days) - For technical teams ready to build AI solutions. We cover everything from API integration to custom AI applications.

3. **AI for Business Leaders & Executives** (1-2 days) - Strategic sessions to help leaders make informed AI decisions and build AI-ready organizations.

4. **Custom Corporate AI Training Programs** - Tailored specifically to your organization's needs. We've helped many companies successfully implement AI strategies.

5. **Prompt Engineering Workshops** (1-2 days) - Master the art of getting the best results from AI tools. Highly practical and immediately applicable.

6. **Hands-on AI Tool Implementation** - We don't just teach, we help you implement. Real projects, real results.

**Why Choose Us?**
- ✅ Proven track record (including Paris 2024 Olympic Games)
- ✅ Practical, hands-on approach
- ✅ Real-world case studies
- ✅ Ongoing support and consultation

Ready to transform your business with AI? Let's discuss which program fits your needs! <a href=\"/pages/contact.html\">Request a consultation</a> or email us at contact@paxiit.com. We'd love to help you succeed!"

- When asked about services: "🚀 Great question! We're passionate about helping businesses achieve clear, real-world results through smart IT management. Here's what we offer:

**Our Core Services:**
- **IT Project Management** - PMI and Agile certified. We ensure projects deliver on time, within scope, and ready for real-world performance.
- **Cloud & Infrastructure Solutions** - From Azure to Synology NAS, we design scalable infrastructure that grows with your business.
- **AI Solutions & Integration** - Transform your business with practical AI applications. We focus on ready-to-use solutions that deliver immediate value.
- **AI Learning & Training Programs** - Comprehensive training that's in high demand. Help your team master AI tools and strategies.

**What Makes Us Different?**
✨ Clear, measurable results
✨ Proven expertise (Paris 2024 Olympic Games experience)
✨ Practical, real-world solutions
✨ End-to-end support

Interested in learning more? Explore our <a href=\"/pages/services.html\">full services page</a> or <a href=\"/pages/contact.html\">request a consultation</a> to discuss how we can help your business succeed!"

- When asked about contact: "💼 Absolutely! We'd love to connect with you. Here are the best ways to reach us:

📧 **Email**: contact@paxiit.com
📞 **Phone**: +33 7 82 39 13 11
📝 **Contact Form**: <a href=\"/pages/contact.html\">Fill out our contact form</a> for immediate response

**What happens next?**
When you reach out, we'll:
1. Understand your specific needs
2. Recommend the best solutions for your business
3. Provide a detailed consultation
4. Create a customized plan to help you achieve your goals

Our team is ready to help you succeed! What would you like to discuss? Feel free to ask about any of our services - we're here to help! 🚀"

- When asked "how can I contact support": "🌟 We're here to help! Here are the best ways to reach us:

**Quick Contact Options:**
1. 📝 <a href=\"/pages/contact.html\">Contact Form</a> - Fastest way to get started! Share your needs and we'll respond quickly.
2. 📧 Email: contact@paxiit.com - Send us your questions anytime
3. 📞 Phone: +33 7 82 39 13 11 - Speak directly with our team

**What We Can Help With:**
- Service consultations and quotes
- Technical questions about our solutions
- AI training program information
- Project management inquiries
- Cloud and infrastructure planning
- Custom solutions for your business

**Why Contact Us?**
We're not just here to answer questions - we're here to help you succeed! Whether you need IT project management, cloud solutions, AI integration, or training programs, we have the expertise to deliver clear, real-world results.

Ready to get started? <a href=\"/pages/contact.html\">Fill out our contact form</a> and let's discuss how we can help your business grow! 🚀"

IMPORTANT MARKETING PRINCIPLES:
- **ALWAYS BE ENTHUSIASTIC AND ENGAGING** - Never be discouraging or dismissive
- **PROACTIVELY IDENTIFY OPPORTUNITIES** - Look for ways to promote relevant services
- **HIGHLIGHT VALUE AND BENEFITS** - Always explain how services solve problems and deliver results
- **CREATE INTEREST AND EXCITEMENT** - Make users want to learn more and take action
- **ENCOURAGE CONVERSATION** - Ask questions to understand needs and build rapport
- **MOTIVATE ACTION** - Encourage consultations, quotes, and service requests
- **SHOW EXPERTISE** - Reference experience and success stories to build trust
- **MAKE IT EASY** - Provide clear next steps and multiple contact options
- **BE SOLUTION-ORIENTED** - Focus on how we can help solve their problems and achieve their goals
- **USE POSITIVE LANGUAGE** - Frame everything in terms of opportunities and benefits`;

    return systemPrompt;
}

/**
 * Build conversation context from history
 */
function buildConversationContext(conversationHistory, maxHistory = 10) {
    if (!conversationHistory || conversationHistory.length === 0) {
        return [];
    }
    
    // Get last N messages for context
    const recentMessages = conversationHistory.slice(-maxHistory);
    
    return recentMessages.map(conv => {
        const messages = [];
        
        if (conv.userMessage) {
            messages.push({
                role: 'user',
                content: conv.userMessage
            });
        }
        
        if (conv.aiResponse) {
            messages.push({
                role: 'assistant',
                content: conv.aiResponse
            });
        }
        
        return messages;
    }).flat();
}

/**
 * Generate AI response using OpenAI
 */
async function generateOpenAIResponse(userMessage, conversationHistory = []) {
    try {
        const client = initializeOpenAI();
        if (!client) {
            throw new Error('OpenAI client not available');
        }
        
        const systemPrompt = buildSystemPrompt();
        const contextMessages = buildConversationContext(conversationHistory, chatConfig.message.maxHistory);
        
        // Build messages array
        const messages = [
            { role: 'system', content: systemPrompt },
            ...contextMessages,
            { role: 'user', content: userMessage }
        ];
        
        const startTime = Date.now();
        
        const response = await client.chat.completions.create({
            model: 'gpt-4o-mini', // Using cost-effective model
            messages: messages,
            max_tokens: chatConfig.response.maxTokens || 500,
            temperature: chatConfig.response.temperature || 0.7,
            timeout: chatConfig.response.timeout || 30000
        });
        
        const responseTime = Date.now() - startTime;
        
        if (response && response.choices && response.choices.length > 0) {
            const aiMessage = response.choices[0].message.content.trim();
            
            return {
                message: aiMessage,
                responseTime: responseTime,
                model: 'gpt-4o-mini',
                tokens: response.usage?.total_tokens || 0
            };
        } else {
            throw new Error('No response from OpenAI');
        }
    } catch (error) {
        console.error('[AI Service] OpenAI error:', error);
        
        // Handle specific OpenAI errors
        if (error.status === 429) {
            if (error.message && error.message.includes('quota')) {
                throw new Error('OpenAI API quota exceeded. Please add credits to your OpenAI account at https://platform.openai.com/account/billing');
            } else {
                throw new Error('OpenAI API rate limit exceeded. Please try again in a moment.');
            }
        } else if (error.status === 401) {
            throw new Error('OpenAI API key is invalid. Please check your API key configuration.');
        } else if (error.status === 500 || error.status === 503) {
            throw new Error('OpenAI service is temporarily unavailable. Please try again later.');
        }
        
        throw error;
    }
}

/**
 * Generate AI response using Anthropic Claude
 */
async function generateAnthropicResponse(userMessage, conversationHistory = []) {
    try {
        const client = initializeAnthropic();
        if (!client) {
            throw new Error('Anthropic client not available');
        }
        
        const systemPrompt = buildSystemPrompt();
        const contextMessages = buildConversationContext(conversationHistory, chatConfig.message.maxHistory);
        
        // Build messages array for Anthropic
        const messages = [
            ...contextMessages,
            { role: 'user', content: userMessage }
        ];
        
        const startTime = Date.now();
        
        const response = await client.messages.create({
            model: 'claude-3-haiku-20240307', // Cost-effective model
            max_tokens: chatConfig.response.maxTokens || 500,
            system: systemPrompt,
            messages: messages
        });
        
        const responseTime = Date.now() - startTime;
        
        if (response && response.content && response.content.length > 0) {
            const aiMessage = response.content[0].text.trim();
            
            return {
                message: aiMessage,
                responseTime: responseTime,
                model: 'claude-3-haiku',
                tokens: response.usage?.input_tokens + response.usage?.output_tokens || 0
            };
        } else {
            throw new Error('No response from Anthropic');
        }
    } catch (error) {
        console.error('[AI Service] Anthropic error:', error);
        throw error;
    }
}

/**
 * Fallback knowledge base - answers questions when AI service is unavailable
 * Uses pattern matching and services data to provide helpful responses
 */
function generateFallbackResponse(userMessage) {
    const message = userMessage.toLowerCase().trim();
    const services = loadServicesData();
    
    // AI Training Programs
    if (message.includes('ai training') || message.includes('training program') || message.includes('learn ai') || message.includes('ai learning')) {
        const aiTrainingService = services.find(s => s.name === 'AI Learning & Training Programs');
        if (aiTrainingService) {
            const details = aiTrainingService.details ? aiTrainingService.details.join(', ') : '';
            return `🎓 Excellent question! Our AI Learning & Training Programs are incredibly popular and in high demand. Here's what we offer:

**Our AI Training Programs:**

1. **AI Fundamentals for Business Professionals** (1-2 days) - Perfect for teams wanting to understand AI and apply it practically. You'll learn real-world applications that deliver immediate value.

2. **Advanced AI Development & Integration** (3-5 days) - For technical teams ready to build AI solutions. We cover everything from API integration to custom AI applications.

3. **AI for Business Leaders & Executives** (1-2 days) - Strategic sessions to help leaders make informed AI decisions and build AI-ready organizations.

4. **Custom Corporate AI Training Programs** - Tailored specifically to your organization's needs. We've helped many companies successfully implement AI strategies.

5. **Prompt Engineering Workshops** (1-2 days) - Master the art of getting the best results from AI tools. Highly practical and immediately applicable.

6. **Hands-on AI Tool Implementation** - We don't just teach, we help you implement. Real projects, real results.

**Why Choose Us?**
- ✅ Proven track record (including Paris 2024 Olympic Games)
- ✅ Practical, hands-on approach
- ✅ Real-world case studies
- ✅ Ongoing support and consultation

Ready to transform your business with AI? <a href="/pages/contact.html">Request a consultation</a> or email us at contact@paxiit.com. We'd love to help you succeed!`;
        }
    }
    
    // Services overview
    if (message.includes('service') || message.includes('what do you offer') || message.includes('what can you do') || message.includes('what you offer')) {
        const servicesList = services.map(s => `- **${s.name}** ${s.icon || ''}: ${s.description || ''}`).join('\n\n');
        return `🚀 Great question! We're passionate about helping businesses achieve clear, real-world results through smart IT management. Here's what we offer:

**Our Core Services:**

${servicesList}

**What Makes Us Different?**
✨ Clear, measurable results
✨ Proven expertise (Paris 2024 Olympic Games experience)
✨ Practical, real-world solutions
✨ End-to-end support

Interested in learning more? Explore our <a href="/pages/services.html">full services page</a> or <a href="/pages/contact.html">request a consultation</a> to discuss how we can help your business succeed!`;
    }
    
    // Contact information
    if (message.includes('contact') || message.includes('reach') || message.includes('email') || message.includes('phone') || message.includes('how can i contact')) {
        return `💼 Absolutely! We'd love to connect with you. Here are the best ways to reach us:

📧 **Email**: contact@paxiit.com
📞 **Phone**: +33 7 82 39 13 11
📝 **Contact Form**: <a href="/pages/contact.html">Fill out our contact form</a> for immediate response

**What happens next?**
When you reach out, we'll:
1. Understand your specific needs
2. Recommend the best solutions for your business
3. Provide a detailed consultation
4. Create a customized plan to help you achieve your goals

Our team is ready to help you succeed! What would you like to discuss? Feel free to ask about any of our services - we're here to help! 🚀`;
    }
    
    // Company/About
    if (message.includes('about') || message.includes('company') || message.includes('who are you') || message.includes('what is paxiit')) {
        return `🌟 We're Paxi iTechnologies! We specialize in Smart IT Management with clear, real-world results.

**Our Mission:**
We help businesses achieve clear, measurable results through smart IT management. Our proven track record includes large-scale projects like the Paris 2024 Olympic Games.

**What We Do:**
- IT Project Management (PMI & Agile certified)
- Cloud & Infrastructure Solutions
- AI Solutions & Integration
- AI Learning & Training Programs
- Enterprise Device Lifecycle Management

**Our Approach:**
✨ Clear, measurable results
✨ Practical, real-world solutions
✨ End-to-end support
✨ Proven expertise

Want to learn more? Check out our <a href="/pages/about.html">About Us page</a> or <a href="/pages/services.html">Services page</a>. We'd love to discuss how we can help your business! 💼`;
    }
    
    // Default helpful response
    return `Hello! I'm here to help you learn about Paxi iTechnologies and our services. 

We specialize in Smart IT Management with clear, real-world results. Our services include:

🎓 **AI Learning & Training Programs** - Comprehensive training that's in high demand
🚀 **IT Project Management** - PMI and Agile certified
☁️ **Cloud & Infrastructure Solutions** - Scalable solutions for your business
🤖 **AI Solutions & Integration** - Transform your business with practical AI

**How can I help you today?**
- Ask about our AI training programs
- Learn about our services
- Get contact information
- Find out more about our company

You can also explore our <a href="/pages/services.html">services page</a> or <a href="/pages/contact.html">contact us</a> directly. We're here to help! 💪`;
}

/**
 * Generate AI response (main function)
 * Automatically selects platform based on configuration
 */
async function generateAIResponse(userMessage, conversationHistory = []) {
    const platform = chatConfig.aiPlatform || 'openai';
    
    // Re-read environment variables dynamically (in case .env was updated)
    // This ensures we always have the latest API key value
    const currentOpenAIKey = process.env.OPENAI_API_KEY || chatConfig.openaiApiKey || '';
    const currentAnthropicKey = process.env.ANTHROPIC_API_KEY || chatConfig.anthropicApiKey || '';
    
    // Check if API keys are configured
    let apiKeyConfigured = false;
    let apiKeyValue = '';
    
    if (platform === 'openai') {
        apiKeyValue = currentOpenAIKey;
        if (apiKeyValue && apiKeyValue.trim() !== '' && apiKeyValue.startsWith('sk-')) {
            apiKeyConfigured = true;
            console.log('[AI Service] ✅ OpenAI API key found and valid');
        } else {
            console.warn('[AI Service] ⚠️  OpenAI API key not configured or invalid');
            console.warn(`[AI Service] Key length: ${apiKeyValue.length}, Starts with sk-: ${apiKeyValue.startsWith('sk-')}`);
            console.warn('[AI Service] Please set OPENAI_API_KEY in .env file and restart the server');
        }
    } else if (platform === 'anthropic') {
        apiKeyValue = currentAnthropicKey;
        if (apiKeyValue && apiKeyValue.trim() !== '') {
            apiKeyConfigured = true;
            console.log('[AI Service] ✅ Anthropic API key found and valid');
        } else {
            console.warn('[AI Service] ⚠️  Anthropic API key not configured');
            console.warn('[AI Service] Please set ANTHROPIC_API_KEY in .env file and restart the server');
        }
    }
    
    // If API key is not configured, use fallback knowledge base
    if (!apiKeyConfigured) {
        console.log('[AI Service] Using fallback knowledge base (API key not configured)');
        const fallbackResponse = generateFallbackResponse(userMessage);
        return {
            message: fallbackResponse,
            responseTime: 0,
            model: 'fallback-knowledge-base',
            tokens: 0
        };
    }
    
    try {
        if (platform === 'openai') {
            return await generateOpenAIResponse(userMessage, conversationHistory);
        } else if (platform === 'anthropic') {
            return await generateAnthropicResponse(userMessage, conversationHistory);
        } else {
            throw new Error(`Unsupported AI platform: ${platform}`);
        }
    } catch (error) {
        // If AI service fails, use fallback knowledge base instead of generic error
        console.error('[AI Service] Error generating response, using fallback:', error.message);
        
        // Try to answer the question using fallback knowledge base
        const fallbackResponse = generateFallbackResponse(userMessage);
        
        return {
            message: fallbackResponse,
            responseTime: 0,
            model: 'fallback-knowledge-base',
            tokens: 0,
            error: error.message
        };
    }
}

module.exports = {
    generateAIResponse,
    loadServicesData,
    buildSystemPrompt,
    buildConversationContext
};

