import { Component, createSignal, Show } from 'solid-js';
import { useAuth } from '@/composables/useAuth';
import SideMenu, { MenuItem } from '@/components/layout/SideMenu';
import { logout } from '@/stores/auth';

const menuItems: MenuItem[] = [
  { label: '预订管理', path: '/staff/reservations', icon: '📅' },
  { label: '门店管理', path: '/staff/stores', icon: '🏪' },
];

interface StaffLayoutProps {
  children?: any;
}

export const StaffLayout: Component<StaffLayoutProps> = (props) => {
  const auth = useAuth();
  const [sidebarOpen, setSidebarOpen] = createSignal(true);

  const handleLogout = () => {
    logout();
    window.location.href = '/staff/login';
  };

  return (
    <div class="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <SideMenu
        items={menuItems}
        isOpen={sidebarOpen()}
      />

      {/* Main Content */}
      <div class={`flex-1 flex flex-col transition-all ${sidebarOpen() ? 'ml-64' : 'ml-0'}`}>
        {/* Top Bar */}
        <header class="bg-white shadow-sm border-b border-gray-200 h-16 flex items-center justify-between px-6">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen())}
            class="text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>

          <div class="flex items-center gap-4">
            <Show when={auth.user()}>
              <span class="text-sm text-gray-700">{auth.user()?.name}</span>
            </Show>
            <button onClick={handleLogout} class="text-sm text-gray-700 hover:text-red-600">
              退出登录
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main class="flex-1 p-6">{props.children}</main>
      </div>
    </div>
  );
};

export default StaffLayout;
