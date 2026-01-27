import React, { useState, useMemo } from 'react';
import { LineChart, Trophy, Info, ChevronLeft, ChevronRight, Copy, Check, Download, Terminal, Link, ExternalLink, Sparkles } from 'lucide-react';
import * as wuwaCalc from '../utils/gachaCalculator';
import * as genshinCalc from '../utils/genshinCalculator';

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
    powershellCommand: 'iwr -UseBasicParsing https://raw.githubusercontent.com/genshin-wishes/genshin-wishes-getlink/main/genshin-wishes-getlink.ps1 | iex',
    instructions: [
      '啟動遊戲並打開「祈願歷史紀錄」頁面',
      '打開 Windows PowerShell 並貼上下方指令執行',
      '複製獲取到的 URL 並貼到下方輸入框',
      '點擊「匯入資料」按鈕'
    ],
    docUrl: 'https://github.com/genshin-wishes/genshin-wishes-getlink',
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
    calculator: wuwaCalc  // 星鐵機制與鳴潮類似，暫時共用
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
const ImportPanel = ({ gameConfig, onImport }) => {
  const [copied, setCopied] = useState(false);
  const [inputUrl, setInputUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
    try {
      // TODO: 這裡之後會實作實際的 API 呼叫
      // const response = await fetch(inputUrl);
      // const data = await response.json();
      // onImport(data);
      
      // 目前先模擬延遲
      await new Promise(resolve => setTimeout(resolve, 1500));
      alert('匯入功能開發中！URL: ' + inputUrl);
    } catch (error) {
      console.error('匯入失敗:', error);
    } finally {
      setIsLoading(false);
    }
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
            onChange={(e) => setInputUrl(e.target.value)}
            placeholder="在這裡貼上連結..."
            className="w-full bg-slate-900 border border-slate-600 rounded-lg p-4 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition"
          />
        </div>

        {/* 匯入按鈕 */}
        <div className="flex justify-end">
          <button
            onClick={handleImport}
            disabled={!inputUrl.trim() || isLoading}
            className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-600 disabled:cursor-not-allowed text-slate-900 font-semibold rounded-lg transition"
          >
            <Download size={18} />
            {isLoading ? '匯入中...' : '匯入資料'}
          </button>
        </div>
      </div>
    </div>
  );
};

const GachaTracker = () => {
  const [currentGame, setCurrentGame] = useState('WutheringWaves');
  const [currentPage, setCurrentPage] = useState(1);
  const [showImportPanel, setShowImportPanel] = useState(true);
  const [isSimulatedData, setIsSimulatedData] = useState(true); // 追蹤是否為模擬資料
  const itemsPerPage = 10;

  const gameConfig = GAME_CONFIGS[currentGame];
  const calc = gameConfig.calculator;

  // 根據遊戲生成模擬資料
  const [gachaData, setGachaData] = useState(() => calc.simulateGacha(500));

  // 切換遊戲時重新生成模擬資料
  const handleGameChange = (gameKey) => {
    setCurrentGame(gameKey);
    setCurrentPage(1);
    const newCalc = GAME_CONFIGS[gameKey].calculator;
    setGachaData(newCalc.simulateGacha(500));
    setIsSimulatedData(true); // 切換遊戲時使用模擬資料
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

  const handleImport = (data) => {
    setGachaData(data);
    setShowImportPanel(false);
    setCurrentPage(1);
    setIsSimulatedData(false); // 匯入實際資料
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
        <ImportPanel gameConfig={gameConfig} onImport={handleImport} />
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
