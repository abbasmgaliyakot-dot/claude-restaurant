import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { LogOut, History, Printer, ReceiptText, CheckCheck, Wifi, WifiOff, X } from 'lucide-react';

export default function ReceptionDashboard() {
  const { user, logout } = useAuth();
  const { connected, subscribe } = useWebSocket();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [tables, setTables] = useState([]);
  const [settings, setSettings] = useState(null);
  const [billModal, setBillModal] = useState(null);
  const [loading, setLoading] = useState(true);
  const printRef = useRef();

  const fetchData = useCallback(async () => {
    try {
      const [ordersRes, tablesRes] = await Promise.all([
        api.get('/api/orders/?status=running'),
        api.get('/api/tables/'),
      ]);
      setOrders(ordersRes.data);
      setTables(tablesRes.data);
    } catch {}
    setLoading(false);
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await api.get('/api/admin/settings');
      setSettings(res.data);
    } catch {}
  }, []);

  useEffect(() => { fetchData(); fetchSettings(); }, [fetchData, fetchSettings]);

  useEffect(() => {
    const unsub = subscribe((msg) => {
      if (msg.type === 'items_added') {
        setOrders(prev => {
          const exists = prev.find(o => o.id === msg.order.id);
          if (exists) return prev.map(o => o.id === msg.order.id ? msg.order : o);
          return [...prev, msg.order];
        });
        toast.success(`New items on ${msg.order.table_name}!`, { icon: '🍽️' });
      }
      if (msg.type === 'order_started') {
        setOrders(prev => [...prev, msg.order]);
        fetchData();
      }
      if (msg.type === 'order_closed' || msg.type === 'item_removed') {
        fetchData();
      }
    });
    return unsub;
  }, [subscribe, fetchData]);

  const acknowledge = async (tableId) => {
    try {
      await api.post(`/api/orders/table/${tableId}/acknowledge`);
      fetchData();
    } catch {}
  };

  const openBill = (order) => setBillModal(order);

  const closeBill = async (order) => {
    try {
      await api.post(`/api/orders/table/${order.table_id}/close`);
      setBillModal(null);
      fetchData();
      toast.success(`Table ${order.table_name} closed!`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed');
    }
  };

  const printBill = (order) => {
    const subtotal = order.items.reduce((s, i) => s + i.price * i.quantity, 0);
    const taxEnabled = settings?.tax_enabled;
    const taxRate = settings?.tax_rate || 0;
    const taxAmount = taxEnabled ? subtotal * taxRate / 100 : 0;
    const total = subtotal + taxAmount;
    const content = `
      <html><head><title>Bill</title>
      <style>body{font-family:monospace;max-width:300px;margin:0 auto;padding:16px;font-size:13px}
      h2{text-align:center;margin:0}p{text-align:center;margin:4px 0}hr{border:1px dashed #999}
      .row{display:flex;justify-content:space-between}.total{font-weight:bold;font-size:15px}</style>
      </head><body>
      <h2>${settings?.restaurant_name || 'Restaurant'}</h2>
      <p>Table: ${order.table_name} | ${order.table_number}</p>
      <p>${new Date().toLocaleString()}</p>
      <hr/>
      ${order.items.map(i => `<div class="row"><span>${i.name} x${i.quantity}</span><span>₹${(i.price*i.quantity).toFixed(2)}</span></div>`).join('')}
      <hr/>
      <div class="row"><span>Subtotal</span><span>₹${subtotal.toFixed(2)}</span></div>
      ${taxEnabled ? `<div class="row"><span>${settings?.tax_name||'Tax'} (${taxRate}%)</span><span>₹${taxAmount.toFixed(2)}</span></div>` : ''}
      <div class="row total"><span>TOTAL</span><span>₹${total.toFixed(2)}</span></div>
      <hr/><p style="margin-top:12px">Thank you!</p>
      </body></html>
    `;
    const w = window.open('', '_blank');
    w.document.write(content);
    w.document.close();
    w.print();
  };

  const hasNew = (order) => order.items?.some(i => i.is_new);

  const allTables = tables.map(t => {
    const order = orders.find(o => o.table_id === t.id);
    return { ...t, order };
  });

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{background: '#0f1923'}}>
      <div className="text-white text-lg animate-pulse">Loading dashboard…</div>
    </div>
  );

  const BillModal = ({ order }) => {
    const subtotal = order.items.reduce((s, i) => s + i.price * i.quantity, 0);
    const taxEnabled = settings?.tax_enabled;
    const taxRate = settings?.tax_rate || 0;
    const taxName = settings?.tax_name || 'Tax';
    const taxAmount = taxEnabled ? subtotal * taxRate / 100 : 0;
    const total = subtotal + taxAmount;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)'}}>
        <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-900">Bill — {order.table_name}</h3>
            <button onClick={() => setBillModal(null)} className="p-1 rounded-lg hover:bg-gray-100"><X size={18}/></button>
          </div>
          <div className="px-5 py-4 max-h-80 overflow-y-auto">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex justify-between py-2 border-b border-gray-50">
                <div>
                  <p className="text-sm font-medium text-gray-800">{item.name}</p>
                  <p className="text-xs text-gray-400">₹{item.price} × {item.quantity}</p>
                </div>
                <p className="text-sm font-semibold text-gray-800">₹{(item.price*item.quantity).toFixed(2)}</p>
              </div>
            ))}
          </div>
          <div className="px-5 py-4 border-t border-gray-100 space-y-1" style={{background: '#fafafa'}}>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span>
            </div>
            {taxEnabled && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>{taxName} ({taxRate}%)</span><span>₹{taxAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-gray-900 text-base pt-1 border-t border-gray-200">
              <span>Total</span><span>₹{total.toFixed(2)}</span>
            </div>
          </div>
          <div className="px-5 py-4 flex gap-2">
            <button onClick={() => printBill(order)}
              className="flex-1 h-10 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 flex items-center justify-center gap-1.5 hover:bg-gray-50">
              <Printer size={14}/> Print
            </button>
            <button onClick={() => closeBill(order)}
              className="flex-1 h-10 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-1.5"
              style={{background: 'linear-gradient(135deg, #C9A961, #8B6914)'}}>
              <CheckCheck size={14}/> Close Table
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen" style={{background: '#0f1923', fontFamily: 'system-ui, sans-serif'}}>
      {/* Header */}
      <div className="sticky top-0 z-20 px-6 py-4 flex items-center justify-between border-b" style={{background: 'rgba(15,25,35,0.95)', backdropFilter: 'blur(12px)', borderColor: 'rgba(201,169,97,0.2)'}}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">🍽️</span>
          <div>
            <h1 className="font-bold text-white text-lg" style={{fontFamily: "'Georgia', serif"}}>Reception Dashboard</h1>
            <p className="text-xs" style={{color: 'rgba(255,255,255,0.4)'}}>Hi, {user?.name} · {orders.length} active tables</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {connected
            ? <div className="flex items-center gap-1.5 text-xs text-green-400"><Wifi size={12}/> Live</div>
            : <div className="flex items-center gap-1.5 text-xs text-red-400"><WifiOff size={12}/> Offline</div>
          }
          <button onClick={() => navigate('/history')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors hover:bg-white/10"
            style={{color: '#C9A961', border: '1px solid rgba(201,169,97,0.3)'}}>
            <History size={13}/> History
          </button>
          <button onClick={logout} className="p-2 rounded-xl hover:bg-white/10 transition-colors">
            <LogOut size={16} className="text-gray-400" />
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Available', count: allTables.filter(t => t.status === 'available').length, color: '#22c55e' },
            { label: 'Running',   count: allTables.filter(t => t.status === 'running').length,   color: '#C9A961' },
            { label: 'New Orders',count: orders.filter(o => hasNew(o)).length,                   color: '#f87171' },
          ].map(stat => (
            <div key={stat.label} className="rounded-2xl p-4 border" style={{background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)'}}>
              <p className="text-2xl font-bold" style={{color: stat.color}}>{stat.count}</p>
              <p className="text-xs mt-1" style={{color: 'rgba(255,255,255,0.5)'}}>{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Tables grid */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {allTables.map(table => {
            const order = table.order;
            const isNew = order && hasNew(order);
            const subtotal = order?.items?.reduce((s, i) => s + i.price * i.quantity, 0) || 0;

            return (
              <div key={table.id}
                className={`rounded-2xl border transition-all duration-300 ${isNew ? 'animate-pulse-once' : ''}`}
                style={{
                  background: table.status === 'running'
                    ? 'linear-gradient(145deg, rgba(201,169,97,0.08), rgba(255,255,255,0.04))'
                    : 'rgba(255,255,255,0.03)',
                  borderColor: table.status === 'running'
                    ? (isNew ? '#f87171' : 'rgba(201,169,97,0.35)')
                    : 'rgba(255,255,255,0.07)',
                  boxShadow: isNew ? '0 0 20px rgba(248,113,113,0.2)' : 'none'
                }}>

                <div className="p-4 border-b" style={{borderColor: 'rgba(255,255,255,0.06)'}}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-white">{table.name}</p>
                      <p className="text-xs mt-0.5" style={{color: 'rgba(255,255,255,0.4)'}}>Cap: {table.capacity}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{background: table.status === 'running' ? '#C9A961' : '#22c55e'}} />
                        <span className="text-xs capitalize" style={{color: table.status === 'running' ? '#C9A961' : '#22c55e'}}>{table.status}</span>
                      </div>
                      {isNew && <span className="text-xs font-bold text-red-400 animate-bounce">NEW!</span>}
                    </div>
                  </div>
                </div>

                {order ? (
                  <div className="p-4">
                    <div className="space-y-1 max-h-32 overflow-y-auto mb-3 custom-scrollbar">
                      {order.items?.map((item, idx) => (
                        <div key={idx} className={`flex justify-between items-center text-xs py-1 px-2 rounded-lg ${item.is_new ? 'bg-red-500/10 border border-red-500/20' : ''}`}>
                          <span style={{color: item.is_new ? '#fca5a5' : 'rgba(255,255,255,0.7)'}}>
                            {item.name} ×{item.quantity}
                          </span>
                          <span style={{color: 'rgba(255,255,255,0.5)'}}>₹{(item.price*item.quantity).toFixed(0)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs" style={{color: 'rgba(255,255,255,0.4)'}}>Subtotal</span>
                      <span className="font-semibold text-white text-sm">₹{subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex gap-1.5">
                      {isNew && (
                        <button onClick={() => acknowledge(table.id)}
                          className="flex-1 h-8 rounded-xl text-xs font-medium flex items-center justify-center gap-1 border border-amber-500/30 hover:border-amber-500/60 transition-colors"
                          style={{color: '#C9A961', background: 'rgba(201,169,97,0.1)'}}>
                          <CheckCheck size={11}/> Ack
                        </button>
                      )}
                      <button onClick={() => printBill(order)}
                        className="flex-1 h-8 rounded-xl text-xs font-medium flex items-center justify-center gap-1 border border-white/10 hover:bg-white/10 transition-colors text-gray-400">
                        <Printer size={11}/> Print
                      </button>
                      <button onClick={() => openBill(order)}
                        className="flex-1 h-8 rounded-xl text-xs font-medium flex items-center justify-center gap-1 text-white"
                        style={{background: 'linear-gradient(135deg, #C9A961, #8B6914)'}}>
                        <ReceiptText size={11}/> Bill
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 text-center">
                    <p className="text-xs" style={{color: 'rgba(255,255,255,0.25)'}}>Available</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {billModal && <BillModal order={billModal} />}
    </div>
  );
}
