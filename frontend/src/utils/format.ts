import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';

dayjs.locale('zh-cn');

/**
 * 格式化日期（返回标准 YYYY-MM-DD 格式）
 */
export function formatDate(date: string | Date, format?: string): string {
  if (format) {
    return dayjs(date).format(format);
  }
  // 强制使用 YYYY-MM-DD 格式（HTML date input 需要此格式）
  const d = dayjs(date);
  return `${d.year()}-${String(d.month() + 1).padStart(2, '0')}-${String(d.date()).padStart(2, '0')}`;
}
