import { createEffect, createSignal, For, Index, Show } from 'solid-js';
import { createMutation } from '@urql/solid';
import { UPDATE_STORE_CONFIG } from '@/api/graphql/store';
import BaseInput from '@/components/ui/BaseInput';
import Button from '@/components/ui/Button';

interface TableConfig {
  id?: string;
  name: string;
  seats: number;
  count: number;
}

interface TimeSlotConfig {
  id?: string;
  name: string;
  startTime: string;
  endTime: string;
  enabled: boolean;
}

interface BookingRules {
  minDaysAdvance?: number;
  maxDaysAdvance?: number;
}

interface StoreData {
  id?: string;
  name?: string;
  address?: string;
  phone?: string;
  description?: string;
  tableConfig?: TableConfig[];
  timeSlotConfig?: TimeSlotConfig[];
  bookingRules?: BookingRules;
}

interface StoreConfigProps {
  storeId?: string | null;
  storeData?: StoreData;
  onSaved?: () => void;
  onCancel?: () => void;
}

export default function StoreConfig(props: StoreConfigProps) {
  // States
  const [saving, setSaving] = createSignal(false);
  const [warnings, setWarnings] = createSignal<string[]>([]);
  const [errors, setErrors] = createSignal<Record<string, string>>({});

  // Form data
  const [name, setName] = createSignal('');
  const [address, setAddress] = createSignal('');
  const [phone, setPhone] = createSignal('');
  const [description, setDescription] = createSignal('');
  const [tableConfig, setTableConfig] = createSignal<TableConfig[]>([]);
  const [timeSlotConfig, setTimeSlotConfig] = createSignal<TimeSlotConfig[]>([]);
  const [minDaysAdvance, setMinDaysAdvance] = createSignal(0);
  const [maxDaysAdvance, setMaxDaysAdvance] = createSignal(30);

  // Mutations
  const [updateResult, executeUpdateConfig] = createMutation(UPDATE_STORE_CONFIG);

  // Generate temp ID
  function generateTempId(): string {
    return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Table config operations
  function addTableConfig() {
    setTableConfig((prev) => [...prev, { id: generateTempId(), name: '', seats: 2, count: 1 }]);
  }

  function removeTableConfig(index: number) {
    setTableConfig((prev) => prev.filter((_, i) => i !== index));
  }

  function updateTableConfig(index: number, field: keyof TableConfig, value: any) {
    setTableConfig((prev) => {
      const newConfig = prev.map((item, i) => (i === index ? { ...item, [field]: value } : item));
      return newConfig;
    });
  }

  // Time slot config operations
  function addTimeSlotConfig() {
    setTimeSlotConfig((prev) => [
      ...prev,
      { id: generateTempId(), name: '', startTime: '11:00', endTime: '13:00', enabled: true },
    ]);
  }

  function removeTimeSlotConfig(index: number) {
    setTimeSlotConfig((prev) => prev.filter((_, i) => i !== index));
  }

  function updateTimeSlotConfig(index: number, field: keyof TimeSlotConfig, value: any) {
    setTimeSlotConfig((prev) => {
      const newConfig = prev.map((item, i) => (i === index ? { ...item, [field]: value } : item));
      return newConfig;
    });
  }

  // Clean __typename from objects
  function cleanTypename(obj: any): any {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }
    if (Array.isArray(obj)) {
      return obj.map(cleanTypename);
    }
    const cleaned: any = {};
    for (const key in obj) {
      if (key !== '__typename') {
        cleaned[key] = cleanTypename(obj[key]);
      }
    }
    return cleaned;
  }

  // Validate form
  function validateForm(): boolean {
    const newErrors: Record<string, string> = {};
    setWarnings([]);

    // Basic info validation
    if (!name().trim()) {
      newErrors.name = '请输入门店名称';
    }
    if (!address().trim()) {
      newErrors.address = '请输入门店地址';
    }

    // Table config validation
    tableConfig().forEach((table, index) => {
      if (!table.name) {
        newErrors[`table_${index}_name`] = '请输入桌型名称';
      }
      if (table.seats < 1 || table.seats > 20) {
        newErrors[`table_${index}_seats`] = '座位数必须在1-20之间';
      }
      if (table.count < 1 || table.count > 50) {
        newErrors[`table_${index}_count`] = '数量必须在1-50之间';
      }
    });

    // Time slot validation
    timeSlotConfig().forEach((slot, index) => {
      if (!slot.name) {
        newErrors[`slot_${index}_name`] = '请输入时段名称';
      }
      if (slot.startTime >= slot.endTime) {
        newErrors[`slot_${index}_time`] = '结束时间必须大于开始时间';
      }
    });

    // Booking rules validation
    if (minDaysAdvance() < 0) {
      newErrors.minDaysAdvance = '最少提前天数不能为负数';
    }
    if (maxDaysAdvance() < 1) {
      newErrors.maxDaysAdvance = '最多提前天数至少为1天';
    }
    if (minDaysAdvance() > maxDaysAdvance()) {
      newErrors.daysAdvance = '最少提前天数不能大于最多提前天数';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  // Handle save (create or update)
  async function handleSave() {
    // 防止重复提交
    if (saving()) {
      return;
    }

    if (!validateForm()) {
      const errorMessages = Object.values(errors());
      if (errorMessages.length > 0) {
        alert('请修正表单错误：\n' + errorMessages.join('\n'));
      }
      return;
    }

    setSaving(true);
    try {
      const result = await executeUpdateConfig({
        storeId: props.storeId || undefined,
        input: cleanTypename({
          name: name().trim(),
          address: address().trim(),
          phone: phone().trim() || undefined,
          description: description().trim() || '',
          tableConfig: tableConfig(),
          timeSlotConfig: timeSlotConfig(),
          bookingRules: {
            minDaysAdvance: minDaysAdvance(),
            maxDaysAdvance: maxDaysAdvance(),
          },
        }),
      });

      if (result.data?.updateStoreConfig) {
        props.onSaved?.();
      }
    } catch (err: any) {
      console.error('Save failed:', err);
      let errorMessage = props.storeId ? '保存门店配置失败，请重试' : '创建门店失败，请重试';
      if (err?.message) {
        errorMessage = err.message;
      } else if (err?.graphQLErrors?.length > 0) {
        errorMessage = err.graphQLErrors.map((e: any) => e.message).join('\n');
      }
      alert(errorMessage);
    } finally {
      setSaving(false);
    }
  }

  // Load store data when props change
  createEffect(() => {
    const data = props.storeData;
    const id = props.storeId;

    if (data) {
      setName(data.name || '');
      setAddress(data.address || '');
      setPhone(data.phone || '');
      setDescription(data.description || '');
      setTableConfig([...(data.tableConfig || [])]);
      setTimeSlotConfig([...(data.timeSlotConfig || [])]);
      setMinDaysAdvance(data.bookingRules?.minDaysAdvance ?? 0);
      setMaxDaysAdvance(data.bookingRules?.maxDaysAdvance ?? 30);
    } else if (!id) {
      // New store mode, init defaults
      setName('');
      setAddress('');
      setPhone('');
      setDescription('');
      setTableConfig([]);
      setTimeSlotConfig([]);
      setMinDaysAdvance(0);
      setMaxDaysAdvance(30);
    }
  });

  return (
    <div class="store-config">
      {/* Config Form */}
      <div class="space-y-6">
        {/* Basic Info */}
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">基本信息</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <BaseInput
              value={name}
              onInput={(e) => setName(e.currentTarget.value)}
              label="门店名称"
              placeholder="请输入门店名称"
              error={errors().name}
            />
            <BaseInput
              value={phone}
              onInput={(e) => setPhone(e.currentTarget.value)}
              label="联系电话"
              placeholder="请输入联系电话"
              error={errors().phone}
            />
            <div class="md:col-span-2">
              <BaseInput
                value={address}
                onInput={(e) => setAddress(e.currentTarget.value)}
                label="门店地址"
                placeholder="请输入门店地址"
                error={errors().address}
              />
            </div>
            <div class="md:col-span-2">
              <label class="block text-sm font-medium text-gray-700 mb-1">门店描述</label>
              <textarea
                value={description()}
                onInput={(e) => setDescription(e.currentTarget.value)}
                placeholder="请输入门店描述（如：营业时间、特色服务等）"
                rows="3"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Table Config */}
        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-gray-900">桌型配置</h3>
            <Button onClick={addTableConfig} variant="secondary" size="sm">
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              添加桌型
            </Button>
          </div>
          <div class="space-y-4">
            <Index each={tableConfig()}>
              {(table, index) => (
                <div class="flex items-end space-x-4 p-4 bg-gray-50 rounded-lg">
                  <div class="flex-1">
                    <label class="block text-sm font-medium text-gray-700 mb-1">桌型名称</label>
                    <input
                      value={table().name}
                      onInput={(e) => updateTableConfig(index, 'name', e.currentTarget.value)}
                      type="text"
                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="如：两人桌"
                    />
                    <Show when={errors()[`table_${index}_name`]}>
                      <span class="text-sm text-red-600">{errors()[`table_${index}_name`]}</span>
                    </Show>
                  </div>
                  <div class="w-24">
                    <label class="block text-sm font-medium text-gray-700 mb-1">座位数</label>
                    <input
                      value={table().seats}
                      onInput={(e) =>
                        updateTableConfig(index, 'seats', parseInt(e.currentTarget.value) || 0)
                      }
                      type="number"
                      min="1"
                      max="20"
                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div class="w-24">
                    <label class="block text-sm font-medium text-gray-700 mb-1">数量</label>
                    <input
                      value={table().count}
                      onInput={(e) =>
                        updateTableConfig(index, 'count', parseInt(e.currentTarget.value) || 0)
                      }
                      type="number"
                      min="1"
                      max="50"
                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    onClick={() => removeTableConfig(index)}
                    class="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              )}
            </Index>
            <Show when={tableConfig().length === 0}>
              <p class="text-sm text-gray-500 text-center py-4">暂无桌型配置，点击上方按钮添加</p>
            </Show>
          </div>
        </div>

        {/* Time Slot Config */}
        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-gray-900">时段配置</h3>
            <Button onClick={addTimeSlotConfig} variant="secondary" size="sm">
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              添加时段
            </Button>
          </div>
          <div class="space-y-4">
            <Index each={timeSlotConfig()}>
              {(slot, index) => (
                <div class="flex items-end space-x-4 p-4 bg-gray-50 rounded-lg">
                  <div class="flex-1">
                    <label class="block text-sm font-medium text-gray-700 mb-1">时段名称</label>
                    <input
                      value={slot().name}
                      onInput={(e) => updateTimeSlotConfig(index, 'name', e.currentTarget.value)}
                      type="text"
                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="如：午餐时段"
                    />
                  </div>
                  <div class="w-32">
                    <label class="block text-sm font-medium text-gray-700 mb-1">开始时间</label>
                    <input
                      value={slot().startTime}
                      onInput={(e) =>
                        updateTimeSlotConfig(index, 'startTime', e.currentTarget.value)
                      }
                      type="time"
                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div class="w-32">
                    <label class="block text-sm font-medium text-gray-700 mb-1">结束时间</label>
                    <input
                      value={slot().endTime}
                      onInput={(e) => updateTimeSlotConfig(index, 'endTime', e.currentTarget.value)}
                      type="time"
                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div class="w-24">
                    <label class="block text-sm font-medium text-gray-700 mb-1">状态</label>
                    <select
                      value={slot().enabled ? 'true' : 'false'}
                      onInput={(e) =>
                        updateTimeSlotConfig(index, 'enabled', e.currentTarget.value === 'true')
                      }
                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="true">启用</option>
                      <option value="false">禁用</option>
                    </select>
                  </div>
                  <button
                    onClick={() => removeTimeSlotConfig(index)}
                    class="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              )}
            </Index>
            <Show when={timeSlotConfig().length === 0}>
              <p class="text-sm text-gray-500 text-center py-4">暂无时段配置，点击上方按钮添加</p>
            </Show>
          </div>
        </div>

        {/* Booking Rules */}
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">预订规则</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">最少提前天数</label>
              <input
                value={minDaysAdvance()}
                onInput={(e) => setMinDaysAdvance(parseInt(e.currentTarget.value) || 0)}
                type="number"
                min="0"
                max="30"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p class="text-xs text-gray-500 mt-1">客人需要提前多少天预订（0表示当天可订）</p>
              <Show when={errors().minDaysAdvance}>
                <span class="text-sm text-red-600">{errors().minDaysAdvance}</span>
              </Show>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">最多提前天数</label>
              <input
                value={maxDaysAdvance()}
                onInput={(e) => setMaxDaysAdvance(parseInt(e.currentTarget.value) || 1)}
                type="number"
                min="1"
                max="365"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p class="text-xs text-gray-500 mt-1">最多可以提前多少天预订</p>
              <Show when={errors().maxDaysAdvance}>
                <span class="text-sm text-red-600">{errors().maxDaysAdvance}</span>
              </Show>
            </div>
          </div>
        </div>

        {/* Warnings */}
        <Show when={warnings().length > 0}>
          <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div class="flex">
              <svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clip-rule="evenodd"
                />
              </svg>
              <div class="ml-3">
                <h4 class="text-sm font-medium text-yellow-800">配置变更警告</h4>
                <ul class="mt-2 text-sm text-yellow-700 list-disc list-inside">
                  <For each={warnings()}>{(warning) => <li>{warning}</li>}</For>
                </ul>
              </div>
            </div>
          </div>
        </Show>

        {/* Action Buttons */}
        <div class="flex justify-end space-x-3">
          <Button onClick={() => props.onCancel?.()} variant="secondary" disabled={saving()}>
            取消
          </Button>
          <Button onClick={handleSave} variant="primary" disabled={saving()} loading={saving()}>
            {saving() ? '保存中...' : props.storeId ? '保存配置' : '创建门店'}
          </Button>
        </div>
      </div>
    </div>
  );
}
