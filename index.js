const { Telegraf } = require('telegraf');
const mongoose = require('mongoose');
require('dotenv').config();

const { connectDB, disconnectDB } = require('./config/database');
const CONSTANTS = require('./config/constants');
const security = require('./config/security');
const onclickaService = require('./services/onclicka');
const rateLimiter = require('./services/rateLimiter');
const userService = require('./services/userService');

const User = require('./models/User');
const AdminLog = require('./models/AdminLog');

// Initialize bot
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const ADMIN_ID = process.env.TELEGRAM_ADMIN_ID;

// ======================
// MIDDLEWARE
// ======================

// Check rate limit
bot.use(async (ctx, next) => {
  const userId = String(ctx.from?.id);
  const rateLimit = await rateLimiter.checkRateLimit(userId);

  if (!rateLimit.allowed) {
    return ctx.reply('⏳ Too many requests. Please wait before trying again.');
  }

  await next();
});

// Validate user input
bot.use((ctx, next) => {
  if (ctx.message?.text) {
    const validation = rateLimiter.validateUserInput(ctx.message.text);
    if (!validation.valid) {
      return ctx.reply('❌ Invalid input detected. Please try again with valid characters.');
    }
  }
  return next();
});

// ======================
// START COMMAND
// ======================

bot.start(async (ctx) => {
  try {
    const userId = String(ctx.from?.id);
    const user = await userService.getOrCreateUser(userId, {
      username: ctx.from?.username,
      first_name: ctx.from?.first_name,
      last_name: ctx.from?.last_name,
    });

    const message = `🐐 **Welcome to BNB GOAT!**

💰 **Earn BNB by:**
• 🎥 Watching video ads: **0.0005 BNB** per ad
• 👥 Referring friends: **0.00176 BNB** per referral

📊 **Your Stats:**
• Balance: **${user.balance} BNB**
• Ads Today: **${user.adsWatchedToday}/${CONSTANTS.MAX_ADS_PER_DAY}**
• Referrals: **${user.referralCount}**

🎮 **Commands:**
/balance - Check balance
/ads - Watch ads
/referral - Get referral link
/withdraw - Withdraw BNB
/help - Show help`;

    const keyboard = [
      [{ text: '🎥 Watch Ads', callback_data: 'show_ads' }],
      [{ text: '👥 Referral Link', callback_data: 'show_referral' }],
      [{ text: '💰 Balance', callback_data: 'show_balance' }],
      [{ text: '💸 Withdraw', callback_data: 'show_withdraw' }],
    ];

    return ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: keyboard },
    });
  } catch (error) {
    console.error('❌ Start Error:', error.message);
    return ctx.reply('❌ An error occurred. Please try again.');
  }
});

// ======================
// BALANCE COMMAND
// ======================

bot.command('balance', async (ctx) => {
  try {
    const userId = String(ctx.from?.id);
    const stats = await userService.getUserStats(userId);

    if (!stats) {
      return ctx.reply('❌ User not found. Use /start first.');
    }

    const message = `💰 **Your Balance:**

**Current Balance:** ${stats.balance.toFixed(6)} BNB
**Total Earned:** ${stats.totalEarned.toFixed(6)} BNB
• Ad Rewards: ${stats.adRewards.toFixed(6)} BNB
• Referral Rewards: ${stats.referralRewards.toFixed(6)} BNB

📊 **Statistics:**
• Ads Watched Today: ${stats.adsWatchedToday}/${stats.maxAdsPerDay}
• Total Referrals: ${stats.referralCount}

⚠️ Minimum withdrawal: ${CONSTANTS.MIN_WITHDRAWAL_BNB} BNB`;

    return ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('❌ Balance Error:', error.message);
    return ctx.reply('❌ An error occurred.');
  }
});

// ======================
// ADS COMMAND
// ======================

bot.command('ads', async (ctx) => {
  try {
    const userId = String(ctx.from?.id);
    const user = await User.findOne({ telegramId: userId });

    if (!user) {
      return ctx.reply('❌ User not found. Use /start first.');
    }

    // Check if user can watch ads
    if (user.adsWatchedToday >= CONSTANTS.MAX_ADS_PER_DAY) {
      return ctx.reply(
        `❌ You've reached today's ad limit (${CONSTANTS.MAX_ADS_PER_DAY}/day)\n\n⏰ Try again tomorrow!`
      );
    }

    if (!user.canWatchAd()) {
      const timeSinceLastAd = Date.now() - user.lastAdWatchTime.getTime();
      const remainingTime = Math.ceil((CONSTANTS.AD_COOLDOWN_MS - timeSinceLastAd) / 60000);
      return ctx.reply(`⏳ Wait ${remainingTime} minute(s) before watching another ad.`);
    }

    // Get available ads
    const ads = await onclickaService.getAdsForUser(userId, CONSTANTS.MAX_ADS_PER_DAY);

    if (ads.length === 0) {
      return ctx.reply('❌ No ads available right now. Try again later!');
    }

    const message = `🎥 **Available Ads (Choose one):**\n\n${ads.map((ad, i) => 
      `${i + 1}. ${ad.title}\n⏱️ Duration: ${ad.duration}s | 💰 Reward: ${ad.reward} BNB`
    ).join('\n\n')}\n\n_Click a button below to watch_`;

    const keyboard = ads.map((ad, index) => [{
      text: `${index + 1}. ${ad.title.substring(0, 28)}...`,
      callback_data: `watch_ad_${ad.onClickAId}`,
    }]);

    return ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: keyboard },
    });
  } catch (error) {
    console.error('❌ Ads Error:', error.message);
    return ctx.reply('❌ An error occurred.');
  }
});

// ======================
// REFERRAL COMMAND
// ======================

bot.command('referral', async (ctx) => {
  try {
    const userId = String(ctx.from?.id);
    const user = await User.findOne({ telegramId: userId });

    if (!user) {
      return ctx.reply('❌ User not found. Use /start first.');
    }

    const referralLink = `https://t.me/${(await bot.telegram.getMe()).username}?start=ref_${user.referralCode}`;
    const message = `👥 **Your Referral Link:**\n\n\`${referralLink}\`\n\n💰 Earn **0.00176 BNB** for each friend who joins!\n\n📊 Total Referrals: **${user.referralCount}**`;

    return ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('❌ Referral Error:', error.message);
    return ctx.reply('❌ An error occurred.');
  }
});

// ======================
// WITHDRAW COMMAND
// ======================

bot.command('withdraw', async (ctx) => {
  try {
    const userId = String(ctx.from?.id);
    const user = await User.findOne({ telegramId: userId });

    if (!user) {
      return ctx.reply('❌ User not found. Use /start first.');
    }

    if (user.balance < CONSTANTS.MIN_WITHDRAWAL_BNB) {
      return ctx.reply(
        `❌ Insufficient balance.\n\nMinimum withdrawal: ${CONSTANTS.MIN_WITHDRAWAL_BNB} BNB\nYour balance: ${user.balance} BNB`
      );
    }

    ctx.session = ctx.session || {};
    ctx.session.withdrawalState = 'waiting_address';

    return ctx.reply(
      `💸 **Withdrawal Process**\n\nSend your BNB address (0x...):\n\nℹ️ Make sure the address is valid!`,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    console.error('❌ Withdraw Error:', error.message);
    return ctx.reply('❌ An error occurred.');
  }
});

// ======================
// CALLBACK QUERIES
// ======================

bot.action('show_ads', (ctx) => ctx.scene.leave() || ctx.replyWithChatAction('typing') || bot.telegram.sendMessage(ctx.chat.id, 'Loading ads...').then(() => ctx.scene.enter('ads')));

bot.action(/watch_ad_(.+)/, async (ctx) => {
  try {
    const userId = String(ctx.from?.id);
    const adId = ctx.match[1];

    const user = await User.findOne({ telegramId: userId });
    if (!user || user.isBlocked) {
      return ctx.answerCbQuery('❌ Account blocked or not found.');
    }

    if (!user.canWatchAd()) {
      return ctx.answerCbQuery('⏳ You must wait before watching another ad.');
    }

    const ad = await onclickaService.getAdById(adId);
    if (!ad) {
      return ctx.answerCbQuery('❌ Ad not found.');
    }

    // Open web app with ad
    const webAppUrl = `https://partners.onclicka.com/view?id=${adId}`;

    return ctx.editMessageReplyMarkup({
      inline_keyboard: [[
        { text: '🎥 Watch Ad', web_app: { url: webAppUrl } },
      ]],
    });
  } catch (error) {
    console.error('❌ Ad Click Error:', error.message);
    return ctx.answerCbQuery('❌ An error occurred.');
  }
});

bot.action('show_balance', (ctx) => {
  ctx.answerCbQuery();
  return bot.telegram.sendMessage(ctx.chat.id, '/balance');
});

bot.action('show_referral', (ctx) => {
  ctx.answerCbQuery();
  return bot.telegram.sendMessage(ctx.chat.id, '/referral');
});

bot.action('show_withdraw', (ctx) => {
  ctx.answerCbQuery();
  return bot.telegram.sendMessage(ctx.chat.id, '/withdraw');
});

// ======================
// ADMIN COMMANDS
// ======================

bot.command('admin', async (ctx) => {
  try {
    const userId = String(ctx.from?.id);

    if (userId !== ADMIN_ID) {
      console.warn(`🚨 Unauthorized admin access attempt from ${security.maskSensitiveId(userId)}`);
      return ctx.reply('❌ Unauthorized.');
    }

    const message = `🔐 **Admin Panel**\n\n/admin_stats - View statistics\n/admin_users - View users\n/admin_block <id> - Block user\n/admin_unblock <id> - Unblock user`;

    return ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('❌ Admin Error:', error.message);
  }
});

bot.command('admin_stats', async (ctx) => {
  try {
    const userId = String(ctx.from?.id);
    if (userId !== ADMIN_ID) return ctx.reply('❌ Unauthorized.');

    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isBlocked: false });
    const totalBalance = await User.aggregate([{ $group: { _id: null, total: { $sum: '$balance' } } }]);

    const message = `📊 **Bot Statistics**\n\n👥 Total Users: ${totalUsers}\n✅ Active Users: ${activeUsers}\n❌ Blocked Users: ${totalUsers - activeUsers}\n💰 Total Balance: ${totalBalance[0]?.total.toFixed(6) || '0'} BNB`;

    return ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('❌ Admin Stats Error:', error.message);
  }
});

bot.command('admin_block', async (ctx) => {
  try {
    const userId = String(ctx.from?.id);
    if (userId !== ADMIN_ID) return ctx.reply('❌ Unauthorized.');

    const targetId = ctx.message.text.split(' ')[1];
    if (!targetId) return ctx.reply('Usage: /admin_block <user_id>');

    await userService.blockUser(targetId, 'Admin block');
    await AdminLog.create({
      adminId: userId,
      action: 'block_user',
      targetUserId: targetId,
    });

    return ctx.reply(`✅ User ${security.maskSensitiveId(targetId)} blocked.`);
  } catch (error) {
    console.error('❌ Block Error:', error.message);
  }
});

// ======================
// ERROR & LAUNCH
// ======================

bot.catch((err, ctx) => {
  console.error('❌ Bot Error:', err.message);
  ctx.reply('❌ An unexpected error occurred.');
});

const startBot = async () => {
  try {
    console.log('🚀 Connecting to MongoDB...');
    await connectDB();

    console.log('🔄 Syncing ads from OnClickA...');
    await onclickaService.syncAdsToDatabase();

    console.log('🤖 Starting Telegram bot...');
    await bot.launch();

    console.log('✅ Bot is running!');

    process.once('SIGINT', async () => {
      console.log('\n🛑 Shutting down...');
      await bot.stop();
      await disconnectDB();
      process.exit(0);
    });

    process.once('SIGTERM', async () => {
      console.log('\n🛑 Shutting down...');
      await bot.stop();
      await disconnectDB();
      process.exit(0);
    });
  } catch (error) {
    console.error('❌ Startup Error:', error.message);
    process.exit(1);
  }
};

// Start bot
startBot();

module.exports = bot;
