import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface ColorInputProps {
  title: string;
  value: string;
  onClick: () => void;
}

export default function ColorInput({ title, value, onClick }: ColorInputProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{title}</Text>
      <TouchableOpacity style={styles.colorButton} onPress={onClick}>
        <View style={[styles.colorPreview, { backgroundColor: value }]} />
        <Text style={styles.colorText}>{value}</Text>
      </TouchableOpacity>
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
  colorButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorPreview: {
    width: 30,
    height: 30,
    borderRadius: 5,
    marginRight: 10,
  },
  colorText: {
    color: '#fff',
    fontSize: 14,
  },
});
