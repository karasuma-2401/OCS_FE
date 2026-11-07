import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input, type InputProps } from './Input';

export type PasswordInputProps = Omit<InputProps, 'type' | 'endAdornment'>;

export function PasswordInput({ label, disabled = false, loading = false, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const fieldName = typeof label === 'string' ? label.toLocaleLowerCase('vi-VN') : 'mật khẩu';

  return (
    <Input
      {...props}
      label={label}
      type={visible ? 'text' : 'password'}
      disabled={disabled}
      loading={loading}
      endAdornment={
        <button
          type="button"
          aria-label={`${visible ? 'Ẩn' : 'Hiện'} ${fieldName}`}
          aria-pressed={visible}
          disabled={disabled || loading}
          onClick={() => setVisible(current => !current)}
          className="inline-flex rounded p-1 text-muted hover:text-brand-highlight focus-visible:outline-2 focus-visible:outline-brand-pink-focus disabled:cursor-not-allowed disabled:opacity-70"
        >
          {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
      }
    />
  );
}
