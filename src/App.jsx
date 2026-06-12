import React, { useState, useEffect, useMemo } from 'react';
import liff from '@line/liff';

const GAS_URL = import.meta.env.VITE_GAS_URL;
const LIFF_ID = import.meta.env.VITE_LIFF_ID;

function App() {
  const [currentTab, setCurrentTab] = useState('items'); // 'items' | 'categories'
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [statuses, setStatuses] = useState([]); // 新增狀態清單
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list' | 'grouped'
  const [expandedCategories, setExpandedCategories] = useState({});
  const [displayLimit, setDisplayLimit] = useState(12);

  // 初始化 LIFF 與取得初始資料
  useEffect(() => {
    const initApp = async () => {
      setLoading(true);
      try {
        // 並行執行 LIFF 初始化與資料取得
        const [liffResult, itemsRes, catsRes, statsRes] = await Promise.allSettled([
          liff.init({ liffId: LIFF_ID }).then(async () => {
            if (liff.isLoggedIn()) {
              return await liff.getProfile();
            } else {
              liff.login();
              return null;
            }
          }),
          fetch(`${GAS_URL}?action=getItems`).then(res => res.json()),
          fetch(`${GAS_URL}?action=getCategories`).then(res => res.json()),
          fetch(`${GAS_URL}?action=getStatuses`).then(res => res.json())
        ]);

        if (liffResult.status === 'fulfilled') setUserProfile(liffResult.value);
        if (itemsRes.status === 'fulfilled' && itemsRes.value.success) {
          console.log("Items loaded:", itemsRes.value.data);
          setItems(itemsRes.value.data);
        }
        if (catsRes.status === 'fulfilled' && catsRes.value.success) {
          console.log("Categories loaded:", catsRes.value.data);
          setCategories(catsRes.value.data);
        }
        if (statsRes.status === 'fulfilled' && statsRes.value.success) {
          console.log("Statuses loaded:", statsRes.value.data);
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
      console.log("fetchItems result:", json);
      if (json.success) {
        setItems(json.data);
      }
    } catch (err) {
      console.error("取得物品失敗", err);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${GAS_URL}?action=getCategories&t=${Date.now()}`);
      const json = await res.json();
      if (json.success) {
        console.log("Categories fetched:", json.data);
        setCategories(json.data);
      }
    } catch (err) {
      console.error("取得分類失敗", err);
    }
  };

  const fetchStatuses = async () => {
    try {
      const res = await fetch(`${GAS_URL}?action=getStatuses&t=${Date.now()}`);
      const json = await res.json();
      if (json.success) setStatuses(json.data);
    } catch (err) {
      console.error("取得狀態失敗", err);
    }
  };

  // 通用 Select 樣式
  const selectStyle = {
    backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%236b7280\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")',
    backgroundSize: '1.25em',
    backgroundPosition: 'right 0.75rem center',
    backgroundRepeat: 'no-repeat'
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

  // 篩選物品邏輯
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const name = item.name || item.Name || Object.values(item)[1] || "";
      const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase());
      const itemCat = item.category || item.Category || Object.values(item)[3] || "";
      const matchesCategory = selectedCategory ? itemCat === selectedCategory : true;
      return matchesSearch && matchesCategory;
    });
  }, [items, searchQuery, selectedCategory]);

  // 工具函式：計算使用時間
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

  // 工具函式：格式化日期
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toISOString().split('T')[0];
    } catch (e) {
      return dateStr;
    }
  };

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '',
    model: '', // 新增型號
    category: '',
    status: '', // 新增狀態
    purchase_date: new Date().toISOString().split('T')[0],
    description: '',
    thumbnail: ''
  });

  const [selectedItemForDetail, setSelectedItemForDetail] = useState(null);
  const [itemLogs, setItemLogs] = useState([]);
  const [isLogAdding, setIsLogAdding] = useState(false);
  const [newLog, setNewLog] = useState({ type: '維修', detail: '', date: new Date().toISOString().split('T')[0] });

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
    setSelectedItemForDetail(item);
    fetchLogs(item.id || Object.values(item)[0]);
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
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-500 font-medium">系統載入中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-gray-50 min-h-screen">
      {/* Header Section */}
      <header className="bg-white border-b sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                AssetPro
              </h1>
              <nav className="hidden md:flex space-x-4">
                <button
                  onClick={() => setCurrentTab('items')}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${currentTab === 'items' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  物品清單
                </button>
                <button
                  onClick={() => setCurrentTab('categories')}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${currentTab === 'categories' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  分類管理
                </button>
              </nav>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition shadow-md shadow-blue-200"
              >
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                新增物品
              </button>
              {userProfile && (
                <div className="hidden sm:flex items-center space-x-2 bg-gray-50 px-2 py-1 rounded-full border">
                  <img src={userProfile.pictureUrl} alt="avatar" className="w-6 h-6 rounded-full" />
                  <span className="text-xs font-medium text-gray-700">{userProfile.displayName}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Add Item Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={() => setIsAddModalOpen(false)}></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleAddItem}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg font-bold text-gray-900 mb-6">新增資產物品</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">物品名稱 *</label>
                      <input
                        type="text"
                        required
                        value={newItem.name}
                        onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="例如: MacBook Pro 14"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">型號</label>
                      <input
                        type="text"
                        value={newItem.model}
                        onChange={(e) => setNewItem({...newItem, model: e.target.value})}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="例如: A2442"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">分類 *</label>
                      <select
                        required
                        value={newItem.category}
                        onChange={(e) => setNewItem({...newItem, category: e.target.value})}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white"
                        style={selectStyle}
                      >
                        <option value="">請選擇分類</option>
                        {categories.map((cat, idx) => {
                          const label = cat.name || cat.Name || Object.values(cat)[1] || "未命名";
                          return <option key={cat.id || idx} value={label}>{label}</option>;
                        })}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">初始狀態</label>
                      <select
                        value={newItem.status}
                        onChange={(e) => setNewItem({...newItem, status: e.target.value})}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white"
                        style={selectStyle}
                      >
                        <option value="">預設狀態</option>
                        {statuses.map((stat, idx) => {
                          const label = stat.name || stat.Name || Object.values(stat)[1] || "未知";
                          return <option key={stat.id || idx} value={label}>{label}</option>;
                        })}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">購買日期</label>
                      <input
                        type="date"
                        value={newItem.purchase_date}
                        onChange={(e) => setNewItem({...newItem, purchase_date: e.target.value})}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">描述 / 備註</label>
                      <textarea
                        value={newItem.description}
                        onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-24"
                        placeholder="請輸入物品相關資訊..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">上傳縮圖</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, 'new')}
                        className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      {newItem.thumbnail && (
                        <img src={newItem.thumbnail} className="mt-2 w-20 h-20 object-cover rounded-lg border" alt="preview" />
                      )}
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-2">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none sm:w-auto sm:text-sm"
                  >
                    儲存物品
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:w-auto sm:text-sm"
                  >
                    取消
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Item Detail & Logs Modal */}
      {selectedItemForDetail && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-500 opacity-75" onClick={() => setSelectedItemForDetail(null)}></div>
            <div className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex gap-4">
                    <div className="relative group/thumb">
                      {(selectedItemForDetail.thumbnail || Object.values(selectedItemForDetail)[8]) ? (
                        <img 
                          src={selectedItemForDetail.thumbnail || Object.values(selectedItemForDetail)[8]} 
                          className="w-20 h-20 object-cover rounded-xl border shadow-sm"
                          alt="thumbnail"
                        />
                      ) : (
                        <div className="w-20 h-20 bg-gray-100 rounded-xl border flex items-center justify-center text-gray-300">
                           <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        </div>
                      )}
                      <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 group-hover/thumb:opacity-100 rounded-xl cursor-pointer transition-opacity text-[10px] font-bold">
                        更換圖片
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'edit')} />
                      </label>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">{selectedItemForDetail.name || Object.values(selectedItemForDetail)[1]}</h2>
                      <p className="text-sm text-gray-500">{selectedItemForDetail.model || Object.values(selectedItemForDetail)[2]}</p>
                      <span className="inline-block mt-2 px-2 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded uppercase">
                        {selectedItemForDetail.category || Object.values(selectedItemForDetail)[3]}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => setSelectedItemForDetail(null)} className="text-gray-400 hover:text-gray-600">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8 bg-gray-50 p-4 rounded-xl border">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">購買日期</p>
                    <p className="text-sm font-medium">{formatDate(selectedItemForDetail.purchase_date || Object.values(selectedItemForDetail)[4])}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">目前狀態</p>
                    <p className="text-sm font-bold text-blue-600">{selectedItemForDetail.status || Object.values(selectedItemForDetail)[5]}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">描述備註</p>
                    <p className="text-sm text-gray-600">{selectedItemForDetail.description || Object.values(selectedItemForDetail)[7] || "無備註"}</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex justify-between items-center border-b pb-2">
                    <h3 className="text-lg font-bold text-gray-900">維修與異動紀錄</h3>
                  </div>

                  <form onSubmit={handleAddLog} className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <input 
                      type="date"
                      value={newLog.date}
                      onChange={e => setNewLog({...newLog, date: e.target.value})}
                      className="text-xs border rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <select 
                      value={newLog.type}
                      onChange={e => setNewLog({...newLog, type: e.target.value})}
                      className="text-xs border rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option>維修</option>
                      <option>保養</option>
                      <option>零件更換</option>
                      <option>異動</option>
                    </select>
                    <input 
                      type="text" 
                      required
                      placeholder="輸入紀錄內容..."
                      value={newLog.detail}
                      onChange={e => setNewLog({...newLog, detail: e.target.value})}
                      className="text-xs border rounded-lg px-3 py-1 outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button 
                      disabled={isLogAdding}
                      className="bg-blue-600 text-white px-4 py-1 rounded-lg text-xs font-bold hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isLogAdding ? '...' : '新增紀錄'}
                    </button>
                  </form>

                  <div className="space-y-3">
                    {itemLogs.length > 0 ? itemLogs.map((log, lidx) => {
                      const logDate = log.date || Object.values(log)[2];
                      const purchaseDate = selectedItemForDetail.purchase_date || Object.values(selectedItemForDetail)[4];
                      const usageAtLog = calculateDuration(purchaseDate, logDate);

                      return (
                        <div key={log.id || lidx} className="flex items-start gap-3 p-3 bg-white border rounded-lg group">
                          <div className="mt-1">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${log.type === '維修' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                              {log.type}
                            </span>
                          </div>
                          <div className="flex-grow">
                            <p className="text-sm text-gray-700">{log.detail}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-[10px] text-gray-400">{formatDate(logDate)}</p>
                              <span className="text-[10px] text-blue-500 font-medium">使用滿 {usageAtLog}</span>
                            </div>
                          </div>
                          <button 
                            onClick={() => handleDeleteLog(log.id || Object.values(log)[0])}
                            className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-opacity"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      );
                    }) : (
                      <p className="text-center py-4 text-gray-400 text-sm">尚無紀錄</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Navigation */}
      <div className="md:hidden bg-white border-b px-4 py-2 flex justify-around">
        <button
          onClick={() => setCurrentTab('items')}
          className={`text-sm py-2 px-4 rounded-md ${currentTab === 'items' ? 'bg-blue-50 text-blue-600 font-bold' : 'text-gray-500'}`}
        >
          物品
        </button>
        <button
          onClick={() => setCurrentTab('categories')}
          className={`text-sm py-2 px-4 rounded-md ${currentTab === 'categories' ? 'bg-blue-50 text-blue-600 font-bold' : 'text-gray-500'}`}
        >
          分類
        </button>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search & Filters (Sticky) */}
        {currentTab === 'items' && (
          <div className="sticky top-16 z-10 bg-gray-50/95 backdrop-blur-sm pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-grow relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setDisplayLimit(12); // Reset limit on search
                    }}
                    placeholder="搜尋物品名稱或關鍵字..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                  <svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <div className="flex gap-2">
                  <select
                    value={selectedCategory}
                    onChange={(e) => {
                      setSelectedCategory(e.target.value);
                      setDisplayLimit(12); // Reset limit on filter
                    }}
                    className="flex-grow md:w-48 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white"
                    style={selectStyle}
                  >
                    <option value="">所有分類</option>
                    {categories.map((cat, idx) => {
                      const label = cat.name || cat.Name || Object.values(cat)[1] || "未命名";
                      return <option key={cat.id || idx} value={label}>{label}</option>;
                    })}
                  </select>
                  
                  <div className="flex border rounded-lg overflow-hidden shrink-0">
                    <button 
                      onClick={() => setViewMode('grid')}
                      className={`p-2 ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-white text-gray-400'}`}
                      title="網格視圖"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                      </svg>
                    </button>
                    <button 
                      onClick={() => setViewMode('list')}
                      className={`p-2 ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-400'}`}
                      title="列表視圖"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                    <button 
                      onClick={() => setViewMode('grouped')}
                      className={`p-2 ${viewMode === 'grouped' ? 'bg-blue-600 text-white' : 'bg-white text-gray-400'}`}
                      title="分組視圖"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 物品清單內容 */}
        {currentTab === 'items' && (
          <div className="space-y-6">
            {viewMode === 'grouped' ? (
              // Grouped Accordion View
              <div className="space-y-3">
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
                    <div key={category} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                      <button
                        onClick={() => setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }))}
                        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider">
                            {category}
                          </span>
                          <span className="text-sm font-medium text-gray-400">({categoryItems.length} 項)</span>
                        </div>
                        <svg className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      
                      {isExpanded && (
                        <div className="border-t bg-gray-50/30 p-3 space-y-2">
                          {categoryItems.map((item, idx) => {
                            const itemName = item.name || item.Name || Object.values(item)[1] || "未命名物品";
                            const itemModel = item.model || item.Model || Object.values(item)[2] || "";
                            const itemStatus = item.status || item.Status || Object.values(item)[5] || "未知狀態";
                            
                            return (
                              <div key={item.id || idx} className="bg-white p-3 rounded-lg border border-gray-100 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => handleOpenDetail(item)}>
                                <div className="flex items-center gap-3">
                                  {(item.thumbnail || Object.values(item)[8]) ? (
                                    <img src={item.thumbnail || Object.values(item)[8]} className="w-8 h-8 object-cover rounded border" alt="thumb" />
                                  ) : (
                                    <div className={`w-1.5 h-1.5 rounded-full ${itemStatus === '使用中' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                  )}
                                  <span className="font-bold text-gray-800 text-sm">{itemName}</span>
                                  {itemModel && <span className="text-[10px] text-gray-400">({itemModel})</span>}
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-[10px] font-bold text-blue-600">{calculateDuration(item.purchase_date || item.PurchaseDate)}</span>
                                  <button className="p-1 text-gray-300 hover:text-blue-600">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                  </button>
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
              // Standard View (Grid or List)
              <div className={viewMode === 'grid' 
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" 
                : "flex flex-col gap-3"
              }>
                {filteredItems.slice(0, displayLimit).map((item, idx) => {
                  const itemName = item.name || item.Name || Object.values(item)[1] || "未命名物品";
                  const itemModel = item.model || item.Model || Object.values(item)[2] || "";
                  const itemCat = item.category || item.Category || Object.values(item)[3] || "未分類";
                  const itemStatus = item.status || item.Status || Object.values(item)[5] || "未知狀態";
                  
                  if (viewMode === 'list') {
                    return (
                      <div key={item.id || idx} className="bg-white p-3 rounded-xl border border-gray-100 flex items-center justify-between hover:shadow-sm transition-all cursor-pointer" onClick={() => handleOpenDetail(item)}>
                        <div className="flex items-center gap-4">
                          {(item.thumbnail || Object.values(item)[8]) ? (
                            <img src={item.thumbnail || Object.values(item)[8]} className="w-10 h-10 object-cover rounded-lg border shadow-sm" alt="thumb" />
                          ) : (
                            <div className={`w-2 h-2 rounded-full ${itemStatus === '使用中' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          )}
                          <div>
                            <h3 className="font-bold text-gray-900 text-sm">{itemName}</h3>
                            <div className="flex gap-2 items-center">
                              <span className="text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded uppercase font-bold">{itemCat}</span>
                              {itemModel && <span className="text-[10px] text-gray-400">({itemModel})</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right hidden sm:block">
                            <p className="text-[10px] text-gray-400">使用時間</p>
                            <p className="text-xs font-bold text-blue-600">{calculateDuration(item.purchase_date || item.PurchaseDate)}</p>
                          </div>
                          <button 
                            onClick={() => alert(`查看 ${itemName} 的紀錄`)}
                            className="p-1.5 text-gray-400 hover:text-blue-600"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={item.id || idx} className="group bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col cursor-pointer" onClick={() => handleOpenDetail(item)}>
                      {(item.thumbnail || Object.values(item)[8]) && (
                        <div className="h-40 w-full overflow-hidden border-b">
                          <img src={item.thumbnail || Object.values(item)[8]} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="item" />
                        </div>
                      )}
                      <div className="p-5 flex-grow">
                        <div className="flex justify-between items-start mb-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${itemStatus === '使用中' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${itemStatus === '使用中' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                            {itemStatus}
                          </span>
                          <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-wider">
                            {itemCat}
                          </span>
                        </div>

                        <div className="mb-2">
                          <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors inline-block">{itemName}</h3>
                          {itemModel && (
                            <span className="ml-2 text-xs font-medium text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border">
                              {itemModel}
                            </span>
                          )}
                        </div>

                        <div className="space-y-2 mt-4 text-sm text-gray-600">
                          <div className="flex justify-between">
                            <span className="text-gray-400">購買日期</span>
                            <span className="font-medium">{formatDate(item.purchase_date || item.PurchaseDate)}</span>
                          </div>
                          {itemStatus === '使用中' ? (
                            <div className="flex justify-between">
                              <span className="text-gray-400">已使用</span>
                              <span className="font-bold text-blue-600">{calculateDuration(item.purchase_date || item.PurchaseDate)}</span>
                            </div>
                          ) : (
                            <div className="space-y-1 pt-1 border-t border-gray-50">
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-400">使用壽命</span>
                                <span className="font-medium text-gray-700">{calculateDuration(item.purchase_date || item.PurchaseDate, item.end_date || item.EndDate)}</span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-red-400">停用日期</span>
                                <span className="text-red-500 font-medium">{formatDate(item.end_date || item.EndDate)}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="bg-gray-50 p-4 border-t flex gap-3">
                        <button
                          onClick={() => alert(`查看 ${itemName} 的紀錄`)}
                          className="flex-1 text-xs font-semibold py-2 px-3 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-100 transition shadow-sm"
                        >
                          維修紀錄
                        </button>
                        {itemStatus === '使用中' && (
                          <button
                            onClick={() => handleDeactivateItem(item.id)}
                            className="text-xs font-semibold py-2 px-3 bg-red-50 text-red-600 border border-red-100 rounded-lg hover:bg-red-100 transition"
                          >
                            標記停用
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Load More Button (Only for Grid/List) */}
            {viewMode !== 'grouped' && filteredItems.length > displayLimit && (
              <div className="flex justify-center py-4">
                <button
                  onClick={() => setDisplayLimit(prev => prev + 12)}
                  className="px-8 py-3 bg-white border-2 border-blue-100 text-blue-600 font-bold rounded-xl hover:bg-blue-50 hover:border-blue-200 transition active:scale-95 shadow-sm"
                >
                  載入更多物品 ({filteredItems.length - displayLimit} 剩餘)
                </button>
              </div>
            )}

            {filteredItems.length === 0 && (
              <div className="col-span-full bg-white border border-dashed border-gray-300 rounded-2xl py-20 text-center">
                <div className="mx-auto w-12 h-12 text-gray-300 mb-4">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900">無符合的物品</h3>
                <p className="text-gray-500 mt-1">請嘗試變更搜尋條件或選擇其他分類</p>
              </div>
            )}
          </div>
        )}

        {/* 分類管理內容 */}
        {currentTab === 'categories' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl shadow-sm border p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">分類管理</h2>
                  <p className="text-sm text-gray-500 mt-1">建立與管理資產分類</p>
                </div>
              </div>

              <div className="flex gap-3 mb-8 p-4 bg-blue-50 rounded-xl">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="輸入新分類名稱 (例如: 電子產品)"
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                />
                <button
                  onClick={handleAddCategory}
                  className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg text-sm hover:bg-blue-700 transition shadow-md shadow-blue-200 active:scale-95"
                >
                  新增分類
                </button>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-2 mb-3">現有分類 ({categories.length})</h3>
                <div className="grid grid-cols-1 gap-2">
                  {categories.map((cat, idx) => {
                    const catName = cat.name || cat.Name || cat.category_name || Object.values(cat)[1] || "未命名分類";
                    console.log(`Rendering category ${idx}:`, cat);
                    return (
                      <div key={cat.id || idx} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition group">
                        <span className="font-medium text-gray-700">{catName}</span>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                        </div>
                      </div>
                    );
                  })}
                  {categories.length === 0 && (
                    <div className="text-center py-10 text-gray-400 border border-dashed rounded-xl">
                      尚未建立分類
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;