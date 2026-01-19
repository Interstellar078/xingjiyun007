
import React, { useState } from 'react';
import { User, Lock, LogIn, UserPlus } from 'lucide-react';
import { AuthService } from '../services/authService';
import { User as UserType } from '../types';

interface AuthModalProps {
  onLoginSuccess: (user: UserType) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('请输入用户名和密码');
      return;
    }

    if (isLogin) {
      const result = await AuthService.login(username, password);
      if (result.success && result.user) {
        onLoginSuccess(result.user);
      } else {
        setError(result.message);
      }
    } else {
      const result = await AuthService.register(username, password);
      if (result.success) {
        alert('注册成功，请登录');
        setIsLogin(true);
        setPassword('');
      } else {
        setError(result.message);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-90 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-2">星际云旅行</h2>
          <p className="text-blue-100 text-sm">行程定制报价核算系统</p>
        </div>
        
        <div className="p-8">
          <div className="flex justify-center mb-6">
            <div className="bg-gray-100 p-1 rounded-lg flex">
              <button 
                onClick={() => { setIsLogin(true); setError(''); }}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${isLogin ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                登录
              </button>
              <button 
                onClick={() => { setIsLogin(false); setError(''); }}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${!isLogin ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                注册
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User size={18} className="text-gray-400" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="请输入用户名"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock size={18} className="text-gray-400" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="请输入密码"
                />
              </div>
            </div>

            {error && (
              <div className="text-red-500 text-xs text-center bg-red-50 p-2 rounded">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              {isLogin ? <LogIn size={18} /> : <UserPlus size={18} />}
              {isLogin ? '安全登录' : '创建账号'}
            </button>
          </form>
        </div>
        <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 text-center">
             <p className="text-xs text-gray-400">
                 {isLogin ? "专业行程定制系统" : "注册后即为普通用户权限"}
             </p>
        </div>
      </div>
    </div>
  );
};
