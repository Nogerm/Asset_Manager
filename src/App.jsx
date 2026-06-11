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
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6 min-h-screen">
      <h1 className="text-2xl font-bold mb-4 text-gray-800 text-center">資產與維護管理</h1>

      {userProfile && (
        <div className="flex items-center space-x-2 mb-4 p-2 bg-blue-50 rounded">
          <img src={userProfile.pictureUrl} alt="avatar" className="w-8 h-8 rounded-full" />
          <span className="text-sm text-gray-700">您好，{userProfile.displayName}</span>
        </div>
      )}

      {/* 頁籤切換 */}
      <div className="flex border-b mb-4">
        <button
          onClick={() => setCurrentTab('items')}
          className={`flex-1 py-2 text-center text-sm ${currentTab === 'items' ? 'border-b-2 border-blue-500 font-bold text-blue-600' : 'text-gray-500'}`}
        >
          物品清單
        </button>
        <button
          onClick={() => setCurrentTab('categories')}
          className={`flex-1 py-2 text-center text-sm ${currentTab === 'categories' ? 'border-b-2 border-blue-500 font-bold text-blue-600' : 'text-gray-500'}`}
        >
          分類管理
        </button>
      </div>

      {/* 物品清單頁籤 */}
      {currentTab === 'items' && (
        <div>
          <div className="mb-4 space-y-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜尋物品名稱..."
              className="w-full border p-2 rounded text-sm focus:outline-blue-500"
            />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full border p-2 rounded text-sm focus:outline-blue-500"
            >
              <option value="">所有分類</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            {filteredItems.map(item => (
              <div key={item.id} className="border p-3 rounded hover:bg-gray-50 transition">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">{item.name}</h3>
                    <span className="inline-block bg-blue-50 text-blue-600 text-xs px-2 py-0.5 rounded mt-1">
                      {item.category}
                    </span>
                  </div>
                  <span className={`text-xs font-semibold ${item.status === '使用中' ? 'text-green-600' : 'text-red-500'}`}>
                    {item.status}
                  </span>
                </div>

                <div className="text-xs text-gray-500 mt-2">
                  <div>購買日期: {formatDate(item.purchase_date)}</div>
                  {item.status === '使用中' ? (
                    <div>
                      已使用: <span className="font-medium text-blue-600">{calculateDuration(item.purchase_date)}</span>
                    </div>
                  ) : (
                    <div>
                      使用壽命: <span className="font-medium text-gray-700">{calculateDuration(item.purchase_date, item.end_date)}</span>
                      <div className="text-red-400">停用日期: {formatDate(item.end_date)}</div>
                    </div>
                  )}
                </div>

                <div className="mt-3 flex space-x-2">
                  <button onClick={() => alert(`查看 ${item.name} 的紀錄`)} className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600">
                    維修紀錄
                  </button>
                  {item.status === '使用中' && (
                    <button onClick={() => handleDeactivateItem(item.id)} className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded hover:bg-red-200">
                      標記停用
                    </button>
                  )}
                </div>
              </div>
            ))}
            {filteredItems.length === 0 && (
              <div className="text-center text-gray-400 py-10 text-sm">無符合的物品</div>
            )}
          </div>
        </div>
      )}

      {/* 分類管理頁籤 */}
      {currentTab === 'categories' && (
        <div className="space-y-4">
          <h2 class="text-lg font-bold text-gray-800">現有分類</h2>

          <div className="flex space-x-2">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="輸入新分類名稱"
              className="flex-1 border p-2 rounded text-sm focus:outline-blue-500"
            />
            <button onClick={handleAddCategory} className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">
              新增
            </button>
          </div>

          <ul className="divide-y border rounded bg-gray-50">
            {categories.map(cat => (
              <li key={cat.id} className="p-3 text-sm text-gray-700 flex justify-between items-center">
                <span>{cat.name}</span>
              </li>
            ))}
            {categories.length === 0 && (
              <li className="p-3 text-sm text-gray-400 text-center">暫無分類，請先新增</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export default App;