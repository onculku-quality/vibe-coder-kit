import {
  ActivityIndicator,
  Pressable,
  Text,
  type PressableProps,
} from 'react-native';
import { type ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps extends PressableProps {
  label: string;
  variant?: Variant;
  loading?: boolean;
  icon?: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-brand-600 active:bg-brand-700',
  secondary: 'bg-gray-200 active:bg-gray-300',
  danger: 'bg-red-600 active:bg-red-700',
  ghost: 'bg-transparent active:bg-gray-100',
};

const variantTextClasses: Record<Variant, string> = {
  primary: 'text-white',
  secondary: 'text-gray-900',
  danger: 'text-white',
  ghost: 'text-brand-600',
};

export function Button({
  label,
  variant = 'primary',
  loading = false,
  icon,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <Pressable
      disabled={disabled || loading}
      className={`flex-row items-center justify-center gap-2 rounded-xl px-5 py-3.5 ${variantClasses[variant]} ${disabled || loading ? 'opacity-50' : ''} ${className}`}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' || variant === 'ghost' ? '#2563eb' : '#fff'} size="small" />
      ) : (
        <>
          {icon}
          <Text className={`text-base font-semibold ${variantTextClasses[variant]}`}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}
