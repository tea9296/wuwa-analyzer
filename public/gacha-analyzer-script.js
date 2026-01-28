/**
 * 鳴潮抽卡資料轉換與統計腳本
 * 可以在瀏覽器 Console 中直接執行
 * 
 * 使用方式：
 * 1. 先用原本的 fetchWithExactPayload() 取得 result.data
 * 2. 將 result.data 傳入下面的函數進行統計
 */

// 已知的限定五星角色列表
const LIMITED_FIVE_STAR_CHARACTERS = [
  '吟霖', '忌炎', '卡卡羅', '安可', '維里奈',
  '今汐', '長離', '守岸人', '布蘭特',
  '相里要', '折枝', '椿', '洛可可', '露緹亞',
  '莫寧', '渡嵐', '琳奈', '白芷', '白露',
];

// 已知的常駐五星角色列表
const STANDARD_FIVE_STAR_CHARACTERS = [
  '凌陽', '維里奈', '安可', '卡卡羅', '鑒心',
];

/**
 * 判斷角色是否為限定五星
 */
function isLimitedFiveStar(name, cardPoolType) {
  if (LIMITED_FIVE_STAR_CHARACTERS.includes(name)) return true;
  if (STANDARD_FIVE_STAR_CHARACTERS.includes(name)) return false;
  if (cardPoolType === 2) return true; // 武器活動池
  if (cardPoolType >= 3) return false; // 常駐/新手池
  return true; // 預設活動池的未知角色算限定
}

/**
 * 轉換原始資料並計算統計
 * @param {Array} rawRecords - API 回傳的原始資料 (最新的在 index 0)
 */
function analyzeGachaRecords(rawRecords) {
  if (!rawRecords || rawRecords.length === 0) {
    console.log("❌ 沒有資料！");
    return;
  }

  // 反轉成時間順序（舊的在前）
  const chronological = [...rawRecords].reverse();
  
  let pityCounter = 0;
  const processed = [];
  
  chronological.forEach((item, index) => {
    pityCounter++;
    const poolType = parseInt(item.cardPoolType) || 1;
    const rarity = item.qualityLevel;
    
    const record = {
      pull: index + 1,
      name: item.name,
      rarity: rarity,
      type: item.resourceType,
      time: item.time,
      pity: rarity === 5 ? pityCounter : 0,
      isLimited: rarity === 5 ? isLimitedFiveStar(item.name, poolType) : false
    };
    
    if (rarity === 5) {
      pityCounter = 0;
    }
    
    processed.push(record);
  });

  // 統計
  const totalPulls = processed.length;
  const fiveStars = processed.filter(r => r.rarity === 5);
  const fourStars = processed.filter(r => r.rarity === 4);
  const limitedFiveStars = fiveStars.filter(r => r.isLimited);
  
  // 計算五星平均抽數
  const avgPullsPerFiveStar = fiveStars.length > 0 
    ? (fiveStars.reduce((sum, r) => sum + r.pity, 0) / fiveStars.length).toFixed(1)
    : 0;
  
  // 計算限定五星平均抽數
  let avgPullsPerLimited = 0;
  if (limitedFiveStars.length > 0) {
    let accumulatedPulls = 0;
    const pullsForLimiteds = [];
    
    for (const record of processed) {
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

  // 小保不歪率
  const winRate = fiveStars.length > 0 
    ? ((limitedFiveStars.length / fiveStars.length) * 100).toFixed(1)
    : 0;

  // 輸出結果
  console.log("\n📊 ===== 抽卡統計結果 =====\n");
  console.log(`📦 總抽數: ${totalPulls}`);
  console.log(`⭐ 五星數量: ${fiveStars.length}`);
  console.log(`🌟 限定五星數量: ${limitedFiveStars.length}`);
  console.log(`💜 四星數量: ${fourStars.length}`);
  console.log(`📈 平均幾抽一五星: ${avgPullsPerFiveStar}`);
  console.log(`🎯 平均幾抽一限定: ${avgPullsPerLimited}`);
  console.log(`🎲 小保不歪率: ${winRate}%`);
  
  console.log("\n🏆 ===== 五星詳細列表 =====\n");
  console.table(fiveStars.map(r => ({
    名稱: r.name,
    抽數: r.pity,
    限定: r.isLimited ? '✅' : '❌',
    時間: r.time
  })));

  // 返回處理後的資料（可以用於進一步分析）
  return {
    totalPulls,
    fiveStarCount: fiveStars.length,
    fourStarCount: fourStars.length,
    limitedFiveStarCount: limitedFiveStars.length,
    avgPullsPerFiveStar,
    avgPullsPerLimited,
    winRate,
    fiveStarList: fiveStars,
    processedRecords: processed.reverse() // 返回最新的在前
  };
}

// ============================================
// 完整的一鍵獲取並分析腳本
// ============================================
async function fetchAndAnalyze(recordId) {
  const API_URL = "https://gmserver-api.aki-game2.net/gacha/record/query";
  
  // 從 URL 獲取參數（需要手動填入）
  const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
  
  const payload = {
    playerId: urlParams.get('player_id'),
    cardPoolId: urlParams.get('resources_id'),
    cardPoolType: parseInt(urlParams.get('gacha_type')) || 1,
    languageCode: urlParams.get('lang') || 'zh-Hant',
    recordId: urlParams.get('record_id'),
    serverId: urlParams.get('svr_id')
  };

  console.log("🛰️ 正在獲取資料...", payload);

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (result.code === 0 && result.data && result.data.length > 0) {
      console.log(`✅ 成功獲取 ${result.data.length} 筆資料！`);
      return analyzeGachaRecords(result.data);
    } else {
      console.error("❌ 無資料或錯誤:", result.message);
      return null;
    }
  } catch (err) {
    console.error("❌ 網路錯誤:", err);
    return null;
  }
}

// 導出供外部使用
window.analyzeGachaRecords = analyzeGachaRecords;
window.fetchAndAnalyze = fetchAndAnalyze;

console.log(`
🎮 鳴潮抽卡分析工具已載入！

使用方式 1 - 如果你已經有資料：
  analyzeGachaRecords(你的資料陣列)

使用方式 2 - 在抽卡紀錄頁面自動獲取：
  fetchAndAnalyze()
`);
