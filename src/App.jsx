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
    const initLiff = async () => {
      try {
        await liff.init({ liffId: LIFF_ID });
        if (liff.isLoggedIn()) {
          const profile = await liff.getProfile();
          setUserProfile(profile);
        } else {
          liff.login();
        }
      } catch (err) {
        console.error("LIFF 載入失敗", err);
      } finally {
        setLoading(false);
      }
    };

    initLiff();
    fetchItems();
    fetchCategories();
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

  if (loading) {
    return <div className="text-center p-10 text-gray-500">載入中...</div>;
  }

  return (
    <div className="w-full bg-gray-50 min-h-screen">
      {/* Header Section */}
      <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                AssetPro
              </h1>
            </div>

            <div className="hidden md:flex space-x-8">
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
            </div>

            <div className="flex items-center">
              {userProfile ? (
                <div className="flex items-center space-x-3 bg-gray-50 px-3 py-1.5 rounded-full border">
                  <img src={userProfile.pictureUrl} alt="avatar" className="w-7 h-7 rounded-full" />
                  <span className="text-sm font-medium text-gray-700">{userProfile.displayName}</span>
                </div>
              ) : (
                <button className="text-sm text-blue-600 font-medium">登入</button>
              )}
            </div>
          </div>
        </div>
      </header>

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
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none appearance-none bg-no-repeat bg-right"
                  style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%236b7280\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', backgroundSize: '1.5em', backgroundPosition: 'right 0.5rem center' }}
                >
                  <option value="">所有分類</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* 物品清單內容 */}
        {currentTab === 'items' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredItems.map(item => (
              <div key={item.id} className="group bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col">
                <div className="p-5 flex-grow">
                  <div className="flex justify-between items-start mb-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.status === '使用中' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${item.status === '使用中' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                      {item.status}
                    </span>
                    <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-wider">
                      {item.category}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors mb-2">{item.name}</h3>

                  <div className="space-y-2 mt-4 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span className="text-gray-400">購買日期</span>
                      <span className="font-medium">{formatDate(item.purchase_date)}</span>
                    </div>
                    {item.status === '使用中' ? (
                      <div className="flex justify-between">
                        <span className="text-gray-400">已使用</span>
                        <span className="font-bold text-blue-600">{calculateDuration(item.purchase_date)}</span>
                      </div>
                    ) : (
                      <div className="space-y-1 pt-1 border-t border-gray-50">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">使用壽命</span>
                          <span className="font-medium text-gray-700">{calculateDuration(item.purchase_date, item.end_date)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-red-400">停用日期</span>
                          <span className="text-red-500 font-medium">{formatDate(item.end_date)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 p-4 border-t flex gap-3">
                  <button
                    onClick={() => alert(`查看 ${item.name} 的紀錄`)}
                    className="flex-1 text-xs font-semibold py-2 px-3 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-100 transition shadow-sm"
                  >
                    維修紀錄
                  </button>
                  {item.status === '使用中' && (
                    <button
                      onClick={() => handleDeactivateItem(item.id)}
                      className="text-xs font-semibold py-2 px-3 bg-red-50 text-red-600 border border-red-100 rounded-lg hover:bg-red-100 transition"
                    >
                      標記停用
                    </button>
                  )}
                </div>
              </div>
            ))}
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
                  {categories.map(cat => (
                    <div key={cat.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition group">
                      <span className="font-medium text-gray-700">{cat.name}</span>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                        {/* 這裡可以加編輯或刪除按鈕 */}
                      </div>
                    </div>
                  ))}
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