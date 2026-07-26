const axios = require('axios');
const Ad = require('../models/Ad');
const security = require('../config/security');

class OnClickAService {
  constructor() {
    this.apiUrl = process.env.ONCLICKA_API_URL || 'https://partners.onclicka.com/backend/api/public/user-spots';
    this.apiToken = process.env.ONCLICKA_API_TOKEN;
    this.timeout = parseInt(process.env.ONCLICKA_TIMEOUT || 300000);
    this.cacheTime = 5 * 60 * 1000; // 5 minutes
    this.cachedAds = null;
    this.lastCacheTime = null;
  }

  // Fetch ads from OnClickA API
  async fetchAdsFromAPI() {
    try {
      const response = await axios.get(this.apiUrl, {
        params: { token: this.apiToken },
        timeout: this.timeout,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'BNBGOAT-Bot/1.0',
        },
      });

      if (!response.data) {
        console.warn('⚠️ Empty response from OnClickA API');
        return [];
      }

      // Handle different response formats
      const ads = response.data.ads || response.data || [];
      return Array.isArray(ads) ? ads : [];
    } catch (error) {
      console.error('❌ OnClickA API Error:', error.message);
      return [];
    }
  }

  // Get available ads (with caching)
  async getAvailableAds(forceRefresh = false) {
    const now = Date.now();

    // Return cached ads if fresh
    if (!forceRefresh && this.cachedAds && this.lastCacheTime && (now - this.lastCacheTime) < this.cacheTime) {
      return this.cachedAds;
    }

    // Fetch fresh ads from API
    const apiAds = await this.fetchAdsFromAPI();

    // Transform and validate ads
    const validAds = apiAds.filter(ad => this.validateAd(ad)).map(ad => ({
      onClickAId: ad.id || ad.ID,
      title: ad.title || ad.name || 'Video Ad',
      description: ad.description || '',
      url: ad.url || ad.link || '',
      imageUrl: ad.imageUrl || ad.image || '',
      duration: ad.duration || 30,
      reward: 0.0005, // Fixed reward
      status: 'active',
    }));

    // Cache the ads
    this.cachedAds = validAds;
    this.lastCacheTime = now;

    console.log(`✅ Loaded ${validAds.length} ads from OnClickA`);
    return validAds;
  }

  // Validate ad structure
  validateAd(ad) {
    return ad && (ad.id || ad.ID) && (ad.url || ad.link);
  }

  // Get ads for user (max 10)
  async getAdsForUser(userId, limit = 10) {
    const availableAds = await this.getAvailableAds();
    
    if (availableAds.length === 0) {
      console.warn(`⚠️ No ads available for user ${security.maskSensitiveId(userId)}`);
      return [];
    }

    // Limit to max ads per day
    return availableAds.slice(0, Math.min(limit, availableAds.length));
  }

  // Get single ad by ID
  async getAdById(adId) {
    const ads = await this.getAvailableAds();
    return ads.find(ad => ad.onClickAId === adId) || null;
  }

  // Sync ads to MongoDB
  async syncAdsToDatabase() {
    try {
      const ads = await this.getAvailableAds(true); // Force refresh

      for (const ad of ads) {
        await Ad.findOneAndUpdate(
          { onClickAId: ad.onClickAId },
          ad,
          { upsert: true, new: true }
        );
      }

      console.log(`✅ Synced ${ads.length} ads to database`);
      return ads.length;
    } catch (error) {
      console.error('❌ Database sync error:', error.message);
      return 0;
    }
  }

  // Format ads for Telegram display
  formatAdsForTelegram(ads) {
    if (!ads || ads.length === 0) {
      return '❌ No ads available right now. Try again later!';
    }

    let message = '🎥 **Available Ads (Choose one):**\n\n';
    ads.forEach((ad, index) => {
      message += `${index + 1}. ${ad.title}\n`;
      message += `   ⏱️ Duration: ${ad.duration}s | 💰 Reward: ${ad.reward} BNB\n\n`;
    });
    message += '_Click a button below to watch_';
    return message;
  }

  // Build inline keyboard for ads
  buildAdKeyboard(ads) {
    if (!ads || ads.length === 0) return null;

    const keyboard = ads.map((ad, index) => [{
      text: `${index + 1}. ${ad.title.substring(0, 30)}...`,
      callback_data: `watch_ad_${ad.onClickAId}`,
    }]);

    return keyboard;
  }
}

module.exports = new OnClickAService();
