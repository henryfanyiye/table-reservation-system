import { createSignal, For, Show } from 'solid-js';
import { createMutation, createQuery } from '@urql/solid';
import { GET_RESERVATIONS, UPDATE_RESERVATION, UPDATE_RESERVATION_STATUS, } from '@/api/graphql/reservation';
import { GET_STORES } from '@/api/graphql/store';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ReasonModal from '@/components/ui/ReasonModal';
import EditReservationModal, { type EditFormData, } from '@/components/ui/EditReservationModal';
import { logout, user } from '@/stores/auth';
import { useNavigate } from '@solidjs/router';

interface Reservation {
  id: string;
  userId?: string;
  customer: {
    name: string;
    phone: string;
    email?: string;
  };
  reservationDate: string;
  storeId: string;
  storeName: string;
  timeSlot: string;
  timeSlotName: string;
  tableConfigId: string;
  tableConfigName: string;
  status: string;
  specialRequests?: string;
  estimatedArrivalTime?: string;
  cancelReason?: string;
  createdAt: string;
}

interface Store {
  id: string;
  name: string;
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
}

export default function MyReservationsPage() {
  const navigate = useNavigate();

  const [showEditModal, setShowEditModal] = createSignal(false);
  const [editingReservationId, setEditingReservationId] = createSignal<string | null>(null);
  const [showReasonModal, setShowReasonModal] = createSignal(false);
  const [cancelingId, setCancelingId] = createSignal<string | null>(null);

  // 筛选器状态
  const [statusFilter, setStatusFilter] = createSignal<string>('all');

  // 计算默认日期范围（今天到往后7天）
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const futureDate = new Date(today);
  futureDate.setDate(today.getDate() + 7);
  const futureStr = `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, '0')}-${String(futureDate.getDate()).padStart(2, '0')}`;

  const [dateFromFilter, setDateFromFilter] = createSignal(todayStr);
  const [dateToFilter, setDateToFilter] = createSignal(futureStr);

  // 获取门店列表
  const [storesResult] = createQuery({
    query: GET_STORES,
  });

  // GraphQL 查询预订 - 只能通过 userId 查询
  const [result, refetch] = createQuery({
    query: GET_RESERVATIONS,
    variables: () => {
      const currentUser = user();
      if (!currentUser?.id) return { query: {}, pagination: { limit: 50, page: 1 } };

      return {
        query: {
          userId: currentUser.id,
          dateFrom: dateFromFilter(),
          dateTo: dateToFilter(),
        },
        pagination: { limit: 50, page: 1 },
      };
    },
    pause: () => !user()?.id,
  });

  // 更新预订 mutation
  const [updateResult, updateReservation] = createMutation(UPDATE_RESERVATION);

  // 更新预订状态 mutation
  const [, updateReservationStatus] = createMutation(UPDATE_RESERVATION_STATUS);

  // 编辑表单数据
  const [editForm, setEditForm] = createSignal<EditFormData>({
    reservationDate: '',
    storeId: '',
    storeName: '',
    timeSlot: '',
    timeSlotName: '',
    tableConfigId: '',
    tableConfigName: '',
    specialRequests: '',
    estimatedArrivalTime: '',
  });

  const data = () => result.data?.reservations?.data || [];
  const fetching = () => result.fetching;
  const error = () => result.error;

  // 状态选项
  const statusOptions = [
    { value: 'all', label: '全部状态' },
    { value: 'REQUESTED', label: '待审核' },
    { value: 'APPROVED', label: '已确认' },
    { value: 'COMPLETED', label: '已完成' },
    { value: 'CANCELLED', label: '已取消' }
  ];

  // 过滤后的预订列表
  const filteredData = () => {
    let filtered = data();

    // 状态筛选
    if (statusFilter() !== 'all') {
      filtered = filtered.filter((r: Reservation) => r.status === statusFilter());
    }

    // 日期范围筛选
    if (dateFromFilter()) {
      filtered = filtered.filter((r: Reservation) => r.reservationDate >= dateFromFilter());
    }
    if (dateToFilter()) {
      filtered = filtered.filter((r: Reservation) => r.reservationDate <= dateToFilter());
    }

    return filtered;
  };

  // 重置筛选器
  const resetFilters = () => {
    setStatusFilter('all');
    setDateFromFilter('');
    setDateToFilter('');
  };

  const handleCancel = (id: string) => {
    setCancelingId(id);
    setShowReasonModal(true);
  };

  const handleReasonConfirm = async (reason: string) => {
    const id = cancelingId();
    if (!id) return;

    const result = await updateReservationStatus({
      input: {
        reservationId: id,
        status: 'CANCELLED',
        reason,
      },
    });

    setShowReasonModal(false);
    setCancelingId(null);

    if (result.error) {
      alert('取消失败：' + (result.error.graphQLErrors?.[0]?.message || '请稍后重试'));
      return;
    }

    refetch({ requestPolicy: 'network-only' });
  };

  const handleReasonModalClose = () => {
    setShowReasonModal(false);
    setCancelingId(null);
  };

  const startEdit = (reservation: Reservation) => {
    setEditForm({
      reservationDate: reservation.reservationDate,
      storeId: reservation.storeId,
      storeName: reservation.storeName,
      timeSlot: reservation.timeSlot,
      timeSlotName: reservation.timeSlotName,
      tableConfigId: reservation.tableConfigId,
      tableConfigName: reservation.tableConfigName,
      specialRequests: reservation.specialRequests || '',
      estimatedArrivalTime: reservation.estimatedArrivalTime || '',
    });
    setEditingReservationId(reservation.id);
    setShowEditModal(true);
  };

  const cancelEdit = () => {
    setShowEditModal(false);
    setEditingReservationId(null);
  };

  const handleEdit = async (formData: EditFormData) => {
    const id = editingReservationId();
    if (!id) return;

    const store = storesResult.data?.stores?.find(
      (s: Store) => s.id === formData.storeId
    );
    const tableConfig = store?.tableConfig?.find((t) => t.id === formData.tableConfigId);

    const result = await updateReservation({
      input: {
        reservationId: id,
        reservationDate: formData.reservationDate,
        storeId: formData.storeId,
        storeName: formData.storeName,
        timeSlot: formData.timeSlot,
        timeSlotName: formData.timeSlotName,
        tableConfigId: formData.tableConfigId,
        tableConfigName: tableConfig?.name || formData.tableConfigName,
        specialRequests: formData.specialRequests || undefined,
        estimatedArrivalTime: formData.estimatedArrivalTime || undefined,
      },
    });

    if (result.error) {
      alert('修改失败：' + (result.error.graphQLErrors?.[0]?.message || '请稍后重试'));
      return;
    }

    setShowEditModal(false);
    setEditingReservationId(null);
    refetch({ requestPolicy: 'network-only' });
  };

  return (
    <div class="min-h-screen bg-gray-50">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页头 */}
        <div class="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-2xl shadow-xl p-8 mb-8">
          <div class="flex justify-between items-start">
            <div>
              <h1 class="text-3xl font-bold mb-2">我的预订</h1>
              <p class="text-green-100">欢迎，{user()?.name || user()?.phone || '用户'}</p>
            </div>
            <div class="flex gap-2">
              <a
                href="/reservation"
                class="px-4 py-2 bg-white text-green-600 rounded-xl hover:bg-green-50 font-medium transition-colors"
              >
                预订
              </a>
              <button
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                class="px-4 py-2 bg-green-700 text-white border border-green-500 rounded-xl hover:bg-green-800 font-medium transition-colors"
              >
                退出
              </button>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-2xl shadow-xl p-8">

            {/* 筛选器 */}
            <div class="mb-6 p-5 bg-gradient-to-r from-gray-50 to-green-50 rounded-2xl border-2 border-gray-100">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  筛选条件
                </h3>
                <button
                  onClick={resetFilters}
                  class="text-sm text-green-600 hover:text-green-700 font-medium flex items-center gap-1 transition-colors"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  重置
                </button>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 状态筛选 */}
                <div>
                  <label class="block text-sm font-semibold text-gray-700 mb-2">预订状态</label>
                  <select
                    value={statusFilter()}
                    onInput={(e) => setStatusFilter(e.currentTarget.value)}
                    class="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white transition-colors"
                  >
                    <For each={statusOptions}>
                      {(option) => (
                        <option value={option.value}>{option.label}</option>
                      )}
                    </For>
                  </select>
                </div>
                {/* 开始日期筛选 */}
                <div>
                  <label class="block text-sm font-semibold text-gray-700 mb-2">开始日期</label>
                  <Show
                    when={dateFromFilter()}
                    fallback={
                      <input
                        type="date"
                        onInput={(e) => setDateFromFilter(e.currentTarget.value)}
                        class="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                      />
                    }
                  >
                    <input
                      type="date"
                      value={dateFromFilter()}
                      onInput={(e) => setDateFromFilter(e.currentTarget.value)}
                      class="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                    />
                  </Show>
                </div>
                {/* 结束日期筛选 */}
                <div>
                  <label class="block text-sm font-semibold text-gray-700 mb-2">结束日期</label>
                  <Show
                    when={dateToFilter()}
                    fallback={
                      <input
                        type="date"
                        onInput={(e) => setDateToFilter(e.currentTarget.value)}
                        class="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                      />
                    }
                  >
                    <input
                      type="date"
                      value={dateToFilter()}
                      onInput={(e) => setDateToFilter(e.currentTarget.value)}
                      class="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                    />
                  </Show>
                </div>
              </div>
              {/* 筛选结果提示 */}
              <Show when={statusFilter() !== 'all' || dateFromFilter() || dateToFilter()}>
                <div class="mt-4 pt-4 border-t border-gray-200">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="text-sm text-gray-600">筛选条件：</span>
                    <Show when={statusFilter() !== 'all'}>
                      <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        状态: {statusOptions.find(o => o.value === statusFilter())?.label}
                      </span>
                    </Show>
                    <Show when={dateFromFilter()}>
                      <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                        从: {dateFromFilter()}
                      </span>
                    </Show>
                    <Show when={dateToFilter()}>
                      <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                        至: {dateToFilter()}
                      </span>
                    </Show>
                    <span class="text-sm text-gray-600 ml-auto">找到 {filteredData().length} 条记录</span>
                  </div>
                </div>
              </Show>
            </div>

            {fetching() ? (
              <LoadingSpinner />
            ) : error() ? (
              <div class="bg-red-50 border-2 border-red-200 rounded-2xl p-8 text-center">
                <svg class="w-16 h-16 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p class="text-red-800 font-medium">查询失败，请稍后重试</p>
              </div>
            ) : filteredData().length === 0 ? (
              <EmptyState
                title={data().length === 0 ? "暂无预订记录" : "没有符合筛选条件的预订"}
                message={data().length === 0 ? "未找到该手机号的预订记录，请检查手机号是否正确" : "请尝试调整筛选条件"}
              />
            ) : (
              <div class="space-y-4">
                <For each={filteredData()}>
                  {(reservation: Reservation) => {
                    return (
                      <div class="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                        <div class="p-6">
                          <div class="flex justify-between items-start mb-4">
                            <div class="flex items-center gap-4">
                              <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                                <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                              </div>
                              <div>
                                <h3 class="text-lg font-bold text-gray-900">{reservation.customer.name}</h3>
                                <p class="text-gray-500 text-sm">{reservation.customer.phone}</p>
                              </div>
                            </div>
                            <StatusBadge status={reservation.status} />
                          </div>

                          <div class="grid grid-cols-2 gap-4 mb-4">
                            <div class="bg-gray-50 rounded-xl p-4">
                              <p class="text-xs text-gray-500 mb-1">预订日期</p>
                              <p class="text-gray-900 font-semibold">{reservation.reservationDate}</p>
                            </div>
                            <Show when={reservation.estimatedArrivalTime}>
                              <div class="bg-blue-50 rounded-xl p-4">
                                <p class="text-xs text-blue-600 mb-1">预计到达时间</p>
                                <p class="text-blue-900 font-semibold">{reservation.estimatedArrivalTime}</p>
                              </div>
                            </Show>
                            <Show when={!reservation.estimatedArrivalTime}>
                              <div class="bg-gray-50 rounded-xl p-4">
                                <p class="text-xs text-gray-500 mb-1">预计到达时间</p>
                                <p class="text-gray-400 font-semibold">未设置</p>
                              </div>
                            </Show>
                          </div>

                          <div class="grid grid-cols-1 gap-4 mb-4">
                            <div class="bg-gray-50 rounded-xl p-4">
                              <p class="text-xs text-gray-500 mb-1">餐厅</p>
                              <p class="text-gray-900 font-semibold">{reservation.storeName}</p>
                            </div>
                          </div>

                          <div class="grid grid-cols-2 gap-4 mb-4">
                            <div class="bg-gray-50 rounded-xl p-4">
                              <p class="text-xs text-gray-500 mb-1">用餐时段</p>
                              <p class="text-gray-900 font-semibold">{reservation.timeSlotName}</p>
                            </div>
                            <div class="bg-gray-50 rounded-xl p-4">
                              <p class="text-xs text-gray-500 mb-1">桌型</p>
                              <p class="text-gray-900 font-semibold">{reservation.tableConfigName}</p>
                            </div>
                          </div>

                          <Show when={reservation.specialRequests}>
                            <div class="mb-4 p-4 bg-amber-50 rounded-xl">
                              <p class="text-xs text-amber-600 mb-1">特殊要求</p>
                              <p class="text-amber-900">{reservation.specialRequests}</p>
                            </div>
                          </Show>

                          <Show when={reservation.status === 'CANCELLED' && reservation.cancelReason}>
                            <div class="mb-4 p-4 bg-red-50 rounded-xl">
                              <p class="text-xs text-red-600 mb-1">取消原因</p>
                              <p class="text-red-900">{reservation.cancelReason}</p>
                            </div>
                          </Show>

                          <div class="flex gap-3">
                            <Show
                              when={
                                reservation.status === 'REQUESTED' ||
                                reservation.status === 'APPROVED'
                              }
                            >
                              <button
                                onClick={() => startEdit(reservation)}
                                class="flex-1 py-2.5 text-blue-600 bg-blue-50 border-2 border-blue-600 rounded-xl hover:bg-blue-100 font-medium transition-colors"
                              >
                                修改预订
                              </button>
                              <button
                                onClick={() => handleCancel(reservation.id)}
                                class="flex-1 py-2.5 text-red-600 bg-red-50 border-2 border-red-600 rounded-xl hover:bg-red-100 font-medium transition-colors"
                              >
                                取消预订
                              </button>
                            </Show>
                          </div>
                        </div>
                      </div>
                    );
                  }}
                </For>
              </div>
            )}
          </div>
      </div>

      <ReasonModal
        isOpen={showReasonModal()}
        title="取消预订"
        message="请输入取消原因"
        onClose={handleReasonModalClose}
        onConfirm={handleReasonConfirm}
      />

      <EditReservationModal
        isOpen={showEditModal()}
        formData={editForm()}
        stores={storesResult.data?.stores || []}
        fetching={updateResult.fetching}
        onClose={cancelEdit}
        onSave={handleEdit}
        onFormDataChange={setEditForm}
      />
    </div>
  );
}
