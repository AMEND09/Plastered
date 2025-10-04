import { View, Text, TextInput, StyleSheet } from 'react-native';

interface NormalInputProps {
  title: string;
  value: string | number;
  onChange: (text: string) => void;
}

export default function NormalInput({ title, value, onChange }: NormalInputProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{title}</Text>
      <TextInput
        style={styles.input}
        value={String(value)}
        onChangeText={onChange}
        placeholderTextColor="#555"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 15,
  },
  label: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 5,
    fontWeight: '500',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    color: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    fontSize: 14,
  },
});
