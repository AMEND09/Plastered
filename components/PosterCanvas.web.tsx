import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';

interface PosterData {
  albumCover: string;
  albumName: string;
  artistsName: string;
  titleSize: string;
  artistsSize: string;
  tracksSize: string;
  marginTop: string;
  marginSide: string;
  marginCover: string;
  marginBackground: string;
  backgroundColor: string;
  textColor: string;
  titleRelease: string;
  releaseDate: string;
  titleRuntime: string;
  runtime: string;
  useFade: boolean;
  showTracklist: boolean;
  tracklist: string;
  color1: string;
  color2: string;
  color3: string;
  // fonts
  titleFont?: string;
  artistFont?: string;
  tracksFont?: string;
  // optional flags used elsewhere
  userAdjustedTitleSize?: boolean;
  initialTitleSizeSet?: boolean;
  useUncompressed?: boolean;
  uncompressedAlbumCover?: string;
}

interface PosterCanvasProps {
  posterData: PosterData;
  onImageReady: (uri: string) => void;
  generatePoster: boolean;
}

export default function PosterCanvas({ posterData, onImageReady, generatePoster, onTitleSizeAdjust }: PosterCanvasProps & any) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  // Keep track of the last created blob URL so we can revoke it reliably
  const lastBlobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const width = 2480;
    const height = 3508;

    const hexToRgb = (hex: string) => {
      const bigint = parseInt(hex.replace('#', ''), 16);
      return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
    };

    const generate = async () => {
      if (!generatePoster) return;
      // create an off-DOM canvas for drawing to avoid platform/webview canvas backing issues
      const exportCanvas = (typeof document !== 'undefined') ? document.createElement('canvas') as HTMLCanvasElement : null;
      const canvas = exportCanvas || canvasRef.current;
      console.log('[PosterCanvas] generate start', {
        albumCover: posterData.albumCover,
        albumName: posterData.albumName,
        titleFont: posterData.titleFont,
        artistFont: posterData.artistFont,
      });
      if (exportCanvas) console.log('[PosterCanvas] using off-DOM export canvas');
      if (!canvas) return;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Normalize and parse numeric fields
      posterData.marginSide = parseInt(posterData.marginSide) || 0;
      posterData.marginTop = parseInt(posterData.marginTop) || 0;
      posterData.marginCover = parseInt(posterData.marginCover) || 0;
      posterData.marginBackground = parseInt(posterData.marginBackground) || 0;

      // helpers
      const loadImage = (url: string) => new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new (window as any).Image() as HTMLImageElement;
        img.crossOrigin = 'anonymous';
        img.src = url;
        img.onload = () => {
          console.log('[PosterCanvas] image loaded:', url);
          resolve(img);
        };
        img.onerror = (err: any) => {
          console.error('[PosterCanvas] image load error:', url, err);
          reject(err);
        };
      });

      const drawCover = async (url: string) => {
        try {
          const img = await loadImage(url);
          const coverSize = width - posterData.marginCover * 2;
          ctx.drawImage(img, posterData.marginCover, posterData.marginCover, coverSize, coverSize);
          if (posterData.useFade) {
            const verticalFade = ctx.createLinearGradient(0, 0, 0, 3000 - posterData.marginBackground);
            const rgb = hexToRgb(posterData.backgroundColor || '#000000');
            verticalFade.addColorStop(0.5, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);
            verticalFade.addColorStop(0.8, posterData.backgroundColor || '#000000');
            ctx.fillStyle = verticalFade as any;
            ctx.fillRect(0, 0, canvas.width, 2500 - posterData.marginBackground);
          }
        } catch (e) {
          // ignore cover load errors
        }
      };

      // background base
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = posterData.backgroundColor || '#000';
      ctx.fillRect(0, 0, width, height);

      // draw cover (prefer uncompressed if asked)
      let canvasTainted = false;
      if (posterData.useUncompressed && posterData.uncompressedAlbumCover) {
        await drawCover(posterData.uncompressedAlbumCover);
      } else if (posterData.albumCover) {
        await drawCover(posterData.albumCover);
      }

      // quick taint detection: reading pixels will throw if canvas is tainted by cross-origin image
      try {
        // test read
        ctx.getImageData(0, 0, 1, 1);
        console.log('[PosterCanvas] canvas pixel read OK (not tainted)');
      } catch (err) {
        console.warn('[PosterCanvas] canvas appears tainted after drawing cover — exports will fail.');
        canvasTainted = true;
      }

      // draw bottom background panel
      ctx.fillStyle = posterData.backgroundColor || '#000';
      ctx.fillRect(0, 2480 - posterData.marginBackground, width, height - 2480 + posterData.marginBackground);

      // draw album infos
      let titleFontSize = posterData.titleSize ? parseInt(posterData.titleSize) : 230;

      const resolveFamily = (fontName?: string) => {
        if (!fontName || fontName === 'System') {
          return 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial';
        }
        return fontName;
      };

      const formatForCanvas = (family: string) => {
        // if family is a list (contains comma), use as-is
        if (family.includes(',')) return family;
        // wrap family with spaces in quotes
        if (family.includes(' ')) return `"${family}"`;
        return family;
      };

  const titleFamily = formatForCanvas(resolveFamily(posterData.titleFont) || 'Montserrat');
  const artistFamily = formatForCanvas(resolveFamily(posterData.artistFont) || 'Montserrat');
  const tracksFamily = formatForCanvas(resolveFamily(posterData.tracksFont) || 'Montserrat');

      if (!posterData.userAdjustedTitleSize && !posterData.initialTitleSizeSet) {
        ctx.font = `bold ${titleFontSize}px ${titleFamily}`;
        let titleWidth = ctx.measureText(posterData.albumName || '').width;
        while (titleWidth > (2480 - posterData.marginSide * 2)) {
          titleFontSize -= 1;
          ctx.font = `bold ${titleFontSize}px ${titleFamily}`;
          titleWidth = ctx.measureText(posterData.albumName || '').width;
        }
        if (typeof onTitleSizeAdjust === 'function') onTitleSizeAdjust(titleFontSize, true);
      } else {
        ctx.font = `bold ${titleFontSize}px ${titleFamily}`;
      }

      ctx.fillStyle = posterData.textColor || '#fff';
      // Y positions similar to original
      const titleY = posterData.showTracklist ? 2500 + posterData.marginTop : 2790 + posterData.marginTop;
      const artistsY = posterData.showTracklist ? (2500 + posterData.marginTop) + (parseInt(posterData.artistsSize || '110') * 1.3) : (2820 + posterData.marginTop) + parseInt(posterData.artistsSize || '110');

      ctx.fillText(posterData.albumName || '', posterData.marginSide, titleY);

  let artistsFontSize = posterData.artistsSize ? parseInt(posterData.artistsSize) : 110;
  ctx.font = `bold ${artistsFontSize}px ${artistFamily}`;
      ctx.fillText(posterData.artistsName || '', posterData.marginSide, artistsY);

      // release/runtime
  ctx.font = `bold 70px ${artistFamily}`;
      ctx.fillText(posterData.titleRelease || '', posterData.marginSide, 3310);
      const releaseWidth = ctx.measureText(posterData.titleRelease || '').width;
      ctx.fillText(posterData.titleRuntime || '', releaseWidth + posterData.marginSide + 100, 3310);

  ctx.globalAlpha = 0.7;
  ctx.font = `bold 60px ${artistFamily}`;
      ctx.fillText(posterData.runtime || '', releaseWidth + posterData.marginSide + 100, 3390);
      ctx.fillText(posterData.releaseDate || '', posterData.marginSide, 3390);
      ctx.globalAlpha = 1;

      // color bars
      ctx.fillStyle = posterData.color1 || '#ff0000';
      ctx.fillRect(2045 - posterData.marginSide, 3368, 145, 30);
      ctx.fillStyle = posterData.color2 || '#00ff40';
      ctx.fillRect(2190 - posterData.marginSide, 3368, 145, 30);
      ctx.fillStyle = posterData.color3 || '#2600ff';
      ctx.fillRect(2335 - posterData.marginSide, 3368, 145, 30);

      // tracklist
      if (posterData.showTracklist && posterData.tracklist) {
        ctx.fillStyle = posterData.textColor || '#fff';
        let paddingMusic = posterData.marginSide + 10;
        let maxWidth = 0;
        let paddingColumn = 0;
  const fontSize = posterData.tracksSize ? parseInt(posterData.tracksSize) : 50;
  ctx.font = `bold ${fontSize}px ${tracksFamily}`;
        const musicSize = fontSize;

        const marginTopVal = parseInt(posterData.marginTop || '0');
        const rectY = parseInt(posterData.artistsSize || '110')
          ? (2500 + marginTopVal) + parseInt(posterData.artistsSize || '110') * 1.3 + 130
          : (2500 + marginTopVal) + (110 * 1.2) + 130;
        const rectHeight = 500;
        const rectWidth = width - (posterData.marginSide * 2);
        const rectX = parseInt(posterData.marginSide);
        const maxTextHeight = rectY + rectHeight - 10 - parseInt(posterData.marginTop || '0');

        let textHeight = rectY;

        (posterData.tracklist || '').split('\n').forEach((track: string) => {
          if (textHeight + musicSize * 1.3 >= maxTextHeight) {
            textHeight = rectY;
            paddingMusic = maxWidth + (musicSize * 2.5) + paddingColumn;
            if (paddingMusic >= rectX + rectWidth) return;
            paddingColumn = paddingMusic - (musicSize * 2.5);
            maxWidth = 0;
          }
          const textWidth = ctx.measureText(`${track}`).width + posterData.marginSide;
          if (textWidth > maxWidth) {
            maxWidth = textWidth;
          }
          ctx.fillText(`${track}`, paddingMusic, textHeight);
          textHeight += (musicSize * 1.3);
        });
      }

      // finished - export image
      if (canvasTainted) {
        console.error('[PosterCanvas] Skipping export because canvas is tainted by cross-origin image. Consider using a proxy or a CORS-enabled image source.');
      }

      // Clean up: no visual debug markers in production
      // Prefer toBlob/objectURL for large canvases (more memory-friendly and reliable)
      try {
        if ((canvas as any).toBlob) {
          const blob: Blob | null = await new Promise((res) => (canvas as any).toBlob((b: Blob | null) => res(b)));
          if (blob) {
            const objUrl = URL.createObjectURL(blob);
            console.log('[PosterCanvas] created blob URL for preview, size:', blob.size, 'url:', objUrl);
            // revoke previous blob URL (if any)
            try {
              if (lastBlobUrlRef.current && lastBlobUrlRef.current.startsWith('blob:')) {
                URL.revokeObjectURL(lastBlobUrlRef.current);
              }
            } catch (revErr) {
              /* ignore */
            }
            // store and set new preview
            lastBlobUrlRef.current = objUrl;
            setPreviewUrl(objUrl);
            // also read blob as data URL and call onImageReady with the base64 string so downloads work
            try {
              const reader = new FileReader();
              reader.onloadend = () => {
                const result = reader.result as string | null;
                if (result && typeof onImageReady === 'function') {
                  console.log('[PosterCanvas] invoking onImageReady with data URL (from blob) length:', result.length);
                  onImageReady(result);
                }
              };
              reader.readAsDataURL(blob);
            } catch (frErr) {
              console.warn('[PosterCanvas] FileReader failed on blob', frErr);
              // fallback: still expose blob URL via onImageReady
              if (typeof onImageReady === 'function') onImageReady(objUrl);
            }
          } else {
            // fallback to toDataURL
            const dataUrl = canvas.toDataURL('image/png');
            console.log('[PosterCanvas] toDataURL fallback produced length:', dataUrl ? dataUrl.length : 0);
            if (typeof onImageReady === 'function') onImageReady(dataUrl);
            // if we previously had a blob URL, revoke it since we're switching to data URL preview
            try {
              if (lastBlobUrlRef.current && lastBlobUrlRef.current.startsWith('blob:')) URL.revokeObjectURL(lastBlobUrlRef.current);
            } catch (revErr) {
              /* ignore */
            }
            lastBlobUrlRef.current = null;
            setPreviewUrl(dataUrl);
          }
        } else {
          // no toBlob available — use toDataURL
          const dataUrl = canvas.toDataURL('image/png');
          console.log('[PosterCanvas] toDataURL produced length:', dataUrl ? dataUrl.length : 0);
          if (typeof onImageReady === 'function') onImageReady(dataUrl);
          try {
            if (lastBlobUrlRef.current && lastBlobUrlRef.current.startsWith('blob:')) URL.revokeObjectURL(lastBlobUrlRef.current);
          } catch (revErr) {
            /* ignore */
          }
          lastBlobUrlRef.current = null;
          setPreviewUrl(dataUrl);
        }
      } catch (e) {
        console.error('Canvas export failed (blob/dataURL)', e);
        try {
          // final try: toDataURL
          const dataUrl = canvas.toDataURL('image/png');
          if (typeof onImageReady === 'function') onImageReady(dataUrl);
          try {
            if (lastBlobUrlRef.current && lastBlobUrlRef.current.startsWith('blob:')) URL.revokeObjectURL(lastBlobUrlRef.current);
          } catch (revErr) {
            /* ignore */
          }
          lastBlobUrlRef.current = null;
          setPreviewUrl(dataUrl);
        } catch (e2) {
          console.error('Final fallback export failed', e2);
          setPreviewUrl(null);
        }
      }

      // end generate
    };

    // run generation
    generate();

    return () => {
      // cleanup any remaining blob URL when the effect is torn down
      try {
        if (lastBlobUrlRef.current && lastBlobUrlRef.current.startsWith('blob:')) {
          URL.revokeObjectURL(lastBlobUrlRef.current);
        }
      } catch (revErr) {
        /* ignore */
      }
      lastBlobUrlRef.current = null;
    };
  }, [generatePoster, posterData, onImageReady, onTitleSizeAdjust]);

  return (
    <View style={styles.container}>
      {/* offscreen canvas for web poster generation */}
      <canvas ref={canvasRef as any} style={styles.canvas as any} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
  },
  canvas: {
    // Keep the canvas off-screen but renderable so the browser allocates a backing buffer
    position: 'absolute',
    left: -10000,
    top: -10000,
    width: 2480,
    height: 3508,
    opacity: 0,
    pointerEvents: 'none',
  },
  cover: {
    width: '100%',
    height: '70%',
  },
  noCover: {
    width: '100%',
    height: '70%',
    backgroundColor: '#222',
  },
  textContainer: {
    padding: 12,
    width: '100%',
  },
  title: {
    fontWeight: '700',
  },
  artist: {
    marginTop: 8,
    opacity: 0.85,
  },
});
