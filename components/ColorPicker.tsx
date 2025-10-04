import { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, TextInput } from 'react-native';

interface ColorPickerProps {
  visible: boolean;
  defaultColor: string;
  onClose: () => void;
  onSelectColor: (color: string) => void;
  predefinedColors?: string[];
}

export default function ColorPicker({
  visible,
  defaultColor,
  onClose,
  onSelectColor,
  predefinedColors = [],
}: ColorPickerProps) {
  const [customColor, setCustomColor] = useState(defaultColor);

  const handleDone = () => {
    onSelectColor(customColor);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.container} onStartShouldSetResponder={() => true}>
          <Text style={styles.title}>Select Color</Text>

          <View style={styles.previewContainer}>
            <View style={[styles.preview, { backgroundColor: customColor }]} />
            <TextInput
              style={styles.input}
              value={customColor}
              onChangeText={setCustomColor}
              placeholder="#000000"
              placeholderTextColor="#555"
              autoCapitalize="none"
            />
          </View>

          {predefinedColors.length > 0 && (
            <View style={styles.colorsGrid}>
              {predefinedColors.map((color, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.colorBox, { backgroundColor: color }]}
                  onPress={() => setCustomColor(color)}
                />
              ))}
            </View>
          )}

          <View style={styles.buttons}>
            <TouchableOpacity style={styles.button} onPress={onClose}>
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.buttonPrimary]}
              onPress={handleDone}
            >
              <Text style={[styles.buttonText, styles.buttonTextPrimary]}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#1a1a1a',
    borderRadius: 15,
    padding: 20,
    width: '85%',
    maxWidth: 400,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  preview: {
    width: 60,
    height: 60,
    borderRadius: 10,
    marginRight: 15,
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    color: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  colorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  colorBox: {
    width: 50,
    height: 50,
    borderRadius: 10,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#1DB954',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextPrimary: {
    color: '#fff',
  },
});
