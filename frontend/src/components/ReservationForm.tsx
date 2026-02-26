import { createEffect, createMemo, createSignal, For, Show } from 'solid-js';
import { createMutation, createQuery } from '@urql/solid';
import { useNavigate } from '@solidjs/router';
import { validateEmail, validatePhone } from '@/utils/validation';
import { GET_STORES } from '@/api/graphql/store';
import { CREATE_RESERVATION } from '@/api/graphql/reservation';
import { user } from '@/stores/auth';

interface Store {
  id: string;
  name: string;
  address: string;
  phone: string;
  tableConfig: Array<{
    id: string;
    name: string;
    seats: number;
    count: number;
  }>;
  timeSlotConfig: Array<{
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    enabled: boolean;
  }>;
  bookingRules: {
    minDaysAdvance: number;
    maxDaysAdvance: number;
  };
}

interface ReservationFormData {
  name: string;
  phone: string;
  email: string;
  date: string;
  storeId: string;
  timeSlotId: string;
  timeSlotName: string;
  tableConfigId: string;
  specialRequests: string;
  estimatedArrivalTime: string;
}

export default function ReservationForm() {
  const navigate = useNavigate();

  // 查询门店列表
  const [storesResult] = createQuery({
    query: GET_STORES,
  });

  // 创建预订 mutation
  const [createResult, createReservation] = createMutation(CREATE_RESERVATION);

  const [formData, setFormData] = createSignal<ReservationFormData>({
    name: '',
    phone: user()?.phone || '',
    email: '',
    date: '',
    storeId: '',
    timeSlotId: '',
    timeSlotName: '',
    tableConfigId: '',
    specialRequests: '',
    estimatedArrivalTime: '',
  });

  const [errors, setErrors] = createSignal<Record<string, string>>({});
  const [loading, setLoading] = createSignal(false);
  const [submitted, setSubmitted] = createSignal(false);
  const [reservationData, setReservationData] = createSignal<any>(null);

  // 获取当前选中的门店
  const currentStore = createMemo(() => {
    if (!formData().storeId || !storesResult.data?.stores) return null;
    return storesResult.data.stores.find((s: Store) => s.id === formData().storeId);
  });

  // 获取当前门店的时段配置（仅启用的）
  const timeSlots = createMemo(() => {
    const store = currentStore();
    return store?.timeSlotConfig?.filter((s: any) => s.enabled) || [];
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

  // 当门店变更时，重置日期和桌型选择
  createEffect(() => {
    const storeId = formData().storeId;
    const date = formData().date;
    // 只在门店有值且日期为空时设置默认日期
    if (storeId && !date) {
      const store = currentStore();
      if (store) {
        const { min } = dateRange();
        const dateStr = min.toISOString().split('T')[0];
        setFormData((prev) => ({ ...prev, date: dateStr }));
      }
    }
  });

  // 当用餐时段变更时，设置默认预计到达时间为时段开始时间
  createEffect(() => {
    const storeId = formData().storeId;
    const timeSlotId = formData().timeSlotId;
    const estimatedArrivalTime = formData().estimatedArrivalTime;

    if (storeId && timeSlotId && !estimatedArrivalTime) {
      const store = currentStore();
      if (store) {
        const timeSlot = store.timeSlotConfig?.find((s: any) => s.id === timeSlotId);
        if (timeSlot) {
          setFormData((prev) => ({ ...prev, estimatedArrivalTime: timeSlot.startTime }));
        }
      }
    } else if (!timeSlotId && estimatedArrivalTime) {
      // 清空时段时，也清空预计到达时间
      setFormData((prev) => ({ ...prev, estimatedArrivalTime: '' }));
    }
  });

  // 获取当前选中时段的时间范围（用于限制预计到达时间）
  const timeSlotRange = createMemo(() => {
    const store = currentStore();
    const timeSlotId = formData().timeSlotId;
    if (!store || !timeSlotId) return null;

    const timeSlot = store.timeSlotConfig?.find((s: any) => s.id === timeSlotId);
    if (!timeSlot) return null;

    return {
      start: timeSlot.startTime,
      end: timeSlot.endTime,
    };
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData().name.trim()) {
      newErrors.name = '请输入您的姓名';
    }

    if (!validatePhone(formData().phone)) {
      newErrors.phone = '请输入正确的手机号';
    }

    if (formData().email && !validateEmail(formData().email)) {
      newErrors.email = '请输入正确的邮箱地址';
    }

    if (!formData().storeId) {
      newErrors.storeId = '请选择餐厅';
    }

    if (!formData().date) {
      newErrors.date = '请选择预订日期';
    }

    if (!formData().timeSlotId) {
      newErrors.timeSlotId = '请选择用餐时间';
    }

    if (!formData().tableConfigId) {
      newErrors.tableConfigId = '请选择桌型';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const store = currentStore();
      const timeSlot = store?.timeSlotConfig?.find((s: any) => s.id === formData().timeSlotId);
      const tableConfig = store?.tableConfig?.find((t: any) => t.id === formData().tableConfigId);

      const result = await createReservation({
        input: {
          customerName: formData().name,
          customerPhone: formData().phone,
          customerEmail: formData().email || undefined,
          reservationDate: formData().date,
          storeId: formData().storeId,
          storeName: store?.name || '',
          timeSlot: timeSlot?.id || formData().timeSlotId,
          timeSlotName: timeSlot?.name || formData().timeSlotName,
          tableConfigId: formData().tableConfigId,
          tableConfigName: tableConfig?.name || '',
          specialRequests: formData().specialRequests || undefined,
          estimatedArrivalTime: formData().estimatedArrivalTime || undefined,
        },
      });

      if (result.error) {
        const errorMessage = result.error.graphQLErrors?.[0]?.message || '预订失败，请稍后重试';
        setErrors({ form: errorMessage });
        return;
      }

      // 保存预订数据用于显示
      setReservationData({
        ...result.data?.createReservation,
        storeName: store?.name,
        timeSlotName: timeSlot?.name,
        tableName: tableConfig?.name,
      });
      setSubmitted(true);
    } catch (error) {
      console.error('Reservation error:', error);
      setErrors({ form: '预订失败，请稍后重试' });
    } finally {
      setLoading(false);
    }
  };

  // 格式化日期为 YYYY-MM-DD
  const formatDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return (
    <div class="min-h-screen bg-gray-50">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页头 */}
        <div class="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-2xl shadow-xl p-8 mb-8">
          <div class="flex justify-between items-start">
            <div>
              <h1 class="text-3xl font-bold mb-2">在线预订</h1>
              <p class="text-green-100">填写以下信息完成预订</p>
            </div>
            <button
              onClick={() => navigate('/my-reservations')}
              class="px-4 py-2 bg-white text-green-600 rounded-xl hover:bg-green-50 font-medium transition-colors"
            >
              我的预订
            </button>
          </div>
        </div>

        {submitted() ? (
          <div class="bg-white rounded-2xl shadow-lg p-8">
            <div class="text-center mb-6">
              <svg
                class="w-20 h-20 text-green-600 mx-auto mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h2 class="text-2xl font-bold text-gray-900 mb-2">预订成功！</h2>
              <p class="text-gray-600">我们会尽快确认您的预订，并通过短信通知您。</p>
            </div>

            {/* 预订详情 */}
            <div class="bg-green-50 rounded-2xl p-6 space-y-4">
              <h3 class="text-lg font-semibold text-gray-900 border-b border-green-200 pb-2">预订详情</h3>

              <div class="grid grid-cols-2 gap-4">
                <div class="bg-white rounded-xl p-4">
                  <p class="text-xs text-gray-500 mb-1">预订人</p>
                  <p class="text-gray-900 font-semibold">{reservationData()?.customer?.name}</p>
                </div>
                <div class="bg-white rounded-xl p-4">
                  <p class="text-xs text-gray-500 mb-1">手机号</p>
                  <p class="text-gray-900 font-semibold">{reservationData()?.customer?.phone}</p>
                </div>
                <div class="bg-white rounded-xl p-4">
                  <p class="text-xs text-gray-500 mb-1">预订日期</p>
                  <p class="text-gray-900 font-semibold">{reservationData()?.reservationDate}</p>
                </div>
                <div class="bg-white rounded-xl p-4">
                  <p class="text-xs text-gray-500 mb-1">预计到达时间</p>
                  <p class="text-gray-900 font-semibold">{reservationData()?.estimatedArrivalTime}</p>
                </div>
                <div class="bg-white rounded-xl p-4 col-span-2">
                  <p class="text-xs text-gray-500 mb-1">餐厅</p>
                  <p class="text-gray-900 font-semibold">{reservationData()?.storeName}</p>
                </div>
                <div class="bg-white rounded-xl p-4">
                  <p class="text-xs text-gray-500 mb-1">用餐时段</p>
                  <p class="text-gray-900 font-semibold">{reservationData()?.timeSlotName}</p>
                </div>
                <div class="bg-white rounded-xl p-4">
                  <p class="text-xs text-gray-500 mb-1">桌型</p>
                  <p class="text-gray-900 font-semibold">{reservationData()?.tableConfigName}</p>
                </div>
              </div>

              <Show when={reservationData()?.specialRequests}>
                <div class="bg-amber-50 rounded-xl p-4">
                  <p class="text-xs text-amber-600 mb-1">特殊要求</p>
                  <p class="text-amber-900">{reservationData()?.specialRequests}</p>
                </div>
              </Show>
            </div>

            {/* 返回按钮 */}
            <div class="mt-6">
              <button
                type="button"
                onClick={() => navigate('/my-reservations')}
                class="w-full px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-semibold"
              >
                返回我的预订
              </button>
            </div>
          </div>
      ) : (
        <div class="bg-white rounded-2xl shadow-lg p-8 space-y-6">
          {errors().form && (
            <div class="bg-red-50 border-2 border-red-200 rounded-xl p-4 text-red-700">
              {errors().form}
            </div>
          )}

          {/* 基本信息 */}
          <div class="space-y-4">
            <h3 class="text-lg font-semibold text-gray-900">基本信息</h3>

            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-3">您的姓名 *</label>
              <input
                type="text"
                value={formData().name}
                onInput={(e) => setFormData((prev) => ({ ...prev, name: e.currentTarget.value }))}
                placeholder="请输入您的姓名"
                class={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors ${
                  errors().name ? 'border-red-300' : 'border-gray-200'
                }`}
              />
              {errors().name && <p class="mt-2 text-sm text-red-600">{errors().name}</p>}
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-3">手机号码 *</label>
                <input
                  type="tel"
                  value={formData().phone}
                  onInput={(e) => setFormData((prev) => ({ ...prev, phone: e.currentTarget.value }))}
                  placeholder="请输入手机号码"
                  class={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors ${
                    errors().phone ? 'border-red-300' : 'border-gray-200'
                  }`}
                />
                {errors().phone && <p class="mt-2 text-sm text-red-600">{errors().phone}</p>}
              </div>
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-3">邮箱地址</label>
                <input
                  type="email"
                  value={formData().email}
                  onInput={(e) => setFormData((prev) => ({ ...prev, email: e.currentTarget.value }))}
                  placeholder="请输入邮箱地址（选填）"
                  class={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors ${
                    errors().email ? 'border-red-300' : 'border-gray-200'
                  }`}
                />
                {errors().email && <p class="mt-2 text-sm text-red-600">{errors().email}</p>}
              </div>
            </div>
          </div>

          {/* 预订信息 */}
          <div class="space-y-4">
            <h3 class="text-lg font-semibold text-gray-900">预订信息</h3>

            {/* 餐厅选择 */}
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-3">选择餐厅 *</label>
              <Show
                when={!storesResult.fetching}
                fallback={<div class="text-gray-500">加载中...</div>}
              >
                <select
                  value={formData().storeId}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      storeId: e.currentTarget.value,
                      timeSlotId: '',
                      tableConfigId: '',
                      date: '',
                    }))
                  }
                  class={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors ${
                    errors().storeId ? 'border-red-300' : 'border-gray-200'
                  }`}
                >
                  <option value="">请选择餐厅</option>
                  <For each={storesResult.data?.stores || []}>
                    {(store: Store) => (
                      <option value={store.id}>
                        {store.name}
                      </option>
                    )}
                  </For>
                </select>
              </Show>
              {errors().storeId && <p class="mt-2 text-sm text-red-600">{errors().storeId}</p>}
            </div>

            {/* 预订日期 - 根据门店规则显示范围 */}
            <Show when={currentStore()}>
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-3">预订日期 *</label>
                <input
                  type="date"
                  value={formData().date}
                  min={formatDateString(dateRange().min)}
                  max={formatDateString(dateRange().max)}
                  onInput={(e) => setFormData((prev) => ({ ...prev, date: e.currentTarget.value }))}
                  class={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors ${
                    errors().date ? 'border-red-300' : 'border-gray-200'
                  }`}
                />
                <p class="mt-2 text-xs text-gray-500">
                  可预订范围：{formatDateString(dateRange().min)} 至{' '}
                  {formatDateString(dateRange().max)}
                </p>
                {errors().date && <p class="mt-2 text-sm text-red-600">{errors().date}</p>}
              </div>
            </Show>

            {/* 时段选择 - 根据门店配置 */}
            <Show when={currentStore() && timeSlots().length > 0}>
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-3">用餐时间 *</label>
                <div class="grid grid-cols-3 gap-3">
                  <For each={timeSlots()}>
                    {(slot: any) => (
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            timeSlotId: slot.id,
                            timeSlotName: slot.name,
                          }))
                        }
                        class={`px-4 py-3 rounded-xl border-2 transition-all ${
                          formData().timeSlotId === slot.id
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
                {errors().timeSlotId && (
                  <p class="mt-2 text-sm text-red-600">{errors().timeSlotId}</p>
                )}
              </div>
            </Show>

            {/* 桌型选择 */}
            <Show when={currentStore() && tableConfigs().length > 0}>
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-3">桌型选择 *</label>
                <div class="grid grid-cols-3 gap-3">
                  <For each={tableConfigs()}>
                    {(config: any) => (
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            tableConfigId: config.id,
                          }))
                        }
                        class={`px-4 py-3 rounded-xl border-2 transition-all ${
                          formData().tableConfigId === config.id
                            ? 'border-green-500 bg-green-50 text-green-700 font-medium'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div class="text-sm font-medium">{config.name}</div>
                      </button>
                    )}
                  </For>
                </div>
                {errors().tableConfigId && (
                  <p class="mt-2 text-sm text-red-600">{errors().tableConfigId}</p>
                )}
              </div>
            </Show>

            {/* 预计到达时间 */}
            <Show when={timeSlotRange()}>
              {(range) => (
                <div>
                  <label class="block text-sm font-semibold text-gray-700 mb-3">预计到达时间</label>
                  <input
                    type="time"
                    value={formData().estimatedArrivalTime}
                    min={range().start}
                    max={range().end}
                    onInput={(e) =>
                      setFormData((prev) => ({ ...prev, estimatedArrivalTime: e.currentTarget.value }))
                    }
                    class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                  />
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
                value={formData().specialRequests}
                onInput={(e) =>
                  setFormData((prev) => ({ ...prev, specialRequests: e.currentTarget.value }))
                }
                placeholder="如有特殊要求请填写（选填）"
                rows="3"
                class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
              />
            </div>
          </div>

          {/* 返回和提交按钮 */}
          <div class="flex gap-4">
            <button
              type="button"
              onClick={() => navigate('/my-reservations')}
              class="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-semibold"
            >
              返回
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading() || createResult.fetching}
              class="flex-1 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold transition-colors"
            >
              {loading() || createResult.fetching ? '提交中...' : '提交'}
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
