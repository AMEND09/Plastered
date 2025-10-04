import { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList, Image, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Search as SearchIcon } from 'lucide-react-native';

interface Album {
  id: string;
  name: string;
  artists: { name: string }[];
  images: { url: string }[];
}

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [artistQuery, setArtistQuery] = useState('');
  const [results, setResults] = useState<Album[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<Array<{q: string; artist?: string}>>([]);
  const router = useRouter();

  const STORAGE_KEY = '@Plastered:recentSearches';

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

  const storageSet = async (key: string, value: string) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      if (AsyncStorage && AsyncStorage.setItem) return await AsyncStorage.setItem(key, value);
    } catch (e) {}
    try {
      if (typeof window !== 'undefined' && window.localStorage) return window.localStorage.setItem(key, value);
    } catch (e) {}
  };

  const searchAlbums = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      // build MusicBrainz query; include artist if provided
      let q = searchQuery.trim();
      if (artistQuery && artistQuery.trim()) {
        q = `${q} AND artist:${artistQuery.trim()}`;
      }
      const mbUrl = `https://musicbrainz.org/ws/2/release?query=${encodeURIComponent(q)}&fmt=json&limit=20`;

      const searchResponse = await fetch(mbUrl, {
        headers: {
          Accept: 'application/json',
          // MusicBrainz requests a User-Agent identifying the app
          'User-Agent': 'Plastered/1.0 (https://example.com)'
        },
      });

      const searchData = await searchResponse.json();
      const releases = searchData.releases || [];

      // For each release, probe the Cover Art Archive for a front image.
      const albums = await Promise.all(
        releases.map(async (r: any) => {
          const id = r.id;
          const title = r.title;
          const artists = (r['artist-credit'] || []).map((a: any) => ({ name: a.name }));

          const coverUrl = `https://coverartarchive.org/release/${id}/front-250`;

          // Use HEAD to check if cover art exists (saves bandwidth)
          let hasCover = false;
          try {
            const head = await fetch(coverUrl, { method: 'HEAD' });
            hasCover = head.ok;
          } catch (e) {
            hasCover = false;
          }

          return {
            id,
            name: title,
            artists,
            images: hasCover ? [{ url: coverUrl }] : [],
          } as Album;
        })
      );

      setResults(albums);

      // persist recent search (deduplicate)
      try {
        const raw = await storageGet(STORAGE_KEY);
        const list = raw ? JSON.parse(raw) : [];
        const entry = { q: searchQuery.trim(), artist: artistQuery.trim() || undefined };
        const filtered = [entry, ...list.filter((s: any) => !(s.q === entry.q && (s.artist || '') === (entry.artist || '')))].slice(0, 10);
        await storageSet(STORAGE_KEY, JSON.stringify(filtered));
        setRecentSearches(filtered);
      } catch (e) {
        /* ignore */
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAlbumPress = (albumId: string) => {
    router.push(`/editor/${albumId}`);
  };

  const runRecentSearch = (s: {q: string; artist?: string}) => {
    setSearchQuery(s.q);
    setArtistQuery(s.artist || '');
    // run search after state updates
    setTimeout(() => searchAlbums(), 40);
  };

  useEffect(() => {
    (async () => {
      try {
        const raw = await storageGet(STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        setRecentSearches(parsed || []);
      } catch (e) {
        /* ignore */
      }
    })();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <SearchIcon size={20} color="#888" style={styles.searchIcon} />
        <TextInput
          style={styles.input}
          placeholder="Search for albums..."
          placeholderTextColor="#555"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={searchAlbums}
          returnKeyType="search"
        />
      </View>

      <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
        <Text style={{ color: '#888', marginBottom: 6 }}>Artist (optional)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: '#121212', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }]}
          placeholder="Artist name (optional)"
          placeholderTextColor="#555"
          value={artistQuery}
          onChangeText={setArtistQuery}
          onSubmitEditing={searchAlbums}
          returnKeyType="search"
        />
      </View>

      {recentSearches.length > 0 && (
        <View style={{ paddingHorizontal: 20, marginBottom: 8 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {recentSearches.map((s, i) => (
              <TouchableOpacity key={`recent-${i}`} onPress={() => runRecentSearch(s)} style={{ backgroundColor: '#111', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginRight: 8 }}>
                <Text style={{ color: '#ddd' }}>{s.q}{s.artist ? ` • ${s.artist}` : ''}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.albumItem}
            onPress={() => handleAlbumPress(item.id)}
          >
            <Image
              source={{ uri: item.images[0]?.url }}
              style={styles.albumCover}
            />
            <View style={styles.albumInfo}>
              <Text style={styles.albumName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.artistName} numberOfLines={1}>
                {item.artists.map(a => a.name).join(', ')}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          loading ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#1DB954" />
              <Text style={{ color: '#888', marginTop: 12 }}>Searching...</Text>
            </View>
          ) : (!loading && searchQuery ? (
            <Text style={styles.emptyText}>No results found</Text>
          ) : null)
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    paddingTop: 60,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 10,
    paddingHorizontal: 15,
  },
  searchIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    paddingVertical: 12,
  },
  listContent: {
    paddingHorizontal: 20,
  },
  albumItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    marginBottom: 10,
    padding: 10,
  },
  albumCover: {
    width: 60,
    height: 60,
    borderRadius: 5,
  },
  albumInfo: {
    flex: 1,
    marginLeft: 15,
  },
  albumName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  artistName: {
    color: '#888',
    fontSize: 14,
  },
  emptyText: {
    color: '#888',
    textAlign: 'center',
    marginTop: 40,
  },
});
