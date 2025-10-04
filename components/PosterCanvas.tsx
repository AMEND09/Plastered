/*
  Dynamic platform wrapper for PosterCanvas.
  This file avoids static imports of @shopify/react-native-skia so the web bundle
  doesn't include CanvasKit unless explicitly required.
*/
import { Platform } from 'react-native';
let Component: any = null;
if (Platform.OS === 'web') {
  Component = require('./PosterCanvas.web').default;
} else {
  // Try native implementation first; fall back to web if native missing
  try {
    Component = require('./PosterCanvas.native').default;
  } catch (e) {
    Component = require('./PosterCanvas.web').default;
  }
}

export default function PosterCanvas(props: any) {
  const C = Component;
  return C ? C(props) : null;
}
