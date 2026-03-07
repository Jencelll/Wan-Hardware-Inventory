import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { User } from '../types';
import { Users, UserPlus, Loader2, ShieldCheck, Mail, Lock, User as UserIcon, Eye, EyeOff } from 'lucide-react';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { token, user: currentUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users', {
        headers: { 
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
        }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (res.ok) {
        setShowForm(false);
        fetchData();
        // Reset form? The form unmounts so it's fine.
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to create user');
      }
    } catch (error) {
      console.error(error);
      alert('Error creating user');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading && users.length === 0) {
      return (
          <div className="flex items-center justify-center h-full">
              <Loader2 className="animate-spin text-emerald-600" size={32} />
          </div>
      );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 shadow-sm border border-indigo-100">
            <Users size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-stone-900 font-display">User Management</h2>
            <p className="text-stone-500 text-sm">Manage system access and roles</p>
          </div>
        </div>
        
        {currentUser?.role === 'super_admin' && (
            <button
            onClick={() => setShowForm(!showForm)}
            className="btn-premium bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200"
            >
            <UserPlus size={18} />
            {showForm ? 'Cancel' : 'Add New User'}
            </button>
        )}
      </div>

      {showForm && (
        <div className="card-premium p-8 max-w-2xl mx-auto border-indigo-100 ring-4 ring-indigo-500/5 animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-stone-100">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                <UserPlus size={20} />
            </div>
            <div>
                <h3 className="text-lg font-bold text-stone-900">Create New Account</h3>
                <p className="text-xs text-stone-500">Add a new administrator or staff member</p>
            </div>
          </div>

          <form onSubmit={handleCreateUser} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-500 uppercase tracking-wider ml-1">Full Name</label>
                <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                    <input name="name" required className="input-refined pl-10" placeholder="John Doe" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-500 uppercase tracking-wider ml-1">Username / Email</label>
                <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                    <input name="email" required className="input-refined pl-10" placeholder="john.doe" />
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-500 uppercase tracking-wider ml-1">Password</label>
                <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                    <input 
                      name="password" 
                      type={showPassword ? "text" : "password"} 
                      required 
                      minLength={4} 
                      className="input-refined pl-10 pr-10" 
                      placeholder="••••••••" 
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors focus:outline-none"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-500 uppercase tracking-wider ml-1">Role Permission</label>
                <div className="relative">
                    <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                    <select name="role" className="input-refined pl-10 appearance-none">
                    <option value="staff">Staff (Inventory Access)</option>
                    <option value="admin">Admin (Full Access)</option>
                    {currentUser?.role === 'super_admin' && <option value="super_admin">Super Admin</option>}
                    </select>
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2.5 rounded-xl font-bold text-stone-500 hover:bg-stone-100 transition-colors text-sm">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="btn-premium bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 min-w-[140px]">
                    {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : 'Create Account'}
                </button>
            </div>
          </form>
        </div>
      )}

      <div className="card-premium overflow-hidden border border-stone-200/60 shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead className="bg-stone-50/80 border-b border-stone-200">
            <tr>
              <th className="px-6 py-4 text-[10px] font-bold text-stone-400 uppercase tracking-wider">User Profile</th>
              <th className="px-6 py-4 text-[10px] font-bold text-stone-400 uppercase tracking-wider">Role & Permissions</th>
              <th className="px-6 py-4 text-[10px] font-bold text-stone-400 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-[10px] font-bold text-stone-400 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {users.map(user => (
              <tr key={user.id} className="group hover:bg-stone-50/50 transition-colors">
                <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 font-bold text-xs border border-stone-200">
                            {user.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                            <div className="font-bold text-stone-700 text-sm">{user.name}</div>
                            <div className="text-xs text-stone-400 font-mono">{user.email}</div>
                        </div>
                    </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                    user.role === 'super_admin' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                    user.role === 'admin' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                    'bg-stone-50 text-stone-600 border-stone-200'
                  }`}>
                    {user.role === 'super_admin' && <ShieldCheck size={12} />}
                    {user.role ? user.role.replace('_', ' ') : 'staff'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Active
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                    <button className="text-xs font-bold text-stone-400 hover:text-stone-900 transition-colors">
                        Edit
                    </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
