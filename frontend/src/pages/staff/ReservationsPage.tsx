import { createSignal, For, Show } from 'solid-js';
import { createMutation, createQuery } from '@urql/solid';
import { formatDate } from '@/utils/format';
import { GET_RESERVATIONS, UPDATE_RESERVATION_STATUS } from '@/api/graphql/reservation';
import ReservationTable from '@/components/ReservationTable';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

// 预订状态选项
const STATUS_OPTIONS = [
  { value: 'REQUESTED', label: '待确认' },
  { value: 'APPROVED', label: '已确认' },
  { value: 'CANCELLED', label: '已取消' },
  { value: 'COMPLETED', label: '已完成' },
];

export default function ReservationsPage() {
  // 筛选条件 - 默认今明2天
  const today = formatDate(new Date());
  const tomorrow = formatDate(new Date(Date.now() + 86400000));
  const [filters, setFilters] = createSignal({
    name: '',
    phone: '',
    dateFrom: today,
    dateTo: tomorrow,
    status: [] as string[],
  });

  // 状态下拉显示
  const [showStatusDropdown, setShowStatusDropdown] = createSignal(false);

  // GraphQL 查询 - 获取预订列表
  const [reservationsQuery, reexecuteQuery] = createQuery({
    query: GET_RESERVATIONS,
    variables: () => ({
      query: {
        name: filters().name || undefined,
        phone: filters().phone || undefined,
        dateFrom: filters().dateFrom || undefined,
        dateTo: filters().dateTo || undefined,
        status: filters().status.length > 0 ? (filters().status as any) : undefined,
      },
      pagination: {
        page: 1,
        limit: 100,
      },
    }),
  });

  // GraphQL 变更 - 更新预订状态
  const [, executeUpdateStatus] = createMutation(UPDATE_RESERVATION_STATUS);

  const reservations = () => {
    const data = reservationsQuery.data;
    return data?.reservations?.data || [];
  };

  const loading = () => reservationsQuery.fetching;

  const handleUpdateStatus = async (id: string, status: string, reason?: string) => {
    const result = await executeUpdateStatus({
      input: {
        reservationId: id,
        status: status as any,
        ...(reason && { reason }),
      },
    });

    if (result.error) {
      alert('更新失败，请稍后重试');
    } else {
      reexecuteQuery({ requestPolicy: 'network-only' });
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleStatusToggle = (statusValue: string) => {
    const currentStatus = filters().status;
    const newStatus = currentStatus.includes(statusValue)
      ? currentStatus.filter((s) => s !== statusValue)
      : [...currentStatus, statusValue];
    setFilters((prev) => ({ ...prev, status: newStatus }));
  };

  const handleSearch = () => {
    reexecuteQuery({ requestPolicy: 'network-only' });
  };

  const handleReset = () => {
    const today = formatDate(new Date());
    const tomorrow = formatDate(new Date(Date.now() + 86400000));
    setFilters({
      name: '',
      phone: '',
      dateFrom: today,
      dateTo: tomorrow,
      status: [],
    });
  };

  return (
    <div>
      <div class="mb-6">
        <h1 class="text-3xl font-bold text-gray-900 mb-4">预订管理</h1>

        {/* 筛选区域 */}
        <div class="bg-white rounded-lg shadow p-4">
          <span class="text-sm font-medium text-gray-700 mb-3 block">筛选条件</span>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 客户姓名 */}
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">客户姓名</label>
              <input
                type="text"
                value={filters().name}
                onInput={(e) => handleFilterChange('name', e.currentTarget.value)}
                placeholder="请输入客户姓名"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 手机号 */}
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">手机号</label>
              <input
                type="tel"
                value={filters().phone}
                onInput={(e) => handleFilterChange('phone', e.currentTarget.value)}
                placeholder="请输入手机号"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 预定日期 */}
            <div class="md:col-span-2">
              <label class="block text-sm font-medium text-gray-700 mb-1">预定日期</label>
              <div class="flex gap-2">
                <input
                  type="date"
                  value={filters().dateFrom}
                  onInput={(e) => handleFilterChange('dateFrom', e.currentTarget.value)}
                  placeholder="开始日期"
                  class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span class="text-gray-500 self-center">至</span>
                <input
                  type="date"
                  value={filters().dateTo}
                  onInput={(e) => handleFilterChange('dateTo', e.currentTarget.value)}
                  placeholder="结束日期"
                  class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* 状态多选下拉 */}
            <div class="relative">
              <label class="block text-sm font-medium text-gray-700 mb-1">预订状态</label>
              <div class="relative">
                <button
                  type="button"
                  onClick={() => setShowStatusDropdown(!showStatusDropdown())}
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-left flex items-center justify-between"
                >
                  <span>
                    {filters().status.length === 0
                      ? '全部状态'
                      : `已选择 ${filters().status.length} 项`}
                  </span>
                  <svg
                    classList={{
                      'w-5 h-5 transition-transform': true,
                      'rotate-180': showStatusDropdown(),
                    }}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {/* 下拉选项 */}
                <Show when={showStatusDropdown()}>
                  <div
                    class="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg"
                    onMouseLeave={() => setShowStatusDropdown(false)}
                  >
                    <div class="p-2 border-b">
                      <button
                        type="button"
                        onClick={() => {
                          setFilters((prev) => ({ ...prev, status: [] }));
                        }}
                        class="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded"
                      >
                        清空选择
                      </button>
                    </div>
                    <For each={STATUS_OPTIONS}>
                      {(option) => {
                        const isSelected = () => filters().status.includes(option.value);
                        return (
                          <button
                            type="button"
                            onClick={() => handleStatusToggle(option.value)}
                            class="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                            classList={{
                              'bg-blue-50': isSelected(),
                            }}
                          >
                            <span
                              class="w-4 h-4 border rounded flex items-center justify-center flex-shrink-0"
                              classList={{
                                'bg-blue-600 border-blue-600': isSelected(),
                                'border-gray-300': !isSelected(),
                              }}
                            >
                              <Show when={isSelected()}>
                                <svg
                                  class="w-3 h-3 text-white"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="3"
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              </Show>
                            </span>
                            <span>{option.label}</span>
                          </button>
                        );
                      }}
                    </For>
                  </div>
                </Show>

                {/* 已选择的状态标签 */}
                <Show when={filters().status.length > 0 && !showStatusDropdown()}>
                  <div class="mt-2 flex flex-wrap gap-1">
                    <For each={filters().status}>
                      {(status) => {
                        const option = STATUS_OPTIONS.find((o) => o.value === status);
                        return (
                          <span class="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs">
                            {option?.label}
                            <button
                              type="button"
                              onClick={() => handleStatusToggle(status)}
                              class="hover:text-blue-900"
                            >
                              ×
                            </button>
                          </span>
                        );
                      }}
                    </For>
                  </div>
                </Show>
              </div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div class="flex gap-3 mt-4">
            <button
              onClick={handleSearch}
              class="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              查询
            </button>
            <button
              onClick={handleReset}
              class="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              重置
            </button>
          </div>
        </div>
      </div>

      {loading() ? (
        <LoadingSpinner />
      ) : reservations().length === 0 ? (
        <EmptyState title="暂无预订" message="没有找到符合条件的预订记录" />
      ) : (
        <div>
          <div class="text-sm text-gray-500 mb-4">
            共找到 <span class="font-medium text-gray-900">{reservations().length}</span> 条预订记录
          </div>
          <ReservationTable
            reservations={reservations()}
            onUpdateStatus={handleUpdateStatus}
            onUpdated={() => reexecuteQuery({ requestPolicy: 'network-only' })}
          />
        </div>
      )}
    </div>
  );
}
