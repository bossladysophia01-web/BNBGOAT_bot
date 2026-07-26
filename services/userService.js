const User = require('../models/User');
const Referral = require('../models/Referral');
const Withdrawal = require('../models/Withdrawal');
const Transaction = require('../models/Transaction');
const security = require('../config/security');
const CONSTANTS = require('../config/constants');
const { v4: uuidv4 } = require('uuid');

class UserService {
  // Create or get user
  async getOrCreateUser(telegramId, userData = {}) {
    try {
      let user = await User.findOne({ telegramId });

      if (!user) {
        // Generate unique referral code
        const referralCode = this.generateReferralCode(telegramId);

        user = new User({
          telegramId,
          username: userData.username || '',
          firstName: userData.first_name || '',
          lastName: userData.last_name || '',
          referralCode,
        });
        await user.save();
        console.log(`✅ New user created: ${security.maskSensitiveId(telegramId)}`);
      }

      return user;
    } catch (error) {
      console.error('❌ User Creation Error:', error.message);
      return null;
    }
  }

  // Generate referral code
  generateReferralCode(telegramId) {
    const hash = require('crypto').createHash('sha256')
      .update(telegramId + Date.now())
      .digest('hex')
      .substring(0, 8)
      .toUpperCase();
    return `REF${hash}`;
  }

  // Add ad reward
  async addAdReward(userId, amount = CONSTANTS.AD_REWARD_BNB) {
    try {
      const user = await User.findOne({ telegramId: userId });
      if (!user) return { success: false, error: 'User not found' };

      if (user.isBlocked) {
        return { success: false, error: 'User account is blocked' };
      }

      const balanceBefore = user.balance;
      user.addBalance(amount, 'ad');
      user.adsWatchedToday += 1;
      user.lastAdWatchTime = new Date();
      await user.save();

      // Log transaction
      await Transaction.create({
        userId,
        type: 'ad_reward',
        amount,
        balanceBefore,
        balanceAfter: user.balance,
        status: 'completed',
      });

      return { success: true, newBalance: user.balance };
    } catch (error) {
      console.error('❌ Ad Reward Error:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Process referral
  async processReferral(referrerId, referredUserId) {
    try {
      const referrer = await User.findOne({ telegramId: referrerId });
      if (!referrer) return { success: false, error: 'Referrer not found' };

      // Check if already referred
      const existingReferral = await Referral.findOne({
        referrerId,
        referredUserId,
      });
      if (existingReferral) {
        return { success: false, error: 'Already referred' };
      }

      // Create referral record
      const referral = new Referral({
        referrerId,
        referredUserId,
        referralCode: referrer.referralCode,
        reward: CONSTANTS.REFERRAL_REWARD_BNB,
      });
      await referral.save();

      // Add reward to referrer
      const balanceBefore = referrer.balance;
      referrer.addBalance(CONSTANTS.REFERRAL_REWARD_BNB, 'referral');
      referrer.referralCount += 1;
      await referrer.save();

      // Log transaction
      await Transaction.create({
        userId: referrerId,
        type: 'referral_reward',
        amount: CONSTANTS.REFERRAL_REWARD_BNB,
        balanceBefore,
        balanceAfter: referrer.balance,
        reference: referral._id.toString(),
        status: 'completed',
      });

      return { success: true, newBalance: referrer.balance };
    } catch (error) {
      console.error('❌ Referral Error:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Request withdrawal
  async requestWithdrawal(userId, amount, bnbAddress) {
    try {
      const user = await User.findOne({ telegramId: userId });
      if (!user) return { success: false, error: 'User not found' };

      // Validate amount
      if (amount < CONSTANTS.MIN_WITHDRAWAL_BNB) {
        return { 
          success: false, 
          error: `Minimum withdrawal is ${CONSTANTS.MIN_WITHDRAWAL_BNB} BNB` 
        };
      }

      if (user.balance < amount) {
        return { success: false, error: 'Insufficient balance' };
      }

      // Validate BNB address
      if (!security.validateBNBAddress(bnbAddress)) {
        return { success: false, error: 'Invalid BNB address format' };
      }

      // Check cooldown
      if (user.lastWithdrawalTime) {
        const timeSinceLastWithdrawal = Date.now() - user.lastWithdrawalTime.getTime();
        const cooldownMs = CONSTANTS.WITHDRAWAL_COOLDOWN_HOURS * 60 * 60 * 1000;
        if (timeSinceLastWithdrawal < cooldownMs) {
          const waitHours = Math.ceil((cooldownMs - timeSinceLastWithdrawal) / (60 * 60 * 1000));
          return { success: false, error: `Please wait ${waitHours} hours between withdrawals` };
        }
      }

      // Create withdrawal request
      const withdrawal = new Withdrawal({
        userId,
        amount,
        withdrawalAddress: security.encrypt(bnbAddress),
        status: 'pending',
      });
      await withdrawal.save();

      // Deduct balance
      const balanceBefore = user.balance;
      user.deductBalance(amount);
      user.lastWithdrawalTime = new Date();
      user.withdrawalCount += 1;
      await user.save();

      // Log transaction
      await Transaction.create({
        userId,
        type: 'withdrawal',
        amount,
        balanceBefore,
        balanceAfter: user.balance,
        reference: withdrawal._id.toString(),
        status: 'pending',
      });

      return { 
        success: true, 
        withdrawalId: withdrawal._id.toString(),
        newBalance: user.balance 
      };
    } catch (error) {
      console.error('❌ Withdrawal Error:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Get user stats
  async getUserStats(userId) {
    try {
      const user = await User.findOne({ telegramId: userId });
      if (!user) return null;

      const referralCount = await Referral.countDocuments({ referrerId: userId });

      return {
        balance: user.balance,
        totalEarned: user.totalAdRewards + user.totalReferralRewards,
        adRewards: user.totalAdRewards,
        referralRewards: user.totalReferralRewards,
        referralCount,
        adsWatchedToday: user.adsWatchedToday,
        maxAdsPerDay: CONSTANTS.MAX_ADS_PER_DAY,
        lastAdWatchTime: user.lastAdWatchTime,
      };
    } catch (error) {
      console.error('❌ User Stats Error:', error.message);
      return null;
    }
  }

  // Block user
  async blockUser(userId, reason = 'Suspicious activity') {
    try {
      const user = await User.findOne({ telegramId: userId });
      if (!user) return { success: false };

      user.isBlocked = true;
      user.blockReason = reason;
      await user.save();

      console.log(`🚫 User blocked: ${security.maskSensitiveId(userId)} - ${reason}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Block User Error:', error.message);
      return { success: false };
    }
  }
}

module.exports = new UserService();
