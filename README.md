# BNB GOAT Telegram Bot

🐐 **Earn BNB by watching video ads and referring friends!**

## Features

✅ **Video Ads** - Watch up to 10 ads per day, earn 0.0005 BNB each
✅ **Referral System** - Earn 0.00176 BNB per referral
✅ **Secure Withdrawals** - Minimum 0.0352 BNB to withdraw
✅ **Anti-Spam Protection** - Rate limiting and behavior analysis
✅ **ID Encryption** - Admin ID and sensitive data encrypted
✅ **OnClickA Integration** - Dynamic ad selection
✅ **Admin Panel** - User management and statistics
✅ **MongoDB Storage** - Persistent user data

## Setup

### 1. Prerequisites
- Node.js v14+
- MongoDB Atlas account (or local MongoDB)
- Telegram bot token (from @BotFather)

### 2. Installation

```bash
# Clone the repository
git clone https://github.com/bossladysophia01-web/BNBGOAT_bot.git
cd BNBGOAT_bot

# Install dependencies
npm install
```

### 3. Configuration

Create a `.env` file in the root directory:

```env
# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather
TELEGRAM_ADMIN_ID=7651528889

# MongoDB
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/?appName=BNBGOATbot
MONGODB_DB_NAME=bnbgoat

# OnClickA
ONCLICKA_API_URL=https://partners.onclicka.com/backend/api/public/user-spots
ONCLICKA_API_TOKEN=50b2ea78847d237febce614f93d46aef

# Security
ENCRYPTION_KEY=your-32-character-encryption-key-change-this
JWT_SECRET=your-jwt-secret-change-this

# Bot Settings
AD_REWARD_BNB=0.0005
REFERRAL_REWARD_BNB=0.00176
MIN_WITHDRAWAL_BNB=0.0352
AD_COOLDOWN_MINUTES=7
MAX_ADS_PER_DAY=10

# Environment
NODE_ENV=production
PORT=3000
```

### 4. Run the Bot

```bash
# Development
npm run dev

# Production
npm start
```

## Commands

- `/start` - Initialize and view welcome message
- `/balance` - Check your BNB balance and statistics
- `/ads` - View and watch available video ads
- `/referral` - Get your unique referral link
- `/withdraw` - Request BNB withdrawal
- `/help` - Show available commands

## Admin Commands

- `/admin` - Access admin panel
- `/admin_stats` - View bot statistics
- `/admin_users` - List all users
- `/admin_block <user_id>` - Block a user
- `/admin_unblock <user_id>` - Unblock a user

## Security Features

### 1. ID Obfuscation
- Admin ID is hashed (never stored plain)
- User IDs masked in logs
- All sensitive data encrypted

### 2. Rate Limiting
- Max 10 requests per 60 seconds
- Automatic 15-minute cooldown for spammers
- Behavioral anomaly detection

### 3. Input Validation
- BNB address format validation
- Injection attack prevention
- HTML special character sanitization

### 4. Spam Detection
- Suspicious activity scoring
- Automatic user blocking
- Security event logging

### 5. Database Security
- Encrypted connection (MongoDB Atlas)
- Sensitive fields encrypted (withdrawal addresses)
- Transaction logging for audit trail
- Automatic log retention (30 days)

## File Structure

```
BNBGOAT_bot/
├── config/
│   ├── constants.js      # App constants
│   ├── database.js       # MongoDB connection
│   └── security.js       # Encryption & validation
├── models/
│   ├── User.js           # User schema
│   ├── Ad.js             # Ad schema
│   ├── Referral.js       # Referral schema
│   ├── Withdrawal.js     # Withdrawal schema
│   ├── Transaction.js    # Transaction log
│   ├── RateLimit.js      # Rate limit tracking
│   ├── AdminLog.js       # Admin actions
│   └── SecurityLog.js    # Security events
├── services/
│   ├── onclicka.js       # OnClickA API integration
│   ├── rateLimiter.js    # Rate limiting & spam detection
│   └── userService.js    # User operations
├── index.js              # Main bot file
├── package.json          # Dependencies
├── .env.example          # Example env file
└── README.md             # This file
```

## Reward System

### Ad Rewards
- 0.0005 BNB per ad
- Maximum 10 ads per day
- 7-minute cooldown between ads
- Total max per day: 0.005 BNB

### Referral Rewards
- 0.00176 BNB per referral
- Unlimited referrals
- Instant credit

### Withdrawal
- Minimum: 0.0352 BNB
- 24-hour cooldown between withdrawals
- Maximum 5 withdrawals per day

## Telegram Web App Integration

Ads play in a Telegram Web App (in-app), no redirect:

1. User clicks "Watch Ad" button
2. Web app opens within Telegram
3. Ad plays (OnClickA)
4. Reward automatically credited
5. User stays in Telegram

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| TELEGRAM_BOT_TOKEN | ✅ | Bot token from @BotFather |
| TELEGRAM_ADMIN_ID | ✅ | Admin user ID |
| MONGODB_URI | ✅ | MongoDB connection string |
| ONCLICKA_API_TOKEN | ✅ | OnClickA API token |
| ENCRYPTION_KEY | ✅ | 32-char encryption key |
| AD_REWARD_BNB | ⚠️ | Ad reward amount (default: 0.0005) |
| MAX_ADS_PER_DAY | ⚠️ | Daily ad limit (default: 10) |

## Logging

Logs include:
- User actions (ads watched, withdrawals)
- Security events (suspicious activity, rate limit)
- Admin actions (blocks, credits)
- System events (startup, shutdown)

**Automatic cleanup**: Logs older than 30 days are deleted.

## Troubleshooting

### Bot not responding
1. Check if bot token is correct
2. Verify MongoDB connection
3. Check logs for errors

### No ads showing
1. Verify OnClickA API token
2. Test API endpoint: `curl -H 'Accept: application/json' 'https://partners.onclicka.com/backend/api/public/user-spots?token=YOUR_TOKEN'`
3. Check if ads are available

### Withdrawal failing
1. Ensure balance >= 0.0352 BNB
2. Verify BNB address format (0x...)
3. Check if 24-hour cooldown has passed

## Support

For issues or questions:
- Check the logs
- Review security settings
- Verify all environment variables

## License

MIT License © 2024 BNB GOAT

---

**⚠️ Security Notice:**
- Never commit `.env` file to Git
- Keep ENCRYPTION_KEY secret
- Regularly rotate JWT_SECRET
- Monitor admin logs for unauthorized access
- Keep Node.js and packages updated
