/// <reference types="vite/client" />

/// <reference types="vite-plugin-pwa/client" />

interface WakeLockSentinel extends EventTarget {
  released: boolean;
  type: 'screen';
  release(): Promise<void>;
}

interface WakeLock {
  request(type: 'screen'): Promise<WakeLockSentinel>;
}

interface Navigator {
  wakeLock: WakeLock;
}

interface BarcodeDetector {
  detect(image: ImageBitmapSource): Promise<Array<{
    boundingBox: DOMRectReadOnly;
    cornerPoints: Array<{x: number, y: number}>;
    format: string;
    rawValue: string;
  }>>;
}

declare var BarcodeDetector: {
  prototype: BarcodeDetector;
  new(options?: { formats: string[] }): BarcodeDetector;
  getSupportedFormats(): Promise<string[]>;
};