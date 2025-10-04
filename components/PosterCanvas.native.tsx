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
}

interface PosterCanvasProps {
  posterData: PosterData;
  onImageReady: (uri: string) => void;
  generatePoster: boolean;
}

export default function PosterCanvas({ posterData, onImageReady, generatePoster }: PosterCanvasProps) {
  const coverImage = useImage(posterData.albumCover);
  const canvasRef = useRef<any>(null);

  const width = 496;
  const height = 702;
  const scale = 5;

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

  const marginSide = parseInt(posterData.marginSide) / scale || 32;
  const marginTop = parseInt(posterData.marginTop) /scale || 0;
  const marginCover = parseInt(posterData.marginCover) / scale || 0;
  const titleSize = parseInt(posterData.titleSize) / scale || 40;
  const artistsSize = parseInt(posterData.artistsSize) / scale || 22;

  const resolveFamilyNative = (fontName?: string, custom?: string) => {
    if (custom) return custom;
    if (!fontName || fontName === 'System') return undefined;
    return fontName;
  };
  const titleFamily = resolveFamilyNative(posterData.titleFont);
  const artistFamily = resolveFamilyNative(posterData.artistFont);
  const tracksFamily = resolveFamilyNative(posterData.tracksFont);

  const titleY = posterData.showTracklist ? 500 + marginTop : 558 + marginTop;
  const artistY = titleY + artistsSize * 1.3;

  return (
    <View style={styles.container}>
      <Canvas style={{ width, height }} ref={canvasRef}>
        <Rect x={0} y={0} width={width} height={height} color={posterData.backgroundColor} />

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
          <Rect x={0} y={0} width={width} height={500}>
            <LinearGradient
              start={vec(0, 250)}
              end={vec(0, 400)}
              colors={[ 'transparent', posterData.backgroundColor ]}
            />
          </Rect>
        )}

        <Rect x={0} y={496} width={width} height={height - 496} color={posterData.backgroundColor} />

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
          y: 662,
          text: posterData.titleRelease,
          color: posterData.textColor,
          size: 14,
          familyName: artistFamily,
          weight: 'bold',
        })}

        {(Text as any)({
          x: marginSide,
          y: 678,
          text: posterData.releaseDate,
          color: posterData.textColor,
          size: 12,
          familyName: artistFamily,
          opacity: 0.7,
        })}

        <Rect x={409 - marginSide} y={674} width={29} height={6} color={posterData.color1} />
        <Rect x={438 - marginSide} y={674} width={29} height={6} color={posterData.color2} />
        <Rect x={467 - marginSide} y={674} width={29} height={6} color={posterData.color3} />
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
