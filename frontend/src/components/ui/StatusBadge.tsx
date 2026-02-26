import { Component } from 'solid-js';

/** 预订状态枚举 */
export type ReservationStatus =
  | 'REQUESTED'
  | 'APPROVED'
  | 'CANCELLED'
  | 'COMPLETED';

export interface StatusBadgeProps {
  status: ReservationStatus | string;
  class?: string;
}

const statusConfig: Record<ReservationStatus, { label: string; class: string }> = {
  REQUESTED: { label: '待确认', class: 'bg-yellow-100 text-yellow-800' },
  APPROVED: { label: '已确认', class: 'bg-blue-100 text-blue-800' },
  CANCELLED: { label: '已取消', class: 'bg-red-100 text-red-800' },
  COMPLETED: { label: '已完成', class: 'bg-gray-100 text-gray-800' },
};

export const StatusBadge: Component<StatusBadgeProps> = (props) => {
  const config = () =>
    statusConfig[props.status as any] || {
      label: props.status,
      class: 'bg-gray-100 text-gray-800',
    };

  return (
    <span
      class={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config().class} ${props.class || ''}`}
    >
      {config().label}
    </span>
  );
};

export default StatusBadge;
