import { Component, createSignal, For, Show } from 'solid-js';
import { createMutation, createQuery } from '@urql/solid';
import dayjs from 'dayjs';
import { formatDate } from '@/utils/format';
import StatusBadge from '@/components/ui/StatusBadge';
import ReasonModal from '@/components/ui/ReasonModal';
import { UPDATE_RESERVATION } from '@/api/graphql/reservation';
import { GET_STORES } from '@/api/graphql/store';

export interface Reservation {
  id: string;
  customer: {
    name: string;
    phone: string;
  };
  reservationDate: string;
  createdAt: string;
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
  bookingRules: {
    minDaysAdvance: number;
    maxDaysAdvance: number;
  };
}

interface ReservationTableProps {
  reservations: Reservation[];
  loading?: boolean;
  onUpdateStatus?: (id: string, status: string, reason?: string) => void;
  onAssignTable?: (id: string, tableConfigId: string) => void;
  onUpdated?: () => void;
}

export const ReservationTable: Component<ReservationTableProps> = (props) => {
  const [showReasonModal, setShowReasonModal] = createSignal(false);
  const [modalAction, setModalAction] = createSignal<{
    id: string;
    status: string;
    title: string;
  } | null>(null);
  const [showDetailModal, setShowDetailModal] = createSignal(false);
  const [viewingReservation, setViewingReservation] = createSignal<Reservation | null>(null);

  const handleStatusUpdate = (id: string, status: string, reason?: string) => {
    props.onUpdateStatus?.(id, status, reason);
  };

  const handleCancelOrReject = (id: string, status: string, title: string) => {
    setModalAction({ id, status, title });
    setShowReasonModal(true);
  };

  const handleReasonConfirm = (reason: string) => {
    const action = modalAction();
    if (action) {
      handleStatusUpdate(action.id, action.status, reason);
    }
    setShowReasonModal(false);
    setModalAction(null);
  };

  const handleReasonModalClose = () => {
    setShowReasonModal(false);
    setModalAction(null);
  };

  const handleViewDetail = (reservation: Reservation) => {
    setViewingReservation(reservation);
    setShowDetailModal(true);
  };

  const handleDetailModalClose = () => {
    setShowDetailModal(false);
    setViewingReservation(null);
  };

  // 获取门店列表
  const [storesResult] = createQuery({
    query: GET_STORES,
  });

  // 更新预订 mutation
  const [updateResult, updateReservation] = createMutation(UPDATE_RESERVATION);

  // 编辑状态
  const [showEditModal, setShowEditModal] = createSignal(false);
  const [editingReservation, setEditingReservation] = createSignal<Reservation | null>(null);
  const [editForm, setEditForm] = createSignal({
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

  // 格式化日期为 YYYY-MM-DD
  const formatDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 获取当前预订的门店
  const getReservationStore = (reservation: Reservation) => {
    return storesResult.data?.stores?.find((s: Store) => s.id === reservation.storeId);
  };

  // 获取当前编辑表单选择的门店
  const getEditingReservationStore = () => {
    const storeId = editForm().storeId;
    if (!storeId) return null;
    return storesResult.data?.stores?.find((s: Store) => s.id === storeId);
  };

  // 计算可选日期范围
  const getDateRange = (reservation: Reservation) => {
    const store = getReservationStore(reservation);
    const rules = store?.bookingRules || { minDaysAdvance: 0, maxDaysAdvance: 30 };
    const today = new Date();
    const minDate = new Date(today);
    minDate.setDate(today.getDate() + rules.minDaysAdvance);
    const maxDate = new Date(today);
    maxDate.setDate(today.getDate() + rules.maxDaysAdvance);
    return { min: minDate, max: maxDate };
  };

  // 计算编辑预订的可选日期范围
  const getEditDateRange = () => {
    const store = getEditingReservationStore();
    const rules = store?.bookingRules || { minDaysAdvance: 0, maxDaysAdvance: 30 };
    const today = new Date();
    const minDate = new Date(today);
    minDate.setDate(today.getDate() + rules.minDaysAdvance);
    const maxDate = new Date(today);
    maxDate.setDate(today.getDate() + rules.maxDaysAdvance);
    return { min: minDate, max: maxDate };
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
    setEditingReservation(reservation);
    setShowEditModal(true);
    setShowDetailModal(false);
  };

  const cancelEdit = () => {
    setShowEditModal(false);
    setEditingReservation(null);
  };

  const handleEdit = async () => {
    const reservation = editingReservation();
    if (!reservation) return;

    // 使用表单中的 storeId 查找门店
    const store = storesResult.data?.stores?.find(
      (s: Store) => s.id === editForm().storeId
    );
    const tableConfig = store?.tableConfig?.find((t) => t.id === editForm().tableConfigId);

    // 前端校验：预计到达时间必须在时段范围内
    if (editForm().estimatedArrivalTime) {
      const timeSlot = store?.timeSlotConfig?.find((s) => s.id === editForm().timeSlot);
      if (timeSlot) {
        if (editForm().estimatedArrivalTime < timeSlot.startTime ||
            editForm().estimatedArrivalTime > timeSlot.endTime) {
          alert(`预计到达时间必须在 ${timeSlot.startTime}-${timeSlot.endTime} 之间`);
          return;
        }
      }
    }

    const result = await updateReservation({
      input: {
        reservationId: reservation.id,
        reservationDate: editForm().reservationDate,
        storeId: editForm().storeId,
        storeName: editForm().storeName,
        timeSlot: editForm().timeSlot,
        timeSlotName: editForm().timeSlotName,
        tableConfigId: editForm().tableConfigId,
        tableConfigName: tableConfig?.name || editForm().tableConfigName,
        specialRequests: editForm().specialRequests || undefined,
        estimatedArrivalTime: editForm().estimatedArrivalTime || undefined,
      },
    });

    if (result.error) {
      alert('修改失败：' + (result.error.graphQLErrors?.[0]?.message || '请稍后重试'));
      return;
    }

    setShowEditModal(false);
    setEditingReservation(null);
    props.onUpdated?.();
  };

  return (
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              客户信息
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              申请时间
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              预订日期
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              用餐时段
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              预计到达时间
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              桌型
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              状态
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              操作
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          {props.loading ? (
            <tr>
              <td colSpan={8} class="px-6 py-4 text-center text-sm text-gray-500">
                加载中...
              </td>
            </tr>
          ) : props.reservations.length === 0 ? (
            <tr>
              <td colSpan={8} class="px-6 py-4 text-center text-sm text-gray-500">
                暂无预订记录
              </td>
            </tr>
          ) : (
            props.reservations.map((reservation) => (
              <tr key={reservation.id} class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm font-medium text-gray-900">{reservation.customer.name}</div>
                  <div class="text-sm text-gray-500">{reservation.customer.phone}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {dayjs(reservation.createdAt).format('YYYY-MM-DD HH:mm')}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatDate(reservation.reservationDate)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {reservation.timeSlotName || reservation.timeSlot}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {reservation.estimatedArrivalTime || '-'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {reservation.tableConfigName}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <StatusBadge status={reservation.status as any} />
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div class="flex gap-2">
                    <button
                      onClick={() => handleViewDetail(reservation)}
                      class="px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
                    >
                      查看
                    </button>
                    {(reservation.status === 'REQUESTED' ||
                      reservation.status === 'APPROVED') && (
                      <button
                        onClick={() => startEdit(reservation)}
                        class="px-3 py-1 bg-amber-100 text-amber-700 rounded-md hover:bg-amber-200 text-sm"
                      >
                        修改
                      </button>
                    )}
                    {reservation.status === 'REQUESTED' && (
                      <>
                        <button
                          onClick={() => handleStatusUpdate(reservation.id, 'APPROVED')}
                          class="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                        >
                          确认
                        </button>
                        <button
                          onClick={() =>
                            handleCancelOrReject(reservation.id, 'CANCELLED', '取消预订')
                          }
                          class="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                        >
                          取消
                        </button>
                      </>
                    )}
                    {reservation.status === 'APPROVED' && (
                      <>
                        <button
                          onClick={() => handleStatusUpdate(reservation.id, 'COMPLETED')}
                          class="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                        >
                          完成
                        </button>
                        <button
                          onClick={() =>
                            handleCancelOrReject(reservation.id, 'CANCELLED', '取消预订')
                          }
                          class="px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
                        >
                          取消
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <ReasonModal
        isOpen={showReasonModal()}
        title={modalAction()?.title || ''}
        message="请输入取消的原因"
        onClose={handleReasonModalClose}
        onConfirm={handleReasonConfirm}
      />
      <Show when={showDetailModal() && viewingReservation()}>
        {(reservation) => (
          <div
            class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={handleDetailModalClose}
          >
            <div
              class="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div class="px-6 py-4 border-b flex justify-between items-center">
                <h3 class="text-lg font-semibold text-gray-900">预订详情</h3>
                <button onClick={handleDetailModalClose} class="text-gray-400 hover:text-gray-600">
                  <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <div class="px-6 py-4 space-y-4">
                <div>
                  <span class="text-sm text-gray-500">预订ID</span>
                  <p class="text-gray-900 font-mono text-sm">{reservation().id}</p>
                </div>
                <div>
                  <span class="text-sm text-gray-500">客户姓名</span>
                  <p class="text-gray-900 font-medium">{reservation().customer.name}</p>
                </div>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <span class="text-sm text-gray-500">手机号</span>
                    <p class="text-gray-900">{reservation().customer.phone}</p>
                  </div>
                  <div>
                    <span class="text-sm text-gray-500">邮箱</span>
                    <p class="text-gray-900">{reservation().customer.email || '-'}</p>
                  </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <span class="text-sm text-gray-500">预订日期</span>
                    <p class="text-gray-900">{formatDate(reservation().reservationDate)}</p>
                  </div>
                  <div>
                    <span class="text-sm text-gray-500">申请时间</span>
                    <p class="text-gray-900">
                      {dayjs(reservation().createdAt).format('YYYY-MM-DD HH:mm')}
                    </p>
                  </div>
                </div>
                <div>
                  <span class="text-sm text-gray-500">门店</span>
                  <p class="text-gray-900">{reservation().storeName}</p>
                </div>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <span class="text-sm text-gray-500">用餐时段</span>
                    <p class="text-gray-900">
                      {reservation().timeSlotName || reservation().timeSlot}
                    </p>
                  </div>
                  <div>
                    <span class="text-sm text-gray-500">桌型</span>
                    <p class="text-gray-900">{reservation().tableConfigName}</p>
                  </div>
                </div>
                <div>
                  <span class="text-sm text-gray-500">状态</span>
                  <div class="mt-1">
                    <StatusBadge status={reservation().status as any} />
                  </div>
                </div>
                <Show when={reservation().cancelReason}>
                  <div>
                    <span class="text-sm text-gray-500">取消原因</span>
                    <p class="text-gray-900 mt-1 bg-red-50 p-3 rounded text-red-800">
                      {reservation().cancelReason}
                    </p>
                  </div>
                </Show>
                <Show when={reservation().estimatedArrivalTime}>
                  <div>
                    <span class="text-sm text-gray-500">预计到达时间</span>
                    <p class="text-gray-900 mt-1 bg-gray-50 p-3 rounded">
                      {reservation().estimatedArrivalTime}
                    </p>
                  </div>
                </Show>
                <Show when={reservation().specialRequests}>
                  <div>
                    <span class="text-sm text-gray-500">特殊要求</span>
                    <p class="text-gray-900 mt-1 bg-gray-50 p-3 rounded">
                      {reservation().specialRequests}
                    </p>
                  </div>
                </Show>
              </div>
              <div class="px-6 py-4 bg-gray-50 flex justify-end gap-2 rounded-b-lg">
                <Show
                  when={
                    reservation().status === 'REQUESTED' ||
                    reservation().status === 'APPROVED'
                  }
                >
                  <button
                    onClick={() => startEdit(reservation())}
                    class="px-4 py-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-300 rounded-md hover:bg-amber-100"
                  >
                    修改
                  </button>
                  <button
                    onClick={() =>
                      handleCancelOrReject(reservation().id, 'CANCELLED', '取消预订')
                    }
                    class="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-300 rounded-md hover:bg-red-100"
                  >
                    取消
                  </button>
                </Show>
                <button
                  onClick={handleDetailModalClose}
                  class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        )}
      </Show>
      <Show when={showEditModal() && editingReservation()}>
        {(reservation) => {
          const store = () => getEditingReservationStore();

          return (
            <div
              class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
              onClick={cancelEdit}
            >
              <div
                class="bg-white rounded-2xl shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div class="px-8 py-6 border-b flex justify-between items-center">
                  <h3 class="text-xl font-bold text-gray-900">修改预订</h3>
                  <button onClick={cancelEdit} class="text-gray-400 hover:text-gray-600">
                    <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
                <div class="px-8 py-6 space-y-6">
                  {/* 餐厅选择 */}
                  <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-3">
                      餐厅
                    </label>
                    <select
                      value={editForm().storeId}
                      onChange={(e) => {
                        const selectedStore = storesResult.data?.stores?.find(
                          (s: Store) => s.id === e.currentTarget.value
                        );
                        setEditForm((prev) => ({
                          ...prev,
                          storeId: e.currentTarget.value,
                          storeName: selectedStore?.name || '',
                          // 重置时段和桌型选择
                          timeSlot: '',
                          timeSlotName: '',
                          tableConfigId: '',
                          tableConfigName: '',
                          estimatedArrivalTime: '',
                        }));
                      }}
                      class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <For each={storesResult.data?.stores || []}>
                        {(store: Store) => (
                          <option value={store.id}>
                            {store.name}
                          </option>
                        )}
                      </For>
                    </select>
                  </div>

                  {/* 预订日期 */}
                  <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-3">
                      预订日期
                    </label>
                    <input
                      type="date"
                      value={editForm().reservationDate}
                      min={formatDateString(getEditDateRange().min)}
                      max={formatDateString(getEditDateRange().max)}
                      onInput={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          reservationDate: e.currentTarget.value,
                        }))
                      }
                      class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                    />
                    <p class="mt-2 text-xs text-gray-500">
                      可预订范围：{formatDateString(getEditDateRange().min)} 至{' '}
                      {formatDateString(getEditDateRange().max)}
                    </p>
                  </div>

                  {/* 用餐时段 - 按钮式选择 */}
                  <Show when={store()}>
                    <div>
                      <label class="block text-sm font-semibold text-gray-700 mb-3">
                        用餐时间
                      </label>
                      <div class="grid grid-cols-3 gap-3">
                        <For each={store()?.timeSlotConfig?.filter((s) => s.enabled) || []}>
                          {(slot: any) => (
                            <button
                              type="button"
                              onClick={() => {
                                const selected = editForm().timeSlot === slot.id;
                                setEditForm((prev) => ({
                                  ...prev,
                                  timeSlot: slot.id,
                                  timeSlotName: slot.name,
                                  estimatedArrivalTime: selected ? prev.estimatedArrivalTime : slot.startTime,
                                }));
                              }}
                              class={`px-4 py-3 rounded-xl border-2 transition-all ${
                                editForm().timeSlot === slot.id
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

                  {/* 桌型选择 - 按钮式选择 */}
                  <Show when={store()}>
                    <div>
                      <label class="block text-sm font-semibold text-gray-700 mb-3">
                        桌型选择
                      </label>
                      <div class="grid grid-cols-3 gap-3">
                        <For each={store()?.tableConfig || []}>
                          {(config: any) => (
                            <button
                              type="button"
                              onClick={() =>
                                setEditForm((prev) => ({
                                  ...prev,
                                  tableConfigId: config.id,
                                  tableConfigName: config.name,
                                }))
                              }
                              class={`px-4 py-3 rounded-xl border-2 transition-all ${
                                editForm().tableConfigId === config.id
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
                  <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-3">
                      预计到达时间
                    </label>
                    <input
                      type="time"
                      value={editForm().estimatedArrivalTime}
                      min={store()?.timeSlotConfig?.find((s) => s.id === editForm().timeSlot)?.startTime}
                      max={store()?.timeSlotConfig?.find((s) => s.id === editForm().timeSlot)?.endTime}
                      onInput={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          estimatedArrivalTime: e.currentTarget.value,
                        }))
                      }
                      class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                    />
                    <p class="mt-2 text-xs text-gray-500">
                      请选择客户预计到达餐厅的具体时间（必须在
                      {store()?.timeSlotConfig?.find((s) => s.id === editForm().timeSlot)?.startTime}-
                      {store()?.timeSlotConfig?.find((s) => s.id === editForm().timeSlot)?.endTime} 之间）
                    </p>
                  </div>

                  {/* 特殊要求 */}
                  <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-3">
                      特殊要求
                    </label>
                    <textarea
                      value={editForm().specialRequests}
                      onInput={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          specialRequests: e.currentTarget.value,
                        }))
                      }
                      placeholder="如有特殊要求请填写（选填）"
                      rows="3"
                      class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                    />
                  </div>
                </div>
                <div class="px-8 py-6 bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
                  <button
                    onClick={cancelEdit}
                    class="px-6 py-3 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleEdit}
                    disabled={updateResult.fetching}
                    class="px-6 py-3 text-sm font-semibold text-white bg-green-600 rounded-xl hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    {updateResult.fetching ? '保存中...' : '保存'}
                  </button>
                </div>
              </div>
            </div>
          );
        }}
      </Show>
    </div>
  );
};

export default ReservationTable;
