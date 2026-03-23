import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Calendar, ReceiptText } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function HistoryPage() {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/history/${search ? `?search=${encodeURIComponent(search)}` : ''}`);
      setOrders(res.data);
    } catch {}
    setLoading(false);
  }, [search]);

  useEffect(() => {
    const t = setTimeout(fetchHistory, 300);
    return () => clearTimeout(t);
  }, [fetchHistory]);

  const fmt = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const backPath = user?.role === 'reception' ? '/reception' : '/staff';

  return (
    <div className="min-h-screen" style={{background: '#f8f7f4', fontFamily: 'system-ui, sans-serif'}}>
      <div className="sticky top-0 z-10 px-4 py-3 flex items-center gap-3 border-b border-gray-200" style={{background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)'}}>
        <button onClick={() => navigate(backPath)} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="font-bold text-gray-900" style={{fontFamily: "'Georgia', serif"}}>Order History</h1>
          <p className="text-xs text-gray-500">{orders.length} completed orders</p>
        </div>
        <ReceiptText size={20} style={{color: '#C9A961'}} />
      </div>

      <div className="p-4">
        <div className="relative mb-4">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by table or order ID…"
            className="w-full h-11 pl-9 pr-4 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-amber-400" />
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading…</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No history found</div>
        ) : (
          <div className="space-y-3">
            {orders.map(order => (
              <div key={order.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                <button className="w-full px-4 py-3 flex items-center justify-between text-left"
                  onClick={() => setExpanded(expanded === order.id ? null : order.id)}>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{order.table_name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Closed</span>
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <Calendar size={11} className="text-gray-400" />
                      <span className="text-xs text-gray-400">{fmt(order.closed_at)}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">ID: {order.id.slice(-8)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">₹{(order.total || 0).toFixed(2)}</p>
                    <p className="text-xs text-gray-400">{order.items?.length || 0} items</p>
                  </div>
                </button>

                {expanded === order.id && (
                  <div className="border-t border-gray-100 px-4 py-3">
                    <div className="space-y-1.5 mb-3">
                      {order.items?.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-gray-700">{item.name} <span className="text-gray-400">×{item.quantity}</span></span>
                          <span className="text-gray-700 font-medium">₹{(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-dashed border-gray-200 pt-2 space-y-1">
                      <div className="flex justify-between text-sm text-gray-500">
                        <span>Subtotal</span><span>₹{(order.subtotal || 0).toFixed(2)}</span>
                      </div>
                      {order.tax_amount > 0 && (
                        <div className="flex justify-between text-sm text-gray-500">
                          <span>{order.tax_name} ({order.tax_rate}%)</span><span>₹{order.tax_amount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-gray-900">
                        <span>Total</span><span>₹{(order.total || 0).toFixed(2)}</span>
                      </div>
                    </div>
                    {order.closed_by && <p className="text-xs text-gray-400 mt-2">Closed by: {order.closed_by}</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
