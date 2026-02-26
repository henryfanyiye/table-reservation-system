import { Component, JSX } from 'solid-js';

export interface EmptyStateProps {
  icon?: JSX.Element;
  title?: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  class?: string;
}

export const EmptyState: Component<EmptyStateProps> = (props) => {
  return (
    <div class={`flex flex-col items-center justify-center py-12 ${props.class || ''}`}>
      {props.icon || (
        <svg
          class="h-16 w-16 text-gray-400 mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      )}

      <h3 class="text-lg font-medium text-gray-900 mb-1">{props.title || '暂无数据'}</h3>

      <p class="text-gray-500 text-center max-w-sm mb-4">{props.message}</p>

      {props.action && (
        <button
          onClick={props.action.onClick}
          class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {props.action.label}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
