import React, { useState, useEffect, useMemo } from 'react';
import liff from '@line/liff';

const GAS_URL = import.meta.env.VITE_GAS_URL;
const LIFF_ID = import.meta.env.VITE_LIFF_ID;

function App() {
  const [currentTab, setCurrentTab] = useState('items'); 
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grouped'); // 預設改為分組視圖
  const [expandedCategories, setExpandedCategories] = useState({});
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false); // 新增設定彈窗狀態
  const [selectedItemForDetail, setSelectedItemForDetail] = useState(null);
  const [itemLogs, setItemLogs] = useState([]);
  const [isLogAdding, setIsLogAdding] = useState(false);
  const [newLog, setNewLog] = useState({ type: '維修', detail: '', date: new Date().toISOString().split('T')[0] });

  const [newItem, setNewItem] = useState({
    name: '',
    model: '',
    category: '',
    status: '',
    purchase_date: new Date().toISOString().split('T')[0],
    description: '',
    thumbnail: ''
  });

  // 通用 Select 樣式
  const selectStyle = {
    backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%236b7280\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")',
    backgroundSize: '1.25em',
    backgroundPosition: 'right 0.75rem center',
    backgroundRepeat: 'no-repeat'
  };

  // 初始化 LIFF 與取得初始資料
  useEffect(() => {
    const initApp = async () => {
      setLoading(true);
      try {
        const [liffResult, itemsRes, catsRes, statsRes] = await Promise.allSettled([
          liff.init({ liffId: LIFF_ID }).then(async () => {
            if (liff.isLoggedIn()) {
              return await liff.getProfile();
            } else {
              liff.login();
              return null;
            }
          }),
          fetch(`${GAS_URL}?action=getItems&t=${Date.now()}`).then(res => res.json()),
          fetch(`${GAS_URL}?action=getCategories&t=${Date.now()}`).then(res => res.json()),
          fetch(`${GAS_URL}?action=getStatuses&t=${Date.now()}`).then(res => res.json())
        ]);

        if (liffResult.status === 'fulfilled') setUserProfile(liffResult.value);
        if (itemsRes.status === 'fulfilled' && itemsRes.value.success) {
          setItems(itemsRes.value.data);
        }
        if (catsRes.status === 'fulfilled' && catsRes.value.success) {
          setCategories(catsRes.value.data);
        }
        if (statsRes.status === 'fulfilled' && statsRes.value.success) {
          setStatuses(statsRes.value.data);
        }

      } catch (err) {
        console.error("初始化失敗", err);
      } finally {
        setLoading(false);
      }
    };

    initApp();
  }, []);

  const fetchItems = async () => {
    try {
      const res = await fetch(`${GAS_URL}?action=getItems&t=${Date.now()}`);
      const json = await res.json();
      if (json.success) setItems(json.data);
    } catch (err) {
      console.error("取得物品失敗", err);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${GAS_URL}?action=getCategories&t=${Date.now()}`);
      const json = await res.json();
      if (json.success) setCategories(json.data);
    } catch (err) {
      console.error("取得分類失敗", err);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const res = await fetch(GAS_URL, {
        method: "POST",
        body: JSON.stringify({
          action: "addCategory",
          name: newCategoryName.trim()
        })
      });
      const json = await res.json();
      if (json.success) {
        setNewCategoryName('');
        fetchCategories();
      } else {
        alert(json.message || "新增失敗");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeactivateItem = async (itemId) => {
    if (!window.confirm("確定要將此物品標記為停用嗎？")) return;
    const today = new Date().toISOString().split('T')[0];
    try {
      const res = await fetch(GAS_URL, {
        method: "POST",
        body: JSON.stringify({
          action: "deactivateItem",
          item_id: itemId,
          end_date: today
        })
      });
      const json = await res.json();
      if (json.success) fetchItems();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const name = item.name || item.Name || Object.values(item)[1] || "";
      const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase());
      const itemCat = item.category || item.Category || Object.values(item)[3] || "";
      const matchesCategory = selectedCategory ? itemCat === selectedCategory : true;
      return matchesSearch && matchesCategory;
    });
  }, [items, searchQuery, selectedCategory]);

  const calculateDuration = (startDate, endDate) => {
    if (!startDate) return '';
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 30) return `${diffDays} 天`;
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) return `${diffMonths} 個月`;
    return `${(diffDays / 365).toFixed(1)} 年`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toISOString().split('T')[0];
    } catch (e) {
      return dateStr;
    }
  };

  const fetchLogs = async (itemId) => {
    try {
      const res = await fetch(`${GAS_URL}?action=getLogs&itemId=${itemId}&t=${Date.now()}`);
      const json = await res.json();
      if (json.success) setItemLogs(json.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenDetail = (item) => {
    // 規範化資料格式，避免 ID 或屬性抓不到
    const normalizedItem = {
      id: item.id || Object.values(item)[0],
      name: item.name || Object.values(item)[1],
      model: item.model || Object.values(item)[2],
      category: item.category || Object.values(item)[3],
      purchase_date: item.purchase_date || Object.values(item)[4],
      status: item.status || Object.values(item)[5],
      end_date: item.end_date || Object.values(item)[6],
      description: item.description || Object.values(item)[7],
      thumbnail: item.thumbnail || Object.values(item)[8]
    };
    setSelectedItemForDetail(normalizedItem);
    fetchLogs(normalizedItem.id);
  };

  const handleAddLog = async (e) => {
    e.preventDefault();
    if (!newLog.detail) return;
    setIsLogAdding(true);
    try {
      const res = await fetch(GAS_URL, {
        method: "POST",
        body: JSON.stringify({
          action: "addLog",
          item_id: selectedItemForDetail.id || Object.values(selectedItemForDetail)[0],
          ...newLog
        })
      });
      const json = await res.json();
      if (json.success) {
        setNewLog({ ...newLog, detail: '' });
        fetchLogs(selectedItemForDetail.id || Object.values(selectedItemForDetail)[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLogAdding(false);
    }
  };

  const handleDeleteLog = async (logId) => {
    if (!window.confirm("確定刪除此紀錄？")) return;
    try {
      const res = await fetch(GAS_URL, {
        method: "POST",
        body: JSON.stringify({ action: "deleteLog", id: logId })
      });
      const json = await res.json();
      if (json.success) {
        fetchLogs(selectedItemForDetail.id || Object.values(selectedItemForDetail)[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleImageUpload = (e, target) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.src = reader.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 400;
          const MAX_HEIGHT = 400;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);

          if (target === 'new') {
            setNewItem({ ...newItem, thumbnail: compressedBase64 });
          } else if (target === 'edit') {
            handleUpdateThumbnail(compressedBase64);
          }
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateThumbnail = async (base64) => {
    if (!selectedItemForDetail) return;
    const itemId = selectedItemForDetail.id || Object.values(selectedItemForDetail)[0];
    try {
      const res = await fetch(GAS_URL, {
        method: "POST",
        body: JSON.stringify({
          action: "updateItem",
          id: itemId,
          thumbnail: base64
        })
      });
      const json = await res.json();
      if (json.success) {
        setSelectedItemForDetail({ ...selectedItemForDetail, thumbnail: base64 });
        fetchItems();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItem.name || !newItem.category) {
      alert("請填寫必填欄位");
      return;
    }
    
    try {
      const res = await fetch(GAS_URL, {
        method: "POST",
        body: JSON.stringify({
          action: "addItem",
          ...newItem
        })
      });
      const json = await res.json();
      if (json.success) {
        setIsAddModalOpen(false);
        setNewItem({
          name: '',
          model: '', // 重置型號
          category: '',
          status: '',
          purchase_date: new Date().toISOString().split('T')[0],
          description: '',
          thumbnail: ''
        });
        fetchItems();
      } else {
        alert(json.message || "新增失敗");
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
          <p className="text-gray-400 text-sm font-medium tracking-widest uppercase">Loading</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#fafafa] min-h-screen text-gray-900 font-sans selection:bg-blue-100">
      {/* Premium Header with Gradient */}
      <header className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-6 h-20 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-500">AssetPro</h1>
              <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest leading-none mt-0.5">Management</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="h-10 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-bold rounded-xl hover:shadow-blue-500/25 transition-all active:scale-95 shadow-lg shadow-black/10 flex items-center gap-2 border-none"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              <span>新增資產</span>
            </button>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37a1.724 1.724 0 002.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Simplified Search/Filter */}
        <div className="mb-10 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-grow w-full group">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜尋資產名稱、型號或關鍵字..."
              className="w-full h-12 pl-12 pr-4 bg-white border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-600 transition-all shadow-sm group-hover:shadow-md"
            />
            <svg className="absolute left-4 top-3.5 h-5 w-5 text-gray-300 group-hover:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          
          <div className="flex gap-2 shrink-0">
            <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-100">
              {['grouped', 'grid', 'list'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === mode ? 'bg-gradient-to-r from-gray-800 to-black text-white shadow-md' : 'text-gray-400 hover:text-black'}`}
                >
                  {mode === 'grouped' ? '分組' : mode === 'grid' ? '網格' : '清單'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Dynamic Content */}
        <div className="space-y-4">
          {viewMode === 'grouped' ? (
            <div className="space-y-4">
              {Object.entries(
                filteredItems.reduce((acc, item) => {
                  const cat = item.category || item.Category || Object.values(item)[3] || "未分類";
                  if (!acc[cat]) acc[cat] = [];
                  acc[cat].push(item);
                  return acc;
                }, {})
              ).map(([category, categoryItems]) => {
                const isExpanded = expandedCategories[category];
                return (
                  <div key={category} className="group bg-white rounded-2xl shadow-sm border border-gray-100 transition-all hover:shadow-md overflow-hidden">
                    <button
                      onClick={() => setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }))}
                      className="w-full px-6 py-5 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-1.5 h-1.5 bg-blue-600 rounded-full shadow-sm shadow-blue-500"></div>
                        <h3 className="font-bold text-sm tracking-wide text-gray-800">{category}</h3>
                        <span className="text-[10px] font-black text-gray-400 bg-gray-50 uppercase px-2 py-0.5 border rounded-md">{categoryItems.length}</span>
                      </div>
                      <svg className={`w-5 h-5 text-gray-300 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-blue-600' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {isExpanded && (
                      <div className="px-6 pb-6 space-y-2 animate-in slide-in-from-top-2 duration-300">
                        {categoryItems.map((item, idx) => {
                          const itemName = item.name || item.Name || Object.values(item)[1];
                          const itemStatus = item.status || item.Status || Object.values(item)[5];
                          const thumb = item.thumbnail || Object.values(item)[8];

                          return (
                            <div 
                              key={item.id || idx} 
                              onClick={(e) => { e.stopPropagation(); handleOpenDetail(item); }}
                              className="group/item flex items-center justify-between p-3 rounded-xl border border-transparent hover:border-blue-100 hover:bg-blue-50/30 transition-all cursor-pointer"
                            >
                              <div className="flex items-center gap-4">
                                {thumb ? (
                                  <img src={thumb} className="w-10 h-10 rounded-lg object-cover shadow-sm border border-white group-hover/item:scale-110 transition-transform" alt="" />
                                ) : (
                                  <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center text-gray-200">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                  </div>
                                )}
                                <div>
                                  <p className="text-sm font-bold text-gray-700 group-hover/item:text-blue-700 transition-colors">{itemName}</p>
                                  <p className="text-[10px] text-gray-400 font-medium tracking-tight">Last Update: {formatDate(item.purchase_date || Object.values(item)[4])}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${itemStatus === '使用中' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{itemStatus}</span>
                                <svg className="w-4 h-4 text-gray-200 group-hover/item:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-3"}>
               {filteredItems.map((item, idx) => (
                  <div 
                    key={item.id || idx} 
                    onClick={() => handleOpenDetail(item)}
                    className={`bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all cursor-pointer group ${viewMode === 'list' ? 'flex items-center p-3 gap-4' : 'flex flex-col overflow-hidden'}`}
                  >
                    {(item.thumbnail || Object.values(item)[8]) ? (
                      <img src={item.thumbnail || Object.values(item)[8]} className={viewMode === 'list' ? "w-12 h-12 rounded-xl object-cover" : "h-48 w-full object-cover group-hover:scale-105 transition-transform duration-500"} alt="" />
                    ) : (
                      <div className={viewMode === 'list' ? "w-12 h-12 bg-gray-50 rounded-xl" : "h-48 w-full bg-gray-50"}></div>
                    )}
                    <div className={viewMode === 'list' ? "flex-grow" : "p-5"}>
                      <div className="flex justify-between items-start">
                        <h3 className="font-bold text-sm group-hover:text-blue-600 transition-colors">{item.name || Object.values(item)[1]}</h3>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{item.category || Object.values(item)[3]}</span>
                      </div>
                      {viewMode === 'grid' && <p className="text-xs text-gray-400 mt-1">{item.model || Object.values(item)[2]}</p>}
                    </div>
                  </div>
               ))}
            </div>
          )}
        </div>
      </main>

      {/* Settings Modal (Categories) */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm shadow-inner" onClick={() => setIsSettingsOpen(false)}></div>
          <div className="relative bg-white rounded-[32px] shadow-2xl max-w-md w-full p-8 duration-200">
             <div className="flex justify-between items-center mb-8 border-b pb-4">
               <h2 className="text-xl font-bold tracking-tight">管理設定</h2>
               <button onClick={() => setIsSettingsOpen(false)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-black bg-gray-50 rounded-full transition-colors">
                 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
               </button>
             </div>

             <section className="space-y-6">
               <div>
                 <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">分類管理</h3>
                 <div className="flex gap-2 mb-4">
                   <input
                     type="text"
                     value={newCategoryName}
                     onChange={(e) => setNewCategoryName(e.target.value)}
                     placeholder="新增分類名稱..."
                     className="flex-grow h-11 px-4 bg-gray-50 border-none rounded-xl text-sm focus:ring-1 focus:ring-blue-600 outline-none"
                   />
                   <button onClick={handleAddCategory} className="h-11 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold rounded-xl active:scale-95 transition-transform">新增</button>
                 </div>
                 <div className="max-h-60 overflow-y-auto space-y-1 pr-2">
                   {categories.map((cat, idx) => (
                     <div key={cat.id || idx} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-xl transition-colors">
                       <span className="text-sm font-medium text-gray-700">{cat.name || Object.values(cat)[1]}</span>
                       <button className="text-gray-300 hover:text-red-500 transition-colors">
                         <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                       </button>
                     </div>
                   ))}
                 </div>
               </div>
             </section>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsAddModalOpen(false)}></div>
          <div className="relative bg-white rounded-[32px] shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-8 duration-300">
             <div className="flex justify-between items-center mb-8 border-b pb-4">
               <h2 className="text-xl font-bold tracking-tight">新增資產</h2>
               <button onClick={() => setIsAddModalOpen(false)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-black bg-gray-50 rounded-full transition-colors">
                 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
               </button>
             </div>

             <form onSubmit={handleAddItem} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">物品名稱</label>
                    <input required type="text" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} className="w-full h-12 px-4 bg-gray-50 border-none rounded-2xl text-sm focus:ring-1 focus:ring-blue-600 outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">型號</label>
                    <input type="text" value={newItem.model} onChange={e => setNewItem({...newItem, model: e.target.value})} className="w-full h-12 px-4 bg-gray-50 border-none rounded-2xl text-sm focus:ring-1 focus:ring-blue-600 outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">分類</label>
                    <select required value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})} className="w-full h-12 px-4 bg-gray-50 border-none rounded-2xl text-sm focus:ring-1 focus:ring-blue-600 outline-none appearance-none" style={selectStyle}>
                      <option value="">選擇分類</option>
                      {categories.map((cat, idx) => <option key={idx}>{cat.name || Object.values(cat)[1]}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                   <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">照片上傳</label>
                   <div className="relative h-36 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center group/upload hover:bg-blue-50 transition-all">
                      {newItem.thumbnail ? (
                        <img src={newItem.thumbnail} className="w-full h-full object-cover rounded-2xl" alt="" />
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <svg className="w-10 h-10 text-gray-200 group-hover/upload:text-blue-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 4v16m8-8H4" /></svg>
                          <span className="text-[10px] font-bold text-gray-300">點擊上傳縮圖</span>
                        </div>
                      )}
                      <input type="file" accept="image/*" onChange={e => handleImageUpload(e, 'new')} className="absolute inset-0 opacity-0 cursor-pointer" />
                   </div>
                </div>

                <div className="flex gap-4 pt-4 border-t mt-4">
                   <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 h-12 text-sm font-bold text-gray-400 hover:text-gray-900 transition-colors">取消</button>
                   <button type="submit" className="flex-1 h-12 bg-gradient-to-r from-blue-600 to-indigo-700 text-white text-sm font-bold rounded-2xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all">確認儲存</button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* Item Detail Modal */}
      {selectedItemForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedItemForDetail(null)}></div>
          <div className="relative bg-white rounded-[40px] shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-10 duration-200 border border-gray-100">
             <div className="flex justify-between items-start mb-10">
                <div className="flex gap-6 items-center">
                  <div className="relative group/edit shadow-2xl shadow-black/10 rounded-3xl overflow-hidden ring-4 ring-white">
                    {selectedItemForDetail.thumbnail ? (
                      <img src={selectedItemForDetail.thumbnail} className="w-28 h-24 object-cover" alt="" />
                    ) : (
                      <div className="w-28 h-24 bg-gray-50 flex items-center justify-center text-gray-200">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      </div>
                    )}
                    <label className="absolute inset-0 bg-blue-600/60 flex items-center justify-center opacity-0 group-hover/edit:opacity-100 transition-opacity cursor-pointer">
                      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, 'edit')} />
                    </label>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight mb-1 text-gray-800">{selectedItemForDetail.name}</h2>
                    <p className="text-sm text-gray-400 font-medium mb-3">{selectedItemForDetail.model || '標準型號'}</p>
                    <span className="text-[10px] font-black tracking-widest uppercase px-3 py-1 bg-blue-50 text-blue-600 rounded-full border border-blue-100">{selectedItemForDetail.category}</span>
                  </div>
                </div>
                <button onClick={() => setSelectedItemForDetail(null)} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-black bg-gray-50 rounded-full transition-all">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
             </div>

             <div className="grid grid-cols-2 gap-8 mb-12 bg-gray-50/50 p-6 rounded-[32px] border border-gray-100">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">購買日期</p>
                  <p className="text-sm font-bold text-gray-700">{formatDate(selectedItemForDetail.purchase_date)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">目前狀態</p>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${selectedItemForDetail.status === '使用中' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                    <p className="text-sm font-bold text-gray-800">{selectedItemForDetail.status}</p>
                  </div>
                </div>
                <div className="col-span-2 space-y-1 border-t pt-4">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">描述備註</p>
                  <p className="text-sm text-gray-500 leading-relaxed italic">"{selectedItemForDetail.description || "未提供詳細描述。"}"</p>
                </div>
             </div>

             <div className="space-y-6">
                <div className="flex items-center gap-3 border-b pb-4">
                  <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
                  <h3 className="text-sm font-bold tracking-widest uppercase text-gray-800">維修與異動紀錄</h3>
                </div>
                
                <form onSubmit={handleAddLog} className="bg-white border-2 border-gray-50 p-6 rounded-[32px] flex flex-col gap-4 shadow-sm">
                  <div className="grid grid-cols-2 gap-3">
                    <input type="date" value={newLog.date} onChange={e => setNewLog({...newLog, date: e.target.value})} className="h-11 px-4 bg-gray-50 border-none rounded-xl text-xs outline-none focus:ring-1 focus:ring-blue-600" />
                    <select value={newLog.type} onChange={e => setNewLog({...newLog, type: e.target.value})} className="h-11 px-4 bg-gray-50 border-none rounded-xl text-xs outline-none appearance-none focus:ring-1 focus:ring-blue-600" style={selectStyle}>
                      <option>維修</option><option>保養</option><option>零件更換</option><option>異動</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <input required placeholder="在此輸入紀錄詳細內容..." value={newLog.detail} onChange={e => setNewLog({...newLog, detail: e.target.value})} className="flex-grow h-12 px-4 bg-gray-50 border-none rounded-xl text-xs outline-none focus:ring-1 focus:ring-blue-600" />
                    <button disabled={isLogAdding} className="h-12 px-8 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold rounded-xl active:scale-95 transition-all shadow-md shadow-blue-500/10">
                      {isLogAdding ? '...' : '新增紀錄'}
                    </button>
                  </div>
                </form>

                <div className="space-y-4 pt-4 px-2">
                  {itemLogs.length > 0 ? itemLogs.map((log, lidx) => {
                    const lDate = log.date || Object.values(log)[2];
                    const pDate = selectedItemForDetail.purchase_date || Object.values(selectedItemForDetail)[4];
                    return (
                      <div key={log.id || lidx} className="flex items-center justify-between group p-3 hover:bg-gray-50 rounded-2xl transition-all">
                        <div className="flex items-center gap-6">
                          <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${log.type === '維修' ? 'bg-red-500' : log.type === '保養' ? 'bg-blue-500' : 'bg-gray-800'}`}></div>
                          <div>
                            <p className="text-sm font-bold text-gray-800">{log.detail}</p>
                            <div className="flex items-center gap-3 mt-1.5">
                              <span className="text-[10px] text-gray-400 font-bold">{formatDate(lDate)}</span>
                              <span className="text-[10px] text-blue-500 font-black tracking-tight bg-blue-50 px-2 py-0.5 rounded-full">使用滿 {calculateDuration(pDate, lDate)}</span>
                            </div>
                          </div>
                        </div>
                        <button onClick={() => handleDeleteLog(log.id || Object.values(log)[0])} className="opacity-0 group-hover:opacity-100 w-9 h-9 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    );
                  }) : (
                    <div className="text-center py-10 opacity-30 grayscale grayscale-100">
                       <svg className="w-10 h-10 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                       <p className="text-xs font-bold uppercase tracking-widest">尚無維修紀錄</p>
                    </div>
                  )}
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;