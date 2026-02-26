import { onMount } from 'solid-js';
import { isAuthenticated, isCustomer, isStaff, logout as logoutStore, user, } from '@/stores/auth';

export function useAuth() {
  // 从 store 获取状态 - 直接使用 store 的函数
  // 不需要创建额外的 signal

  // 初始化时从 localStorage 读取
  onMount(() => {
    const authStorage = localStorage.getItem('auth');
    if (authStorage) {
      try {
        const authData = JSON.parse(authStorage);
        if (authData.token) {
          // token 已经在 store 中初始化
        }
      } catch (error) {
        console.error('Failed to parse auth storage:', error);
      }
    }
  });

  const logout = () => {
    logoutStore();
  };

  return {
    isAuthenticated,
    user,
    isStaff,
    isCustomer,
    logout,
  };
}

export default useAuth;
