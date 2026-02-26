import { createSignal } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { login as loginStore } from '@/stores/auth';
import Button from '@/components/ui/Button';

interface LoginForm {
  username: string;
  password: string;
}

export default function LoginPage() {
  const navigate = useNavigate();

  // 表单数据
  const [form, setForm] = createSignal<LoginForm>({
    username: '',
    password: '',
  });

  // 状态
  const [loading, setLoading] = createSignal(false);
  const [showPassword, setShowPassword] = createSignal(false);
  const [errorMessage, setErrorMessage] = createSignal('');
  const [errors, setErrors] = createSignal<Record<string, string>>({});

  // 初始化 - 检查是否已登录（由路由守卫处理）

  // 验证用户名
  function validateUsername() {
    const f = form();
    if (!f.username) {
      setErrors((prev) => ({ ...prev, username: '请输入用户名' }));
    } else if (f.username.length < 2) {
      setErrors((prev) => ({ ...prev, username: '用户名至少需要2个字符' }));
    } else {
      setErrors((prev) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { username, ...rest } = prev;
        return rest;
      });
    }
  }

  // 验证密码
  function validatePassword() {
    const f = form();
    if (!f.password) {
      setErrors((prev) => ({ ...prev, password: '请输入密码' }));
    } else if (f.password.length < 6) {
      setErrors((prev) => ({ ...prev, password: '密码至少需要6个字符' }));
    } else {
      setErrors((prev) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, ...rest } = prev;
        return rest;
      });
    }
  }

  // 处理提交
  async function handleSubmit(e: Event) {
    e.preventDefault();

    // 清除之前的错误
    setErrorMessage('');
    setErrors({});

    // 验证表单
    validateUsername();
    validatePassword();

    if (Object.keys(errors()).length > 0) {
      return;
    }

    setLoading(true);
    try {
      const f = form();
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'staff',
          username: f.username,
          password: f.password,
        }),
      });

      if (!response.ok) {
        throw new Error('登录失败');
      }

      const data = await response.json();

      // 保存到 store (后端返回 DataResponseDto 结构，数据在 data 字段中)
      loginStore(data.data.access_token, {
        id: data.data.user.id,
        username: data.data.user.username,
        name: data.data.user.name,
        role: data.data.user.role,
      });

      // 跳转到原访问页面或默认页面
      const redirectPath = sessionStorage.getItem('redirect');
      sessionStorage.removeItem('redirect');
      navigate(redirectPath || '/staff/reservations', { replace: true });
    } catch (err: any) {
      console.error('Login failed:', err);
      setErrorMessage(err.message || '登录失败，请检查用户名和密码');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div class="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div class="max-w-md w-full">
        {/* Logo 和标题 */}
        <div class="text-center mb-8">
          <div class="flex justify-center mb-4">
            <div class="bg-white p-4 rounded-full shadow-lg">
              <svg
                class="w-12 h-12 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
          </div>
          <h2 class="text-3xl font-bold text-gray-900">餐厅管理系统</h2>
          <p class="mt-2 text-sm text-gray-600">使用您的员工账号登录</p>
        </div>

        {/* 登录表单 */}
        <div class="bg-white rounded-xl shadow-xl p-8">
          <form onSubmit={handleSubmit} class="space-y-6">
            {/* 错误提示 */}
            {errorMessage() && (
              <div class="bg-red-50 border border-red-200 rounded-lg p-4">
                <div class="flex">
                  <svg class="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clip-rule="evenodd"
                    />
                  </svg>
                  <p class="ml-3 text-sm text-red-800">{errorMessage()}</p>
                </div>
              </div>
            )}

            {/* 用户名 */}
            <div>
              <label for="username" class="block text-sm font-medium text-gray-700 mb-1">
                用户名
              </label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    class="h-5 w-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <input
                  id="username"
                  type="text"
                  value={form().username}
                  onInput={(e) => setForm((prev) => ({ ...prev, username: e.currentTarget.value }))}
                  onBlur={validateUsername}
                  required
                  class={`w-full pl-10 pr-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors().username ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="请输入用户名"
                />
              </div>
              {errors().username && <p class="mt-1 text-sm text-red-600">{errors().username}</p>}
            </div>

            {/* 密码 */}
            <div>
              <label for="password" class="block text-sm font-medium text-gray-700 mb-1">
                密码
              </label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    class="h-5 w-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
                <input
                  id="password"
                  type={showPassword() ? 'text' : 'password'}
                  value={form().password}
                  onInput={(e) => setForm((prev) => ({ ...prev, password: e.currentTarget.value }))}
                  onBlur={validatePassword}
                  required
                  class={`w-full pl-10 pr-10 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors().password ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="请输入密码"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword())}
                  class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPassword() ? (
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  ) : (
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                      />
                    </svg>
                  )}
                </button>
              </div>
              {errors().password && <p class="mt-1 text-sm text-red-600">{errors().password}</p>}
            </div>

            {/* 登录按钮 */}
            <Button type="submit" loading={loading()} class="w-full py-3 text-base">
              {loading() ? '登录中...' : '登录'}
            </Button>
          </form>
        </div>

        {/* 返回首页 */}
        <div class="mt-6 text-center">
          <a
            href="/"
            class="text-sm text-gray-500 hover:text-gray-700"
          >
            返回首页
          </a>
        </div>

        {/* 页脚 */}
        <div class="mt-6 text-center">
          <p class="text-sm text-gray-500">© 2026 餐厅管理系统. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
