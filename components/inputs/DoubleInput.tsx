import { View, Text, TextInput, StyleSheet } from 'react-native';

interface DoubleInputProps {
  title: string;
  value: string;
  onChangeTitle: (text: string) => void;
  onChangeDate: (text: string) => void;
}

export default function DoubleInput({ title, value, onChangeTitle, onChangeDate }: DoubleInputProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Info Field</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={onChangeTitle}
        placeholder="Title"
        placeholderTextColor="#555"
      />
      <TextInput
        style={[styles.input, styles.inputSpacing]}
        value={value}
        onChangeText={onChangeDate}
        placeholder="Value"
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
  inputSpacing: {
    marginTop: 8,
  },
});
