import { Accessor, Component, createMemo, createSignal, JSX, onMount } from 'solid-js';

export interface BaseInputProps extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, 'value'> {
  label?: string;
  error?: string;
  helperText?: string;
  value?: Accessor<string> | string;
  onInput?: (e: InputEvent) => void;
  onChange?: (e: Event) => void;
}

export const BaseInput: Component<BaseInputProps> = (props) => {
  const { label, error, helperText, value: valueProp, class: className = '', ...rest } = props;
  let inputRef: HTMLInputElement | undefined;
  const [isFocused, setIsFocused] = createSignal(false);
  const [internalValue, setInternalValue] = createSignal('');

  // 使用 createMemo 创建响应式值
  const inputValue = createMemo(() => {
    if (typeof valueProp === 'function') {
      return valueProp();
    }
    return valueProp ?? '';
  });

  // 初始化 input 值
  onMount(() => {
    if (inputRef) {
      const val = inputValue();
      inputRef.value = val;
      setInternalValue(val);
    }
  });

  // 当外部值变化且未聚焦时，同步到 input
  createMemo(() => {
    const val = inputValue();
    if (!isFocused() && val !== internalValue()) {
      if (inputRef) {
        inputRef.value = val;
        setInternalValue(val);
      }
    }
  });

  return (
    <div class="flex flex-col gap-1">
      {label && <label class="text-sm font-medium text-gray-700">{label}</label>}
      <input
        {...rest}
        ref={inputRef}
        onFocus={() => setIsFocused(true)}
        onBlur={(e) => {
          setIsFocused(false);
          // blur 时同步最新值到外部
          if (typeof props.onInput === 'function') {
            const event = new Event('input', { bubbles: true });
            Object.defineProperty(event, 'currentTarget', {
              value: inputRef,
              writable: false,
            });
            props.onInput(event as InputEvent);
          }
        }}
        onInput={(e) => {
          const target = e.currentTarget;
          setInternalValue(target.value);
          props.onInput?.(e as InputEvent);
        }}
        class={`
          px-3 py-2 border rounded-md shadow-sm
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          disabled:bg-gray-100 disabled:cursor-not-allowed
          ${error ? 'border-red-300' : 'border-gray-300'}
          ${className}
        `}
      />
      {error && <span class="text-sm text-red-600">{error}</span>}
      {helperText && !error && <span class="text-sm text-gray-500">{helperText}</span>}
    </div>
  );
};

export default BaseInput;
