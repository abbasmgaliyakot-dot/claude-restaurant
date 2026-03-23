import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Plus, Trash2, Edit2, Save, X, Users, UtensilsCrossed, LayoutGrid, Settings, LogOut } from 'lucide-react';

const TABS = [
  { id: 'tables', label: 'Tables', icon: LayoutGrid },
  { id: 'menu',   label: 'Menu',   icon: UtensilsCrossed },
  { id: 'users',  label: 'Users',  icon: Users },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function AdminPanel() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('tables');

  // Tables state
  const [tables, setTables] = useState([]);
  const [newTable, setNewTable] = useState({ number: '', name: '', capacity: 4 });
  const [editTable, setEditTable] = useState(null);

  // Menu state
  const [menuItems, setMenuItems] = useState([]);
  const [newItem, setNewItem] = useState({ name: '', price: '', category: '', available: true });
  const [editItem, setEditItem] = useState(null);

  // Users state
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ username: '', password: '', name: '', role: 'staff' });

  // Settings state
  const [settings, setSettings] = useState({ tax_enabled: false, tax_rate: 10, tax_name: 'GST', restaurant_name: 'My Restaurant' });

  const fetchTables = useCallback(async () => {
    const res = await api.get('/api/tables/'); setTables(res.data);
  }, []);
  const fetchMenu = useCallback(async () => {
    const res = await api.get('/api/menu/all'); setMenuItems(res.data);
  }, []);
  const fetchUsers = useCallback(async () => {
    const res = await api.get('/api/admin/users'); setUsers(res.data);
  }, []);
  const fetchSettings = useCallback(async () => {
    const res = await api.get('/api/admin/settings'); setSettings(res.data);
  }, []);

  useEffect(() => {
    fetchTables(); fetchMenu(); fetchUsers(); fetchSettings();
  }, [fetchTables, fetchMenu, fetchUsers, fetchSettings]);

  // Tables CRUD
  const addTable = async () => {
    if (!newTable.number || !newTable.name) { toast.error('Fill all fields'); return; }
    try { await api.post('/api/tables/', { ...newTable, number: parseInt(newTable.number) }); fetchTables(); setNewTable({ number: '', name: '', capacity: 4 }); toast.success('Table added'); }
    catch (err) { toast.error(err.response?.data?.detail || 'Error'); }
  };
  const saveTable = async (t) => {
    try { await api.put(`/api/tables/${t.id}`, { name: t.name, capacity: t.capacity, number: t.number }); fetchTables(); setEditTable(null); toast.success('Saved'); }
    catch { toast.error('Error'); }
  };
  const deleteTable = async (id) => {
    if (!window.confirm('Delete table?')) return;
    await api.delete(`/api/tables/${id}`); fetchTables(); toast.success('Deleted');
  };

  // Menu CRUD
  const addItem = async () => {
    if (!newItem.name || !newItem.price || !newItem.category) { toast.error('Fill all fields'); return; }
    try { await api.post('/api/menu/', { ...newItem, price: parseFloat(newItem.price) }); fetchMenu(); setNewItem({ name: '', price: '', category: '', available: true }); toast.success('Item added'); }
    catch { toast.error('Error'); }
  };
  const saveItem = async (item) => {
    try { await api.put(`/api/menu/${item.id}`, { name: item.name, price: parseFloat(item.price), category: item.category, available: item.available }); fetchMenu(); setEditItem(null); toast.success('Saved'); }
    catch { toast.error('Error'); }
  };
  const deleteItem = async (id) => {
    await api.delete(`/api/menu/${id}`); fetchMenu(); toast.success('Deleted');
  };

  // Users CRUD
  const addUser = async () => {
    if (!newUser.username || !newUser.password || !newUser.name) { toast.error('Fill all fields'); return; }
    try { await api.post('/api/auth/register', newUser); fetchUsers(); setNewUser({ username: '', password: '', name: '', role: 'staff' }); toast.success('User created'); }
    catch (err) { toast.error(err.response?.data?.detail || 'Error'); }
  };
  const deleteUser = async (id) => {
    if (!window.confirm('Delete user?')) return;
    await api.delete(`/api/admin/users/${id}`); fetchUsers(); toast.success('Deleted');
  };

  // Settings
  const saveSettings = async () => {
    try { await api.put('/api/admin/settings', settings); toast.success('Settings saved'); }
    catch { toast.error('Error'); }
  };

  const inputClass = "h-10 px-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-amber-400 bg-white w-full";
  const btnClass = "h-10 px-4 rounded-xl text-white text-sm font-semibold flex items-center gap-1.5";

  return (
    <div className="min-h-screen" style={{background: '#f8f7f4', fontFamily: 'system-ui, sans-serif'}}>
      {/* Header */}
      <div className="sticky top-0 z-20 px-6 py-4 flex items-center justify-between border-b border-gray-200" style={{background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)'}}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">⚙️</span>
          <h1 className="font-bold text-gray-900 text-lg" style={{fontFamily: "'Georgia', serif"}}>Admin Panel</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate('/reception')} className="px-3 py-1.5 text-sm rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600">Dashboard</button>
          <button onClick={logout} className="p-2 rounded-xl hover:bg-gray-100"><LogOut size={16} className="text-gray-500" /></button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-6 pt-4">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === t.id ? 'text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
              style={tab === t.id ? {background: 'linear-gradient(135deg, #C9A961, #8B6914)'} : {}}>
              <Icon size={14}/>{t.label}
            </button>
          );
        })}
      </div>

      <div className="p-6 max-w-4xl">
        {/* TABLES TAB */}
        {tab === 'tables' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-800 mb-3">Add New Table</h3>
              <div className="flex gap-2">
                <input value={newTable.number} onChange={e => setNewTable(p => ({...p, number: e.target.value}))} placeholder="No." className={inputClass} style={{width: '70px'}} />
                <input value={newTable.name} onChange={e => setNewTable(p => ({...p, name: e.target.value}))} placeholder="Table Name" className={inputClass} />
                <input value={newTable.capacity} onChange={e => setNewTable(p => ({...p, capacity: e.target.value}))} type="number" placeholder="Cap" className={inputClass} style={{width: '80px'}} />
                <button onClick={addTable} className={btnClass} style={{background: 'linear-gradient(135deg, #C9A961, #8B6914)', minWidth: '90px'}}><Plus size={14}/>Add</button>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              {tables.map(t => (
                <div key={t.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0">
                  {editTable?.id === t.id ? (
                    <>
                      <input value={editTable.name} onChange={e => setEditTable(p => ({...p, name: e.target.value}))} className={inputClass} />
                      <input value={editTable.capacity} onChange={e => setEditTable(p => ({...p, capacity: e.target.value}))} type="number" className={inputClass} style={{width: '80px'}} />
                      <button onClick={() => saveTable(editTable)} className="p-2 rounded-lg text-green-600 hover:bg-green-50"><Save size={16}/></button>
                      <button onClick={() => setEditTable(null)} className="p-2 rounded-lg text-gray-400 hover:bg-gray-50"><X size={16}/></button>
                    </>
                  ) : (
                    <>
                      <span className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white" style={{background: 'linear-gradient(135deg, #C9A961, #8B6914)'}}>{t.number}</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">{t.name}</p>
                        <p className="text-xs text-gray-400">Capacity: {t.capacity} · {t.status}</p>
                      </div>
                      <button onClick={() => setEditTable({...t})} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><Edit2 size={14}/></button>
                      <button onClick={() => deleteTable(t.id)} className="p-2 rounded-lg hover:bg-red-50 text-red-400"><Trash2 size={14}/></button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MENU TAB */}
        {tab === 'menu' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-800 mb-3">Add Menu Item</h3>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <input value={newItem.name} onChange={e => setNewItem(p => ({...p, name: e.target.value}))} placeholder="Item Name" className={inputClass} />
                <input value={newItem.price} onChange={e => setNewItem(p => ({...p, price: e.target.value}))} type="number" placeholder="Price (₹)" className={inputClass} />
                <input value={newItem.category} onChange={e => setNewItem(p => ({...p, category: e.target.value}))} placeholder="Category" className={inputClass} />
                <button onClick={addItem} className={`${btnClass} justify-center`} style={{background: 'linear-gradient(135deg, #C9A961, #8B6914)'}}><Plus size={14}/>Add Item</button>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              {menuItems.map(item => (
                <div key={item.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0">
                  {editItem?.id === item.id ? (
                    <>
                      <input value={editItem.name} onChange={e => setEditItem(p => ({...p, name: e.target.value}))} className={inputClass} />
                      <input value={editItem.price} onChange={e => setEditItem(p => ({...p, price: e.target.value}))} type="number" className={inputClass} style={{width: '90px'}} />
                      <input value={editItem.category} onChange={e => setEditItem(p => ({...p, category: e.target.value}))} className={inputClass} />
                      <select value={editItem.available} onChange={e => setEditItem(p => ({...p, available: e.target.value === 'true'}))} className={inputClass} style={{width: '100px'}}>
                        <option value="true">Active</option><option value="false">Inactive</option>
                      </select>
                      <button onClick={() => saveItem(editItem)} className="p-2 rounded-lg text-green-600 hover:bg-green-50"><Save size={16}/></button>
                      <button onClick={() => setEditItem(null)} className="p-2 rounded-lg text-gray-400 hover:bg-gray-50"><X size={16}/></button>
                    </>
                  ) : (
                    <>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">{item.name} {!item.available && <span className="text-xs text-red-400">(Inactive)</span>}</p>
                        <p className="text-xs text-gray-400">{item.category} · ₹{item.price}</p>
                      </div>
                      <button onClick={() => setEditItem({...item})} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><Edit2 size={14}/></button>
                      <button onClick={() => deleteItem(item.id)} className="p-2 rounded-lg hover:bg-red-50 text-red-400"><Trash2 size={14}/></button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* USERS TAB */}
        {tab === 'users' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-800 mb-3">Add Staff User</h3>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <input value={newUser.name} onChange={e => setNewUser(p => ({...p, name: e.target.value}))} placeholder="Full Name" className={inputClass} />
                <input value={newUser.username} onChange={e => setNewUser(p => ({...p, username: e.target.value}))} placeholder="Username" className={inputClass} />
                <input value={newUser.password} onChange={e => setNewUser(p => ({...p, password: e.target.value}))} type="password" placeholder="Password" className={inputClass} />
                <select value={newUser.role} onChange={e => setNewUser(p => ({...p, role: e.target.value}))} className={inputClass}>
                  <option value="staff">Staff</option>
                  <option value="reception">Reception</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button onClick={addUser} className={btnClass} style={{background: 'linear-gradient(135deg, #C9A961, #8B6914)'}}><Plus size={14}/>Add User</button>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              {users.map(u => (
                <div key={u.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold" style={{background: 'linear-gradient(135deg, #C9A961, #8B6914)'}}>
                    {u.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{u.name}</p>
                    <p className="text-xs text-gray-400">@{u.username} · <span className="capitalize">{u.role}</span></p>
                  </div>
                  {u.username !== 'admin' && (
                    <button onClick={() => deleteUser(u.id)} className="p-2 rounded-lg hover:bg-red-50 text-red-400"><Trash2 size={14}/></button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SETTINGS TAB */}
        {tab === 'settings' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5 max-w-md">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">Restaurant Name</label>
              <input value={settings.restaurant_name || ''} onChange={e => setSettings(p => ({...p, restaurant_name: e.target.value}))} className={inputClass} />
            </div>
            <div className="flex items-center justify-between py-2 border-t border-gray-100">
              <div>
                <p className="text-sm font-medium text-gray-800">Enable Tax</p>
                <p className="text-xs text-gray-400">Apply tax to all bills</p>
              </div>
              <button onClick={() => setSettings(p => ({...p, tax_enabled: !p.tax_enabled}))}
                className={`w-12 h-6 rounded-full transition-colors relative ${settings.tax_enabled ? '' : 'bg-gray-200'}`}
                style={settings.tax_enabled ? {background: 'linear-gradient(135deg, #C9A961, #8B6914)'} : {}}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.tax_enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>
            {settings.tax_enabled && (
              <>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">Tax Name</label>
                  <input value={settings.tax_name || ''} onChange={e => setSettings(p => ({...p, tax_name: e.target.value}))} placeholder="GST / VAT / Sales Tax" className={inputClass} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">Tax Rate (%)</label>
                  <input value={settings.tax_rate || ''} onChange={e => setSettings(p => ({...p, tax_rate: parseFloat(e.target.value) || 0}))} type="number" min="0" max="100" step="0.1" className={inputClass} />
                </div>
              </>
            )}
            <button onClick={saveSettings} className={`${btnClass} w-full justify-center`} style={{background: 'linear-gradient(135deg, #C9A961, #8B6914)'}}>
              <Save size={14}/> Save Settings
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
