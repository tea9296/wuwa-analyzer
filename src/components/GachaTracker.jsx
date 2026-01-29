import React, { useState, useMemo, useEffect } from 'react';
import { LineChart, Trophy, Info, ChevronLeft, ChevronRight, Copy, Check, Download, Terminal, Link, ExternalLink, Sparkles, AlertCircle, Loader2 } from 'lucide-react';
import * as wuwaCalc from '../utils/gachaCalculator';
import * as genshinCalc from '../utils/genshinCalculator';
import * as wuwaFetcher from '../utils/wuwaGachaFetcher';

// 各遊戲的匯入設定
const GAME_CONFIGS = {
  WutheringWaves: {
    name: '鳴潮',
    color: 'from-blue-400 to-purple-400',
    powershellCommand: 'iwr -UseBasicParsing -Headers @{"User-Agent"="Mozilla/5.0"} https://raw.githubusercontent.com/wuwatracker/wuwatracker/refs/heads/main/import.ps1 | iex',
    instructions: [
      '啟動遊戲並打開遊戲內的「唤取歷史紀錄」頁面',
      '打開 Windows PowerShell 並貼上下方指令執行',
      '複製獲取到的 URL 並貼到下方輸入框',
      '點擊「匯入資料」按鈕'
    ],
    docUrl: 'https://github.com/wuwatracker/wuwatracker',
    calculator: wuwaCalc
  },
  Genshin: {
    name: '原神',
    color: 'from-amber-400 to-orange-400',
    powershellCommand: 'Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex "&{$((New-Object System.Net.WebClient).DownloadString(\'https://gist.github.com/MadeBaruna/1d75c1d37d19eca71591ec8a31178235/raw/getlink.ps1\'))} global"',
    instructions: [
      '啟動遊戲並打開「祈願歷史紀錄」頁面',
      '打開 Windows PowerShell 並貼上下方指令執行',
      '複製獲取到的 URL 並貼到下方輸入框',
      '點擊「匯入資料」按鈕'
    ],
    docUrl: 'https://gist.github.com/MadeBaruna/1d75c1d37d19eca71591ec8a31178235',
    calculator: genshinCalc
  },
  StarRail: {
    name: '崩壞：星穹鐵道',
    color: 'from-purple-400 to-pink-400',
    powershellCommand: 'iwr -UseBasicParsing https://raw.githubusercontent.com/srliao/StarRailGachaGetter/master/StarRailGachaGetter.ps1 | iex',
    instructions: [
      '啟動遊戲並打開「躍遷歷史紀錄」頁面',
      '打開 Windows PowerShell 並貼上下方指令執行',
      '複製獲取到的 URL 並貼到下方輸入框',
      '點擊「匯入資料」按鈕'
    ],
    docUrl: 'https://github.com/srliao/StarRailGachaGetter',
    calculator: wuwaCalc  // 暫不開發
  }
};

// 預設使用鳴潮的模擬資料
const DEFAULT_MOCK_DATA = wuwaCalc.simulateGacha(500);

const StatCard = ({ title, value, unit, icon, color = "text-slate-100", subText, bgColor, borderColor }) => (
  <div className={`p-6 rounded-xl border shadow-lg ${bgColor || 'bg-slate-800'} ${borderColor || 'border-slate-700'}`}>
    <div className="flex justify-between items-center mb-4 text-slate-400">
      <span className="text-sm">{title}</span>
      {icon}
    </div>
    <div className={`text-3xl font-bold ${color}`}>
      {value} <span className="text-lg font-normal text-slate-500">{unit}</span>
    </div>
    {subText && <div className="mt-2 text-xs text-slate-500">{subText}</div>}
  </div>
);

// 顏色映射表
const COLOR_MAP = {
  'text-yellow-400': '#FACC15',
  'text-purple-400': '#A855F7',
  'text-cyan-400': '#22D3EE',
  'text-blue-400': '#3B82F6',
  'text-orange-400': '#FB923C',
  'text-slate-400': '#94A3B8',
  'text-rose-400': '#FB7185',
  'text-red-400': '#EF4444'
};

// 歐非排名儀表板組件
const LuckGauge = ({ percentile, luckRank, avgPullsPerLimited }) => {
  // 計算指針角度 (0% = -90deg, 100% = 90deg)
  const angle = -90 + (Math.min(percentile, 100) / 100) * 180;
  
  // 獲取指針顏色
  const needleColor = COLOR_MAP[luckRank.color] || '#3B82F6';
  
  // 格式化百分比顯示
  const displayPercentile = percentile < 1 
    ? percentile.toFixed(2) 
    : percentile < 10 
      ? percentile.toFixed(1) 
      : Math.round(percentile);
  
  return (
    <div className={`p-6 rounded-xl border shadow-lg bg-slate-800 ${luckRank.borderColor}`}>
      <div className="flex justify-between items-center mb-4 text-slate-400">
        <span className="text-sm">歐非運氣排名</span>
        <Sparkles size={20} className={luckRank.color} />
      </div>
      
      {/* 儀表板 */}
      <div className="relative w-full h-24 mb-2">
        <svg viewBox="0 0 200 110" className="w-full h-full">
          {/* 背景弧形 */}
          <path
            d="M 20 90 A 80 80 0 0 1 180 90"
            fill="none"
            stroke="#334155"
            strokeWidth="12"
            strokeLinecap="round"
          />
          {/* 顏色區段 - 8個等級，按百分比分布在半圓上 */}
          {/* 圓心(100,90) 半徑80，角度從180°(左)到0°(右) */}
          {/* Top 1-5% 歐皇降臨 (金) 5% = 9° */}
          <path d="M 20 90 A 80 80 0 0 1 21.0 77.5" fill="none" stroke="#FACC15" strokeWidth="12" strokeLinecap="round" />
          {/* Top 6-20% 氣運全開 (紫) 15% = 27° */}
          <path d="M 21.0 77.5 A 80 80 0 0 1 35.3 43.4" fill="none" stroke="#A855F7" strokeWidth="12" />
          {/* Top 21-35% 小有氣運 (青) 15% = 27° */}
          <path d="M 35.3 43.4 A 80 80 0 0 1 63.4 18.8" fill="none" stroke="#22D3EE" strokeWidth="12" />
          {/* Top 36-50% 正常發揮 (藍) 15% = 27° */}
          <path d="M 63.4 18.8 A 80 80 0 0 1 100 10" fill="none" stroke="#3B82F6" strokeWidth="12" />
          {/* Top 51-65% 運途坎坷 (橙) 15% = 27° */}
          <path d="M 100 10 A 80 80 0 0 1 136.6 18.8" fill="none" stroke="#FB923C" strokeWidth="12" />
          {/* Top 66-80% 非氣纏身 (灰) 15% = 27° */}
          <path d="M 136.6 18.8 A 80 80 0 0 1 164.7 43.4" fill="none" stroke="#94A3B8" strokeWidth="12" />
          {/* Top 81-95% 命運多舛 (玫紅) 15% = 27° */}
          <path d="M 164.7 43.4 A 80 80 0 0 1 179 77.5" fill="none" stroke="#FB7185" strokeWidth="12" />
          {/* Top 96-100% 大地之子 (紅) 5% = 9° */}
          <path d="M 179 77.5 A 80 80 0 0 1 180 90" fill="none" stroke="#EF4444" strokeWidth="12" strokeLinecap="round" />
          
          {/* 指針 */}
          <g transform={`rotate(${angle}, 100, 90)`}>
            <line x1="100" y1="90" x2="100" y2="40" stroke={needleColor} strokeWidth="3" strokeLinecap="round" />
            <circle cx="100" cy="90" r="6" fill={needleColor} />
            <circle cx="100" cy="90" r="3" fill="#1e293b" />
          </g>
        </svg>
      </div>
      
      {/* 排名顯示 */}
      <div className="text-center">
        <div className={`text-2xl font-bold ${luckRank.color}`}>
          Top {displayPercentile}%
        </div>
        <div className={`text-lg font-semibold ${luckRank.color} mt-1`}>
          {luckRank.title}
        </div>
        <div className="text-xs text-slate-400 mt-1">
          平均 {avgPullsPerLimited} 抽/限定 · {luckRank.description}
        </div>
      </div>
    </div>
  );
};

// 匯入資料面板組件
const ImportPanel = ({ gameConfig, currentGame, onImport }) => {
  const [copied, setCopied] = useState(false);
  const [inputUrl, setInputUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(gameConfig.powershellCommand);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('複製失敗:', err);
    }
  };

  const handleImport = async () => {
    if (!inputUrl.trim()) return;
    
    setIsLoading(true);
    setError('');
    setProgress(null);

    try {
      // 根據不同遊戲使用不同的匯入邏輯
      if (currentGame === 'WutheringWaves') {
        // 鳴潮：使用 wuwaGachaFetcher
        const fetchedData = await wuwaFetcher.fetchAllGachaRecords(
          inputUrl,
          (progressInfo) => {
            setProgress(progressInfo);
          }
        );

        if (fetchedData.totalCount === 0) {
          throw new Error('未找到任何抽卡紀錄，請確認 URL 是否正確');
        }

        // 轉換成 Tracker 可用的格式
        const trackerData = wuwaFetcher.convertToTrackerFormat(fetchedData);
        
        // 計算每筆紀錄的保底數
        const dataWithPity = calculatePityForRecords(trackerData, gameConfig.calculator);
        
        onImport(dataWithPity, {
          playerId: fetchedData.playerId,
          totalCount: fetchedData.totalCount,
          recordsByPool: fetchedData.recordsByPool
        });
      } else {
        // 其他遊戲暫時顯示開發中訊息
        await new Promise(resolve => setTimeout(resolve, 1500));
        setError(`${gameConfig.name} 的匯入功能開發中！`);
      }
    } catch (error) {
      console.error('匯入失敗:', error);
      setError(error.message || '匯入失敗，請檢查 URL 是否正確');
    } finally {
      setIsLoading(false);
      setProgress(null);
    }
  };

  // 計算每筆紀錄的保底數並判斷是否為限定
  const calculatePityForRecords = (records, calc) => {
    // 按時間排序（舊的在前）
    const sortedRecords = [...records].sort((a, b) => 
      new Date(a.time) - new Date(b.time)
    );

    // 常駐五星角色（很少變動）
    const STANDARD_FIVE_STAR_CHARACTERS = ['凌陽', '維里奈', '安可', '卡卡羅', '鑒心'];

    let pityCount = 0;
    const result = sortedRecords.map(record => {
      pityCount++;
      
      // 判斷是否為限定五星（只統計角色活動池）
      // 邏輯：角色活動池(1) + 不在常駐角色列表 = 限定
      let isLimited = false;
      if (record.rarity === 5 && record.poolType === 1) {
        isLimited = !STANDARD_FIVE_STAR_CHARACTERS.includes(record.name);
      }
      
      const recordWithPity = {
        ...record,
        pity: record.rarity === 5 ? pityCount : 0,
        isLimited
      };
      
      // 如果是五星，重置保底
      if (record.rarity === 5) {
        pityCount = 0;
      }
      
      return recordWithPity;
    });

    // 反轉回最新的在前面
    return result.reverse();
  };

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-lg mb-10 overflow-hidden">
      <div className="p-6 border-b border-slate-700">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Download size={20} />
          匯入抽卡資料
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          請按照以下步驟獲取你的抽卡紀錄
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* 步驟說明 */}
        <div className="space-y-4">
          {gameConfig.instructions.map((instruction, idx) => (
            <div key={idx} className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold shrink-0">
                {idx + 1}
              </div>
              <p className="text-slate-300 pt-1">{instruction}</p>
            </div>
          ))}
        </div>

        {/* PowerShell 指令區塊 */}
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-2 text-slate-400 text-sm">
            <Terminal size={16} />
            <span>PowerShell 指令</span>
          </div>
          <div className="relative">
            <div className="bg-slate-900 border border-slate-600 rounded-lg p-4 pr-12 font-mono text-sm text-blue-300 overflow-x-auto">
              {gameConfig.powershellCommand}
            </div>
            <button
              onClick={handleCopy}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-slate-700 rounded transition"
              title="複製指令"
            >
              {copied ? <Check size={18} className="text-green-400" /> : <Copy size={18} className="text-slate-400" />}
            </button>
          </div>
          <p className="text-slate-500 text-xs mt-2 flex items-center gap-1">
            <Info size={12} />
            程式不會修改您的任何檔案，只會從紀錄中擷取紀錄連結
            <a 
              href={gameConfig.docUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline inline-flex items-center gap-1 ml-1"
            >
              查看原始碼 <ExternalLink size={10} />
            </a>
          </p>
        </div>

        {/* URL 輸入框 */}
        <div>
          <div className="flex items-center gap-2 mb-2 text-slate-400 text-sm">
            <Link size={16} />
            <span>在這裡貼上連結</span>
          </div>
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => {
              setInputUrl(e.target.value);
              setError(''); // 清除錯誤訊息
            }}
            placeholder="在這裡貼上連結..."
            className={`w-full bg-slate-900 border rounded-lg p-4 text-slate-100 placeholder:text-slate-500 focus:outline-none transition ${
              error ? 'border-red-500 focus:border-red-400' : 'border-slate-600 focus:border-blue-500'
            }`}
          />
        </div>

        {/* 錯誤訊息 */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400">
            <AlertCircle size={18} />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* 進度顯示 */}
        {isLoading && progress && (
          <div className="flex items-center gap-3 p-3 bg-blue-500/20 border border-blue-500/50 rounded-lg text-blue-400">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">
              正在獲取 {progress.currentPool}... ({progress.current + 1}/{progress.total})
            </span>
          </div>
        )}

        {/* 匯入按鈕 */}
        <div className="flex justify-end">
          <button
            onClick={handleImport}
            disabled={!inputUrl.trim() || isLoading}
            className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-600 disabled:cursor-not-allowed text-slate-900 font-semibold rounded-lg transition"
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                匯入中...
              </>
            ) : (
              <>
                <Download size={18} />
                匯入資料
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// localStorage key 常數
const STORAGE_KEYS = {
  WutheringWaves: 'wuwa_gacha_data',
  Genshin: 'genshin_gacha_data',
  StarRail: 'starrail_gacha_data',
};

const GachaTracker = () => {
  const [currentGame, setCurrentGame] = useState('WutheringWaves');
  const [currentPage, setCurrentPage] = useState(1);
  const [showImportPanel, setShowImportPanel] = useState(true);
  const [isSimulatedData, setIsSimulatedData] = useState(true); // 追蹤是否為模擬資料
  const itemsPerPage = 10;

  const gameConfig = GAME_CONFIGS[currentGame];
  const calc = gameConfig.calculator;

  // 從 localStorage 讀取已保存的資料，沒有則使用模擬資料
  const [gachaData, setGachaData] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.WutheringWaves);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('讀取 localStorage 失敗:', e);
    }
    return calc.simulateGacha(500);
  });

  // 初始化時檢查是否有已保存的資料
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS[currentGame]);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) {
          setIsSimulatedData(false);
          setShowImportPanel(false);
        }
      }
    } catch (e) {
      console.warn('檢查 localStorage 失敗:', e);
    }
  }, []);

  // 切換遊戲時讀取該遊戲的已保存資料，沒有則使用模擬資料
  const handleGameChange = (gameKey) => {
    setCurrentGame(gameKey);
    setCurrentPage(1);
    const newCalc = GAME_CONFIGS[gameKey].calculator;
    
    try {
      const saved = localStorage.getItem(STORAGE_KEYS[gameKey]);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) {
          setGachaData(parsed);
          setIsSimulatedData(false);
          setShowImportPanel(false);
          return;
        }
      }
    } catch (e) {
      console.warn('讀取 localStorage 失敗:', e);
    }
    
    setGachaData(newCalc.simulateGacha(500));
    setIsSimulatedData(true);
    setShowImportPanel(true);
  };

  // --- 使用對應遊戲的計算工具 ---
  const stats = useMemo(() => {
    return calc.calculateGachaStats(gachaData);
  }, [gachaData, calc]);

  // --- 分頁邏輯 ---
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = gachaData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(gachaData.length / itemsPerPage);

  // 儲存匯入的元資料 (玩家ID, 各卡池統計等)
  const [importMeta, setImportMeta] = useState(null);

  const handleImport = (data, metadata = null) => {
    setGachaData(data);
    setImportMeta(metadata);
    setShowImportPanel(false);
    setCurrentPage(1);
    setIsSimulatedData(false); // 匯入實際資料
    
    // 保存到 localStorage
    try {
      localStorage.setItem(STORAGE_KEYS[currentGame], JSON.stringify(data));
      if (metadata) {
        localStorage.setItem(`${STORAGE_KEYS[currentGame]}_meta`, JSON.stringify(metadata));
      }
    } catch (e) {
      console.warn('保存到 localStorage 失敗:', e);
    }
  };

  // 清除已保存的資料
  const handleClearData = () => {
    if (window.confirm('確定要清除已保存的抽卡紀錄嗎？此操作無法復原。')) {
      try {
        localStorage.removeItem(STORAGE_KEYS[currentGame]);
        localStorage.removeItem(`${STORAGE_KEYS[currentGame]}_meta`);
      } catch (e) {
        console.warn('清除 localStorage 失敗:', e);
      }
      setGachaData(calc.simulateGacha(500));
      setImportMeta(null);
      setIsSimulatedData(true);
      setShowImportPanel(true);
      setCurrentPage(1);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 font-sans">
      {/* 頂部導航 */}
      <div className="flex flex-wrap gap-4 mb-8">
        {Object.entries(GAME_CONFIGS).map(([key, config]) => (
          <button 
            key={key}
            onClick={() => handleGameChange(key)}
            className={`px-4 py-2 rounded-full transition font-medium ${
              currentGame === key 
                ? `bg-gradient-to-r ${config.color} text-slate-900` 
                : 'bg-slate-800 hover:bg-slate-700'
            }`}
          >
            {config.name}
          </button>
        ))}
      </div>

      <header className="mb-10">
        <h1 className={`text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r ${gameConfig.color}`}>
          {gameConfig.name} - 抽卡數據分析面板
        </h1>
      </header>

      {/* 模擬資料提示 */}
      {isSimulatedData && (
        <div className="mb-6 p-4 bg-amber-500/20 border border-amber-500/50 rounded-lg flex items-start gap-3">
          <Info size={20} className="text-amber-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-amber-400">目前顯示為模擬資料</div>
            <div className="text-sm text-amber-200/80 mt-1">
              這是系統隨機生成的測試資料，僅供預覽介面使用。請使用下方「匯入資料」功能載入您的實際抽卡紀錄。
            </div>
          </div>
        </div>
      )}

      {/* 已匯入資料提示 */}
      {!isSimulatedData && (
        <div className="mb-6 p-4 bg-green-500/20 border border-green-500/50 rounded-lg flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <Check size={20} className="text-green-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-green-400">已載入實際抽卡紀錄</div>
              <div className="text-sm text-green-200/80 mt-1">
                共 {gachaData.length} 筆紀錄{importMeta?.playerId && `，玩家 ID: ${importMeta.playerId}`}
                <span className="text-green-300/60 ml-2">（資料已自動保存）</span>
              </div>
            </div>
          </div>
          <button
            onClick={handleClearData}
            className="text-sm text-red-400 hover:text-red-300 transition shrink-0"
          >
            清除資料
          </button>
        </div>
      )}

      {/* 匯入面板切換按鈕 */}
      <button
        onClick={() => setShowImportPanel(!showImportPanel)}
        className="mb-6 flex items-center gap-2 text-slate-400 hover:text-slate-200 transition"
      >
        <Download size={16} />
        {showImportPanel ? '隱藏匯入面板' : '顯示匯入面板'}
      </button>

      {/* 匯入資料面板 */}
      {showImportPanel && (
        <ImportPanel 
          gameConfig={gameConfig} 
          currentGame={currentGame}
          onImport={handleImport} 
        />
      )}

      {/* 數據卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <StatCard 
          title="平均幾抽一五星" 
          value={stats.avgPullsPerFiveStar} 
          unit="抽" 
          icon={<LineChart size={20}/>}
          subText={`理論期望: ${calc.getExpectedPullsForFiveStar().toFixed(1)} 抽`}
        />
        <StatCard 
          title="平均幾抽限定" 
          value={stats.avgPullsPerLimited} 
          unit="抽" 
          icon={<Trophy size={20}/>}
          subText={`理論期望: ${calc.getExpectedPullsForLimited().toFixed(1)} 抽`}
        />
        <StatCard 
          title="小保不歪率" 
          value={`${stats.winRate}%`} 
          icon={<Info size={20}/>}
          subText="理論機率: 50%"
          color={parseFloat(stats.winRate) >= 50 ? 'text-green-400' : 'text-slate-100'}
        />
        <LuckGauge 
          percentile={stats.luckPercentile} 
          luckRank={stats.luckRank}
          avgPullsPerLimited={stats.avgPullsPerLimited}
        />
      </div>

      {/* 抽卡紀錄表格 */}
      <div className="bg-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-6 border-b border-slate-700 flex justify-between items-center">
          <h2 className="text-xl font-semibold">詳細紀錄</h2>
          <span className="text-slate-400 text-sm">總共 {stats.totalPulls} 抽</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-700/50 text-slate-400 text-sm">
              <tr>
                <th className="p-4">名稱</th>
                <th className="p-4">類型</th>
                <th className="p-4">星級</th>
                <th className="p-4">累積抽數</th>
                <th className="p-4">時間</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.map((item, idx) => (
                <tr key={idx} className="border-b border-slate-700 hover:bg-slate-700/30 transition">
                  <td className={`p-4 font-medium ${item.rarity === 5 ? 'text-yellow-500' : item.rarity === 4 ? 'text-purple-400' : ''}`}>
                    {item.name}
                  </td>
                  <td className="p-4 text-slate-400 text-sm">{item.type}</td>
                  <td className="p-4">
                    <div className="flex">
                      {Array.from({length: item.rarity}).map((_, i) => (
                        <span key={i} className="text-yellow-500">★</span>
                      ))}
                    </div>
                  </td>
                  <td className="p-4 font-mono">{item.pity}</td>
                  <td className="p-4 text-slate-500 text-xs">{item.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 分頁控制 */}
        <div className="p-4 flex justify-between items-center bg-slate-800">
          <button 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => p - 1)}
            className="p-2 disabled:opacity-30 hover:bg-slate-700 rounded"
          >
            <ChevronLeft />
          </button>
          <span className="text-sm text-slate-400">頁碼 {currentPage} / {totalPages}</span>
          <button 
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(p => p + 1)}
            className="p-2 disabled:opacity-30 hover:bg-slate-700 rounded"
          >
            <ChevronRight />
          </button>
        </div>
      </div>
    </div>
  );
};

export default GachaTracker;
