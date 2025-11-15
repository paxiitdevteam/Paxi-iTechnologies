/**
 * Chat Learning & Improvement System
 * Implements continuous learning methodology to improve chat responses
 * Based on analytics, feedback, and user interactions
 */

const fs = require('fs');
const PMS = require('../utils/pms');
const chatConfig = require('../config/chat-config');

/**
 * Load learning data from JSON file - USING PMS (NO HARDCODED PATHS)
 */
function loadLearningData() {
    const learningPath = PMS.backend('data', 'chat-learning.json');
    
    if (!fs.existsSync(learningPath)) {
        return {
            popularQuestions: [],
            questionPatterns: {},
            responseImprovements: [],
            lowRatedResponses: [],
            highRatedResponses: [],
            learnedInsights: [],
            lastAnalysis: null,
            version: 1
        };
    }
    
    try {
        const fileContent = fs.readFileSync(learningPath, 'utf8');
        return JSON.parse(fileContent);
    } catch (error) {
        console.error('[CHAT LEARNING] Error loading learning data:', error);
        return {
            popularQuestions: [],
            questionPatterns: {},
            responseImprovements: [],
            lowRatedResponses: [],
            highRatedResponses: [],
            learnedInsights: [],
            lastAnalysis: null,
            version: 1
        };
    }
}

/**
 * Save learning data to JSON file - USING PMS (NO HARDCODED PATHS)
 */
function saveLearningData(learningData) {
    const learningPath = PMS.backend('data', 'chat-learning.json');
    
    try {
        // Ensure directory exists
        const dir = PMS.backend('data');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(learningPath, JSON.stringify(learningData, null, 2), 'utf8');
    } catch (error) {
        console.error('[CHAT LEARNING] Error saving learning data:', error);
        throw new Error('Failed to save learning data');
    }
}

/**
 * Track popular questions from user messages
 */
function trackPopularQuestion(userMessage, sessionId) {
    if (!chatConfig.analytics.trackPopularQuestions) {
        return;
    }
    
    try {
        const learningData = loadLearningData();
        const normalizedMessage = normalizeQuestion(userMessage);
        
        // Find existing question or create new
        let question = learningData.popularQuestions.find(q => q.normalized === normalizedMessage);
        
        if (question) {
            question.count += 1;
            question.lastAsked = new Date().toISOString();
            question.sessions.push(sessionId);
        } else {
            question = {
                original: userMessage,
                normalized: normalizedMessage,
                count: 1,
                firstAsked: new Date().toISOString(),
                lastAsked: new Date().toISOString(),
                sessions: [sessionId],
                category: categorizeQuestion(userMessage)
            };
            learningData.popularQuestions.push(question);
        }
        
        // Sort by count (most popular first)
        learningData.popularQuestions.sort((a, b) => b.count - a.count);
        
        // Keep only top 100 questions
        if (learningData.popularQuestions.length > 100) {
            learningData.popularQuestions = learningData.popularQuestions.slice(0, 100);
        }
        
        saveLearningData(learningData);
    } catch (error) {
        console.error('[CHAT LEARNING] Error tracking popular question:', error);
    }
}

/**
 * Normalize question for comparison
 */
function normalizeQuestion(question) {
    return question
        .toLowerCase()
        .trim()
        .replace(/[^\w\s]/g, '') // Remove punctuation
        .replace(/\s+/g, ' ') // Normalize whitespace
        .substring(0, 200); // Limit length
}

/**
 * Categorize question by topic
 */
function categorizeQuestion(question) {
    const lowerQuestion = question.toLowerCase();
    
    if (lowerQuestion.includes('ai training') || lowerQuestion.includes('ai learning') || lowerQuestion.includes('training program')) {
        return 'ai_training';
    } else if (lowerQuestion.includes('contact') || lowerQuestion.includes('support') || lowerQuestion.includes('help')) {
        return 'contact';
    } else if (lowerQuestion.includes('service') || lowerQuestion.includes('offer')) {
        return 'services';
    } else if (lowerQuestion.includes('price') || lowerQuestion.includes('cost') || lowerQuestion.includes('quote')) {
        return 'pricing';
    } else if (lowerQuestion.includes('about') || lowerQuestion.includes('company')) {
        return 'about';
    } else {
        return 'general';
    }
}

/**
 * Learn from feedback ratings
 */
function learnFromFeedback(rating, comment, sessionId, userMessage, aiResponse) {
    if (!chatConfig.analytics.trackSatisfaction) {
        return;
    }
    
    try {
        const learningData = loadLearningData();
        
        const feedbackData = {
            rating: parseInt(rating),
            comment: comment || null,
            sessionId: sessionId || null,
            userMessage: userMessage || null,
            aiResponse: aiResponse || null,
            timestamp: new Date().toISOString()
        };
        
        // Store low-rated responses for improvement
        if (rating <= 2) {
            learningData.lowRatedResponses.push(feedbackData);
            
            // Keep only last 50 low-rated responses
            if (learningData.lowRatedResponses.length > 50) {
                learningData.lowRatedResponses = learningData.lowRatedResponses.slice(-50);
            }
            
            // Extract insights from low ratings
            extractInsights(feedbackData, 'negative');
        }
        
        // Store high-rated responses as examples
        if (rating >= 4) {
            learningData.highRatedResponses.push(feedbackData);
            
            // Keep only last 50 high-rated responses
            if (learningData.highRatedResponses.length > 50) {
                learningData.highRatedResponses = learningData.highRatedResponses.slice(-50);
            }
            
            // Extract insights from high ratings
            extractInsights(feedbackData, 'positive');
        }
        
        saveLearningData(learningData);
    } catch (error) {
        console.error('[CHAT LEARNING] Error learning from feedback:', error);
    }
}

/**
 * Extract insights from feedback
 */
function extractInsights(feedbackData, type) {
    try {
        const learningData = loadLearningData();
        
        if (!feedbackData.comment) {
            return;
        }
        
        const insight = {
            type: type, // 'positive' or 'negative'
            comment: feedbackData.comment,
            userMessage: feedbackData.userMessage,
            rating: feedbackData.rating,
            timestamp: feedbackData.timestamp,
            category: feedbackData.userMessage ? categorizeQuestion(feedbackData.userMessage) : 'general'
        };
        
        learningData.learnedInsights.push(insight);
        
        // Keep only last 100 insights
        if (learningData.learnedInsights.length > 100) {
            learningData.learnedInsights = learningData.learnedInsights.slice(-100);
        }
        
        saveLearningData(learningData);
    } catch (error) {
        console.error('[CHAT LEARNING] Error extracting insights:', error);
    }
}

/**
 * Analyze learning data and generate improvement recommendations
 */
function analyzeAndImprove() {
    try {
        const learningData = loadLearningData();
        const analytics = require('./chat-analytics-loader')();
        
        const improvements = [];
        
        // Analyze popular questions
        if (learningData.popularQuestions.length > 0) {
            const topQuestions = learningData.popularQuestions.slice(0, 10);
            improvements.push({
                type: 'popular_questions',
                recommendation: `Top ${topQuestions.length} most asked questions identified. Consider adding these to FAQ or enhancing responses.`,
                data: topQuestions.map(q => ({
                    question: q.original,
                    count: q.count,
                    category: q.category
                }))
            });
        }
        
        // Analyze low-rated responses
        if (learningData.lowRatedResponses.length > 0) {
            const recentLowRated = learningData.lowRatedResponses.slice(-10);
            const commonIssues = identifyCommonIssues(recentLowRated);
            
            improvements.push({
                type: 'response_improvement',
                recommendation: `Identified ${recentLowRated.length} low-rated responses. Common issues: ${commonIssues.join(', ')}`,
                data: {
                    count: recentLowRated.length,
                    commonIssues: commonIssues,
                    examples: recentLowRated.slice(0, 3).map(r => ({
                        rating: r.rating,
                        comment: r.comment,
                        userMessage: r.userMessage
                    }))
                }
            });
        }
        
        // Analyze high-rated responses
        if (learningData.highRatedResponses.length > 0) {
            const recentHighRated = learningData.highRatedResponses.slice(-10);
            improvements.push({
                type: 'best_practices',
                recommendation: `Identified ${recentHighRated.length} high-rated responses. Use these as examples for future responses.`,
                data: {
                    count: recentHighRated.length,
                    examples: recentHighRated.slice(0, 3).map(r => ({
                        rating: r.rating,
                        comment: r.comment,
                        userMessage: r.userMessage,
                        aiResponse: r.aiResponse
                    }))
                }
            });
        }
        
        // Analyze insights
        if (learningData.learnedInsights.length > 0) {
            const recentInsights = learningData.learnedInsights.slice(-20);
            improvements.push({
                type: 'insights',
                recommendation: `Extracted ${recentInsights.length} insights from user feedback. Review for system prompt improvements.`,
                data: {
                    count: recentInsights.length,
                    insights: recentInsights.slice(0, 5)
                }
            });
        }
        
        learningData.lastAnalysis = new Date().toISOString();
        learningData.responseImprovements = improvements;
        saveLearningData(learningData);
        
        return improvements;
    } catch (error) {
        console.error('[CHAT LEARNING] Error analyzing learning data:', error);
        return [];
    }
}

/**
 * Identify common issues from low-rated responses
 */
function identifyCommonIssues(lowRatedResponses) {
    const issues = [];
    const comments = lowRatedResponses
        .filter(r => r.comment)
        .map(r => r.comment.toLowerCase());
    
    if (comments.some(c => c.includes('not helpful') || c.includes('unhelpful'))) {
        issues.push('Not helpful enough');
    }
    if (comments.some(c => c.includes('too short') || c.includes('brief'))) {
        issues.push('Responses too short');
    }
    if (comments.some(c => c.includes('not relevant') || c.includes('wrong'))) {
        issues.push('Irrelevant responses');
    }
    if (comments.some(c => c.includes('confusing') || c.includes('unclear'))) {
        issues.push('Unclear responses');
    }
    if (comments.some(c => c.includes('contact') || c.includes('form'))) {
        issues.push('Too quick to suggest contact form');
    }
    
    return issues.length > 0 ? issues : ['General dissatisfaction'];
}

/**
 * Get learning insights for system prompt enhancement
 */
function getLearningInsights() {
    try {
        const learningData = loadLearningData();
        const insights = [];
        
        // Get top popular questions
        if (learningData.popularQuestions.length > 0) {
            const topQuestions = learningData.popularQuestions.slice(0, 5);
            insights.push({
                type: 'popular_questions',
                data: topQuestions.map(q => q.original)
            });
        }
        
        // Get common issues from low ratings
        if (learningData.lowRatedResponses.length > 0) {
            const recentLowRated = learningData.lowRatedResponses.slice(-10);
            const commonIssues = identifyCommonIssues(recentLowRated);
            insights.push({
                type: 'common_issues',
                data: commonIssues
            });
        }
        
        // Get best practices from high ratings
        if (learningData.highRatedResponses.length > 0) {
            const recentHighRated = learningData.highRatedResponses.slice(-5);
            insights.push({
                type: 'best_practices',
                data: recentHighRated.map(r => ({
                    question: r.userMessage,
                    response: r.aiResponse
                }))
            });
        }
        
        return insights;
    } catch (error) {
        console.error('[CHAT LEARNING] Error getting learning insights:', error);
        return [];
    }
}


module.exports = {
    loadLearningData,
    saveLearningData,
    trackPopularQuestion,
    learnFromFeedback,
    analyzeAndImprove,
    getLearningInsights,
    normalizeQuestion,
    categorizeQuestion
};

