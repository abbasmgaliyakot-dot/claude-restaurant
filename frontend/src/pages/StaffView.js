import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { LogOut, History, Search, Plus, X, ArrowLeft, Wifi, WifiOff } from 'lucide-react';

const STATUS_COLORS = {
  available: { bg: '#e8f5f0', border: '#22c55e', text: '#15803d', dot: '#22c55e' },
  running:   { bg: '#fff8ed', border: '#C9A961', text: '#92400e', dot: '#C9A961' },
  closed:    { bg: '#f3f4f6', border: '#9ca3af', text: '#6b7280', dot: '#9ca3af' },
};

export default function StaffView() {
  const { user, logout } = useAuth();
  const { connected, subscribe } = useWebSocket();
  const navigate = useNavigate();

  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [manualItem, setManualItem] = useState({ name: '', price: '', quantity: 1 });
  const [showManual, setShowManual] = useState(false);
  const [view, setView] = useState('tables'); // 'tables' | 'order'
  const [submitting, setSubmitting] = useState(false);

  const fetchTables = useCallback(async () => {
    try {
      const res = await api.get('/api/tables/');
      setTables(res.data);
    } catch {}
  }, []);

  useEffect(() => { fetchTables(); }, [fetchTables]);

  useEffect(() => {
    const unsub = subscribe((msg) => {
      if (['order_started','items_added','order_closed','item_removed'].includes(msg.type)) {
        fetchTables();
        if (selectedTable && msg.table_id === selectedTable.id) {
          setCurrentOrder(msg.order);
        }
      }
    });
    return unsub;
  }, [subscribe, fetchTables, selectedTable]);

  useEffect(() => {
    if (!search.trim()) { setMenuItems([]); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`/api/menu/?search=${encodeURIComponent(search)}`);
        setMenuItems(res.data);
      } catch {}
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const selectTable = async (table) => {
    setSelectedTable(table);
    setCart([]);
    setSearch('');
    setMenuItems([]);
    try {
      const res = await api.get(`/api/orders/table/${table.id}`);
      if (res.data) {
        setCurrentOrder(res.data);
      } else if (table.status === 'running') {
        setCurrentOrder(null);
      } else {
        setCurrentOrder(null);
      }
    } catch { setCurrentOrder(null); }
    setView('order');
  };

  const startOrder = async () => {
    try {
      const res = await api.post(`/api/orders/table/${selectedTable.id}/start`);
      setCurrentOrder(res.data);
      fetchTables();
      toast.success('Order started!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to start order');
    }
  };

  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id);
      if (existing) return prev.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { ...item, quantity: 1 }];
    });
    toast.success(`${item.name} added to cart`, { duration: 1000 });
  };

  const updateCartQty = (idx, qty) => {
    if (qty < 1) { setCart(prev => prev.filter((_, i) => i !== idx)); return; }
    setCart(prev => prev.map((c, i) => i === idx ? { ...c, quantity: qty } : c));
  };

  const addManualItem = () => {
    if (!manualItem.name || !manualItem.price) { toast.error('Enter name and price'); return; }
    setCart(prev => [...prev, { ...manualItem, price: parseFloat(manualItem.price), is_manual: true, id: `manual-${Date.now()}` }]);
    setManualItem({ name: '', price: '', quantity: 1 });
    setShowManual(false);
    toast.success('Manual item added');
  };

  const submitOrder = async () => {
    if (cart.length === 0) { toast.error('Cart is empty'); return; }
    setSubmitting(true);
    try {
      const items = cart.map(c => ({
        name: c.name, price: c.price, quantity: c.quantity,
        is_manual: c.is_manual || false,
        menu_item_id: c.is_manual ? null : c.id
      }));
      const res = await api.post(`/api/orders/table/${selectedTable.id}/items`, { items });
      setCurrentOrder(res.data);
      setCart([]);
      fetchTables();
      toast.success('Order sent!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  const cartTotal = cart.reduce((s, c) => s + c.price * c.quantity, 0);
  const orderTotal = currentOrder?.items?.reduce((s, i) => s + i.price * i.quantity, 0) || 0;

  if (view === 'order' && selectedTable) {
    return (
      <div className="min-h-screen flex flex-col" style={{background: '#f8f7f4', fontFamily: 'system-ui, sans-serif'}}>
        {/* Header */}
        <div className="sticky top-0 z-20 px-4 py-3 flex items-center gap-3 border-b border-gray-200" style={{background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)'}}>
          <button onClick={() => { setView('tables'); setSelectedTable(null); setCurrentOrder(null); setCart([]); }}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <ArrowLeft size={20} style={{color: '#374151'}} />
          </button>
          <div className="flex-1">
            <h2 className="font-bold text-gray-900">{selectedTable.name}</h2>
            <p className="text-xs text-gray-500">Cap: {selectedTable.capacity} · {selectedTable.status}</p>
          </div>
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-40">
          {/* Start order banner */}
          {!currentOrder && (
            <div className="mt-4 rounded-2xl p-5 text-center border-2 border-dashed border-amber-200" style={{background: '#fffbf0'}}>
              <p className="text-gray-600 mb-3">No active order on this table</p>
              <button onClick={startOrder}
                className="px-6 py-2.5 rounded-xl text-white font-semibold text-sm"
                style={{background: 'linear-gradient(135deg, #C9A961, #8B6914)'}}>
                Start Order
              </button>
            </div>
          )}

          {/* Current order items */}
          {currentOrder && currentOrder.items?.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-2">Current Order</h3>
              <div className="rounded-2xl overflow-hidden border border-gray-200 bg-white">
                {currentOrder.items.map((item, idx) => (
                  <div key={idx} className={`flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0 ${item.is_new ? 'bg-amber-50' : ''}`}>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">{item.name} {item.is_new && <span className="text-xs text-amber-600 font-bold">NEW</span>}</p>
                      <p className="text-xs text-gray-500">₹{item.price} × {item.quantity}</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-800">₹{(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
                <div className="px-4 py-3 flex justify-between" style={{background: '#fafafa'}}>
                  <span className="font-semibold text-gray-700">Total</span>
                  <span className="font-bold text-gray-900">₹{orderTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Menu Search */}
          {currentOrder && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-2">Add Items</h3>
              <div className="relative mb-3">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search menu items… e.g. 'butt'"
                  className="w-full h-11 pl-9 pr-4 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-amber-400 transition-colors"
                />
              </div>

              {menuItems.length > 0 && (
                <div className="rounded-2xl overflow-hidden border border-gray-200 bg-white mb-3">
                  {menuItems.map(item => (
                    <div key={item.id} className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-amber-50/50 transition-colors">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{item.name}</p>
                        <p className="text-xs text-gray-500">{item.category}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-amber-700">₹{item.price}</span>
                        <button onClick={() => addToCart(item)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                          style={{background: 'linear-gradient(135deg, #C9A961, #8B6914)'}}>
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Manual entry */}
              <button onClick={() => setShowManual(!showManual)}
                className="w-full py-2.5 rounded-xl border-2 border-dashed border-gray-300 text-sm text-gray-500 hover:border-amber-300 hover:text-amber-600 transition-colors flex items-center justify-center gap-2 mb-3">
                <Plus size={14} /> Manual Entry
              </button>

              {showManual && (
                <div className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3 mb-3">
                  <input value={manualItem.name} onChange={e => setManualItem(p => ({ ...p, name: e.target.value }))}
                    placeholder="Item name" className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-amber-400" />
                  <div className="flex gap-2">
                    <input value={manualItem.price} onChange={e => setManualItem(p => ({ ...p, price: e.target.value }))}
                      placeholder="Price (₹)" type="number" className="flex-1 h-10 px-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-amber-400" />
                    <input value={manualItem.quantity} onChange={e => setManualItem(p => ({ ...p, quantity: parseInt(e.target.value) || 1 }))}
                      type="number" min="1" className="w-20 h-10 px-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-amber-400" />
                  </div>
                  <button onClick={addManualItem}
                    className="w-full h-10 rounded-xl text-white font-semibold text-sm"
                    style={{background: 'linear-gradient(135deg, #C9A961, #8B6914)'}}>
                    Add to Cart
                  </button>
                </div>
              )}

              {/* Cart */}
              {cart.length > 0 && (
                <div className="mt-2">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-2">Cart ({cart.length})</h3>
                  <div className="rounded-2xl overflow-hidden border border-amber-200 bg-white mb-2">
                    {cart.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-800">{item.name}</p>
                          <p className="text-xs text-gray-500">₹{item.price}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => updateCartQty(idx, item.quantity - 1)} className="w-7 h-7 rounded-lg bg-gray-100 text-gray-700 flex items-center justify-center text-sm font-bold">−</button>
                          <span className="w-7 text-center text-sm font-semibold">{item.quantity}</span>
                          <button onClick={() => updateCartQty(idx, item.quantity + 1)} className="w-7 h-7 rounded-lg text-white flex items-center justify-center text-sm font-bold" style={{background: '#C9A961'}}>+</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom bar */}
        {currentOrder && cart.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-600">Cart total</span>
              <span className="font-bold text-gray-900">₹{cartTotal.toFixed(2)}</span>
            </div>
            <button onClick={submitOrder} disabled={submitting}
              className="w-full h-12 rounded-xl text-white font-semibold text-sm disabled:opacity-60"
              style={{background: 'linear-gradient(135deg, #C9A961, #8B6914)', boxShadow: '0 4px 20px rgba(201,169,97,0.4)'}}>
              {submitting ? 'Sending…' : `Send to Kitchen (${cart.length} item${cart.length > 1 ? 's' : ''})`}
            </button>
          </div>
        )}
      </div>
    );
  }

  // Tables grid
  return (
    <div className="min-h-screen" style={{background: '#f8f7f4', fontFamily: 'system-ui, sans-serif'}}>
      <div className="sticky top-0 z-20 px-4 py-3 flex items-center justify-between border-b border-gray-200" style={{background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)'}}>
        <div>
          <h1 className="font-bold text-gray-900" style={{fontFamily: "'Georgia', serif"}}>🍽️ Tables</h1>
          <p className="text-xs text-gray-500">Hi, {user?.name}</p>
        </div>
        <div className="flex items-center gap-2">
          {connected ? <Wifi size={14} className="text-green-500" /> : <WifiOff size={14} className="text-red-400" />}
          <button onClick={() => navigate('/history')} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <History size={18} style={{color: '#C9A961'}} />
          </button>
          <button onClick={logout} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <LogOut size={18} style={{color: '#6b7280'}} />
          </button>
        </div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-3 gap-3">
          {tables.map(table => {
            const colors = STATUS_COLORS[table.status] || STATUS_COLORS.available;
            return (
              <button key={table.id} onClick={() => selectTable(table)}
                className="rounded-2xl p-4 text-left border-2 transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm hover:shadow-md"
                style={{background: colors.bg, borderColor: colors.border}}>
                <div className="flex items-start justify-between mb-2">
                  <span className="text-lg font-bold" style={{color: colors.text}}>T{table.number}</span>
                  <div className="w-2.5 h-2.5 rounded-full mt-1" style={{background: colors.dot}} />
                </div>
                <p className="text-xs font-medium" style={{color: colors.text}}>{table.name}</p>
                <p className="text-xs mt-1" style={{color: colors.text, opacity: 0.7}}>Cap: {table.capacity}</p>
                <p className="text-xs font-medium mt-1 capitalize" style={{color: colors.text}}>{table.status}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
