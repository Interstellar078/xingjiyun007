import React, { useState } from 'react';
import { User, Lock, Mail, Eye, EyeOff, X, ArrowRight, Loader2 } from 'lucide-react';
import { AuthService } from '../services/authService';
import { User as UserType } from '../types';
import { setAuthToken } from '../services/apiClient';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserType) => void;
  initialIsLogin?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLoginSuccess, initialIsLogin = true }) => {
  const [isLogin, setIsLogin] = useState(initialIsLogin);
  const [isLoading, setIsLoading] = useState(false);

  // Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (isOpen) {
      setIsLogin(initialIsLogin);
      setError('');
      setUsername('');
      setPassword('');
      setConfirmPassword('');
    }
  }, [isOpen, initialIsLogin]);

  if (!isOpen) return null;

  const resetForm = () => {
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setError('');
    setIsLoading(false);
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('请输入用户名和密码');
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    if (!isLogin && password.length < 6) {
      setError('密码长度至少为 6 位');
      return;
    }

    setIsLoading(true);

    try {
      if (isLogin) {
        const result = await AuthService.login(username, password);
        if (result.success && result.user) {
          onLoginSuccess(result.user);
          onClose();
        } else {
          setError(result.message || '登录失败，请重试');
        }
      } else {
        const result = await AuthService.register(username, password);
        if (result.success && result.user && result.token) {
          setAuthToken(result.token);
          onLoginSuccess(result.user);
          onClose();
        } else {
          setError(result.message || '注册失败，请重试');
        }
      }
    } catch (err) {
      setError('发生网络错误，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden transform transition-all scale-100 opacity-100">

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors z-10"
        >
          <X size={20} />
        </button>

        <div className="p-8 sm:p-10">
          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {isLogin ? '欢迎回来' : '创建账号'}
            </h2>
            <p className="text-gray-500 text-sm">
              {isLogin ? '登录以继续管理您的行程' : '开始您的星际云旅行体验'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username Input */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">用户名</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <User size={18} className="text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none bg-gray-50/50 focus:bg-white"
                  placeholder="请输入用户名"
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">
                {isLogin ? '密码' : '设置密码'}
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock size={18} className="text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none bg-gray-50/50 focus:bg-white"
                  placeholder="请输入密码"
                  autoComplete={isLogin ? "current-password" : "new-password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Confirm Password (Register Only) */}
            {!isLogin && (
              <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="block text-sm font-medium text-gray-700">确认密码</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock size={18} className="text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none bg-gray-50/50 focus:bg-white"
                    placeholder="请再次输入密码"
                    autoComplete="new-password"
                  />
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                <div className="w-1 h-1 rounded-full bg-red-500 shrink-0" />
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full relative flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-blue-500/20 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  {isLogin ? '立即登录' : '创建账号'}
                  <ArrowRight size={16} className="opacity-80" />
                </>
              )}
            </button>
          </form>

          {/* Footer / Toggle Mode */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              {isLogin ? '还可以没有账号？' : '已经有账号了？'}
              <button
                onClick={toggleMode}
                className="ml-1.5 font-medium text-blue-600 hover:text-blue-700 hover:underline transition-colors focus:outline-none"
              >
                {isLogin ? '免费注册' : '直接登录'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
