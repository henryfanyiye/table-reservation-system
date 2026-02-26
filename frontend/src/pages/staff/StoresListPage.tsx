import { createSignal, For, Show } from 'solid-js';
import { createQuery } from '@urql/solid';
import { GET_STORES } from '@/api/graphql/store';
import StoreConfig from '@/components/StoreConfig';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import EmptyState from '@/components/ui/EmptyState';

interface TableConfig {
  id: string;
  name: string;
  seats: number;
  count: number;
}

interface TimeSlotConfig {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  enabled: boolean;
}

interface BookingRules {
  minDaysAdvance?: number;
  maxDaysAdvance?: number;
}

interface Store {
  id: string;
  name: string;
  address: string;
  phone: string;
  description?: string;
  tableConfig?: TableConfig[];
  timeSlotConfig?: TimeSlotConfig[];
  bookingRules?: BookingRules;
  createdAt?: string;
  updatedAt?: string;
}

export default function StoresListPage() {
  const [showConfig, setShowConfig] = createSignal(false);
  const [selectedStoreId, setSelectedStoreId] = createSignal<string | null>(null);
  const [selectedStoreData, setSelectedStoreData] = createSignal<any>(null);
  const [refetchTrigger, setRefetchTrigger] = createSignal(0);

  const [storesResult] = createQuery({
    query: GET_STORES,
    variables: () => ({ _refresh: refetchTrigger() }),
  });

  const stores = () => storesResult.data?.stores || [];
  const fetching = () => storesResult.fetching;
  const error = () => storesResult.error;

  function handleCreateStore() {
    setSelectedStoreId(null);
    setSelectedStoreData(null);
    setShowConfig(true);
  }

  function handleEditStore(store: Store) {
    setSelectedStoreId(store.id);
    setSelectedStoreData(store);
    setShowConfig(true);
  }

  function handleConfigSaved() {
    setShowConfig(false);
    // Trigger refetch by incrementing the counter
    setRefetchTrigger((prev) => prev + 1);
  }

  function handleConfigCancel() {
    setShowConfig(false);
    setSelectedStoreId(null);
    setSelectedStoreData(null);
  }

  return (
    <div>
      <Show
        when={!showConfig()}
        fallback={
          <div>
            <div class="flex items-center justify-between mb-6">
              <h1 class="text-3xl font-bold text-gray-900">
                {selectedStoreId() ? '编辑门店' : '创建门店'}
              </h1>
              <Button onClick={handleConfigCancel} variant="secondary">
                返回列表
              </Button>
            </div>
            <StoreConfig
              storeId={selectedStoreId()}
              storeData={selectedStoreData()}
              onSaved={handleConfigSaved}
              onCancel={handleConfigCancel}
            />
          </div>
        }
      >
        <div class="flex items-center justify-between mb-6">
          <h1 class="text-3xl font-bold text-gray-900">门店管理</h1>
          <Button onClick={handleCreateStore} variant="primary">
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            创建门店
          </Button>
        </div>

        {fetching() ? (
          <LoadingSpinner />
        ) : error() ? (
          <div class="bg-red-50 border border-red-200 rounded-lg p-4">
            <p class="text-red-800">加载失败，请稍后重试</p>
          </div>
        ) : stores().length === 0 ? (
          <EmptyState title="暂无门店" message="还没有创建任何门店，点击上方按钮创建第一个门店" />
        ) : (
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <For each={stores()}>
              {(store) => (
                <div class="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6">
                  <div class="flex items-start justify-between">
                    <div class="flex-1">
                      <h3 class="text-lg font-semibold text-gray-900">{store.name}</h3>
                      <p class="text-sm text-gray-500 mt-1">{store.address}</p>
                    </div>
                  </div>

                  <div class="mt-4 space-y-2 text-sm">
                    {store.phone && (
                      <div class="flex items-center text-gray-600">
                        <svg
                          class="w-4 h-4 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                          />
                        </svg>
                        {store.phone}
                      </div>
                    )}
                    {store.description && (
                      <p class="text-gray-600 line-clamp-2">{store.description}</p>
                    )}
                  </div>

                  <div class="mt-4 pt-4 border-t border-gray-200 flex justify-end">
                    <Button onClick={() => handleEditStore(store)} variant="secondary" size="sm">
                      编辑配置
                    </Button>
                  </div>
                </div>
              )}
            </For>
          </div>
        )}
      </Show>
    </div>
  );
}
