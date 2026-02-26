import { createMemo, createSignal, For, Show } from 'solid-js';

interface TimeSlotConfig {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  enabled: boolean;
}

interface TableConfig {
  id: string;
  name: string;
  seats: number;
  count: number;
}

interface Store {
  id: string;
  name: string;
  address: string;
  tableConfig: TableConfig[];
  timeSlotConfig: TimeSlotConfig[];
  bookingRules?: {
    minDaysAdvance: number;
    maxDaysAdvance: number;
  };
}

export interface EditFormData {
  reservationDate: string;
  storeId: string;
  storeName: string;
  timeSlot: string;
  timeSlotName: string;
  tableConfigId: string;
  tableConfigName: string;
  specialRequests: string;
  estimatedArrivalTime: string;
}

interface EditReservationModalProps {
  isOpen: boolean;
  formData: EditFormData;
  stores: Store[];
  fetching: boolean;
  onClose: () => void;
  onSave: (data: EditFormData) => void;
  onFormDataChange: (data: EditFormData) => void;
}

// 格式化日期为 YYYY-MM-DD
const formatDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function EditReservationModal(props: EditReservationModalProps) {
  // 获取当前选中的门店
  const currentStore = createMemo(() => {
    if (!props.formData.storeId || !props.stores?.length) return null;
    return props.stores.find((s) => s.id === props.formData.storeId) || null;
  });

  // 获取当前门店的时段配置（仅启用的）
  const timeSlots = createMemo(() => {
    const store = currentStore();
    return store?.timeSlotConfig?.filter((s) => s.enabled) || [];
  });

  // 获取当前门店的桌型配置
  const tableConfigs = createMemo(() => {
    const store = currentStore();
    return store?.tableConfig || [];
  });

  // 获取当前门店的预订规则
  const bookingRules = createMemo(() => {
    const store = currentStore();
    return store?.bookingRules || { minDaysAdvance: 0, maxDaysAdvance: 30 };
  });

  // 计算可选日期范围
  const dateRange = createMemo(() => {
    const rules = bookingRules();
    const today = new Date();
    const minDate = new Date(today);
    minDate.setDate(today.getDate() + rules.minDaysAdvance);
    const maxDate = new Date(today);
    maxDate.setDate(today.getDate() + rules.maxDaysAdvance);
    return { min: minDate, max: maxDate };
  });

  // 获取当前选中时段的时间范围（用于限制预计到达时间）
  const timeSlotRange = createMemo(() => {
    const store = currentStore();
    const timeSlotId = props.formData.timeSlot;
    if (!store || !timeSlotId) return null;

    const timeSlot = store.timeSlotConfig?.find((s) => s.id === timeSlotId);
    if (!timeSlot) return null;

    return {
      start: timeSlot.startTime,
      end: timeSlot.endTime,
    };
  });

  const [dialogEl, setDialogEl] = createSignal<HTMLDivElement>();

  const handleClickOutside = (e: MouseEvent) => {
    const dialog = dialogEl();
    if (dialog && !dialog.contains(e.target as Node)) {
      props.onClose();
    }
  };

  const handleSave = () => {
    // 前端校验：预计到达时间必须在时段范围内
    if (props.formData.estimatedArrivalTime && timeSlotRange()) {
      const range = timeSlotRange()!;
      if (
        props.formData.estimatedArrivalTime < range.start ||
        props.formData.estimatedArrivalTime > range.end
      ) {
        alert(`预计到达时间必须在 ${range.start}-${range.end} 之间`);
        return;
      }
    }
    props.onSave(props.formData);
  };

  return (
    <Show when={props.isOpen}>
      <div
        class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={handleClickOutside}
      >
        <div
          ref={setDialogEl}
          class="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 标题 */}
          <div class="px-6 py-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-2xl">
            <h3 class="text-xl font-bold text-gray-900">修改预订</h3>
          </div>

          {/* 表单内容 */}
          <div class="px-6 py-5 space-y-5">
            {/* 餐厅选择 */}
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-3">餐厅</label>
              <select
                value={props.formData.storeId}
                onChange={(e) => {
                  const store = props.stores.find((s) => s.id === e.currentTarget.value);
                  // 切换餐厅时，重置时段和桌型
                  props.onFormDataChange({
                    ...props.formData,
                    storeId: e.currentTarget.value,
                    storeName: store?.name || '',
                    timeSlot: '',
                    timeSlotName: '',
                    tableConfigId: '',
                    tableConfigName: '',
                    estimatedArrivalTime: '',
                  });
                }}
                class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <For each={props.stores}>
                  {(store: Store) => (
                    <option value={store.id}>
                      {store.name}
                    </option>
                  )}
                </For>
              </select>
            </div>

            {/* 预订日期 */}
            <Show when={props.formData.storeId}>
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-3">
                  预订日期
                </label>
                <Show
                  when={props.formData.reservationDate}
                  fallback={
                    <input
                      type="date"
                      min={currentStore() ? formatDateString(dateRange().min) : undefined}
                      max={currentStore() ? formatDateString(dateRange().max) : undefined}
                      onInput={(e) =>
                        props.onFormDataChange({
                          ...props.formData,
                          reservationDate: e.currentTarget.value,
                        })
                      }
                      class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  }
                >
                  <input
                    type="date"
                    value={props.formData.reservationDate}
                    min={currentStore() ? formatDateString(dateRange().min) : undefined}
                    max={currentStore() ? formatDateString(dateRange().max) : undefined}
                    onInput={(e) =>
                      props.onFormDataChange({
                        ...props.formData,
                        reservationDate: e.currentTarget.value,
                      })
                    }
                    class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </Show>
                <Show when={currentStore()}>
                  <p class="mt-2 text-xs text-gray-500">
                    可预订范围：{formatDateString(dateRange().min)} 至{' '}
                    {formatDateString(dateRange().max)}
                  </p>
                </Show>
              </div>
            </Show>

            {/* 时段选择 - 根据门店配置 */}
            <Show when={currentStore() && timeSlots().length > 0}>
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-3">用餐时间</label>
                <div class="grid grid-cols-3 gap-3">
                  <For each={timeSlots()}>
                    {(slot: TimeSlotConfig) => (
                      <button
                        type="button"
                        onClick={() =>
                          props.onFormDataChange({
                            ...props.formData,
                            timeSlot: slot.id,
                            timeSlotName: slot.name,
                            estimatedArrivalTime: slot.startTime,
                          })
                        }
                        class={`px-4 py-3 rounded-xl border-2 transition-all ${
                          props.formData.timeSlot === slot.id
                            ? 'border-green-500 bg-green-50 text-green-700 font-medium'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div class="text-sm font-medium">{slot.name}</div>
                        <div class="text-xs text-gray-500 mt-1">
                          {slot.startTime} - {slot.endTime}
                        </div>
                      </button>
                    )}
                  </For>
                </div>
              </div>
            </Show>

            {/* 桌型选择 */}
            <Show when={currentStore() && tableConfigs().length > 0}>
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-3">桌型选择</label>
                <div class="grid grid-cols-3 gap-3">
                  <For each={tableConfigs()}>
                    {(config: TableConfig) => (
                      <button
                        type="button"
                        onClick={() =>
                          props.onFormDataChange({
                            ...props.formData,
                            tableConfigId: config.id,
                            tableConfigName: config.name,
                          })
                        }
                        class={`px-4 py-3 rounded-xl border-2 transition-all ${
                          props.formData.tableConfigId === config.id
                            ? 'border-green-500 bg-green-50 text-green-700 font-medium'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div class="text-sm font-medium">{config.name}</div>
                      </button>
                    )}
                  </For>
                </div>
              </div>
            </Show>

            {/* 预计到达时间 */}
            <Show when={timeSlotRange()}>
              {(range) => (
                <div>
                  <label class="block text-sm font-semibold text-gray-700 mb-3">预计到达时间</label>
                  <Show
                    when={props.formData.estimatedArrivalTime}
                    fallback={
                      <input
                        type="time"
                        min={range().start}
                        max={range().end}
                        onInput={(e) =>
                          props.onFormDataChange({
                            ...props.formData,
                            estimatedArrivalTime: e.currentTarget.value,
                          })
                        }
                        class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    }
                  >
                    <input
                      type="time"
                      value={props.formData.estimatedArrivalTime}
                      min={range().start}
                      max={range().end}
                      onInput={(e) =>
                        props.onFormDataChange({
                          ...props.formData,
                          estimatedArrivalTime: e.currentTarget.value,
                        })
                      }
                      class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </Show>
                  <p class="mt-2 text-xs text-gray-500">
                    请选择预计到达时间（必须在用餐时段 {range().start}-{range().end} 之间）
                  </p>
                </div>
              )}
            </Show>

            {/* 特殊要求 */}
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-3">特殊要求</label>
              <textarea
                value={props.formData.specialRequests}
                onInput={(e) =>
                  props.onFormDataChange({
                    ...props.formData,
                    specialRequests: e.currentTarget.value,
                  })
                }
                placeholder="如有特殊要求请填写（选填）"
                rows="3"
                class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
              />
            </div>
          </div>

          {/* 按钮区域 */}
          <div class="px-6 py-4 bg-gray-50 flex justify-end gap-3 rounded-b-2xl border-t border-gray-200">
            <button
              type="button"
              onClick={props.onClose}
              class="px-6 py-3 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={props.fetching}
              class="px-6 py-3 text-sm font-semibold text-white bg-green-600 rounded-xl hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {props.fetching ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      </div>
    </Show>
  );
}
