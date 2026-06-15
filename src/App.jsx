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
  const [viewMode, setViewMode] = useState('grouped'); 
  const [expandedCategories, setExpandedCategories] = useState({});
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedItemForDetail, setSelectedItemForDetail] = useState(null);
  const [itemLogs, setItemLogs] = useState([]);
  const [isLogAdding, setIsLogAdding] = useState(false);
  const [newLog, setNewLog] = useState({ type: '維修', detail: '', date: new Date().toISOString().split('T')[0], price: '' });
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);
  const [itemSortKey, setItemSortKey] = useState('purchase_date');
  const [itemSortDir, setItemSortDir] = useState('desc');
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [editPriceVal, setEditPriceVal] = useState('');
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [editDescVal, setEditDescVal] = useState('');
  const [tempCategories, setTempCategories] = useState([]);
  const [isSavingCategoriesOrder, setIsSavingCategoriesOrder] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isDeletingLog, setIsDeletingLog] = useState(false);
  const [isUpdatingField, setIsUpdatingField] = useState(false);

  const [newItem, setNewItem] = useState({
    name: '',
    model: '',
    category: '',
    status: '',
    purchase_date: new Date().toISOString().split('T')[0],
    description: '',
    thumbnail: '',
    price: ''
  });

  const selectStyle = {
    backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%236b7280\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")',
    backgroundSize: '1.25em',
    backgroundPosition: 'right 0.75rem center',
    backgroundRepeat: 'no-repeat'
  };

  useEffect(() => {
    const initApp = async () => {
      setLoading(true);
      try {
        const [liffResult, itemsRes, catsRes, statsRes] = await Promise.allSettled([
          liff.init({ liffId: LIFF_ID }).then(async () => {
            if (liff.isLoggedIn()) return await liff.getProfile();
            liff.login();
            return null;
          }),
          fetch(`${GAS_URL}?action=getItems&t=${Date.now()}`).then(res => res.json()),
          fetch(`${GAS_URL}?action=getCategories&t=${Date.now()}`).then(res => res.json()),
          fetch(`${GAS_URL}?action=getStatuses&t=${Date.now()}`).then(res => res.json())
        ]);

        if (liffResult.status === 'fulfilled') setUserProfile(liffResult.value);
        if (itemsRes.status === 'fulfilled' && itemsRes.value.success) setItems(itemsRes.value.data);
        if (catsRes.status === 'fulfilled' && catsRes.value.success) setCategories(catsRes.value.data);
        if (statsRes.status === 'fulfilled' && statsRes.value.success) setStatuses(statsRes.value.data);
      } catch (err) {
        console.error("初始化失敗", err);
      } finally {
        setLoading(false);
      }
    };
    initApp();
  }, []);

  useEffect(() => {
    if (isSettingsOpen) {
      const sorted = [...categories].sort((a, b) => {
        const orderA = a.sort_order !== undefined ? Number(a.sort_order) : 9999;
        const orderB = b.sort_order !== undefined ? Number(b.sort_order) : 9999;
        return orderA - orderB;
      });
      setTempCategories(sorted);
    }
  }, [isSettingsOpen, categories]);

  const fetchItems = async () => {
    try {
      const res = await fetch(`${GAS_URL}?action=getItems&t=${Date.now()}`);
      const json = await res.json();
      if (json.success) setItems(json.data);
    } catch (err) { console.error(err); }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${GAS_URL}?action=getCategories&t=${Date.now()}`);
      const json = await res.json();
      if (json.success) setCategories(json.data);
    } catch (err) { console.error(err); }
  };

  const fetchLogs = async (itemId) => {
    try {
      const res = await fetch(`${GAS_URL}?action=getLogs&itemId=${itemId}&t=${Date.now()}`);
      const json = await res.json();
      if (json.success) setItemLogs(json.data);
    } catch (err) { console.error(err); }
  };

  const handleOpenDetail = (item) => {
    const normalizedItem = {
      id: item.id || Object.values(item)[0],
      name: item.name || Object.values(item)[1],
      model: item.model || Object.values(item)[2],
      category: item.category || Object.values(item)[3],
      purchase_date: item.purchase_date || Object.values(item)[4],
      status: item.status || Object.values(item)[5],
      end_date: item.end_date || item.EndDate || Object.values(item)[6],
      description: item.description || Object.values(item)[7],
      thumbnail: item.thumbnail || Object.values(item)[8],
      price: item.price || item.Price || Object.values(item)[9] || ""
    };
    setSelectedItemForDetail(normalizedItem);
    setIsEditingPrice(false);
    setIsEditingDesc(false);
    setEditPriceVal(normalizedItem.price);
    setEditDescVal(normalizedItem.description || "");
    fetchLogs(normalizedItem.id);
  };

  const handleUpdateItemField = async (field, value) => {
    if (!selectedItemForDetail || isUpdatingField) return false;
    setIsUpdatingField(true);
    try {
      const res = await fetch(GAS_URL, {
        method: "POST",
        body: JSON.stringify({
          action: "updateItem",
          id: selectedItemForDetail.id,
          [field]: value
        })
      });
      const json = await res.json();
      if (json.success) {
        setSelectedItemForDetail(prev => ({ ...prev, [field]: value }));
        fetchItems();
        return true;
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingField(false);
    }
    return false;
  };

  const handleToggleStatus = async () => {
    if (!selectedItemForDetail || isStatusUpdating) return;
    setIsStatusUpdating(true);
    const isCurrentlyActive = selectedItemForDetail.status === '使用中';
    const newStatus = isCurrentlyActive ? '未使用' : '使用中';
    const todayStr = new Date().toISOString().split('T')[0];
    const newEndDate = isCurrentlyActive ? todayStr : '';

    try {
      const res = await fetch(GAS_URL, {
        method: "POST",
        body: JSON.stringify({
          action: "updateItem",
          id: selectedItemForDetail.id,
          status: newStatus,
          end_date: newEndDate
        })
      });
      const json = await res.json();
      if (json.success) {
        setSelectedItemForDetail(prev => ({
          ...prev,
          status: newStatus,
          end_date: newEndDate
        }));
        fetchItems();
      }
    } catch (err) {
      console.error("更新狀態失敗", err);
    } finally {
      setIsStatusUpdating(false);
    }
  };

  const handleAddLog = async (e) => {
    e.preventDefault();
    if (!newLog.detail || isLogAdding) return;
    setIsLogAdding(true);
    try {
      const res = await fetch(GAS_URL, {
        method: "POST",
        body: JSON.stringify({
          action: "addLog",
          item_id: selectedItemForDetail.id,
          ...newLog
        })
      });
      const json = await res.json();
      if (json.success) {
        setNewLog({ ...newLog, detail: '', price: '' });
        fetchLogs(selectedItemForDetail.id);
      }
    } catch (err) { console.error(err); }
    finally { setIsLogAdding(false); }
  };

  const handleDeleteLog = async (logId) => {
    if (isDeletingLog) return;
    if (!window.confirm("確定刪除？")) return;
    setIsDeletingLog(true);
    try {
      const res = await fetch(GAS_URL, {
        method: "POST",
        body: JSON.stringify({ action: "deleteLog", id: logId })
      });
      if ((await res.json()).success) fetchLogs(selectedItemForDetail.id);
    } catch (err) { 
      console.error(err); 
    } finally {
      setIsDeletingLog(false);
    }
  };

  const handleImageUpload = (e, target) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.src = reader.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        // 降低解析度到 200px 最大寬高，縮圖在此尺寸極為清晰且檔案大小在 3-8KB，絕對不超限
        const MAX = 200;
        let w = img.width, h = img.height;
        if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } }
        else { if (h > MAX) { w *= MAX / h; h = MAX; } }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        
        // 降低壓縮質量至 0.6 以獲得最佳大小效能比
        const base64 = canvas.toDataURL('image/jpeg', 0.6);
        
        // 檢測是否超過 Google Sheets 儲存格的最大字元長度 (預留安全範圍 48,000 字元)
        if (base64.length > 48000) {
          alert("圖片過於複雜，為避免寫入資料庫失敗，請更換另一張照片！");
          return;
        }
        
        if (target === 'new') setNewItem({ ...newItem, thumbnail: base64 });
        else handleUpdateThumbnail(base64);
      };
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateThumbnail = async (base64) => {
    if (!selectedItemForDetail || isUpdatingField) return;
    setIsUpdatingField(true);
    try {
      const res = await fetch(GAS_URL, {
        method: "POST",
        body: JSON.stringify({ action: "updateItem", id: selectedItemForDetail.id, thumbnail: base64 })
      });
      const json = await res.json();
      if (json.success) {
        setSelectedItemForDetail({ ...selectedItemForDetail, thumbnail: base64 });
        fetchItems();
      }
    } catch (err) { 
      console.error(err); 
    } finally {
      setIsUpdatingField(false);
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (isAddingItem) return;
    setIsAddingItem(true);
    try {
      const res = await fetch(GAS_URL, { method: "POST", body: JSON.stringify({ action: "addItem", ...newItem }) });
      const json = await res.json();
      if (json.success) {
        setIsAddModalOpen(false);
        setNewItem({ name: '', model: '', category: '', status: '', purchase_date: new Date().toISOString().split('T')[0], description: '', thumbnail: '', price: '' });
        fetchItems();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAddingItem(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim() || isAddingCategory) return;
    setIsAddingCategory(true);
    try {
      const res = await fetch(GAS_URL, { method: "POST", body: JSON.stringify({ action: "addCategory", name: newCategoryName.trim() }) });
      if ((await res.json()).success) { setNewCategoryName(''); fetchCategories(); }
    } catch (err) { 
      console.error(err); 
    } finally {
      setIsAddingCategory(false);
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const name = item.name || item.Name || Object.values(item)[1] || "";
      const cat = item.category || item.Category || Object.values(item)[3] || "";
      return name.toLowerCase().includes(searchQuery.toLowerCase()) && (selectedCategory ? cat === selectedCategory : true);
    });
  }, [items, searchQuery, selectedCategory]);

  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => {
      const orderA = a.sort_order !== undefined ? Number(a.sort_order) : 9999;
      const orderB = b.sort_order !== undefined ? Number(b.sort_order) : 9999;
      return orderA - orderB;
    });
  }, [categories]);

  const sortItems = (itemsList) => {
    return [...itemsList].sort((a, b) => {
      let valA = a[itemSortKey] || Object.values(a)[itemSortKey === 'purchase_date' ? 4 : (itemSortKey === 'name' ? 1 : 9)] || '';
      let valB = b[itemSortKey] || Object.values(b)[itemSortKey === 'purchase_date' ? 4 : (itemSortKey === 'name' ? 1 : 9)] || '';
      
      if (itemSortKey === 'price') {
        const numA = Number(valA) || 0;
        const numB = Number(valB) || 0;
        return itemSortDir === 'asc' ? numA - numB : numB - numA;
      }
      
      if (itemSortKey === 'purchase_date') {
        const dateA = valA ? new Date(valA) : new Date(0);
        const dateB = valB ? new Date(valB) : new Date(0);
        return itemSortDir === 'asc' ? dateA - dateB : dateB - dateA;
      }
      
      valA = String(valA).toLowerCase();
      valB = String(valB).toLowerCase();
      if (valA < valB) return itemSortDir === 'asc' ? -1 : 1;
      if (valA > valB) return itemSortDir === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const groupedItems = useMemo(() => {
    const groups = filteredItems.reduce((acc, i) => {
      const c = i.category || i.Category || Object.values(i)[3] || "未分類";
      if (!acc[c]) acc[c] = [];
      acc[c].push(i);
      return acc;
    }, {});
    
    const orderedGroups = [];
    const processedCats = new Set();
    
    sortedCategories.forEach(cat => {
      const catName = cat.name || Object.values(cat)[1];
      if (groups[catName]) {
        orderedGroups.push({ category: catName, items: groups[catName] });
        processedCats.add(catName);
      }
    });
    
    Object.keys(groups).forEach(catName => {
      if (!processedCats.has(catName)) {
        orderedGroups.push({ category: catName, items: groups[catName] });
      }
    });
    
    return orderedGroups;
  }, [filteredItems, sortedCategories]);

  const handleMoveCategoryLocal = (index, direction) => {
    const nextIdx = index + direction;
    if (nextIdx < 0 || nextIdx >= tempCategories.length) return;
    
    const updated = [...tempCategories];
    const temp = updated[index];
    updated[index] = updated[nextIdx];
    updated[nextIdx] = temp;
    
    setTempCategories(updated);
  };

  const handleSaveCategoriesOrder = async () => {
    if (isSavingCategoriesOrder) return;
    setIsSavingCategoriesOrder(true);
    
    const orders = {};
    tempCategories.forEach((cat, idx) => {
      orders[cat.id || Object.values(cat)[0]] = idx;
    });
    
    try {
      const res = await fetch(GAS_URL, {
        method: "POST",
        body: JSON.stringify({ action: "updateCategoriesOrder", orders })
      });
      const json = await res.json();
      if (json.success) {
        await fetchCategories();
        setIsSettingsOpen(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingCategoriesOrder(false);
    }
  };

  const calculateDuration = (start, end) => {
    if (!start) return '';
    const diff = Math.abs((end ? new Date(end) : new Date()) - new Date(start));
    const days = Math.ceil(diff / 864e5);
    if (days < 30) return `${days} 天`;
    if (days < 365) return `${Math.floor(days / 30)} 個月`;
    return `${(days / 365).toFixed(1)} 年`;
  };

  const formatDate = (d) => d ? new Date(d).toISOString().split('T')[0] : '';

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="w-full bg-[#fafafa] min-h-screen text-gray-900 font-sans">
      <header className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-6 h-16 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20 text-white font-bold text-sm">A</div>
            <h1 className="text-lg font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-500">AssetPro</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setIsAddModalOpen(true)} className="h-9 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all">新增資產</button>
            <button onClick={() => setIsSettingsOpen(true)} className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-blue-600 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37a1.724 1.724 0 002.572-1.065z" /><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-6">
        <div className="mb-6 flex flex-col md:flex-row gap-3">
          <div className="relative flex-grow">
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="搜尋資產..." className="w-full h-11 pl-10 pr-4 bg-white border-none rounded-xl text-sm shadow-sm focus:ring-2 focus:ring-blue-600 transition-all" />
            <svg className="absolute left-3.5 top-3 h-4 w-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          <div className="flex gap-2 shrink-0">
            <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-50">
              {['grouped', 'grid', 'list'].map(m => (
                <button key={m} onClick={() => setViewMode(m)} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === m ? 'bg-gray-900 text-white shadow-md' : 'text-gray-400 hover:text-black'}`}>{m === 'grouped' ? '分組' : m === 'grid' ? '網格' : '清單'}</button>
              ))}
            </div>
            <div className="flex gap-1.5 bg-white p-1.5 rounded-xl shadow-sm border border-gray-50 items-center">
              <select value={itemSortKey} onChange={e => setItemSortKey(e.target.value)} className="px-2 bg-transparent text-xs font-bold outline-none border-none cursor-pointer">
                <option value="purchase_date">依購買日期</option>
                <option value="name">依資產名稱</option>
                <option value="price">依金額價格</option>
              </select>
              <button onClick={() => setItemSortDir(p => p === 'asc' ? 'desc' : 'asc')} className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-gray-50 transition-all">
                {itemSortDir === 'asc' ? (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 4h13M3 8h9M3 12h5m0 0v-8m0 0L5 8m3-4l3 3" /></svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 4h13M3 8h9M3 12h5m0 0v8m0 0l3-3m-3 3L5 13" /></svg>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {viewMode === 'grouped' ? (
            groupedItems.map(({ category: cat, items }) => (
              <div key={cat} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <button onClick={() => setExpandedCategories(p => ({ ...p, [cat]: !p[cat] }))} className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-4 bg-blue-600 rounded-full"></div>
                    <span className="font-bold text-sm text-gray-800">{cat}</span>
                    <span className="text-[10px] font-black text-gray-300 border px-1.5 rounded-md">{items.length}</span>
                  </div>
                  <svg className={`w-4 h-4 text-gray-300 transition-transform ${expandedCategories[cat] ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 9l-7 7-7-7" /></svg>
                </button>
                {expandedCategories[cat] && (
                  <div className="px-4 pb-4 space-y-1">
                    {sortItems(items).map((item, idx) => {
                      const status = item.status || item.Status || Object.values(item)[5];
                      const pDate = item.purchase_date || item.PurchaseDate || Object.values(item)[4];
                      const eDate = item.end_date || item.EndDate || Object.values(item)[6];
                      const duration = status === '使用中' ? calculateDuration(pDate) : (eDate ? calculateDuration(pDate, eDate) : '');
                      
                      return (
                        <div key={item.id || idx} onClick={() => handleOpenDetail(item)} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-blue-50/50 transition-all cursor-pointer group">
                          <div className="flex items-center gap-3">
                            {item.thumbnail || Object.values(item)[8] ? <img src={item.thumbnail || Object.values(item)[8]} className="w-8 h-8 rounded-lg object-cover border border-white shadow-sm" /> : <div className="w-8 h-8 bg-gray-50 rounded-lg" />}
                            <div>
                              <p className="text-sm font-bold text-gray-700 group-hover:text-blue-600">{item.name || Object.values(item)[1]}</p>
                              {duration && <p className="text-[10px] text-blue-500 font-medium">{status === '使用中' ? '已使用' : '使用'} {duration}</p>}
                            </div>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${status === '使用中' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{status}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className={viewMode === 'grid' ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4" : "space-y-2"}>
              {sortItems(filteredItems).map((item, idx) => {
                const status = item.status || item.Status || Object.values(item)[5];
                const pDate = item.purchase_date || item.PurchaseDate || Object.values(item)[4];
                const eDate = item.end_date || item.EndDate || Object.values(item)[6];
                const duration = status === '使用中' ? calculateDuration(pDate) : (eDate ? calculateDuration(pDate, eDate) : '');
                const thumb = item.thumbnail || Object.values(item)[8];

                return (
                  <div key={item.id || idx} onClick={() => handleOpenDetail(item)} className={`bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md cursor-pointer overflow-hidden ${viewMode === 'list' ? 'flex items-center p-2 gap-3' : 'flex flex-col'}`}>
                    {thumb ? <img src={thumb} className={viewMode === 'list' ? "w-12 h-12 rounded-lg object-cover shadow-sm" : "h-32 w-full object-cover"} alt="" /> : <div className={viewMode === 'list' ? "w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center text-gray-200" : "h-32 bg-gray-50 flex items-center justify-center text-gray-200"}>
                       <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </div>}
                    <div className="p-3 min-w-0 flex-grow">
                      <div className="flex justify-between items-start mb-0.5">
                        <p className="text-xs font-bold text-gray-800 truncate">{item.name || Object.values(item)[1]}</p>
                        {viewMode === 'list' && <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${status === '使用中' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{status}</span>}
                      </div>
                      {duration && <p className="text-[10px] text-blue-500 font-medium">{status === '使用中' ? '已使用' : '使用'} {duration}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Item Detail Modal */}
      {selectedItemForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedItemForDetail(null)}></div>
          <div className="relative bg-white rounded-[24px] shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 border border-gray-100">
            <div className="flex justify-between items-start mb-5">
              <div className="flex gap-3 items-center">
                <div className="relative shadow-md rounded-xl overflow-hidden shrink-0 w-16 h-16">
                  {selectedItemForDetail.thumbnail ? <img src={selectedItemForDetail.thumbnail} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-50 flex items-center justify-center text-gray-300"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>}
                  {isUpdatingField ? (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                  ) : (
                    <label className="absolute inset-0 bg-blue-600/60 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                      <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, 'edit')} />
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /></svg>
                    </label>
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-800">{selectedItemForDetail.name}</h2>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider bg-gray-50 inline-block px-1.5 py-0.5 rounded mt-1">{selectedItemForDetail.category}</p>
                </div>
              </div>
              <button onClick={() => setSelectedItemForDetail(null)} className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-black"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6 bg-gray-50 p-4 rounded-2xl text-[11px]">
              <div>
                <p className="text-gray-400 font-bold uppercase mb-0.5">購買日</p>
                <p className="font-bold text-gray-700">{formatDate(selectedItemForDetail.purchase_date)}</p>
              </div>
              <div>
                <p className="text-gray-400 font-bold uppercase mb-0.5">價格</p>
                {isEditingPrice ? (
                  <div className="flex items-center gap-1 mt-0.5">
                    <input
                      type="number"
                      value={editPriceVal}
                      onChange={e => setEditPriceVal(e.target.value)}
                      className="w-20 h-6 px-1.5 bg-white border border-gray-200 rounded text-[10px] outline-none"
                    />
                    <button
                      type="button"
                      disabled={isUpdatingField}
                      onClick={async () => {
                        const ok = await handleUpdateItemField('price', editPriceVal);
                        if (ok) setIsEditingPrice(false);
                      }}
                      className="w-5 h-5 flex items-center justify-center bg-blue-600 text-white rounded text-[10px] font-bold disabled:bg-blue-400"
                    >
                      {isUpdatingField ? '...' : '✓'}
                    </button>
                    <button
                      type="button"
                      disabled={isUpdatingField}
                      onClick={() => {
                        setIsEditingPrice(false);
                        setEditPriceVal(selectedItemForDetail.price);
                      }}
                      className="w-5 h-5 flex items-center justify-center bg-gray-200 text-gray-500 rounded text-[10px] font-bold disabled:opacity-50"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <p className="font-bold text-red-600">
                      {selectedItemForDetail.price !== "" && selectedItemForDetail.price !== undefined
                        ? `$${Number(selectedItemForDetail.price).toLocaleString()}`
                        : "—"}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setEditPriceVal(selectedItemForDetail.price);
                        setIsEditingPrice(true);
                      }}
                      className="text-gray-300 hover:text-blue-600 transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
              <div>
                <p className="text-gray-400 font-bold uppercase mb-0.5">狀態</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <button
                    disabled={isStatusUpdating}
                    onClick={handleToggleStatus}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                      selectedItemForDetail.status === '使用中' ? 'bg-green-500' : 'bg-gray-300'
                    } ${isStatusUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <span
                      className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                        selectedItemForDetail.status === '使用中' ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className={`font-bold ${selectedItemForDetail.status === '使用中' ? 'text-green-600' : 'text-gray-500'}`}>
                    {selectedItemForDetail.status}
                  </span>
                </div>
              </div>
              {selectedItemForDetail.status !== '使用中' && selectedItemForDetail.end_date ? (
                <div>
                  <p className="text-gray-400 font-bold uppercase mb-0.5">停用日</p>
                  <p className="font-bold text-gray-700">{formatDate(selectedItemForDetail.end_date)}</p>
                </div>
              ) : (
                <div>{/* Empty block to keep layout aligned */}</div>
              )}
              {selectedItemForDetail.purchase_date && (
                <div className="col-span-2 border-t pt-2 mt-1">
                  <p className="text-gray-400 font-bold uppercase mb-0.5">
                    {selectedItemForDetail.status === 'using' || selectedItemForDetail.status === '使用中' ? '已使用時間' : '使用期間'}
                  </p>
                  <p className="font-bold text-blue-600">
                    {selectedItemForDetail.status === 'using' || selectedItemForDetail.status === '使用中'
                      ? calculateDuration(selectedItemForDetail.purchase_date)
                      : calculateDuration(selectedItemForDetail.purchase_date, selectedItemForDetail.end_date)}
                  </p>
                </div>
              )}
              <div className="col-span-2 border-t pt-3">
                <p className="text-gray-400 font-bold uppercase mb-0.5">備註</p>
                {isEditingDesc ? (
                  <div className="space-y-1.5 mt-1">
                    <textarea
                      value={editDescVal}
                      onChange={e => setEditDescVal(e.target.value)}
                      placeholder="輸入備註內容..."
                      className="w-full p-2 bg-white border border-gray-200 rounded-xl text-[10px] outline-none min-h-[50px] resize-none"
                    />
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        disabled={isUpdatingField}
                        onClick={async () => {
                          const ok = await handleUpdateItemField('description', editDescVal);
                          if (ok) setIsEditingDesc(false);
                        }}
                        className="px-2.5 py-1 bg-blue-600 text-white rounded-lg text-[9px] font-bold disabled:bg-blue-400"
                      >
                        {isUpdatingField ? '儲存中...' : '儲存'}
                      </button>
                      <button
                        type="button"
                        disabled={isUpdatingField}
                        onClick={() => {
                          setIsEditingDesc(false);
                          setEditDescVal(selectedItemForDetail.description || "");
                        }}
                        className="px-2.5 py-1 bg-gray-100 text-gray-500 rounded-lg text-[9px] font-bold disabled:opacity-50"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-2 mt-0.5">
                    <p className="text-gray-600 italic">
                      {selectedItemForDetail.description ? `"${selectedItemForDetail.description}"` : "無備註"}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setEditDescVal(selectedItemForDetail.description || "");
                        setIsEditingDesc(true);
                      }}
                      className="text-gray-300 hover:text-blue-600 shrink-0 mt-0.5"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-800 border-b pb-2">維修紀錄</h3>
              <form onSubmit={handleAddLog} className="flex flex-col gap-2 bg-white border border-gray-100 p-3 rounded-2xl shadow-sm">
                <div className="flex gap-2">
                  <input type="date" value={newLog.date} onChange={e => setNewLog({...newLog, date: e.target.value})} className="flex-1 h-8 px-2 bg-gray-50 rounded-lg text-[10px] outline-none" />
                  <select value={newLog.type} onChange={e => setNewLog({...newLog, type: e.target.value})} className="flex-1 h-8 px-2 bg-gray-50 rounded-lg text-[10px] outline-none appearance-none" style={selectStyle}><option>維修</option><option>保養</option><option>零件更換</option></select>
                  <input type="number" placeholder="金額" value={newLog.price} onChange={e => setNewLog({...newLog, price: e.target.value})} className="flex-1 h-8 px-2 bg-gray-50 rounded-lg text-[10px] outline-none" />
                </div>
                <div className="flex gap-2">
                  <input required placeholder="紀錄內容..." value={newLog.detail} onChange={e => setNewLog({...newLog, detail: e.target.value})} className="flex-grow h-9 px-3 bg-gray-50 rounded-lg text-[11px] outline-none" />
                  <button
                    disabled={isLogAdding}
                    className="px-4 bg-gray-900 text-white text-[11px] font-bold rounded-lg flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLogAdding ? (
                      <>
                        <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>新增中</span>
                      </>
                    ) : (
                      <span>新增</span>
                    )}
                  </button>
                </div>
              </form>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {itemLogs.map((log, lidx) => (
                  <div key={log.id || lidx} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-xl transition-all group">
                    <div className="flex items-center gap-3">
                      <div className={`w-1.5 h-1.5 rounded-full ${log.type === '維修' ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                      <div>
                        <p className="text-xs font-bold text-gray-700">{log.detail || Object.values(log)[4]}</p>
                        <p className="text-[10px] text-gray-300">{formatDate(log.date || Object.values(log)[2])} • 已過 {calculateDuration(log.date || Object.values(log)[2])}</p>
                      </div>
                    </div>
                    <button onClick={() => handleDeleteLog(log.id || Object.values(log)[0])} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings & Add Modals Simplified (Not shown for brevity, same structure but tightened) */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsSettingsOpen(false)}></div>
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-lg font-bold mb-4">分類管理</h2>
            <div className="flex gap-2 mb-4">
              <input disabled={isAddingCategory} value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="新分類..." className="flex-grow h-10 px-3 bg-gray-50 rounded-xl text-sm outline-none disabled:opacity-50" />
              <button
                disabled={isAddingCategory}
                onClick={handleAddCategory}
                className="px-4 bg-gray-900 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAddingCategory ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>...</span>
                  </>
                ) : (
                  <span>新增</span>
                )}
              </button>
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {tempCategories.map((cat, idx) => (
                <div key={cat.id || idx} className="flex items-center justify-between p-2 text-sm text-gray-600 bg-gray-50 rounded-lg">
                  <span>{cat.name || Object.values(cat)[1]}</span>
                  <div className="flex gap-1 shrink-0">
                    <button type="button" disabled={idx === 0} onClick={() => handleMoveCategoryLocal(idx, -1)} className="w-6 h-6 flex items-center justify-center bg-white border rounded text-xs hover:text-blue-600 disabled:opacity-30 transition-all font-bold">▲</button>
                    <button type="button" disabled={idx === tempCategories.length - 1} onClick={() => handleMoveCategoryLocal(idx, 1)} className="w-6 h-6 flex items-center justify-center bg-white border rounded text-xs hover:text-blue-600 disabled:opacity-30 transition-all font-bold">▼</button>
                  </div>
                </div>
              ))}
            </div>
            <button disabled={isSavingCategoriesOrder} onClick={handleSaveCategoriesOrder} className="w-full mt-4 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-500/10 active:scale-[0.98] transition-all">{isSavingCategoriesOrder ? '儲存中...' : '儲存順序'}</button>
            <button onClick={() => setIsSettingsOpen(false)} className="w-full mt-2 py-1.5 text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors">取消</button>
          </div>
        </div>
      )}

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsAddModalOpen(false)}></div>
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">新增資產</h2>
            <form onSubmit={handleAddItem} className="space-y-4">
              <input required placeholder="名稱" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} className="w-full h-11 px-4 bg-gray-50 rounded-xl text-sm outline-none" />
              <div className="grid grid-cols-2 gap-2">
                <input placeholder="型號" value={newItem.model} onChange={e => setNewItem({...newItem, model: e.target.value})} className="h-11 px-4 bg-gray-50 rounded-xl text-sm outline-none" />
                <select required value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})} className="h-11 px-4 bg-gray-50 rounded-xl text-sm outline-none appearance-none" style={selectStyle}>
                  <option value="">選擇分類</option>
                  {sortedCategories.map((cat, idx) => <option key={idx}>{cat.name || Object.values(cat)[1]}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">購買日期</label>
                  <input type="date" value={newItem.purchase_date} onChange={e => setNewItem({...newItem, purchase_date: e.target.value})} className="w-full h-11 px-4 bg-gray-50 rounded-xl text-sm outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">價格</label>
                  <input type="number" placeholder="金額" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} className="w-full h-11 px-4 bg-gray-50 rounded-xl text-sm outline-none" />
                </div>
              </div>
              <div className="h-24 bg-gray-50 border-2 border-dashed rounded-xl flex items-center justify-center relative">
                {newItem.thumbnail ? <img src={newItem.thumbnail} className="w-full h-full object-cover rounded-xl" /> : <span className="text-xs text-gray-300 font-bold">點擊上傳縮圖</span>}
                <input type="file" accept="image/*" onChange={e => handleImageUpload(e, 'new')} className="absolute inset-0 opacity-0 cursor-pointer" />
              </div>
              <button
                type="submit"
                disabled={isAddingItem}
                className="w-full h-11 bg-blue-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-500/20 mt-2 flex items-center justify-center gap-2 disabled:bg-blue-400 disabled:cursor-not-allowed active:scale-[0.99] transition-all"
              >
                {isAddingItem ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>儲存中...</span>
                  </>
                ) : (
                  <span>儲存</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
