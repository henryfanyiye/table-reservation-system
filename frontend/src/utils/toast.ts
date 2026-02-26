/**
 * 简单的 Toast 提示工具（不依赖响应式系统）
 * 用于在非组件上下文中显示提示
 */

export function toast(options: {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}) {
  const { message, type = 'info', duration = 3000 } = options;

  // 创建 toast 元素
  const toastEl = document.createElement('div');
  toastEl.className = `toast toast-${type}`;
  toastEl.textContent = message;

  // 添加样式
  Object.assign(toastEl.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    padding: '12px 20px',
    borderRadius: '8px',
    backgroundColor: getBackgroundColor(type),
    color: '#fff',
    fontSize: '14px',
    fontWeight: '500',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    zIndex: '9999',
    opacity: '0',
    transform: 'translateY(-20px)',
    transition: 'all 0.3s ease',
    maxWidth: '300px',
  });

  // 添加到页面
  document.body.appendChild(toastEl);

  // 触发动画
  requestAnimationFrame(() => {
    toastEl.style.opacity = '1';
    toastEl.style.transform = 'translateY(0)';
  });

  // 自动移除
  setTimeout(() => {
    toastEl.style.opacity = '0';
    toastEl.style.transform = 'translateY(-20px)';
    setTimeout(() => {
      if (toastEl.parentNode) {
        toastEl.parentNode.removeChild(toastEl);
      }
    }, 300);
  }, duration);
}

function getBackgroundColor(type: string): string {
  switch (type) {
    case 'success':
      return '#10b981';
    case 'error':
      return '#ef4444';
    case 'warning':
      return '#f59e0b';
    default:
      return '#3b82f6';
  }
}
