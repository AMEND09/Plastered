import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Download, RefreshCw, Edit3 } from 'lucide-react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { useRef } from 'react';

import NormalInput from '../../components/inputs/NormalInput';
import DoubleInput from '../../components/inputs/DoubleInput';
import ColorInput from '../../components/inputs/ColorInput';
import CheckInput from '../../components/inputs/CheckInput';
import ColorPicker from '../../components/ColorPicker';
import PosterCanvas from '../../components/PosterCanvas';

export default function EditorScreen() {
  const { id, source } = useLocalSearchParams<{ id: string; source?: string }>();
  const openedFromSaved = source === 'saved' || String(id) === 'autosave';
  const router = useRouter();
  const posterRef = useRef(null);

  const [activeTab, setActiveTab] = useState<'information' | 'tracklist'>('information');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  const [albumName, setAlbumName] = useState('');
  const [artistsName, setArtistsName] = useState('');
  const [albumCover, setAlbumCover] = useState('');
  const [titleSize, setTitleSize] = useState('200');
  const [artistsSize, setArtistsSize] = useState('110');
  const [tracksSize, setTracksSize] = useState('50');
  const [marginTop, setMarginTop] = useState('0');
  const [marginSide, setMarginSide] = useState('160');
  const [marginCover, setMarginCover] = useState('0');
  const [marginBackground, setMarginBackground] = useState('0');
  const [backgroundColor, setBackgroundColor] = useState('#5900ff');
  const [textColor, setTextColor] = useState('#ff9100');
  const [color1, setColor1] = useState('#ff0000');
  const [color2, setColor2] = useState('#00ff40');
  const [color3, setColor3] = useState('#2600ff');
  const [useFade, setUseFade] = useState(true);
  const [showTracklist, setShowTracklist] = useState(false);
  const [tracklist, setTracklist] = useState('');
  const [titleRelease, setTitleRelease] = useState('RELEASE');
  const [releaseDate, setReleaseDate] = useState('');
  const [titleRuntime, setTitleRuntime] = useState('RUNTIME');
  const [runtime, setRuntime] = useState('');

  const [colorPickerVisible, setColorPickerVisible] = useState(false);
  const [currentColorField, setCurrentColorField] = useState<string | null>(null);
  // default closed; open via Edit button
  const [panelOpen, setPanelOpen] = useState(false);
  // removed custom font upload option; allow choosing from built-in font list
  const availableFonts = [
    'System',
    'Montserrat',
    'Inter',
    'Roboto',
    'Open Sans',
    'Lato',
    'Poppins',
    'Georgia',
    'Arial',
    'Helvetica',
    'Times New Roman',
    'Playfair Display',
  ];
  const [titleFont, setTitleFont] = useState<string>('System');
  const [artistFont, setArtistFont] = useState<string>('System');
  const [tracksFont, setTracksFont] = useState<string>('System');
  const [saveToastVisible, setSaveToastVisible] = useState(false);
  const saveToastTimerRef = useRef<number | null>(null);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exportSize, setExportSize] = useState<{ w: number; h: number } | null>(null);
  const isDownloadFlowRef = useRef<boolean>(false);
  const [exportWarningVisible, setExportWarningVisible] = useState(false);
  const [pendingExportSize, setPendingExportSize] = useState<{ w: number; h: number } | null>(null);

  const MAX_PIXELS = 25_000_000; // safe threshold (approx 25 megapixels)
  const SAFE_WIDTH = 4100;
  const loadedFromStorageRef = useRef<boolean>(false);
  const suppressAutoGenerateRef = useRef<boolean>(false);
  const restoringFromStorageRef = useRef<boolean>(false);
  const [uncompressedAlbumCover, setUncompressedAlbumCover] = useState<string | null>(null);
  const [useUncompressed, setUseUncompressed] = useState<boolean>(false);
  const [templateImage, setTemplateImage] = useState<string | null>(null);
  const [framed, setFramed] = useState<boolean>(false);
  const [frameWidth, setFrameWidth] = useState<string>('24');
  const [frameColor, setFrameColor] = useState<string>('#ffffff');
  const [columnGap, setColumnGap] = useState<string>('40');
  const [showTrackNumbers, setShowTrackNumbers] = useState<boolean>(true);

  // NOTE: we defer loading until after storage helpers are available so
  // we can prefer loading a saved project (by id) over fetching from MusicBrainz.

  // When album cover changes, try to extract good color swatches on web
  useEffect(() => {
    if (!albumCover) return;
    if (restoringFromStorageRef.current) return;
    const extract = async () => {
      // Only run in web environment where canvas is available
      if (typeof window === 'undefined' || !(window.document && window.document.createElement)) return;

      try {
        const img = new (window as any).Image();
        img.crossOrigin = 'anonymous';
        img.src = albumCover;
        await new Promise((res, rej) => {
          img.onload = () => res(null);
          img.onerror = rej;
        });

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const sw = 100;
        const sh = 100;
        canvas.width = sw;
        canvas.height = sh;
        // draw image scaled down for sampling
        ctx!.drawImage(img, 0, 0, sw, sh);
        const data = ctx!.getImageData(0, 0, sw, sh).data;
        const counts: Record<string, number> = {};
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          // quantize to reduce unique colors
          const qr = Math.round(r / 32) * 32;
          const qg = Math.round(g / 32) * 32;
          const qb = Math.round(b / 32) * 32;
          const hex = `#${((1 << 24) + (qr << 16) + (qg << 8) + qb).toString(16).slice(1)}`;
          counts[hex] = (counts[hex] || 0) + 1;
        }
        const sorted = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
        if (sorted.length > 0) setBackgroundColor(sorted[0]);
        if (sorted.length > 1) setColor1(sorted[1]);
        if (sorted.length > 2) setColor2(sorted[2]);
        if (sorted.length > 3) setColor3(sorted[3]);

        // pick textColor as black or white based on background luminance
        const hexToRgb = (hex: string) => {
          const bigint = parseInt(hex.replace('#', ''), 16);
          return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
        };
        const bg = sorted[0] || '#000000';
        const rgb = hexToRgb(bg);
        const luminance = (c: number) => {
          const v = c / 255;
          return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        };
        const lum = 0.2126 * luminance(rgb.r) + 0.7152 * luminance(rgb.g) + 0.0722 * luminance(rgb.b);
        setTextColor(lum > 0.179 ? '#000000' : '#ffffff');
      } catch (e) {
        // ignore extraction errors
      }
    };

    extract();
  }, [albumCover]);

  // Debounce auto-generate when user edits fields
  const debounceRef = useRef<number | null>(null);
  useEffect(() => {
    // fields that affect poster
    const keys = [
      albumName,
      artistsName,
      titleSize,
      artistsSize,
      tracksSize,
      marginTop,
      marginSide,
      marginCover,
      marginBackground,
      backgroundColor,
      textColor,
      titleRelease,
      releaseDate,
      titleRuntime,
      runtime,
      useFade,
      showTracklist,
      tracklist,
  color1,
  color2,
  color3,
  albumCover,
  columnGap,
  showTrackNumbers,
    ];

    // clear existing
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      // if we're restoring from storage, suppress the auto-generate until the restore finishes
      if (suppressAutoGenerateRef.current) return;
      // trigger generate
      setGenerating(true);
    }, 700);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [albumName, artistsName, titleSize, artistsSize, tracksSize, marginTop, marginSide, marginCover, marginBackground, backgroundColor, textColor, titleRelease, releaseDate, titleRuntime, runtime, useFade, showTracklist, tracklist, color1, color2, color3, albumCover, columnGap, showTrackNumbers]);

  const fetchAlbumData = async () => {
    if (loadedFromStorageRef.current) {
      console.log('[Editor] fetchAlbumData skipped because loaded from storage');
      return;
    }
    // Basic validation: MusicBrainz release IDs are UUIDs.
    // Skip fetching for known-local ids (e.g. 'autosave') or any non-UUID id
    const isUuid = (s?: string) =>
      typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
    if (!id || String(id) === 'autosave' || !isUuid(String(id))) {
      console.log('[Editor] fetchAlbumData skipped: invalid or non-UUID id=', id);
      // ensure we don't leave the screen stuck in a loading state for custom/new editors
      try { setLoading(false); } catch (e) { /* ignore */ }
      return;
    }
    try {
      console.log('[Editor] fetchAlbumData starting for id', id);
      // Fetch release details from MusicBrainz and cover art from Cover Art Archive
      // MusicBrainz release lookup with recordings and artist-credit included
      const mbUrl = `https://musicbrainz.org/ws/2/release/${id}?inc=recordings+artist-credits&fmt=json`;
      const resp = await fetch(mbUrl, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Plastered/1.0 (https://example.com)'
        },
      });

      if (!resp.ok) {
        throw new Error('Failed to fetch release from MusicBrainz');
      }

      const albumData = await resp.json();

      const formattedArtistsName = (albumData['artist-credit'] || [])
        .map((a: any) => a.name)
        .join(', ');

      setAlbumName(albumData.title || '');
      setArtistsName(formattedArtistsName);
      setReleaseDate(albumData.date || '');

      // Build tracklist from media/tracks
      const tracks: string[] = [];
      const media = albumData.media || [];
      media.forEach((m: any) => {
        (m.tracks || []).forEach((t: any, idx: number) => {
          // include per-track duration if available (MusicBrainz provides length in ms)
          const len = parseInt(t.length || t.duration || 0);
          let dur = '';
          if (!Number.isNaN(len) && len > 0) {
            const seconds = Math.floor(len / 1000);
            const hrs = Math.floor(seconds / 3600);
            const mins = Math.floor((seconds % 3600) / 60);
            const secs = seconds % 60;
            dur = hrs > 0 ? ` — ${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}` : ` — ${mins}:${String(secs).padStart(2, '0')}`;
          }
          tracks.push(`${t.position || idx + 1}. ${t.title}${dur}`);
        });
      });
      if (tracks.length > 0) setShowTracklist(true);
      setTracklist(tracks.join('\n'));

      // compute total runtime if track lengths available (MusicBrainz gives length in ms)
      try {
        let totalMs = 0;
        media.forEach((m: any) => {
          (m.tracks || []).forEach((t: any) => {
            const len = parseInt(t.length || t.duration || 0);
            if (!Number.isNaN(len)) totalMs += len;
          });
        });
        if (totalMs > 0) {
          const seconds = Math.floor(totalMs / 1000);
          const hrs = Math.floor(seconds / 3600);
          const mins = Math.floor((seconds % 3600) / 60);
          const secs = seconds % 60;
          const runtimeStr = hrs > 0 ? `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}` : `${mins}:${String(secs).padStart(2, '0')}`;
          setRuntime(runtimeStr);
        }
      } catch (e) {
        // ignore
      }

      // Attempt to get cover art from Cover Art Archive
      const coverUrl = `https://coverartarchive.org/release/${id}/front`;
      // Check if exists
      let finalCover = '';
      try {
        const head = await fetch(coverUrl, { method: 'HEAD' });
        if (head.ok) {
          finalCover = coverUrl;
        }
      } catch (e) {
        // ignore
      }

  setAlbumCover(finalCover);
      setLoading(false);
      handleGenerate();
    } catch (error) {
      console.error('Error fetching album data:', error);
      setLoading(false);
      Alert.alert('Error', 'Failed to load album data');
    }
  };

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
    }, 1000);
  };

  const startExportWithSize = (w: number, h: number) => {
    setExportModalVisible(false);
    // safety check to avoid browser OOM for very large canvases
    const pixels = w * h;
    if (pixels > MAX_PIXELS) {
      setPendingExportSize({ w, h });
      setExportWarningVisible(true);
      return;
    }
    setExportSize({ w, h });
    isDownloadFlowRef.current = true;
    // trigger generation which will call onImageReady
    setGenerating(true);
  };

  const proceedDownscale = () => {
    if (!pendingExportSize) return setExportWarningVisible(false);
    const { w, h } = pendingExportSize;
    const ratio = h / w;
    const nw = SAFE_WIDTH;
    const nh = Math.round(SAFE_WIDTH * ratio);
    setExportWarningVisible(false);
    setPendingExportSize(null);
    setExportSize({ w: nw, h: nh });
    isDownloadFlowRef.current = true;
    setGenerating(true);
  };

  const proceedAnyway = () => {
    if (!pendingExportSize) return setExportWarningVisible(false);
    const { w, h } = pendingExportSize;
    setExportWarningVisible(false);
    setPendingExportSize(null);
    setExportSize({ w, h });
    isDownloadFlowRef.current = true;
    setGenerating(true);
  };

  const handleDownload = async () => {
    try {
      if (!posterRef.current) return;

      const uri = await captureRef(posterRef, {
        format: 'png',
        quality: 1,
      });

  const fileName = `Plastered-${albumName}.png`;
  const fileUri = (FileSystem as any).documentDirectory + fileName;

      await FileSystem.copyAsync({
        from: uri,
        to: fileUri,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert('Success', 'Poster saved to device');
      }
    } catch (error) {
      console.error('Error downloading poster:', error);
      Alert.alert('Error', 'Failed to download poster');
    }
  };

  // web-safe download: uses generatedImage data URL if available
  const handleDownloadWeb = async () => {
    try {
      if (typeof window === 'undefined') return handleDownload();
      const dataUrl = generatedImage;
      if (!dataUrl) {
        Alert.alert('Error', 'No generated image available');
        return;
      }
      // create a temporary anchor and click it
      const a = document.createElement('a');
      a.href = dataUrl;
  a.download = `Plastered-${albumName || 'poster'}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      // fallback to native flow
      handleDownload();
    }
  };

  // Save posterData JSON to recent projects in AsyncStorage
  // storage helpers - prefer AsyncStorage if available, otherwise localStorage on web or in-memory fallback
  const STORAGE_KEY = '@Plastered:recentProjects';
  const memoryStore: Record<string, string> = {};

  // Apply saved poster data as a sequence of edits so the normal
  // debounced auto-generate and per-field effects (like color extraction)
  // run as if the user changed each field. Spacing updates slightly
  // prevents React batching from collapsing them into a single update
  // and gives effects a chance to run between changes.
  const applyPosterEdits = async (found: any) => {
    const pd = (found && found.posterData) || {};
    const expectedSnapshot = {
      albumName: found.albumName || '',
      artistsName: found.artistsName || '',
      albumCover: found.albumCover || '',
      titleSize: pd.titleSize || '200',
      artistsSize: pd.artistsSize || '110',
      tracksSize: pd.tracksSize || '50',
      marginTop: pd.marginTop || '0',
      marginSide: pd.marginSide || '160',
      marginCover: pd.marginCover || '0',
      marginBackground: pd.marginBackground || '0',
      backgroundColor: pd.backgroundColor || '#5900ff',
      textColor: pd.textColor || '#ff9100',
      color1: pd.color1 || '#ff0000',
      color2: pd.color2 || '#00ff40',
      color3: pd.color3 || '#2600ff',
      useFade: Boolean(pd.useFade),
      showTracklist: Boolean(pd.showTracklist),
      tracklist: pd.tracklist || '',
      titleRelease: pd.titleRelease || 'RELEASE',
      releaseDate: pd.releaseDate || '',
      titleRuntime: pd.titleRuntime || 'RUNTIME',
      runtime: pd.runtime || '',
      titleFont: pd.titleFont || 'System',
      artistFont: pd.artistFont || 'System',
      tracksFont: pd.tracksFont || 'System',
      templateImage: pd.templateImage || null,
      framed: Boolean(pd.framed || false),
      frameWidth: pd.frameWidth || '24',
      frameColor: pd.frameColor || '#ffffff',
      columnGap: pd.columnGap || '40',
      showTrackNumbers: pd.showTrackNumbers === undefined ? true : Boolean(pd.showTrackNumbers),
    };

    // Clear any previous generated preview so the new generation will populate it
    try {
      setGeneratedImage(null);
    } catch (e) {
      /* ignore */
    }

    const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

    const tasks: Array<{ label: string; setter: (v: any) => void; value: any }> = [
      { label: 'albumName', setter: setAlbumName, value: expectedSnapshot.albumName },
      { label: 'artistsName', setter: setArtistsName, value: expectedSnapshot.artistsName },
      { label: 'backgroundColor', setter: setBackgroundColor, value: expectedSnapshot.backgroundColor },
      { label: 'textColor', setter: setTextColor, value: expectedSnapshot.textColor },
      { label: 'color1', setter: setColor1, value: expectedSnapshot.color1 },
      { label: 'color2', setter: setColor2, value: expectedSnapshot.color2 },
      { label: 'color3', setter: setColor3, value: expectedSnapshot.color3 },
      { label: 'titleSize', setter: setTitleSize, value: expectedSnapshot.titleSize },
      { label: 'artistsSize', setter: setArtistsSize, value: expectedSnapshot.artistsSize },
      { label: 'tracksSize', setter: setTracksSize, value: expectedSnapshot.tracksSize },
      { label: 'marginTop', setter: setMarginTop, value: expectedSnapshot.marginTop },
      { label: 'marginSide', setter: setMarginSide, value: expectedSnapshot.marginSide },
      { label: 'marginCover', setter: setMarginCover, value: expectedSnapshot.marginCover },
      { label: 'marginBackground', setter: setMarginBackground, value: expectedSnapshot.marginBackground },
      { label: 'useFade', setter: setUseFade, value: expectedSnapshot.useFade },
      { label: 'showTracklist', setter: setShowTracklist, value: expectedSnapshot.showTracklist },
      { label: 'tracklist', setter: setTracklist, value: expectedSnapshot.tracklist },
      { label: 'titleRelease', setter: setTitleRelease, value: expectedSnapshot.titleRelease },
      { label: 'releaseDate', setter: setReleaseDate, value: expectedSnapshot.releaseDate },
      { label: 'titleRuntime', setter: setTitleRuntime, value: expectedSnapshot.titleRuntime },
      { label: 'runtime', setter: setRuntime, value: expectedSnapshot.runtime },
      { label: 'titleFont', setter: setTitleFont, value: expectedSnapshot.titleFont },
      { label: 'artistFont', setter: setArtistFont, value: expectedSnapshot.artistFont },
      { label: 'tracksFont', setter: setTracksFont, value: expectedSnapshot.tracksFont },
      { label: 'albumCover', setter: setAlbumCover, value: expectedSnapshot.albumCover },
      { label: 'templateImage', setter: setTemplateImage, value: expectedSnapshot.templateImage },
      { label: 'framed', setter: setFramed, value: expectedSnapshot.framed },
      { label: 'frameWidth', setter: setFrameWidth, value: expectedSnapshot.frameWidth },
      { label: 'frameColor', setter: setFrameColor, value: expectedSnapshot.frameColor },
  { label: 'columnGap', setter: setColumnGap, value: expectedSnapshot.columnGap },
  { label: 'showTrackNumbers', setter: setShowTrackNumbers, value: expectedSnapshot.showTrackNumbers },
    ];

    restoringFromStorageRef.current = true;
    try {
      for (const t of tasks) {
        try {
          t.setter(t.value);
          console.log('[Editor] applied edit', t.label, '=>', t.value);
        } catch (e) {
          console.warn('[Editor] failed applying edit', t.label, e);
        }
        await sleep(25);
      }

      loadedFromStorageRef.current = true;
      console.log('[Editor] Applied saved project edits from storage id=', found.id);

      const finalize = () => {
        restoringFromStorageRef.current = false;
        console.log('[Editor] post-apply expected snapshot', expectedSnapshot);
      };

      if (typeof window !== 'undefined') {
        setTimeout(finalize, 180);
      } else {
        finalize();
      }
    } catch (err) {
      restoringFromStorageRef.current = false;
      throw err;
    }
  };

  const storageGet = async (key: string) => {
    try {
      // try AsyncStorage dynamic import
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      if (AsyncStorage && AsyncStorage.getItem) return await AsyncStorage.getItem(key);
    } catch (e) {
      // ignore: try localStorage
    }

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch (e) {
      // ignore
    }

    return memoryStore[key] || null;
  };

  // Try to load a saved project before hitting MusicBrainz. This ensures
  // that opening a saved project id restores previously saved edits.
  useEffect(() => {
    let mounted = true;
    // reset flags on navigation
    loadedFromStorageRef.current = false;
    restoringFromStorageRef.current = false;

    if (!openedFromSaved) {
      suppressAutoGenerateRef.current = false;
      setLoading(true);
      // ensure we fetch fresh data for standard navigation
      fetchAlbumData();
      return () => {
        mounted = false;
      };
    }

    (async () => {
      try {
        const raw = await storageGet(STORAGE_KEY);
        console.log('[Editor] storage-load raw value:', raw);
        if (!mounted) return;
        let list: any[] = [];
        try {
          list = raw ? JSON.parse(raw) : [];
        } catch (e) {
          console.warn('[Editor] Failed to parse storage raw value', e);
          list = [];
        }
        console.log('[Editor] storage-load parsed list length=', list.length, 'ids=', list.map((p: any) => p.id));
        const found = list.find((p: any) => String(p.id) === String(id));
        console.log('[Editor] storage-load searching for id=', id, 'found=', Boolean(found));
        if (found) {
          try {
            setLoading(false);
            loadedFromStorageRef.current = true;
            suppressAutoGenerateRef.current = true;
            await applyPosterEdits(found);
            if (debounceRef.current) {
              window.clearTimeout(debounceRef.current);
              debounceRef.current = null;
            }
            window.setTimeout(() => {
              suppressAutoGenerateRef.current = false;
              try {
                // kick off one generation pass so the restored project shows immediately
                handleGenerate();
              } catch (e) {
                /* ignore */
              }
            }, 200);
          } catch (e) {
            console.warn('[Editor] applyPosterEdits failed', e);
            loadedFromStorageRef.current = true;
            setLoading(false);
          }
          return;
        }
      } catch (e) {
        // ignore and fall back to MusicBrainz fetch
      }

      fetchAlbumData();
    })();

    return () => {
      mounted = false;
    };
  }, [id, openedFromSaved]);

  const storageSet = async (key: string, value: string) => {
    try {
      // try AsyncStorage dynamic import
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      if (AsyncStorage && AsyncStorage.setItem) return await AsyncStorage.setItem(key, value);
    } catch (e) {
      // ignore
    }

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
    } catch (e) {
      // ignore
    }

    memoryStore[key] = value;
  };

  const saveProject = async () => {
    try {
      const project = {
        id: id || String(Date.now()),
        albumName,
        artistsName,
        albumCover,
        posterData: getPosterDataSnapshot(),
        savedAt: Date.now(),
      };
      const raw = await storageGet(STORAGE_KEY);
      const list = raw ? JSON.parse(raw) : [];
      const filtered = [project, ...list.filter((p: any) => p.id !== project.id)].slice(0, 20);
      await storageSet(STORAGE_KEY, JSON.stringify(filtered));
      // log saved JSON and show a small toast
      try {
        console.log('[Plastered] saveProject saved JSON:', JSON.stringify(project));
      } catch (e) {
        console.log('[Plastered] saveProject saved (could not stringify)');
      }
      setSaveToastVisible(true);
      if (saveToastTimerRef.current) window.clearTimeout(saveToastTimerRef.current);
      saveToastTimerRef.current = window.setTimeout(() => setSaveToastVisible(false), 1800);
      Alert.alert('Saved', 'Project saved to recent projects');
    } catch (e) {
      console.error('Save error', e);
      Alert.alert('Error', 'Failed to save project');
    }
  };

  // Autosave current poster state (debounced)
  useEffect(() => {
    const idKey = 'autosave';
    if (restoringFromStorageRef.current) return;
    const timeout = window.setTimeout(async () => {
      try {
        const project = {
          id: idKey,
          albumName,
          artistsName,
          albumCover,
          posterData: getPosterDataSnapshot(),
          savedAt: Date.now(),
        };
        const raw = await storageGet(STORAGE_KEY);
        const list = raw ? JSON.parse(raw) : [];
        const filtered = [project, ...list.filter((p: any) => p.id !== project.id)].slice(0, 20);
        await storageSet(STORAGE_KEY, JSON.stringify(filtered));
        try {
          console.log('[Plastered] autosave saved JSON:', JSON.stringify(project));
        } catch (e) {
          console.log('[Plastered] autosave saved');
        }
        setSaveToastVisible(true);
        if (saveToastTimerRef.current) window.clearTimeout(saveToastTimerRef.current);
        saveToastTimerRef.current = window.setTimeout(() => setSaveToastVisible(false), 1800);
      } catch (e) {
        // ignore autosave errors
      }
    }, 1500);

    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [albumName, artistsName, albumCover, titleSize, artistsSize, tracksSize, marginTop, marginSide, marginCover, marginBackground, backgroundColor, textColor, titleRelease, releaseDate, titleRuntime, runtime, useFade, showTracklist, tracklist, color1, color2, color3, columnGap, showTrackNumbers]);

  const openColorPicker = (field: string) => {
    setCurrentColorField(field);
    setColorPickerVisible(true);
  };

  const handleColorSelect = (color: string) => {
    if (!currentColorField) return;

    switch (currentColorField) {
      case 'backgroundColor':
        setBackgroundColor(color);
        break;
      case 'textColor':
        setTextColor(color);
        break;
      case 'color1':
        setColor1(color);
        break;
      case 'color2':
        setColor2(color);
        break;
      case 'color3':
        setColor3(color);
        break;
    }
  };

  const getPosterDataSnapshot = () => ({
    albumCover,
    albumName,
    artistsName,
    titleSize,
    artistsSize,
    tracksSize,
    marginTop,
    marginSide,
    marginCover,
    marginBackground,
    backgroundColor,
    textColor,
    titleRelease,
    releaseDate,
    titleRuntime,
    runtime,
    useFade,
    showTracklist,
    tracklist,
    color1,
    color2,
    color3,
    titleFont,
    artistFont,
    tracksFont,
    useUncompressed,
    uncompressedAlbumCover,
    templateImage,
    framed,
    frameWidth,
    frameColor,
    columnGap,
    showTrackNumbers,
  });

  const posterData = getPosterDataSnapshot();

  // Debug helper: when the edit modal opens, log a snapshot of the current state
  // to verify saved edits were applied to the editor state.
  useEffect(() => {
    if (!panelOpen) return;
    try {
      console.log('[Editor] modal opened - state snapshot', {
        albumName,
        artistsName,
        albumCover,
        titleFont,
        artistFont,
        tracksFont,
        titleSize,
        artistsSize,
        tracksSize,
        tracklist,
      });
    } catch (e) {
      /* ignore logging errors */
    }
  }, [panelOpen]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1DB954" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            try {
              // explicit: return to search page
              if (typeof router.push === 'function') router.push('/search');
            } catch (e) {
              /* ignore */
            }
          }}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color="#fff" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.editorMainRow}>
          <View style={styles.previewContainer} ref={posterRef}>
            <PosterCanvas
              posterData={{ ...posterData }}
              exportSize={exportSize}
              onImageReady={(uri: string) => {
                setGeneratedImage(uri);
                setGenerating(false);
                // if this generate was triggered by download flow, start download/share
                if (isDownloadFlowRef.current) {
                  isDownloadFlowRef.current = false;
                  // web download
                  if (typeof window !== 'undefined') {
                    const a = document.createElement('a');
                    a.href = uri;
                    a.download = `Plastered-${albumName || 'poster'}.png`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                  } else {
                    // native: save/share
                    (async () => {
                      try {
                        const fileName = `Plastered-${albumName}.png`;
                        const fileUri = (FileSystem as any).documentDirectory + fileName;
                        await FileSystem.writeAsStringAsync(fileUri, uri.replace(/^data:image\/png;base64,/, ''), { encoding: 'base64' as any });
                        if (await Sharing.isAvailableAsync()) {
                          await Sharing.shareAsync(fileUri);
                        } else {
                          Alert.alert('Saved', 'Poster saved to device');
                        }
                      } catch (e) {
                        console.error('Export save failed', e);
                        Alert.alert('Error', 'Failed to save poster');
                      }
                    })();
                  }
                }
              }}
              generatePoster={generating}
              onTitleSizeAdjust={(size: number, initial?: boolean) => setTitleSize(String(size))}
            />

            {/* visible preview: prefer generated image (data URL), otherwise show album cover */}
            {generatedImage ? (
              <Image source={{ uri: generatedImage }} style={styles.posterImage} resizeMode="contain" />
            ) : albumCover ? (
              <Image source={{ uri: albumCover }} style={styles.posterImage} resizeMode="contain" />
            ) : (
              <View style={styles.noPreview}>
                <Text style={styles.noPreviewText}>No preview available</Text>
              </View>
            )}

            {generating && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#1DB954" />
              </View>
            )}
          </View>

          {/* settings panel moved to modal overlay - keep layout spacing */}
          <View style={{ width: 360, marginLeft: 16 }} />

          {/* panel toggle now moved to the sticky buttons row */}
        </View>

        {/* Editing is done in the modal - no duplicate controls on main screen */}

        <View style={styles.stickyButtonContainer}>
          <TouchableOpacity style={styles.iconButton} onPress={handleGenerate} accessibilityLabel="Generate">
            <RefreshCw size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={() => setPanelOpen(!panelOpen)} accessibilityLabel="Edit">
            <Edit3 size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.iconButton, styles.buttonPrimary]} onPress={() => {
            setExportModalVisible(true);
          }} accessibilityLabel="Download">
            <Download size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {panelOpen && (
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>Edit Poster</Text>
              <TouchableOpacity onPress={() => setPanelOpen(false)}>
                <Text style={{ color: '#fff' }}>Close</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalTabsRow}>
              <TouchableOpacity
                style={[styles.modalTab, activeTab === 'information' && styles.modalTabActive]}
                onPress={() => setActiveTab('information')}
              >
                <Text style={[styles.tabText, activeTab === 'information' && styles.tabTextActive]}>Information</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalTab, activeTab === 'tracklist' && styles.modalTabActive]}
                onPress={() => setActiveTab('tracklist')}
              >
                <Text style={[styles.tabText, activeTab === 'tracklist' && styles.tabTextActive]}>Tracklist</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {activeTab === 'information' ? (
                <View>
                  <NormalInput title="Album Name" value={albumName} onChange={setAlbumName} />
                  <NormalInput title="Artist Name" value={artistsName} onChange={setArtistsName} />
                  {typeof window !== 'undefined' && (
                    <View style={{ marginTop: 10, marginBottom: 8 }}>
                      <Text style={{ color: '#bbb', marginBottom: 6 }}>Upload Cover (web)</Text>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e: any) => {
                          const f = e.target.files && e.target.files[0];
                          if (!f) return;
                          const reader = new FileReader();
                          reader.onload = () => {
                            try {
                              const dataUrl = reader.result as string;
                              setUncompressedAlbumCover(dataUrl);
                              setAlbumCover(dataUrl);
                              // signal PosterCanvas to use uncompressed cover
                              try { (setUseUncompressed as any)(true); } catch (_) { /* ignore */ }
                            } catch (err) {
                              /* ignore */
                            }
                          };
                          reader.readAsDataURL(f);
                        }}
                      />
                    </View>
                  )}
                  {typeof window !== 'undefined' && (
                    <View style={{ marginTop: 10, marginBottom: 8 }}>
                      <Text style={{ color: '#bbb', marginBottom: 6 }}>Upload Template (web)</Text>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e: any) => {
                          const f = e.target.files && e.target.files[0];
                          if (!f) return;
                          const reader = new FileReader();
                          reader.onload = () => {
                            try {
                              const dataUrl = reader.result as string;
                              setTemplateImage(dataUrl);
                            } catch (err) {
                              /* ignore */
                            }
                          };
                          reader.readAsDataURL(f);
                        }}
                      />
                    </View>
                  )}
                  <NormalInput title="Title Size" value={titleSize} onChange={setTitleSize} />
                  <NormalInput title="Artist Size" value={artistsSize} onChange={setArtistsSize} />
                  <NormalInput title="Tracks Size" value={tracksSize} onChange={setTracksSize} />
                  <NormalInput title="Margin Top" value={marginTop} onChange={setMarginTop} />
                  <NormalInput title="Margin Side" value={marginSide} onChange={setMarginSide} />
                  <NormalInput title="Margin Cover" value={marginCover} onChange={setMarginCover} />
                  <NormalInput title="Margin Background" value={marginBackground} onChange={setMarginBackground} />

                  <DoubleInput
                    title={titleRelease}
                    value={releaseDate}
                    onChangeTitle={setTitleRelease}
                    onChangeDate={setReleaseDate}
                  />
                  <DoubleInput
                    title={titleRuntime}
                    value={runtime}
                    onChangeTitle={setTitleRuntime}
                    onChangeDate={setRuntime}
                  />

                  <ColorInput title="Background Color" value={backgroundColor} onClick={() => openColorPicker('backgroundColor')} />
                  <ColorInput title="Text Color" value={textColor} onClick={() => openColorPicker('textColor')} />
                  <ColorInput title="Color 1" value={color1} onClick={() => openColorPicker('color1')} />
                  <ColorInput title="Color 2" value={color2} onClick={() => openColorPicker('color2')} />
                  <ColorInput title="Color 3" value={color3} onClick={() => openColorPicker('color3')} />

                  <CheckInput title="Fade Effect" value={useFade} onChange={setUseFade} text="Enable fade effect" />
                  <CheckInput title="Show Tracklist" value={showTracklist} onChange={setShowTracklist} text="Display tracklist" />

                  <CheckInput title="Framed Poster" value={framed} onChange={setFramed} text="Draw a decorative frame around the poster" />
                  {framed && (
                    <View style={{ marginTop: 8 }}>
                      <NormalInput title="Frame Width (px)" value={frameWidth} onChange={setFrameWidth} />
                      <ColorInput title="Frame Color" value={frameColor} onClick={() => { setCurrentColorField('frameColor'); setColorPickerVisible(true); }} />
                    </View>
                  )}

                  {/* Font selectors for different poster parts (horizontal, previewable) */}
                  <View style={{ marginTop: 8 }}>
                    <Text style={{ color: '#bbb', marginBottom: 6 }}>Title Font</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                      {availableFonts.map((f) => (
                        <TouchableOpacity
                          key={`titlefont-${f}`}
                          onPress={() => setTitleFont(f)}
                          style={[
                            styles.openPanelButton,
                            { minWidth: 96, paddingVertical: 10, alignItems: 'center' },
                            titleFont === f && { borderColor: '#1DB954', borderWidth: 1 },
                          ]}
                        >
                          <Text style={{ color: '#fff', fontFamily: f === 'System' ? undefined : f, fontSize: 20 }}>Aa</Text>
                          <Text style={{ color: '#fff', fontSize: 12, marginTop: 6 }}>{f}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>

                    <Text style={{ color: '#bbb', marginBottom: 6 }}>Artist Font</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                      {availableFonts.map((f) => (
                        <TouchableOpacity
                          key={`artistfont-${f}`}
                          onPress={() => setArtistFont(f)}
                          style={[
                            styles.openPanelButton,
                            { minWidth: 96, paddingVertical: 10, alignItems: 'center' },
                            artistFont === f && { borderColor: '#1DB954', borderWidth: 1 },
                          ]}
                        >
                          <Text style={{ color: '#fff', fontFamily: f === 'System' ? undefined : f, fontSize: 18 }}>Aa</Text>
                          <Text style={{ color: '#fff', fontSize: 12, marginTop: 6 }}>{f}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>

                    <Text style={{ color: '#bbb', marginBottom: 6 }}>Tracks Font</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                      {availableFonts.map((f) => (
                        <TouchableOpacity
                          key={`tracksfont-${f}`}
                          onPress={() => setTracksFont(f)}
                          style={[
                            styles.openPanelButton,
                            { minWidth: 96, paddingVertical: 10, alignItems: 'center' },
                            tracksFont === f && { borderColor: '#1DB954', borderWidth: 1 },
                          ]}
                        >
                          <Text style={{ color: '#fff', fontFamily: f === 'System' ? undefined : f, fontSize: 16 }}>Aa</Text>
                          <Text style={{ color: '#fff', fontSize: 12, marginTop: 6 }}>{f}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>
              ) : (
                <View style={styles.tracklistContainer}>
                  <Text style={{ color: '#bbb', marginBottom: 8 }}>Tracklist (one per line)</Text>
                  <TextInput
                    style={styles.tracklistInput}
                    value={tracklist}
                    onChangeText={setTracklist}
                    multiline
                    placeholder="Enter tracklist..."
                    placeholderTextColor="#555"
                  />
                  <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <CheckInput title="Show Track Numbers" value={showTrackNumbers} onChange={setShowTrackNumbers} text="Display leading track numbers (e.g. 1.)" />
                    <View style={{ flex: 1 }}>
                      <NormalInput title="Column Gap (px)" value={columnGap} onChange={setColumnGap} />
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity style={styles.button} onPress={() => { handleGenerate(); setPanelOpen(false); }}>
                <RefreshCw size={18} color="#fff" />
                <Text style={styles.buttonText}>Apply</Text>
              </TouchableOpacity>
              {/* Download removed from modal - use sticky download button */}
            </View>
          </View>
        </View>
      )}

      {/* Export size modal */}
      {exportModalVisible && (
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { maxWidth: 420 }]}>
            <Text style={styles.panelTitle}>Choose export size</Text>
            <View style={{ marginTop: 12 }}>
              <TouchableOpacity style={styles.button} onPress={() => startExportWithSize(2870, 4100)}>
                <Text style={styles.buttonText}>Extra small — 2870 × 4100</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.button} onPress={() => startExportWithSize(4100, 5840)}>
                <Text style={styles.buttonText}>Small — 4100 × 5840</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.button} onPress={() => startExportWithSize(5840, 8310)}>
                <Text style={styles.buttonText}>Medium — 5840 × 8310</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.button} onPress={() => startExportWithSize(8310, 11790)}>
                <Text style={styles.buttonText}>Large — 8310 × 11790</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, { marginTop: 8 }]} onPress={() => setExportModalVisible(false)}>
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {exportWarningVisible && (
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { maxWidth: 480 }]}> 
            <Text style={styles.panelTitle}>Large export warning</Text>
            <Text style={{ color: '#ddd', marginTop: 8 }}>The selected export is very large and may cause your browser or device to run out of memory.</Text>
            <Text style={{ color: '#bbb', marginTop: 8 }}>You can downscale to a safer size (recommended) or attempt the full-size export anyway.</Text>
            <View style={{ marginTop: 12 }}>
              <TouchableOpacity style={styles.button} onPress={proceedDownscale}>
                <Text style={styles.buttonText}>Downscale to safe size ({SAFE_WIDTH}px wide)</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, { marginTop: 8 }]} onPress={proceedAnyway}>
                <Text style={styles.buttonText}>Proceed with selected size</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, { marginTop: 8 }]} onPress={() => { setExportWarningVisible(false); setPendingExportSize(null); }}>
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <ColorPicker
        visible={colorPickerVisible}
        defaultColor={
          currentColorField === 'backgroundColor'
            ? backgroundColor
            : currentColorField === 'textColor'
            ? textColor
            : currentColorField === 'color1'
            ? color1
            : currentColorField === 'color2'
            ? color2
            : color3
        }
        onClose={() => setColorPickerVisible(false)}
        onSelectColor={handleColorSelect}
        predefinedColors={[backgroundColor, textColor, color1, color2, color3]}
      />
      {/* Save toast */}
      {saveToastVisible && (
        <View style={styles.saveToast} pointerEvents="none">
          <Text style={styles.saveToastText}>Saved</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 15,
    zIndex: 900,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  previewContainer: {
    alignItems: 'center',
    marginVertical: 20,
    position: 'relative',
    width: '100%',
    maxWidth: 420,
    maxHeight: 620,
    overflow: 'hidden',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#1DB954',
  },
  tabText: {
    color: '#888',
    fontSize: 16,
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#fff',
  },
  settingsContainer: {
    marginBottom: 20,
  },
  tracklistContainer: {
    marginBottom: 20,
  },
  tracklistInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    color: '#fff',
    padding: 15,
    borderRadius: 8,
    fontSize: 14,
    minHeight: 300,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonPrimary: {
    backgroundColor: '#1DB954',
  },
  iconButton: {
    width: 56,
    height: 48,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  editorMainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  settingsPanel: {
    width: 360,
    padding: 12,
    backgroundColor: '#0f0f0f',
    borderRadius: 8,
    marginLeft: 16,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  panelTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  openPanelButton: {
    width: 120,
    padding: 8,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    marginLeft: 12,
  },
  stickyButtonContainer: {
    position: 'sticky',
    bottom: 0,
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
    paddingVertical: 12,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  panelOpen: {
    display: 'flex',
  },
  panelClosed: {
    display: 'none',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1400,
  },
  modalCard: {
    width: '90%',
    maxWidth: 960,
    maxHeight: '85%',
    backgroundColor: '#0d0d0d',
    borderRadius: 12,
    padding: 12,
    elevation: 40,
    zIndex: 1500,
  },
  modalTabsRow: {
    flexDirection: 'row',
    marginTop: 8,
    marginBottom: 8,
  },
  modalTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#1DB954',
  },
  modalBody: {
    flex: 1,
    marginBottom: 8,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  saveToast: {
    position: 'absolute',
    bottom: 90,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    zIndex: 2000,
  },
  saveToastText: {
    color: '#fff',
    fontWeight: '700',
  },
  posterImage: {
    width: '100%',
    height: 560,
  },
  noPreview: {
    width: '100%',
    height: 560,
    backgroundColor: '#070707',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  noPreviewText: {
    color: '#666',
  },
});
