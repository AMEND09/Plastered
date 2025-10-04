import { useEffect, useRef } from 'react';
import { Canvas, Image as SkImage, Rect, Text, useImage, Skia, LinearGradient, vec } from '@shopify/react-native-skia';
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
  userAdjustedTitleSize?: boolean;
  initialTitleSizeSet?: boolean;
  useUncompressed?: boolean;
  uncompressedAlbumCover?: string;
  // template and framing
  templateImage?: string | null;
  framed?: boolean;
  frameWidth?: string;
  frameColor?: string;
  columnGap?: string;
  showTrackNumbers?: boolean;
  showTrackLengths?: boolean;
}

interface PosterCanvasProps {
  posterData: PosterData;
  onImageReady: (uri: string) => void;
  generatePoster: boolean;
  exportSize?: { w: number; h: number } | null;
}

export default function PosterCanvas({ posterData, onImageReady, generatePoster, exportSize }: PosterCanvasProps) {
  const coverImage = useImage(posterData.albumCover);
  const canvasRef = useRef<any>(null);

  // If exportSize provided, compute a scale factor to scale all layout values
  const baseWidth = 496;
  const baseHeight = 702;
  const targetW = exportSize && exportSize.w ? exportSize.w : baseWidth * 5;
  const targetH = exportSize && exportSize.h ? exportSize.h : baseHeight * 5;
  const scale = targetW / baseWidth;
  const width = targetW;
  const height = targetH;

  useEffect(() => {
    if (generatePoster && coverImage) {
      setTimeout(async () => {
        if (canvasRef.current) {
          // canvasRef typing varies between platforms; use a safe any call
          const snapshot = (canvasRef.current as any).makeImageSnapshot?.();
          if (snapshot) {
            const uri = (snapshot as any).encodeToBase64?.();
            if (uri) onImageReady(`data:image/png;base64,${uri}`);
          }
        }
      }, 500);
    }
  }, [generatePoster, coverImage, posterData]);

  const marginSide = (parseInt(posterData.marginSide) || 0) * scale;
  const marginTop = (parseInt(posterData.marginTop) || 0) * scale;
  const marginCover = (parseInt(posterData.marginCover) || 0) * scale;
  const titleSize = (parseInt(posterData.titleSize) || 40) * scale;
  const artistsSize = (parseInt(posterData.artistsSize) || 22) * scale;

  const resolveFamilyNative = (fontName?: string, custom?: string) => {
    if (custom) return custom;
    if (!fontName || fontName === 'System') return undefined;
    return fontName;
  };
  const titleFamily = resolveFamilyNative(posterData.titleFont);
  const artistFamily = resolveFamilyNative(posterData.artistFont);
  const tracksFamily = resolveFamilyNative(posterData.tracksFont);

  const titleY = posterData.showTracklist ? (500 * scale) + marginTop : (558 * scale) + marginTop;
  const artistY = titleY + artistsSize * 1.3;

  return (
    <View style={styles.container}>
      <Canvas style={{ width, height }} ref={canvasRef}>
  <Rect x={0} y={0} width={width} height={height} color={posterData.backgroundColor} />

        {/* template image (draw first so it's behind everything) */}
        {posterData.templateImage && (
          // use Skia Image from data URI when possible
          (() => {
            try {
              const img = useImage(posterData.templateImage as any);
              if (img) {
                return (
                  <SkImage
                    image={img}
                    x={0}
                    y={0}
                    width={width}
                    height={height}
                    fit="cover"
                  />
                );
              }
            } catch (e) {
              /* ignore */
            }
            return null;
          })()
        )}

        {coverImage && (
          <SkImage
            image={coverImage}
            x={marginCover}
            y={marginCover}
            width={width - marginCover * 2}
            height={width - marginCover * 2}
            fit="cover"
          />
        )}

        {posterData.useFade && (
          <Rect x={0} y={0} width={width} height={500 * scale}>
            <LinearGradient
              start={vec(0, 250 * scale)}
              end={vec(0, 400 * scale)}
              colors={[ 'transparent', posterData.backgroundColor ]}
            />
          </Rect>
        )}

  <Rect x={0} y={496 * scale} width={width} height={height - (496 * scale)} color={posterData.backgroundColor} />

        {/* Text from react-native-skia has differing TS types in some environments; cast to any */}
        {(Text as any)({
          x: marginSide,
          y: titleY,
          text: posterData.albumName,
          color: posterData.textColor,
          size: titleSize,
          familyName: titleFamily,
          weight: 'bold',
        })}

        {(Text as any)({
          x: marginSide,
          y: artistY,
          text: posterData.artistsName,
          color: posterData.textColor,
          size: artistsSize,
          familyName: artistFamily,
          weight: 'bold',
        })}

        {(Text as any)({
          x: marginSide,
          y: 662 * scale,
          text: posterData.titleRelease,
          color: posterData.textColor,
          size: 14 * scale,
          familyName: artistFamily,
          weight: 'bold',
        })}

        {(Text as any)({
          x: marginSide,
          y: 678 * scale,
          text: posterData.releaseDate,
          color: posterData.textColor,
          size: 12 * scale,
          familyName: artistFamily,
          opacity: 0.7,
        })}

  <Rect x={(409 * scale) - marginSide} y={674 * scale} width={29 * scale} height={6 * scale} color={posterData.color1} />
  <Rect x={(438 * scale) - marginSide} y={674 * scale} width={29 * scale} height={6 * scale} color={posterData.color2} />
  <Rect x={(467 * scale) - marginSide} y={674 * scale} width={29 * scale} height={6 * scale} color={posterData.color3} />

        {/* Tracklist rendering with vertically aligned durations */}
        {posterData.showTracklist && posterData.tracklist && (() => {
          try {
            const showNumbers = posterData.showTrackNumbers !== false;
            const showLengths = posterData.showTrackLengths !== false;
            const columnGapVal = parseInt(posterData.columnGap || '40') / scale || 8;
            const lines = (posterData.tracklist || '').split('\n').map((l: string) => {
              let line = l.trim();
              if (!showNumbers) {
                line = line.replace(/^\s*\d+\.\s*/, '');
              }
              const m = line.match(/\s—\s(\d{1,2}:\d{2}(?::\d{2})?)$/);
              if (m && m.index !== undefined) {
                return { left: line.slice(0, m.index).trim(), right: showLengths ? m[1] : '' };
              }
              return { left: line, right: '' };
            });

            const fontSize = (parseInt(posterData.tracksSize || '50') || 10) * scale;
            const musicSize = fontSize;
            const marginTopVal = (parseInt(posterData.marginTop || '0') || 0) * scale;
            const rectY = parseInt(posterData.artistsSize || '110')
              ? ((2500 * scale) + marginTopVal) + ((parseInt(posterData.artistsSize || '110') * scale) * 1.3) + (130 * scale)
              : ((2500 * scale) + marginTopVal) + ((110 * scale) * 1.2) + (130 * scale);
            const rectHeight = 500 * scale;
            const rectWidth = width - ((parseInt(posterData.marginSide || '160') * scale) * 2);
            const rectX = (parseInt(posterData.marginSide) || 0) * scale;
            const maxTextHeight = rectY + rectHeight - (10 * scale) - (parseInt(posterData.marginTop || '0') * scale);

            // approximate text width by char count * approx char width
            const approxWidth = (s: string) => (s ? s.length * (fontSize * 0.55) : 0);

            const columns: Array<{ items: Array<any>; maxLeft: number; maxRight: number }> = [];
            let currentCol = { items: [] as any[], maxLeft: 0, maxRight: 0 };
            let yCursor = rectY;
            for (const item of lines) {
              const leftW = approxWidth(item.left);
              const rightW = approxWidth(item.right || '');
              if (yCursor + musicSize * 1.3 >= maxTextHeight) {
                if (currentCol.items.length > 0) columns.push(currentCol);
                currentCol = { items: [], maxLeft: 0, maxRight: 0 };
                yCursor = rectY;
              }
              currentCol.items.push({ ...item, leftW, rightW });
              if (leftW > currentCol.maxLeft) currentCol.maxLeft = leftW;
              if (rightW > currentCol.maxRight) currentCol.maxRight = rightW;
              yCursor += musicSize * 1.3;
            }
            if (currentCol.items.length > 0) columns.push(currentCol);

            // Render columns
            let xCursor = rectX + (10 * scale);
            const gap = musicSize * 2.5;
            const rendered: any[] = [];
            for (const col of columns) {
              const colWidth = col.maxLeft + col.maxRight + gap;
              if (xCursor >= rectX + rectWidth) break;
              let y = rectY;
              for (const it of col.items) {
                // left text
                rendered.push((Text as any)({ x: xCursor, y, text: it.left, color: posterData.textColor, size: fontSize, familyName: tracksFamily, weight: 'bold' }));
                // right text
                if (it.right) {
                  const rightX = xCursor + colWidth - it.rightW;
                  rendered.push((Text as any)({ x: rightX, y, text: it.right, color: posterData.textColor, size: fontSize, familyName: tracksFamily, weight: 'bold' }));
                }
                y += musicSize * 1.3;
              }
              xCursor += colWidth + (columnGapVal * scale);
            }
            return rendered;
          } catch (e) {
            return null;
          }
        })()}

        {/* Frame drawing: draw stroke by drawing outer rect and inner inset rect with background to simulate stroke if needed */}
        {posterData.framed && (() => {
          try {
            const fw = (parseInt(posterData.frameWidth || '24') || 4) * scale;
            const fc = posterData.frameColor || '#ffffff';
            // draw outer filled rect as frame color
            return (
              <>
                <Rect x={0} y={0} width={width} height={height} color={fc} />
                <Rect x={fw} y={fw} width={width - fw * 2} height={height - fw * 2} color={posterData.backgroundColor} />
              </>
            );
          } catch (e) {
            return null;
          }
        })()}
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
