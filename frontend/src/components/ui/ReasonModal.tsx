import { createSignal, Show } from 'solid-js';

interface ReasonModalProps {
  isOpen: boolean;
  title: string;
  message?: string;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

export default function ReasonModal(props: ReasonModalProps) {
  const [textareaEl, setTextareaEl] = createSignal<HTMLTextAreaElement>();
  const [dialogEl, setDialogEl] = createSignal<HTMLDivElement>();

  const handleConfirm = () => {
    const el = textareaEl();
    const reason = el?.value.trim() || '';
    if (!reason) {
      el?.focus();
      return;
    }
    props.onConfirm(reason);
    if (el) el.value = '';
  };

  const handleClickOutside = (e: MouseEvent) => {
    const dialog = dialogEl();
    if (dialog && !dialog.contains(e.target as Node)) {
      props.onClose();
    }
  };

  return (
    <Show when={props.isOpen}>
      <div
        class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        onClick={handleClickOutside}
      >
        <div
          ref={setDialogEl}
          class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div class="px-6 py-4 border-b">
            <h3 class="text-lg font-semibold text-gray-900">{props.title}</h3>
          </div>
          <div class="px-6 py-4">
            <Show when={props.message}>
              <p class="text-sm text-gray-600 mb-4">{props.message}</p>
            </Show>
            <textarea
              ref={setTextareaEl}
              placeholder="请输入原因"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows="3"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  handleConfirm();
                }
              }}
            />
          </div>
          <div class="px-6 py-4 bg-gray-50 flex justify-end gap-3 rounded-b-lg">
            <button
              type="button"
              onClick={props.onClose}
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              确认
            </button>
          </div>
        </div>
      </div>
    </Show>
  );
}
