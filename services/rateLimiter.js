const RateLimit = require('../models/RateLimit');
const SecurityLog = require('../models/SecurityLog');
const security = require('../config/security');
const CONSTANTS = require('../config/constants');

class RateLimiter {
  constructor() {
    this.windowMs = CONSTANTS.RATE_LIMIT_WINDOW_MS;
    this.maxRequests = CONSTANTS.RATE_LIMIT_MAX_REQUESTS;
    this.spamThreshold = CONSTANTS.SPAM_DETECTION_THRESHOLD;
  }

  // Check rate limit
  async checkRateLimit(userId) {
    try {
      const now = Date.now();
      const windowStart = now - this.windowMs;

      let rateLimitDoc = await RateLimit.findOne({ userId });

      if (!rateLimitDoc) {
        // First request from user
        rateLimitDoc = new RateLimit({
          userId,
          requestCount: 1,
          firstRequestTime: new Date(),
          lastRequestTime: new Date(),
          isBlocked: false,
        });
        await rateLimitDoc.save();
        return { allowed: true, remainingRequests: this.maxRequests - 1 };
      }

      const timeSinceFirstRequest = now - rateLimitDoc.firstRequestTime.getTime();

      // Check if user is blocked
      if (rateLimitDoc.isBlocked && rateLimitDoc.blockedUntil > new Date()) {
        const waitTime = Math.ceil((rateLimitDoc.blockedUntil - new Date()) / 1000);
        return { allowed: false, reason: `blocked_${waitTime}s`, waitTime };
      }

      // Reset if outside window
      if (timeSinceFirstRequest > this.windowMs) {
        rateLimitDoc.requestCount = 1;
        rateLimitDoc.firstRequestTime = new Date();
        await rateLimitDoc.save();
        return { allowed: true, remainingRequests: this.maxRequests - 1 };
      }

      // Check if limit exceeded
      if (rateLimitDoc.requestCount >= this.maxRequests) {
        // Block user temporarily
        rateLimitDoc.isBlocked = true;
        rateLimitDoc.blockedUntil = new Date(now + 15 * 60 * 1000); // 15 minutes
        await rateLimitDoc.save();

        // Log security event
        await this.logSecurityEvent(userId, 'rate_limit_exceeded', 'high');

        return { allowed: false, reason: 'too_many_requests', waitTime: 900 };
      }

      // Increment request count
      rateLimitDoc.requestCount += 1;
      rateLimitDoc.lastRequestTime = new Date();
      await rateLimitDoc.save();

      const remainingRequests = this.maxRequests - rateLimitDoc.requestCount;
      return { allowed: true, remainingRequests };
    } catch (error) {
      console.error('❌ Rate Limit Check Error:', error.message);
      // Allow request on error (fail open)
      return { allowed: true };
    }
  }

  // Detect suspicious activity
  async detectSuspiciousActivity(userId, actionType, frequency = 1) {
    try {
      const suspicionScore = security.detectSuspiciousActivity(frequency);

      if (suspicionScore > 50) {
        await this.logSecurityEvent(userId, 'suspicious_activity', 'medium', {
          actionType,
          frequency,
          suspicionScore,
        });
      }

      return suspicionScore;
    } catch (error) {
      console.error('❌ Suspicious Activity Detection Error:', error.message);
      return 0;
    }
  }

  // Log security event
  async logSecurityEvent(userId, eventType, severity = 'medium', details = {}) {
    try {
      await SecurityLog.create({
        userId,
        eventType,
        severity,
        description: `${eventType} detected for user ${security.maskSensitiveId(userId)}`,
        details,
      });
    } catch (error) {
      console.error('❌ Security Log Error:', error.message);
    }
  }

  // Check for injection attempts
  validateUserInput(input, type = 'text') {
    if (!security.preventInjection(input)) {
      return { valid: false, reason: 'suspicious_characters' };
    }

    const sanitized = security.sanitizeInput(input);

    if (type === 'bnb_address') {
      if (!security.validateBNBAddress(sanitized)) {
        return { valid: false, reason: 'invalid_bnb_format' };
      }
    }

    return { valid: true, data: sanitized };
  }

  // Reset rate limit for user
  async resetRateLimit(userId) {
    try {
      await RateLimit.deleteOne({ userId });
      console.log(`✅ Rate limit reset for user ${security.maskSensitiveId(userId)}`);
      return true;
    } catch (error) {
      console.error('❌ Reset Error:', error.message);
      return false;
    }
  }

  // Clean expired rate limits
  async cleanupExpiredLimits() {
    try {
      const result = await RateLimit.deleteMany({
        isBlocked: false,
        firstRequestTime: { $lt: new Date(Date.now() - this.windowMs) },
      });
      console.log(`✅ Cleaned ${result.deletedCount} expired rate limit records`);
      return result.deletedCount;
    } catch (error) {
      console.error('❌ Cleanup Error:', error.message);
      return 0;
    }
  }
}

module.exports = new RateLimiter();
