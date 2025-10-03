/**
 * Instagram In-App Browser Utilities
 * Handles specific configurations for Instagram in-app browser compatibility
 */

/**
 * Detect if the request is coming from Instagram in-app browser
 * @param {Object} req - Express request object
 * @returns {Object} - Detection result with browser info
 */
export function detectInstagramBrowser(req) {
    const userAgent = req.headers['user-agent'] || '';
    const origin = req.headers.origin || '';
    const referer = req.headers.referer || '';
    
    const isInstagram = userAgent.toLowerCase().includes('instagram') || 
                       origin.includes('instagram.com') ||
                       referer.includes('instagram.com');
    
    const isFacebook = userAgent.toLowerCase().includes('fban') || 
                      userAgent.toLowerCase().includes('fbav') ||
                      origin.includes('facebook.com') ||
                      referer.includes('facebook.com');
    
    const isInAppBrowser = isInstagram || isFacebook || 
                          userAgent.toLowerCase().includes('wv') || // WebView
                          userAgent.toLowerCase().includes('line/');
    
    return {
        isInstagram,
        isFacebook,
        isInAppBrowser,
        userAgent,
        origin,
        referer
    };
}

/**
 * Get appropriate cookie settings based on browser detection
 * @param {Object} req - Express request object
 * @param {Object} options - Base cookie options
 * @returns {Object} - Cookie options optimized for the browser
 */
export function getCookieOptions(req, options = {}) {
    const browserInfo = detectInstagramBrowser(req);
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Base cookie options
    const baseOptions = {
        httpOnly: true,
        secure: isProduction,
        path: '/',
        ...options
    };
    
    // For Instagram in-app browser, we need SameSite=None with Secure
    if (browserInfo.isInstagram || browserInfo.isFacebook || browserInfo.isInAppBrowser) {
        return {
            ...baseOptions,
            sameSite: 'None',
            secure: true, // Must be true when using SameSite=None
            // Don't set domain for cross-origin requests
            domain: undefined
        };
    }
    
    // For regular browsers, use SameSite=Lax for better security
    return {
        ...baseOptions,
        sameSite: 'lax',
        secure: isProduction,
        // Set domain for same-origin requests in production
        domain: isProduction ? '.shithaa.in' : undefined
    };
}

/**
 * Get CORS headers optimized for Instagram in-app browser
 * @param {Object} req - Express request object
 * @param {string} origin - Allowed origin
 * @returns {Object} - CORS headers
 */
export function getCorsHeaders(req, origin) {
    const browserInfo = detectInstagramBrowser(req);
    
    const headers = {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, token, x-requested-with, Accept, Origin',
        'Access-Control-Expose-Headers': 'Access-Control-Allow-Origin, Access-Control-Allow-Credentials'
    };
    
    // For Instagram in-app browser, add additional headers
    if (browserInfo.isInstagram || browserInfo.isFacebook) {
        headers['Access-Control-Allow-Origin'] = origin || '*';
        headers['Vary'] = 'Origin';
    }
    
    return headers;
}
