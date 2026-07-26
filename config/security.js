const crypto = require('crypto');

class SecurityManager {
  constructor() {
    this.encryptionKey = Buffer.from(process.env.ENCRYPTION_KEY || 'default-key-change-in-production'.padEnd(32, '0')).slice(0, 32);
    this.algorithm = 'aes-256-gcm';
  }

  // Encrypt sensitive data
  encrypt(text) {
    if (!text) return null;
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);
    let encrypted = cipher.update(String(text), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  // Decrypt sensitive data
  decrypt(encryptedText) {
    if (!encryptedText) return null;
    try {
      const [iv, authTag, encrypted] = encryptedText.split(':');
      const decipher = crypto.createDecipheriv(
        this.algorithm,
        this.encryptionKey,
        Buffer.from(iv, 'hex')
      );
      decipher.setAuthTag(Buffer.from(authTag, 'hex'));
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error.message);
      return null;
    }
  }

  // Hash admin ID (one-way)
  hashAdminId(adminId) {
    return crypto.createHash('sha256').update(String(adminId) + process.env.ENCRYPTION_KEY).digest('hex');
  }

  // Verify admin ID
  verifyAdminId(plainId, hashedId) {
    return this.hashAdminId(plainId) === hashedId;
  }

  // Generate unique user token
  generateUserToken(userId) {
    return crypto.createHash('sha256')
      .update(userId + Date.now() + Math.random())
      .digest('hex');
  }

  // Sanitize user input
  sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return input
      .trim()
      .replace(/[<>\"']/g, '')
      .substring(0, 500);
  }

  // Validate BNB address format
  validateBNBAddress(address) {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  // Generate secure random string
  generateSecureString(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  // Detect suspicious activity
  detectSuspiciousActivity(frequency = 1) {
    const suspiciousPatterns = {
      'rapid_requests': frequency > 10 ? 80 : 0,
      'bulk_referrals': frequency > 5 ? 70 : 0,
      'repeated_errors': frequency > 3 ? 60 : 0,
    };
    return Math.max(...Object.values(suspiciousPatterns));
  }

  // Mask sensitive IDs in logs
  maskSensitiveId(id) {
    const str = String(id);
    if (str.length <= 4) return '****';
    return str.substring(0, 2) + '****' + str.substring(str.length - 2);
  }

  // Validate input for injection attacks
  preventInjection(input) {
    const dangerousPatterns = /[$()[\]{}*+?.\\^|]/g;
    return !dangerousPatterns.test(String(input));
  }
}

module.exports = new SecurityManager();
