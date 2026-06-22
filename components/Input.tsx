import { TextInput, Text, View, type TextInputProps } from 'react-native';

interface InputProps extends TextInputProps {
  label: string;
  error?: string | null;
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-gray-700">{label}</Text>
      <TextInput
        className={`rounded-xl border px-4 py-3.5 text-base text-gray-900 ${error ? 'border-red-500' : 'border-gray-300'} ${className}`}
        placeholderTextColor="#9ca3af"
        autoCapitalize="none"
        {...props}
      />
      {error ? (
        <Text className="text-sm text-red-600">{error}</Text>
      ) : null}
    </View>
  );
}
