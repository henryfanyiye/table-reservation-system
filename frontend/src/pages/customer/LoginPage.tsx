import { createSignal } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import Button from '@/components/ui/Button';
import { login as loginStore } from '@/stores/auth';

interface LoginForm {
  phone: string;
  code: string;
}

export default function LoginPage() {
  const navigate = useNavigate();

  // 表单数据
  const [form, setForm] = createSignal<LoginForm>({
    phone: '',
    code: '',
  });

  // 状态
  const [loading, setLoading] = createSignal(false);
  const [sendingCode, setSendingCode] = createSignal(false);
  const [countdown, setCountdown] = createSignal(0);
  const [errorMessage, setErrorMessage] = createSignal('');
  const [errors, setErrors] = createSignal<Record<string, string>>({});

  // 验证手机号
  function validatePhone() {
    const f = form();
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!f.phone) {
      setErrors((prev) => ({ ...prev, phone: '请输入手机号' }));
    } else if (!phoneRegex.test(f.phone)) {
      setErrors((prev) => ({ ...prev, phone: '请输入正确的手机号' }));
    } else {
      setErrors((prev) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { phone, ...rest } = prev;
        return rest;
      });
    }
  }

  // 验证验证码
  function validateCode() {
    const f = form();
    if (!f.code) {
      setErrors((prev) => ({ ...prev, code: '请输入验证码' }));
    } else if (f.code.length !== 6) {
      setErrors((prev) => ({ ...prev, code: '验证码必须是6位数字' }));
    } else {
      setErrors((prev) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { code, ...rest } = prev;
        return rest;
      });
    }
  }

  // 发送验证码
  async function sendCode() {
    // 清除之前的错误
    setErrorMessage('');

    // 验证手机号
    const phoneRegex = /^1[3-9]\d{9}$/;
    const f = form();
    if (!f.phone || !phoneRegex.test(f.phone)) {
      validatePhone();
      return;
    }

    setSendingCode(true);
    try {
      const response = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: f.phone }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || '发送验证码失败');
      }

      // 开始倒计时
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      console.error('Send code failed:', err);
      setErrorMessage(err.message || '发送验证码失败，请稍后重试');
    } finally {
      setSendingCode(false);
    }
  }

  // 处理提交
  async function handleSubmit(e: Event) {
    e.preventDefault();

    // 清除之前的错误
    setErrorMessage('');
    setErrors({});

    // 验证表单
    validatePhone();
    validateCode();

    const currentErrors = errors();
    if (Object.keys(currentErrors).length > 0) {
      return;
    }

    setLoading(true);
    try {
      const f = form();
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'customer',
          phone: f.phone,
          code: f.code,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || '登录失败');
      }

      const data = await response.json();

      // 保存到 auth store
      loginStore(data.data.access_token, {
        id: data.data.user.id,
        username: data.data.user.username,
        name: data.data.user.name,
        role: data.data.user.role,
        phone: data.data.user.phone,
      });

      // 跳转到我的预订页面
      navigate('/my-reservations', { replace: true });
    } catch (err: any) {
      console.error('Login failed:', err);
      setErrorMessage(err.message || '登录失败，请检查手机号和验证码');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div class="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div class="max-w-md w-full">
        {/* Logo 和标题 */}
        <div class="text-center mb-8">
          <div class="flex justify-center mb-4">
            <div class="bg-white p-4 rounded-full shadow-lg">
              <svg
                class="w-12 h-12 text-green-600"
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
          </div>
          <h2 class="text-3xl font-bold text-gray-900">餐厅预订系统</h2>
          <p class="mt-2 text-sm text-gray-600">使用手机号登录</p>
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

            {/* 手机号 */}
            <div>
              <label for="phone" class="block text-sm font-medium text-gray-700 mb-1">
                手机号
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
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                </div>
                <input
                  id="phone"
                  type="tel"
                  maxlength="11"
                  value={form().phone}
                  oninput={(e) => {
                    const value = e.currentTarget.value.replace(/\D/g, '');
                    setForm((prev) => ({ ...prev, phone: value }));
                  }}
                  onblur={validatePhone}
                  required
                  class={`w-full pl-10 pr-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${
                    errors().phone ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="请输入手机号"
                />
              </div>
              {errors().phone && <p class="mt-1 text-sm text-red-600">{errors().phone}</p>}
            </div>

            {/* 验证码 */}
            <div>
              <label for="code" class="block text-sm font-medium text-gray-700 mb-1">
                验证码
              </label>
              <div class="flex gap-2">
                <div class="relative flex-1">
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
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      />
                    </svg>
                  </div>
                  <input
                    id="code"
                    type="text"
                    maxlength="6"
                    value={form().code}
                    oninput={(e) => {
                      const value = e.currentTarget.value.replace(/\D/g, '');
                      setForm((prev) => ({ ...prev, code: value }));
                    }}
                    onblur={validateCode}
                    required
                    class={`w-full pl-10 pr-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      errors().code ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="请输入验证码"
                  />
                </div>
                <button
                  type="button"
                  onClick={sendCode}
                  disabled={countdown() > 0 || sendingCode()}
                  class={`px-4 py-2 rounded-md font-medium whitespace-nowrap ${
                    countdown() > 0 || sendingCode()
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {sendingCode() ? '发送中...' : countdown() > 0 ? `${countdown()}s` : '发送验证码'}
                </button>
              </div>
              {errors().code && <p class="mt-1 text-sm text-red-600">{errors().code}</p>}
            </div>

            {/* 登录按钮 */}
            <Button
              type="submit"
              loading={loading()}
              class="w-full py-3 text-base bg-green-600 hover:bg-green-700"
            >
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
        <div class="mt-4 text-center">
          <p class="text-sm text-gray-500">© 2026 餐厅预订系统. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
