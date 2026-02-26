import { createMemo, createSignal, onCleanup, onMount } from 'solid-js';
import { validatePhone } from '@/utils/validation';

// localStorage 键名
const LAST_SEND_TIME_KEY = 'sms_last_send_time';
const COOLDOWN_SECONDS = 60; // 1分钟冷却时间

/**
 * 短信验证码状态
 */
interface SmsState {
  loading: boolean;
  countdown: number;
  canSend: boolean;
  error: string | null;
}

/**
 * 短信验证码 composable (Solid.js 版本)
 */
export function useSms() {
  const [phoneNumber, setPhoneNumber] = createSignal('');
  const [state, setState] = createSignal<SmsState>({
    loading: false,
    countdown: 0,
    canSend: true,
    error: null,
  });

  let countdownTimer: ReturnType<typeof setInterval> | null = null;

  /**
   * 获取上次发送时间戳
   */
  function getLastSendTime(): number {
    const time = localStorage.getItem(LAST_SEND_TIME_KEY);
    return time ? parseInt(time, 10) : 0;
  }

  /**
   * 设置上次发送时间戳
   */
  function setLastSendTime(): void {
    localStorage.setItem(LAST_SEND_TIME_KEY, Date.now().toString());
  }

  /**
   * 清除上次发送时间戳
   */
  function clearLastSendTime(): void {
    localStorage.removeItem(LAST_SEND_TIME_KEY);
  }

  /**
   * 检查冷却时间并初始化倒计时
   */
  function checkCooldownAndInitCountdown(): void {
    const lastSendTime = getLastSendTime();
    if (lastSendTime > 0) {
      const elapsed = Math.floor((Date.now() - lastSendTime) / 1000);
      const remaining = COOLDOWN_SECONDS - elapsed;

      if (remaining > 0) {
        // 仍在冷却期内，恢复倒计时
        startCountdown(remaining, false);
      } else {
        // 冷却期已过，清除记录
        clearLastSendTime();
      }
    }
  }

  // 是否可以发送
  const canSend = createMemo(() => {
    const s = state();
    return s.canSend && validatePhone(phoneNumber()) && s.countdown === 0;
  });

  // 是否正在倒计时
  const isCountingDown = createMemo(() => state().countdown > 0);

  // 倒计时显示文本
  const countdownText = createMemo(() => {
    const s = state();
    if (s.countdown > 0) {
      return `${s.countdown}秒后重试`;
    }
    return canSend() ? '发送验证码' : '请输入手机号';
  });

  // 设置手机号
  function setPhone(phone: string) {
    setPhoneNumber(phone);
    const valid = validatePhone(phone);
    setState((prev) => ({ ...prev, canSend: valid }));
  }

  // 开始倒计时
  function startCountdown(seconds: number = COOLDOWN_SECONDS, recordTime: boolean = true) {
    setState((prev) => ({
      ...prev,
      countdown: seconds,
      canSend: false,
    }));

    // 如果是新的发送（不是页面刷新后恢复），记录发送时间
    if (recordTime) {
      setLastSendTime();
    }

    countdownTimer = setInterval(() => {
      setState((prev) => {
        const newCountdown = prev.countdown - 1;
        if (newCountdown <= 0) {
          stopCountdown();
          return { ...prev, countdown: 0 };
        }
        return { ...prev, countdown: newCountdown };
      });
    }, 1000);
  }

  // 停止倒计时
  function stopCountdown() {
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
    const phone = phoneNumber();
    const valid = validatePhone(phone);
    setState({
      loading: false,
      countdown: 0,
      canSend: valid,
      error: null,
    });
    // 倒计时结束，清除发送时间记录
    clearLastSendTime();
  }

  // 组件挂载时检查冷却时间
  onMount(() => {
    checkCooldownAndInitCountdown();
  });

  // 组件卸载时清理定时器
  onCleanup(() => {
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
  });

  return {
    // 状态
    phoneNumber,
    state,
    loading: () => state().loading,
    error: () => state().error,

    // 计算属性
    canSend,
    isCountingDown,
    countdown: () => state().countdown,
    countdownText,
  };
}

export default useSms;
