import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface CheckInputProps {
  title: string;
  value: boolean;
  onChange: (value: boolean) => void;
  text: string;
}

export default function CheckInput({ title, value, onChange, text }: CheckInputProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{title}</Text>
      <TouchableOpacity
        style={styles.checkContainer}
        onPress={() => onChange(!value)}
      >
        <View style={[styles.checkbox, value && styles.checkboxActive]}>
          {value && <View style={styles.checkmark} />}
        </View>
        <Text style={styles.text}>{text}</Text>
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
  checkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#555',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: '#1DB954',
    borderColor: '#1DB954',
  },
  checkmark: {
    width: 12,
    height: 12,
    backgroundColor: '#fff',
    borderRadius: 2,
  },
  text: {
    color: '#888',
    fontSize: 14,
    flex: 1,
  },
});
