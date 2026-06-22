import { View, type ViewProps } from 'react-native';
import { type ReactNode } from 'react';

interface CardProps extends ViewProps {
  children: ReactNode;
}

export function Card({ children, className = '', ...props }: CardProps) {
  return (
    <View className={`rounded-2xl bg-white p-4 shadow-sm ${className}`} {...props}>
      {children}
    </View>
  );
}
