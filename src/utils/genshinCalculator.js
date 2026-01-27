// 原神抽卡機率計算工具

/**
 * 計算第 n 抽出五星的機率 (軟保底機制)
 * @param {number} n - 當前抽數 (1-90)
 * @returns {number} - 出五星的機率
 */
export const getFiveStarProbability = (n) => {
  if (n <= 0) return 0;
  if (n <= 73) return 0.006;  // 0.6%
  if (n <= 89) return 0.006 + 0.06 * (n - 73);  // 0.6% + 6%×(n-73)
  return 1; // 第 90 抽必出
};

/**
 * 計算在第 n 抽「首次」出五星的機率 (之前都沒出)
 * P(首次在第n抽出金) = P(前n-1抽都沒出) × P(第n抽出)
 * @param {number} n - 抽數
 * @returns {number} - 首次在第 n 抽出金的機率
 */
export const getFirstFiveStarAtN = (n) => {
  let probNotGettingBefore = 1;
  for (let i = 1; i < n; i++) {
    probNotGettingBefore *= (1 - getFiveStarProbability(i));
  }
  return probNotGettingBefore * getFiveStarProbability(n);
};

/**
 * 預先計算所有抽數的首次出金機率分佈 (用於效能優化)
 */
export const generateProbabilityDistribution = () => {
  const distribution = [];
  for (let n = 1; n <= 90; n++) {
    distribution.push({
      pull: n,
      probability: getFirstFiveStarAtN(n),
      fiveStarRate: getFiveStarProbability(n)
    });
  }
  return distribution;
};

/**
 * 計算累積分佈函數 (CDF)
 * 在 n 抽或更少出五星的累積機率
 * @param {number} n - 抽數
 * @returns {number} - 累積機率
 */
export const getCumulativeProbability = (n) => {
  let cumulative = 0;
  for (let i = 1; i <= Math.min(n, 90); i++) {
    cumulative += getFirstFiveStarAtN(i);
  }
  return Math.min(cumulative, 1);
};

/**
 * 計算理論期望抽數 (平均需要幾抽出一個五星)
 * E[X] = Σ n × P(首次在第n抽)
 * @returns {number} - 期望抽數 (約 62.5)
 */
export const getExpectedPullsForFiveStar = () => {
  let expected = 0;
  for (let n = 1; n <= 90; n++) {
    expected += n * getFirstFiveStarAtN(n);
  }
  return expected;
};

/**
 * 計算 UP 限定五星的理論期望抽數
 * 原神大保底機制（標準版）：
 * - 50% 直接出 UP
 * - 50% 歪常駐，下一個必定 UP
 * 
 * E[五星數量] = 1×0.5 + 2×0.5 = 1.5
 * 
 * @returns {number} - 期望抽數 (約 90.31)
 */
export const getExpectedPullsForLimited = () => {
  // 期望需要 1.5 個五星才能拿到一個 UP
  return getExpectedPullsForFiveStar() * 1.5;
};

// 為了向後兼容
export const getExpectedPulls = getExpectedPullsForFiveStar;

/**
 * 預先計算首次出五星機率表（用於 CDF 計算）
 */
const precomputeFirstFiveStarProb = () => {
  const probs = [0]; // index 0 不用
  for (let n = 1; n <= 90; n++) {
    probs[n] = getFirstFiveStarAtN(n);
  }
  return probs;
};

/**
 * 計算 UP 限定五星的累積分佈函數 (CDF)
 * 標準大保底機制：50% UP，50% 歪了下一個必 UP
 * @param {number} targetPulls - 目標抽數
 * @returns {number} - 累積機率百分比 (0-100)
 */
export const getLimitedCumulativeProbability = (targetPulls) => {
  if (targetPulls <= 0) return 0;
  if (targetPulls >= 180) return 99.9; // 最差情況：大保底 = 90×2 = 180
  
  const firstFiveStarProb = precomputeFirstFiveStarProb();
  
  let totalProb = 0;
  
  // 情況1: 第1個五星就是UP (50%)
  for (let i = 1; i <= Math.min(targetPulls, 90); i++) {
    totalProb += firstFiveStarProb[i] * 0.5;
  }
  
  // 情況2: 歪1次，第2個五星必定是UP (50%)
  for (let i = 1; i <= Math.min(targetPulls, 90); i++) {
    const probFirstWrong = firstFiveStarProb[i] * 0.5; // 第1個歪
    const remaining = targetPulls - i;
    
    if (remaining > 0) {
      // 第2個五星必定是 UP
      let probSecondWithin = 0;
      for (let j = 1; j <= Math.min(remaining, 90); j++) {
        probSecondWithin += firstFiveStarProb[j];
      }
      totalProb += probFirstWrong * probSecondWithin;
    }
  }
  
  return Math.min(totalProb * 100, 99.9);
};

/**
 * 計算歐非排名百分比 (基於 UP 限定五星)
 * @param {number} avgPullsPerLimited - 玩家的平均限定抽數
 * @returns {number} - 排名百分比 (0.1-99.9，越小越歐)
 */
export const calculateLuckPercentile = (avgPullsPerLimited) => {
  if (avgPullsPerLimited <= 0) return 50;
  if (avgPullsPerLimited <= 1) return 0.3;
  if (avgPullsPerLimited >= 360) return 99.9;
  
  return getLimitedCumulativeProbability(avgPullsPerLimited);
};

/**
 * 根據排名百分比獲取稱號和顏色
 * @param {number} percentile - 排名百分比
 * @returns {object} - { title, color, description }
 */
export const getLuckRank = (percentile) => {
  if (percentile <= 5) {
    return {
      title: '歐皇降臨',
      description: '天選之人',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-400/20',
      borderColor: 'border-yellow-400/50'
    };
  }
  if (percentile <= 20) {
    return {
      title: '氣運全開',
      description: '運氣極好',
      color: 'text-purple-400',
      bgColor: 'bg-purple-400/20',
      borderColor: 'border-purple-400/50'
    };
  }
  if (percentile <= 35) {
    return {
      title: '小有氣運',
      description: '運氣不錯',
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-400/20',
      borderColor: 'border-cyan-400/50'
    };
  }
  if (percentile <= 50) {
    return {
      title: '正常發揮',
      description: '提瓦特水平',
      color: 'text-blue-400',
      bgColor: 'bg-blue-400/20',
      borderColor: 'border-blue-400/50'
    };
  }
  if (percentile <= 65) {
    return {
      title: '運途坎坷',
      description: '略顯曲折',
      color: 'text-orange-400',
      bgColor: 'bg-orange-400/20',
      borderColor: 'border-orange-400/50'
    };
  }
  if (percentile <= 80) {
    return {
      title: '非氣纏身',
      description: '急需改運',
      color: 'text-slate-400',
      bgColor: 'bg-slate-400/20',
      borderColor: 'border-slate-400/50'
    };
  }
  if (percentile <= 95) {
    return {
      title: '命運多舛',
      description: '保底戰士',
      color: 'text-rose-400',
      bgColor: 'bg-rose-400/20',
      borderColor: 'border-rose-400/50'
    };
  }
  return {
    title: '大地之子',
    description: '究極非酋',
    color: 'text-red-400',
    bgColor: 'bg-red-400/20',
    borderColor: 'border-red-400/50'
  };
};

/**
 * 計算四星機率
 * 基礎機率 5.1%，第 10 抽保底必出
 * @param {number} pityCount - 距離上次四星的抽數
 * @returns {number} - 出四星的機率
 */
export const getFourStarProbability = (pityCount) => {
  if (pityCount >= 10) return 1;
  return 0.051;
};

/**
 * 計算綜合統計數據
 * @param {Array} gachaData - 抽卡紀錄
 * @returns {Object} - 統計數據
 */
export const calculateGachaStats = (gachaData) => {
  if (!gachaData || gachaData.length === 0) {
    return {
      totalPulls: 0,
      fiveStarCount: 0,
      limitedFiveStarCount: 0,
      avgPullsPerFiveStar: 0,
      avgPullsPerLimited: 0,
      winRate: 0,
      luckPercentile: 50,
      luckRank: getLuckRank(50),
      theoreticalExpectedFiveStar: getExpectedPullsForFiveStar().toFixed(1),
      theoreticalExpectedLimited: getExpectedPullsForLimited().toFixed(1)
    };
  }

  const totalPulls = gachaData.length;
  const fiveStars = gachaData.filter(item => item.rarity === 5);
  const fiveStarCount = fiveStars.length;
  
  const limitedFiveStars = fiveStars.filter(item => 
    item.name?.includes('限定') || item.isLimited === true
  );
  const limitedFiveStarCount = limitedFiveStars.length;

  let avgPullsPerFiveStar = 0;
  if (fiveStarCount > 0) {
    const pitySum = fiveStars.reduce((sum, item) => sum + (item.pity || 0), 0);
    avgPullsPerFiveStar = pitySum / fiveStarCount;
  }

  let avgPullsPerLimited = 0;
  if (limitedFiveStarCount > 0) {
    let pullsForLimiteds = [];
    let accumulatedPulls = 0;
    
    for (const star of fiveStars) {
      accumulatedPulls += (star.pity || 0);
      if (star.name?.includes('限定') || star.isLimited === true) {
        pullsForLimiteds.push(accumulatedPulls);
        accumulatedPulls = 0;
      }
    }
    
    if (pullsForLimiteds.length > 0) {
      avgPullsPerLimited = pullsForLimiteds.reduce((a, b) => a + b, 0) / pullsForLimiteds.length;
    }
  }

  const winRate = fiveStarCount > 0 
    ? (limitedFiveStarCount / fiveStarCount) * 100 
    : 0;

  const luckPercentile = calculateLuckPercentile(avgPullsPerLimited);
  const luckRank = getLuckRank(luckPercentile);

  return {
    totalPulls,
    fiveStarCount,
    limitedFiveStarCount,
    avgPullsPerFiveStar: avgPullsPerFiveStar.toFixed(1),
    avgPullsPerLimited: avgPullsPerLimited.toFixed(1),
    winRate: winRate.toFixed(1),
    luckPercentile,
    luckRank,
    theoreticalExpectedFiveStar: getExpectedPullsForFiveStar().toFixed(1),
    theoreticalExpectedLimited: getExpectedPullsForLimited().toFixed(1)
  };
};

/**
 * 模擬抽卡數據（測試用）
 * @param {number} totalPulls - 總抽數
 * @returns {Array} - 模擬的抽卡紀錄
 */
export const simulateGacha = (totalPulls) => {
  const results = [];
  let pity = 0;
  let guaranteed = false; // 是否有大保底（上一個歪了）
  
  for (let i = 0; i < totalPulls; i++) {
    pity++;
    const prob = getFiveStarProbability(pity);
    
    if (Math.random() < prob) {
      // 判斷是否為限定
      let isLimited;
      if (guaranteed) {
        isLimited = true; // 大保底必出 UP
      } else {
        isLimited = Math.random() < 0.5; // 50% UP
      }
      
      results.push({
        index: i + 1,
        rarity: 5,
        name: isLimited ? '限定角色' : '常駐角色',
        isLimited,
        pity
      });
      
      // 更新大保底狀態
      guaranteed = !isLimited;
      pity = 0;
    } else {
      results.push({
        index: i + 1,
        rarity: Math.random() < 0.051 ? 4 : 3,
        name: Math.random() < 0.051 ? '四星' : '三星',
        isLimited: false,
        pity: 0
      });
    }
  }
  
  return results;
};
