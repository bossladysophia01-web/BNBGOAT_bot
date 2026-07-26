module.exports = {
  // BNB Rewards
  AD_REWARD_BNB: parseFloat(process.env.AD_REWARD_BNB || 0.0005),
  REFERRAL_REWARD_BNB: parseFloat(process.env.REFERRAL_REWARD_BNB || 0.00176),
  MIN_WITHDRAWAL_BNB: parseFloat(process.env.MIN_WITHDRAWAL_BNB || 0.0352),

  // Timers
  AD_COOLDOWN_MINUTES: parseInt(process.env.AD_COOLDOWN_MINUTES || 7),
  AD_COOLDOWN_MS: parseInt(process.env.AD_COOLDOWN_MINUTES || 7) * 60 * 1000,
  MAX_ADS_PER_DAY: parseInt(process.env.MAX_ADS_PER_DAY || 10),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || 60000),
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || 10),
  SPAM_DETECTION_THRESHOLD: parseInt(process.env.SPAM_DETECTION_THRESHOLD || 5),

  // Withdrawal Settings
  WITHDRAWAL_COOLDOWN_HOURS: 24,
  MAX_WITHDRAWAL_PER_DAY: 5,

  // Admin ID
  ADMIN_ID: process.env.TELEGRAM_ADMIN_ID,

  // OnClickA
  ONCLICKA_TIMEOUT: parseInt(process.env.ONCLICKA_TIMEOUT || 300000),

  // Messages
  MESSAGES: {
    WELCOME: '🐐 Welcome to BNB GOAT!\n\n💰 Earn BNB by watching ads and referrals\n\n📊 Commands:\n/balance - Check balance\n/ads - Watch ads\n/referral - Your referral link\n/withdraw - Withdraw BNB',
    INSUFFICIENT_BALANCE: '❌ Insufficient balance.\nMinimum: 0.0352 BNB',
    AD_COOLDOWN: '⏳ Wait {time} minutes for next ad',
    AD_LIMIT_EXCEEDED: '❌ Daily limit reached (10/day)',
    INVALID_ADDRESS: '❌ Invalid BNB address',
    WITHDRAWAL_SUCCESS: '✅ Withdrawal successful!',
  },

  // User States
  USER_STATES: {
    IDLE: 'idle',
    WATCHING_AD: 'watching_ad',
    WITHDRAWING: 'withdrawing',
  },

  // Logging
  LOG_RETENTION_DAYS: parseInt(process.env.LOG_RETENTION_DAYS || 30),

  // Security
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION_MINUTES: 15,
};
