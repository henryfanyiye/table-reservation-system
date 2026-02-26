import { Component, For } from 'solid-js';
import { A } from '@solidjs/router';

export interface MenuItem {
  label: string;
  path: string;
  icon?: string;
  requiredStaff?: boolean;
}

export interface SideMenuProps {
  items: MenuItem[];
  isOpen: boolean;
  class?: string;
}

export const SideMenu: Component<SideMenuProps> = (props) => {
  return (
    <aside
      class={`
        fixed left-0 top-0 h-full bg-white border-r border-gray-200 transition-transform
        ${props.isOpen ? 'translate-x-0' : '-translate-x-full'}
        z-40 w-64
        ${props.class || ''}
      `}
    >
      <div class="flex flex-col h-full">
        {/* Logo */}
        <div class="flex items-center justify-center h-16 border-b border-gray-200">
          <h1 class="text-lg font-bold text-gray-900">餐厅管理后台</h1>
        </div>

        {/* Navigation */}
        <nav class="flex-1 p-4 space-y-1">
          <For each={props.items}>
            {(item) => (
              <A
                href={item.path}
                class="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                activeClass="bg-blue-50 text-blue-600 font-medium"
              >
                {item.icon && <span class="text-xl">{item.icon}</span>}
                <span>{item.label}</span>
              </A>
            )}
          </For>
        </nav>

        {/* User Info */}
        <div class="p-4 border-t border-gray-200">
          <div class="text-sm text-gray-600">管理员</div>
        </div>
      </div>
    </aside>
  );
};

export default SideMenu;
