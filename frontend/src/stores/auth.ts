import { createStore } from 'solid-js/store';

export type UserRole = 'admin' | 'staff' | 'customer';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  phone?: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
}

// 从 localStorage 读取初始状态
const loadFromStorage = (): AuthState => {
  const authStorage = localStorage.getItem('auth');
  if (authStorage) {
    try {
      return JSON.parse(authStorage);
    } catch {
      return { token: null, user: null };
    }
  }
  return { token: null, user: null };
};

// 保存到 localStorage
const saveToStorage = (state: AuthState) => {
  if (state.token && state.user) {
    localStorage.setItem('auth', JSON.stringify(state));
  } else {
    localStorage.removeItem('auth');
  }
};

// 创建 auth store
export const authStore = createStore(loadFromStorage());

// 计算属性
export const isAuthenticated = () => !!authStore[0].token;
export const isStaff = () => authStore[0].user?.role === 'staff' || authStore[0].user?.role === 'admin';
export const isCustomer = () => authStore[0].user?.role === 'customer';
export const user = () => authStore[0].user;

// Actions
export const login = (newToken: string, newUser: User) => {
  const state = { token: newToken, user: newUser };
  authStore[1](state);
  saveToStorage(state);
};

export const logout = () => {
  const state = { token: null, user: null };
  authStore[1](state);
  saveToStorage(state);
};

// 初始化时恢复状态
const initialState = loadFromStorage();
authStore[1](initialState);
