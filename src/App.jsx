import React, { useState, useEffect, useMemo } from 'react';
import liff from '@line/liff';

const GAS_URL = import.meta.env.VITE_GAS_URL;
const LIFF_ID = import.meta.env.VITE_LIFF_ID;

function App() {
  const [currentTab, setCurrentTab] = useState('items'); // 'items' | 'categories'
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // 初始化 LIFF 與取得初始資料
  useEffect(() => {
    const initApp = async () => {
      setLoading(true);
      try {
        // 並行執行 LIFF 初始化與資料取得
        const [liffResult, itemsRes, catsRes] = await Promise.allSettled([
          liff.init({ liffId: LIFF_ID }).then(async () => {
            if (liff.isLoggedIn()) {
              return await liff.getProfile();
            } else {
              liff.login();
              return null;
            }
          }),
          fetch(`${GAS_URL}?action=getItems`).then(res => res.json()),
          fetch(`${GAS_URL}?action=getCategories`).then(res => res.json())
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
      const res = await fetch(`${GAS_URL}?action=getItems`);
      const json = await res.json();
      if (json.success) setItems(json.data);
    } catch (err) {
      console.error("取得物品失敗", err);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${GAS_URL}?action=getCategories`);
      const json = await res.json();
      if (json.success) {
        console.log("Categories fetched:", json.data);
        setCategories(json.data);
      }
    } catch (err) {
      console.error("取得分類失敗", err);
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
      const matchesSearch = item.name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory ? item.category === selectedCategory : true;
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
    return new Date(dateStr).toISOString().split('T')[0];
  };

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '',
    category: '',
    purchase_date: new Date().toISOString().split('T')[0],
    description: ''
  });

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
          category: '',
          purchase_date: new Date().toISOString().split('T')[0],
          description: ''
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
        {/* Search & Filters */}
        {currentTab === 'items' && (
          <div className="mb-8 bg-white p-6 rounded-xl shadow-sm border">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜尋物品名稱或關鍵字..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                />
                <svg className="absolute left-3 top-3 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none appearance-none bg-white"
                  style={selectStyle}
                >
                  <option value="">所有分類</option>
                  {categories.map((cat, idx) => {
                    const label = cat.name || cat.Name || Object.values(cat)[1] || "未命名";
                    return <option key={cat.id || idx} value={label}>{label}</option>;
                  })}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* 物品清單內容 */}
        {currentTab === 'items' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredItems.map((item, idx) => {
              const itemName = item.name || item.Name || Object.values(item)[1] || "未命名物品";
              const itemCat = item.category || item.Category || Object.values(item)[2] || "未分類";
              const itemStatus = item.status || item.Status || Object.values(item)[4] || "未知狀態";
              
              return (
                <div key={item.id || idx} className="group bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col">
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

                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors mb-2">{itemName}</h3>

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