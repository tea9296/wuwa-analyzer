// 鳴潮抽卡機率計算工具

/**
 * 計算第 n 抽出五星的機率 (軟保底機制)
 * @param {number} n - 當前抽數 (1-79)
 * @returns {number} - 出五星的機率
 */
export const getFiveStarProbability = (n) => {
  if (n <= 0) return 0;
  if (n <= 65) return 0.008;
  if (n <= 70) return 0.008 + 0.04 * (n - 65);  // 0.048, 0.088, 0.128, 0.168, 0.208
  if (n <= 75) return 0.208 + 0.08 * (n - 70);  // 0.288, 0.368, 0.448, 0.528, 0.608
  if (n <= 78) return 0.608 + 0.10 * (n - 75);  // 0.708, 0.808, 0.908
  return 1; // 第 79 抽必出
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
  for (let n = 1; n <= 79; n++) {
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
  for (let i = 1; i <= Math.min(n, 79); i++) {
    cumulative += getFirstFiveStarAtN(i);
  }
  return Math.min(cumulative, 1);
};

/**
 * 計算理論期望抽數 (平均需要幾抽出一個五星)
 * E[X] = Σ n × P(首次在第n抽)
 * @returns {number} - 期望抽數
 */
export const getExpectedPullsForFiveStar = () => {
  let expected = 0;
  for (let n = 1; n <= 79; n++) {
    expected += n * getFirstFiveStarAtN(n);
  }
  return expected;
};

/**
 * 計算 UP 限定五星的理論期望抽數
 * 考慮大保底機制：50% 直接出 UP，50% 歪了下一個必出 UP
 * E[UP] = E[五星] × 1.5
 * @returns {number} - 期望抽數 (約 81.15)
 */
export const getExpectedPullsForLimited = () => {
  return getExpectedPullsForFiveStar() * 1.5;
};

// 為了向後兼容
export const getExpectedPulls = getExpectedPullsForFiveStar;

/**
 * 計算 UP 限定五星的累積分佈函數 (CDF)
 * 使用 getFiveStarProbability 精確計算，考慮大保底機制
 * @param {number} targetPulls - 目標抽數
 * @returns {number} - 累積機率百分比 (0-100)
 */
export const getLimitedCumulativeProbability = (targetPulls) => {
  if (targetPulls <= 0) return 0;
  if (targetPulls >= 158) return 99.9;
  
  // 預先計算每個抽數首次出五星的機率
  const firstFiveStarProb = [];
  for (let n = 1; n <= 79; n++) {
    firstFiveStarProb[n] = getFirstFiveStarAtN(n);
  }
  
  // 計算在 targetPulls 抽內獲得 UP 限定的機率
  // 情況1: 第一個五星就是 UP (50%)
  // 情況2: 第一個五星歪了 (50%)，然後第二個五星必定是 UP
  
  let totalProb = 0;
  
  // 情況1: 第一個五星在第 i 抽出，且是 UP (機率 50%)
  for (let i = 1; i <= Math.min(targetPulls, 79); i++) {
    totalProb += firstFiveStarProb[i] * 0.5;
  }
  
  // 情況2: 第一個五星在第 i 抽歪了，第二個五星在第 j 抽出 (必定 UP)
  for (let i = 1; i <= Math.min(targetPulls, 79); i++) {
    // 第一個五星歪的機率
    const probFirstWrong = firstFiveStarProb[i] * 0.5;
    
    // 第二個五星需要在剩餘 (targetPulls - i) 抽內出
    const remainingPulls = targetPulls - i;
    
    if (remainingPulls > 0) {
      // 第二輪的 pity 從 1 開始重新計算
      let probSecondWithin = 0;
      for (let j = 1; j <= Math.min(remainingPulls, 79); j++) {
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
  if (avgPullsPerLimited <= 1) return 0.27;
  if (avgPullsPerLimited >= 158) return 99.9;
  
  return getLimitedCumulativeProbability(avgPullsPerLimited);
};

/**
 * 根據排名百分比獲取稱號和顏色
 * @param {number} percentile - 排名百分比
 * @returns {object} - { title, color, description }
 */
export const getLuckRank = (percentile) => {
  // Top 1-5% | 歐皇降臨
  if (percentile <= 5) {
    return {
      title: '歐皇降臨',
      description: '天選之人',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-400/20',
      borderColor: 'border-yellow-400/50'
    };
  }
  // Top 6-20% | 氣運全開
  if (percentile <= 20) {
    return {
      title: '氣運全開',
      description: '運氣極好',
      color: 'text-purple-400',
      bgColor: 'bg-purple-400/20',
      borderColor: 'border-purple-400/50'
    };
  }
  // Top 21-35% | 小有氣運 (新增)
  if (percentile <= 35) {
    return {
      title: '小有氣運',
      description: '運氣不錯',
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-400/20',
      borderColor: 'border-cyan-400/50'
    };
  }
  // Top 36-50% | 正常發揮
  if (percentile <= 50) {
    return {
      title: '正常發揮',
      description: '亞洲水平',
      color: 'text-blue-400',
      bgColor: 'bg-blue-400/20',
      borderColor: 'border-blue-400/50'
    };
  }
  // Top 51-65% | 運途坎坷 (新增)
  if (percentile <= 65) {
    return {
      title: '運途坎坷',
      description: '略顯曲折',
      color: 'text-orange-400',
      bgColor: 'bg-orange-400/20',
      borderColor: 'border-orange-400/50'
    };
  }
  // Top 66-80% | 非氣纏身
  if (percentile <= 80) {
    return {
      title: '非氣纏身',
      description: '急需改運',
      color: 'text-slate-400',
      bgColor: 'bg-slate-400/20',
      borderColor: 'border-slate-400/50'
    };
  }
  // Top 81-95% | 命運多舛
  if (percentile <= 95) {
    return {
      title: '命運多舛',
      description: '保底戰士',
      color: 'text-rose-400',
      bgColor: 'bg-rose-400/20',
      borderColor: 'border-rose-400/50'
    };
  }
  // Top 96-100% | 大地之子
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
 * 基礎機率 6%，第 10 抽保底必出
 * @param {number} pityCount - 距離上次四星的抽數
 * @returns {number} - 出四星的機率
 */
export const getFourStarProbability = (pityCount) => {
  if (pityCount >= 10) return 1;
  return 0.06;
};

/**
 * 從抽卡紀錄計算統計數據
 * @param {Array} gachaData - 抽卡紀錄陣列
 * @returns {object} - 統計結果
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
  
  // 計算限定五星 (名字包含「限定」或 isLimited 為 true)
  const limitedFiveStars = fiveStars.filter(item => 
    item.name?.includes('限定') || item.isLimited === true
  );
  const limitedFiveStarCount = limitedFiveStars.length;

  // 計算平均出五星抽數
  // 方法：用每個五星的 pity 值（距離上一個五星的抽數）的平均值
  let avgPullsPerFiveStar = 0;
  if (fiveStarCount > 0) {
    const pitySum = fiveStars.reduce((sum, item) => sum + (item.pity || 0), 0);
    avgPullsPerFiveStar = pitySum / fiveStarCount;
  }

  // 計算平均幾抽一個限定
  // 正確方法：計算每個限定五星花了多少抽（包含歪掉重抽的）
  // 將五星按順序排列，計算每個限定到上一個限定之間的總抽數
  let avgPullsPerLimited = 0;
  if (limitedFiveStarCount > 0) {
    // 方法：累加從上一個限定到這個限定之間所有五星的 pity 值
    let pullsForLimiteds = [];
    let accumulatedPulls = 0;
    
    for (const star of fiveStars) {
      accumulatedPulls += (star.pity || 0);
      if (star.name?.includes('限定') || star.isLimited === true) {
        pullsForLimiteds.push(accumulatedPulls);
        accumulatedPulls = 0; // 重置累計
      }
    }
    
    if (pullsForLimiteds.length > 0) {
      avgPullsPerLimited = pullsForLimiteds.reduce((a, b) => a + b, 0) / pullsForLimiteds.length;
    }
  }

  // 小保不歪率（限定佔五星總數的比例）
  // 理論上是 50%，實際可能會有偏差
  const winRate = fiveStarCount > 0 
    ? (limitedFiveStarCount / fiveStarCount) * 100 
    : 0;

  // 計算歐非排名 (基於 UP 限定五星的平均抽數)
  const luckPercentile = calculateLuckPercentile(avgPullsPerLimited);
  const luckRank = getLuckRank(luckPercentile);

  return {
    totalPulls,
    fiveStarCount,
    limitedFiveStarCount,
    avgPullsPerFiveStar: avgPullsPerFiveStar.toFixed(1),
    avgPullsPerLimited: avgPullsPerLimited.toFixed(1),
    winRate: winRate.toFixed(1),
    luckPercentile,  // 精確百分比，不四捨五入
    luckRank,
    theoreticalExpectedFiveStar: getExpectedPullsForFiveStar().toFixed(1),
    theoreticalExpectedLimited: getExpectedPullsForLimited().toFixed(1)
  };
};

/**
 * 模擬抽卡（用於測試）
 * @param {number} pulls - 模擬抽數
 * @returns {Array} - 模擬的抽卡結果
 */
export const simulateGacha = (pulls) => {
  const results = [];
  let currentPity = 0;
  let isGuaranteed = false; // 大保底狀態

  for (let i = 0; i < pulls; i++) {
    currentPity++;
    const prob = getFiveStarProbability(currentPity);
    const roll = Math.random();

    if (roll < prob) {
      // 出五星
      const isLimited = isGuaranteed || Math.random() < 0.5;
      results.push({
        id: i,
        name: isLimited ? "限定5★角色" : "常駐5★角色",
        type: "Character",
        rarity: 5,
        pity: currentPity,
        isLimited,
        time: new Date().toISOString()
      });
      
      // 重置保底計數
      currentPity = 0;
      // 如果這次歪了（出常駐），下次大保底
      isGuaranteed = !isLimited;
    } else {
      // 沒出五星，判斷四星
      const fourStarRoll = Math.random();
      if (fourStarRoll < 0.06 || currentPity % 10 === 0) {
        results.push({
          id: i,
          name: "4★角色/武器",
          type: Math.random() < 0.5 ? "Character" : "Weapon",
          rarity: 4,
          pity: 0,
          time: new Date().toISOString()
        });
      } else {
        results.push({
          id: i,
          name: "3★武器",
          type: "Weapon",
          rarity: 3,
          pity: 0,
          time: new Date().toISOString()
        });
      }
    }
  }

  return results;
};

// 預先計算的常數
export const THEORETICAL_EXPECTED_PULLS = getExpectedPulls();
export const PROBABILITY_DISTRIBUTION = generateProbabilityDistribution();

// 除錯用：打印機率分佈表
export const printProbabilityTable = () => {
  console.log('=== 五星機率分佈表 ===');
  console.log('抽數\t單抽機率\t首次出金機率\t累積機率');
  for (let n = 1; n <= 79; n++) {
    if (n <= 5 || n >= 60) {
      console.log(`${n}\t${(getFiveStarProbability(n) * 100).toFixed(2)}%\t\t${(getFirstFiveStarAtN(n) * 100).toFixed(4)}%\t\t${(getCumulativeProbability(n) * 100).toFixed(2)}%`);
    }
  }
  console.log(`\n理論期望抽數: ${THEORETICAL_EXPECTED_PULLS.toFixed(2)} 抽`);
};
