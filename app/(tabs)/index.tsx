import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

export default function HomeScreen() {
  const router = useRouter();
  const [recent, setRecent] = useState<any[]>([]);

  const storageGet = async (key: string) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      if (AsyncStorage && AsyncStorage.getItem) return await AsyncStorage.getItem(key);
    } catch (e) {}
    try {
      if (typeof window !== 'undefined' && window.localStorage) return window.localStorage.getItem(key);
    } catch (e) {}
    return null;
  };

  useEffect(() => {
    (async () => {
  const raw = await storageGet('@Plastered:recentProjects');
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          setRecent(parsed || []);
        } catch (e) {
          setRecent([]);
        }
      }
    })();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Plastered</Text>
      <Text style={styles.subtitle}>Create beautiful album posters</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push('/search')}
      >
        <Text style={styles.buttonText}>Search for an Album</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { marginTop: 12, backgroundColor: '#444' }]}
        onPress={() => router.push({ pathname: '/editor/[id]', params: { id: 'new', source: 'custom' } })}
      >
        <Text style={styles.buttonText}>Create Custom Album</Text>
      </TouchableOpacity>

      {recent.length > 0 && (
        <View style={{ marginTop: 24, width: '100%' }}>
          <Text style={{ color: '#fff', fontSize: 18, marginBottom: 12 }}>Recent Projects</Text>
          <ScrollView style={{ maxHeight: 240 }}>
            {recent.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={{ padding: 12, backgroundColor: '#0f0f0f', borderRadius: 8, marginBottom: 8 }}
                onPress={() => router.push({ pathname: '/editor/[id]', params: { id: p.id, source: 'saved' } })}
              >
            <Text style={{ color: '#fff', fontWeight: '700' }}>{p.albumName || 'Untitled'}</Text>
                <Text style={{ color: '#888' }}>{p.artistsName}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#1DB954',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#888',
    marginBottom: 40,
  },
  button: {
    backgroundColor: '#1DB954',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 25,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
