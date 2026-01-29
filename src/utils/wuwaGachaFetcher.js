// 鳴潮抽卡紀錄 API 擷取工具

const API_URL = "https://gmserver-api.aki-game2.net/gacha/record/query";

// 卡池類型對應表
const CARD_POOL_TYPES = {
  1: "角色活動唤取",   // Featured Resonator
  2: "武器活動唤取",   // Featured Weapon
  3: "角色常駐唤取",   // Standard Resonator
  4: "武器常駐唤取",   // Standard Weapon
  5: "新手唤取",       // Beginner
  6: "新手自選唤取",   // Beginner's Choice
  7: "新手自選唤取（感恩定向唤取）" // Beginner's Choice (Thankful)
};

/**
 * 從鳴潮的 URL 解析出 API 所需的參數
 * @param {string} url - 鳴潮抽卡紀錄頁面的 URL
 * @returns {object} - 解析出的參數
 * 
 * URL 範例：
 * https://aki-gm-resources-oversea.aki-game.net/aki/gacha/index.html#/record?svr_id=xxx&player_id=xxx&lang=zh-Hant&gacha_id=xxx&gacha_type=1&svr_area=global&record_id=xxx&resources_id=xxx&platform=PC
 */
export const parseWuwaUrl = (url) => {
  try {
    // URL 的參數在 hash (#) 後面，需要特殊處理
    const hashIndex = url.indexOf('#');
    if (hashIndex === -1) {
      throw new Error('無效的 URL 格式：缺少 hash 部分');
    }

    const hashPart = url.substring(hashIndex + 1);
    const queryIndex = hashPart.indexOf('?');
    if (queryIndex === -1) {
      throw new Error('無效的 URL 格式：缺少查詢參數');
    }

    const queryString = hashPart.substring(queryIndex + 1);
    const params = new URLSearchParams(queryString);

    const playerId = params.get('player_id');
    const serverId = params.get('svr_id');
    const recordId = params.get('record_id');
    const resourcesId = params.get('resources_id');
    const lang = params.get('lang') || 'zh-Hant';
    const gachaType = params.get('gacha_type');

    // 驗證必要參數
    if (!playerId || !serverId || !recordId || !resourcesId) {
      throw new Error('URL 缺少必要參數');
    }

    return {
      playerId,
      serverId,
      recordId,
      cardPoolId: resourcesId,
      languageCode: lang,
      cardPoolType: gachaType ? parseInt(gachaType, 10) : null
    };
  } catch (error) {
    throw new Error(`URL 解析失敗: ${error.message}`);
  }
};

/**
 * 查詢單一卡池的抽卡紀錄
 * @param {object} params - API 參數
 * @returns {Promise<Array>} - 抽卡紀錄陣列
 */
const fetchCardPoolRecords = async (params) => {
  const payload = {
    playerId: params.playerId,
    cardPoolId: params.cardPoolId,
    cardPoolType: params.cardPoolType,
    languageCode: params.languageCode,
    recordId: params.recordId,
    serverId: params.serverId
  };

  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`HTTP 錯誤: ${response.status}`);
  }

  const result = await response.json();

  if (result.code !== 0) {
    throw new Error(result.message || 'API 回傳錯誤');
  }

  return result.data || [];
};

/**
 * 將 API 回傳的資料轉換成應用程式使用的格式
 * @param {Array} records - API 原始資料
 * @param {number} cardPoolType - 卡池類型
 * @returns {Array} - 轉換後的資料
 */
const transformRecords = (records, cardPoolType) => {
  return records.map((item, index) => ({
    id: `${cardPoolType}-${item.time}-${index}`,
    name: item.name,
    rarity: item.qualityLevel,
    type: item.resourceType === '角色' ? 'character' : 'weapon',
    time: item.time,
    cardPoolType: cardPoolType,
    cardPoolName: CARD_POOL_TYPES[cardPoolType] || `卡池 ${cardPoolType}`
  }));
};

/**
 * 獲取所有卡池的抽卡紀錄
 * @param {string} url - 鳴潮抽卡紀錄頁面的 URL
 * @param {function} onProgress - 進度回調函數 (可選)
 * @returns {Promise<object>} - 包含所有卡池紀錄的物件
 */
export const fetchAllGachaRecords = async (url, onProgress) => {
  const params = parseWuwaUrl(url);
  
  // 要查詢的卡池類型 (1-7)
  const poolTypesToFetch = [1, 2, 3, 4, 5, 6, 7];
  
  const allRecords = [];
  const recordsByPool = {};
  let fetchedPools = 0;

  for (const poolType of poolTypesToFetch) {
    try {
      if (onProgress) {
        onProgress({
          current: fetchedPools,
          total: poolTypesToFetch.length,
          currentPool: CARD_POOL_TYPES[poolType]
        });
      }

      const records = await fetchCardPoolRecords({
        ...params,
        cardPoolType: poolType
      });

      const transformedRecords = transformRecords(records, poolType);
      
      if (transformedRecords.length > 0) {
        recordsByPool[poolType] = {
          name: CARD_POOL_TYPES[poolType],
          records: transformedRecords,
          count: transformedRecords.length
        };
        allRecords.push(...transformedRecords);
      }

      fetchedPools++;

      // 加入短暫延遲避免請求過快
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.warn(`卡池 ${CARD_POOL_TYPES[poolType]} 查詢失敗:`, error.message);
      fetchedPools++;
    }
  }

  // 按時間排序（最新的在前面）
  allRecords.sort((a, b) => new Date(b.time) - new Date(a.time));

  return {
    playerId: params.playerId,
    serverId: params.serverId,
    totalCount: allRecords.length,
    records: allRecords,
    recordsByPool,
    fetchedAt: new Date().toISOString()
  };
};

/**
 * 獲取單一卡池的抽卡紀錄
 * @param {string} url - 鳴潮抽卡紀錄頁面的 URL
 * @param {number} cardPoolType - 要查詢的卡池類型 (1-7)
 * @returns {Promise<Array>} - 抽卡紀錄陣列
 */
export const fetchGachaRecordsByPool = async (url, cardPoolType = 1) => {
  const params = parseWuwaUrl(url);
  
  const records = await fetchCardPoolRecords({
    ...params,
    cardPoolType
  });

  return transformRecords(records, cardPoolType);
};

/**
 * 將抽卡紀錄轉換成適用於 GachaTracker 組件的格式
 * @param {object} fetchedData - fetchAllGachaRecords 回傳的資料
 * @returns {Array} - 適用於 GachaTracker 的資料格式
 */
export const convertToTrackerFormat = (fetchedData) => {
  return fetchedData.records.map((record, index) => ({
    pull: fetchedData.records.length - index, // 從最新往回算
    name: record.name,
    rarity: record.rarity,
    type: record.type,
    time: record.time,
    pity: 0, // 這個需要另外計算
    poolType: record.cardPoolType,
    poolName: record.cardPoolName
  }));
};

/**
 * 常駐五星角色列表（這個列表很少變動）
 */
const STANDARD_FIVE_STAR_CHARACTERS = [
  '凌陽', '維里奈', '安可', '卡卡羅', '鑒心',
];

/**
 * 判斷是否為限定五星（只統計角色活動池）
 * 邏輯：角色活動池(1) + 不在常駐角色列表 = 限定
 * 
 * @param {string} name - 角色名稱
 * @param {number} cardPoolType - 卡池類型
 * @returns {boolean} - 是否為限定
 */
const isLimitedFiveStar = (name, cardPoolType) => {
  // 只統計角色活動唤取 (cardPoolType=1)
  if (cardPoolType === 1) {
    return !STANDARD_FIVE_STAR_CHARACTERS.includes(name);
  }
  
  // 其他池子都不算限定
  return false;
};

/**
 * 將從瀏覽器 Console 直接取得的原始 API 資料轉換成統計可用的格式
 * 
 * 原始資料格式：
 * {
 *   cardPoolType: '1',
 *   resourceId: 21040013,
 *   qualityLevel: 3,
 *   resourceType: '武器',
 *   name: '暗夜臂鎧·夜芒',
 *   time: '2024-01-15 10:30:00'
 * }
 * 
 * @param {Array} rawRecords - 從 API 取得的原始資料陣列（最新的在前面，index 0 最新）
 * @param {number|string} cardPoolType - 卡池類型（可選，如果資料中沒有會用這個）
 * @returns {Array} - 轉換後可用於統計的資料
 */
export const convertRawRecordsToStats = (rawRecords, cardPoolType = 1) => {
  if (!rawRecords || rawRecords.length === 0) {
    return [];
  }

  // 只篩選指定卡池類型的紀錄（預設只要角色活動池 1）
  const filteredRecords = rawRecords.filter(item => {
    const poolType = parseInt(item.cardPoolType) || cardPoolType;
    return poolType === cardPoolType;
  });

  if (filteredRecords.length === 0) {
    return [];
  }

  // API 資料是最新的在前面（index 0），我們需要反轉成最舊的在前面來計算 pity
  const chronologicalRecords = [...filteredRecords].reverse();
  
  let pityCounter = 0; // 五星保底計數器
  let fourStarPity = 0; // 四星保底計數器
  
  const processedRecords = chronologicalRecords.map((item, index) => {
    pityCounter++;
    fourStarPity++;
    
    const poolType = parseInt(item.cardPoolType) || cardPoolType;
    const rarity = item.qualityLevel;
    const name = item.name;
    const resourceType = item.resourceType;
    
    // 建立記錄
    const record = {
      id: `${poolType}-${index}`,
      pull: index + 1, // 第幾抽（從1開始）
      name: name,
      rarity: rarity,
      type: resourceType === '角色' ? 'character' : 'weapon',
      time: item.time,
      pity: rarity === 5 ? pityCounter : (rarity === 4 ? fourStarPity : 0),
      poolType: poolType,
      poolName: CARD_POOL_TYPES[poolType] || `卡池 ${poolType}`,
      isLimited: rarity === 5 ? isLimitedFiveStar(name, poolType) : false,
      resourceId: item.resourceId
    };
    
    // 重置計數器
    if (rarity === 5) {
      pityCounter = 0;
    }
    if (rarity === 4 || rarity === 5) {
      fourStarPity = 0;
    }
    
    return record;
  });
  
  // 反轉回最新的在前面（符合顯示習慣）
  // 同時按時間和原始順序排序，確保同一時間的紀錄順序正確
  const resultRecords = processedRecords.reverse();
  
  // 按時間排序（最新在前），同時間的紀錄按原始順序反序排列
  resultRecords.sort((a, b) => {
    const timeA = new Date(a.time).getTime();
    const timeB = new Date(b.time).getTime();
    
    if (timeA !== timeB) {
      // 不同時間，最新的在前
      return timeB - timeA;
    }
    
    // 同時間，按 pull（抽數）倒序排列（讓最新的抽在前）
    return b.pull - a.pull;
  });
  
  return resultRecords;
};

/**
 * 合併多個卡池的紀錄
 * @param {Object} recordsByPool - 按卡池分類的紀錄 { 1: [...], 2: [...], ... }
 * @returns {Array} - 合併後的所有紀錄（按時間排序，最新在前）
 */
export const mergePoolRecords = (recordsByPool) => {
  const allRecords = [];
  
  for (const [poolType, records] of Object.entries(recordsByPool)) {
    const processed = convertRawRecordsToStats(records, parseInt(poolType));
    allRecords.push(...processed);
  }
  
  // 按時間排序（最新的在前面）
  allRecords.sort((a, b) => new Date(b.time) - new Date(a.time));
  
  return allRecords;
};

/**
 * 快速統計函數 - 直接從原始資料計算統計
 * @param {Array} rawRecords - 從 API 取得的原始資料
 * @returns {object} - 快速統計結果
 */
export const quickStats = (rawRecords) => {
  const processed = convertRawRecordsToStats(rawRecords);
  
  const totalPulls = processed.length;
  const fiveStars = processed.filter(r => r.rarity === 5);
  const fourStars = processed.filter(r => r.rarity === 4);
  const limitedFiveStars = fiveStars.filter(r => r.isLimited);
  
  // 計算五星的 pity 值總和
  const fiveStarPitySum = fiveStars.reduce((sum, r) => sum + r.pity, 0);
  const avgPullsPerFiveStar = fiveStars.length > 0 
    ? (fiveStarPitySum / fiveStars.length).toFixed(1) 
    : '0';
  
  // 計算限定五星的平均抽數
  let avgPullsPerLimited = '0';
  if (limitedFiveStars.length > 0) {
    // 找出每個限定五星之間花了多少抽
    let accumulatedPulls = 0;
    const pullsForLimiteds = [];
    
    // 按時間順序處理（舊的在前）
    const chronological = [...processed].reverse();
    for (const record of chronological) {
      if (record.rarity === 5) {
        accumulatedPulls += record.pity;
        if (record.isLimited) {
          pullsForLimiteds.push(accumulatedPulls);
          accumulatedPulls = 0;
        }
      }
    }
    
    if (pullsForLimiteds.length > 0) {
      avgPullsPerLimited = (pullsForLimiteds.reduce((a, b) => a + b, 0) / pullsForLimiteds.length).toFixed(1);
    }
  }
  
  return {
    totalPulls,
    fiveStarCount: fiveStars.length,
    fourStarCount: fourStars.length,
    limitedFiveStarCount: limitedFiveStars.length,
    avgPullsPerFiveStar,
    avgPullsPerLimited,
    winRate: fiveStars.length > 0 
      ? ((limitedFiveStars.length / fiveStars.length) * 100).toFixed(1) 
      : '0',
    fiveStarList: fiveStars.map(r => ({
      name: r.name,
      pity: r.pity,
      isLimited: r.isLimited,
      time: r.time
    }))
  };
};

export default {
  parseWuwaUrl,
  fetchAllGachaRecords,
  fetchGachaRecordsByPool,
  convertToTrackerFormat,
  convertRawRecordsToStats,
  mergePoolRecords,
  quickStats,
  isLimitedFiveStar,
  CARD_POOL_TYPES,
  STANDARD_FIVE_STAR_CHARACTERS
};
