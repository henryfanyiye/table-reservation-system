import { createClient, type Exchange, fetchExchange, gql } from '@urql/core';
import { map, pipe } from 'wonka';
import { logout as logoutStore, user } from '@/stores/auth';
import { toast } from '@/utils/toast';

// 类型定义
export interface AuthState {
  token: string | null;
  user: {
    id: string;
    username: string;
    name: string;
    role: 'admin' | 'staff' | 'customer';
  } | null;
}

// 从 localStorage 读取认证状态
const getAuthState = (): AuthState => {
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

// 认证错误处理 exchange
const authErrorExchange: Exchange = ({ forward }) => {
  return (ops$) => {
    return pipe(
      forward(ops$),
      map((result) => {
        // 检查 GraphQL 错误
        if (result.error && result.error.graphQLErrors) {
          for (const error of result.error.graphQLErrors) {
            const errorCode = error.extensions?.code as string;

            // 处理 UNAUTHENTICATED 错误
            if (errorCode === 'UNAUTHENTICATED') {
              // 获取当前用户角色
              const currentUser = user();
              // 清除认证状态
              logoutStore();

              // 显示登录过期提示
              toast({
                message: '登录已过期，请重新登录',
                type: 'warning',
                duration: 2000,
              });

              // 延迟跳转，让用户看到提示
              setTimeout(() => {
                // 保存当前路径用于登录后重定向
                sessionStorage.setItem('redirect', window.location.pathname);

                // 根据用户角色跳转到对应的登录页
                const loginPath = currentUser?.role === 'customer' ? '/login' : '/staff/login';
                window.location.href = loginPath;
              }, 500);

              return result;
            }

            // 处理其他 GraphQL 错误，显示错误消息
            const errorMessage = error.message || '请求失败';
            toast({
              message: errorMessage,
              type: 'error',
              duration: 3000,
            });
          }
        }
        return result;
      })
    );
  };
};

// 简化的 GraphQL 客户端
export const urqlClient = createClient({
  url: import.meta.env.VITE_GRAPHQL_URL,
  exchanges: [authErrorExchange, fetchExchange],
  requestPolicy: 'cache-and-network',
  fetchOptions: () => {
    const authState = getAuthState();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // 如果有 token，添加到 Authorization header
    if (authState.token) {
      headers['Authorization'] = `Bearer ${authState.token}`;
    }

    return { headers };
  },
});

// 导出 GraphQL 模板标签
export { gql };
