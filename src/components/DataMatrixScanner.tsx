import React, { useEffect, useRef, useState } from 'react';
import { Camera, Loader2, X, AlertCircle, Image } from 'lucide-react';
import { useCallback } from 'react';

interface DataMatrixScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
}

export function DataMatrixScanner({ onScan, onClose }: DataMatrixScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const detectorRef = useRef<BarcodeDetector | null>(null);
  const scannerRef = useRef<number>();
  const [scanning, setScanning] = useState(false);
  const [cameraStarted, setCameraStarted] = useState(false);
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    async function getDevices() {
      try {
        // Primeiro, solicitar permissão de câmera
        await navigator.mediaDevices.getUserMedia({ video: true });
        
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        
        if (videoDevices.length === 0) {
          throw new Error('Nenhuma câmera encontrada');
        }
        
        setDevices(videoDevices);
        
        // Prefer back camera
        const backCamera = videoDevices.find(device => 
          device.label.toLowerCase().includes('back') ||
          device.label.toLowerCase().includes('traseira') ||
          device.label.toLowerCase().includes('posterior') ||
          device.label.toLowerCase().includes('rear')
        );
        
        setSelectedDeviceId(backCamera?.deviceId || videoDevices[0]?.deviceId || null);
      } catch (err) {
        console.error('Error listing cameras:', err);
        if (err instanceof Error && err.name === 'NotAllowedError') {
          setError('Permissão de câmera negada. Permita o acesso à câmera e tente novamente.');
        } else {
          setError('Erro ao listar câmeras disponíveis');
        }
      }
    }

    getDevices();
  }, []);

  const stopScanning = useCallback(() => {
    setScanning(false);
    setCameraStarted(false);
    
    if (scannerRef.current) {
      cancelAnimationFrame(scannerRef.current);
      scannerRef.current = undefined;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    detectorRef.current = null;
    setLoading(false);
  }, []);

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    
    // Simular detecção (em produção, você enviaria a imagem para um servidor)
    const imageData = canvas.toDataURL('image/jpeg');
    console.log('Imagem capturada:', imageData.substring(0, 100) + '...');
    
    // Por enquanto, vamos simular um código detectado
    const simulatedCode = `SIM_${Date.now()}`;
    onScan(simulatedCode);
  };

  useEffect(() => {
    if (!selectedDeviceId) return;

    async function startCamera() {
      try {
        setLoading(true);
        setError(null);
        stopScanning();

        // Configurações de vídeo mais compatíveis com tablets
        const constraints = {
          video: {
            deviceId: selectedDeviceId,
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 },
            facingMode: 'environment',
            frameRate: { ideal: 30, min: 15 }
          }
        };

        console.log('Iniciando câmera com constraints:', constraints);

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          
          // Aguardar o vídeo carregar
          await new Promise((resolve, reject) => {
            if (!videoRef.current) {
              reject(new Error('Video element not found'));
              return;
            }
            
            videoRef.current.onloadedmetadata = () => {
              console.log('Vídeo carregado:', videoRef.current?.videoWidth, 'x', videoRef.current?.videoHeight);
              resolve(true);
            };
            
            videoRef.current.onerror = () => {
              reject(new Error('Erro ao carregar vídeo'));
            };
            
            // Timeout de segurança
            setTimeout(() => {
              if (videoRef.current?.readyState < 2) {
                reject(new Error('Timeout ao carregar vídeo'));
              }
            }, 10000);
            
            videoRef.current.play().catch(reject);
          });
        }

        setCameraStarted(true);

        // Verificar suporte ao BarcodeDetector
        if (!('BarcodeDetector' in window)) {
          console.warn('BarcodeDetector não suportado, usando modo manual');
          setUseFallback(true);
          setLoading(false);
          return;
        }

        try {
          const formats = await BarcodeDetector.getSupportedFormats();
          console.log('Formatos suportados:', formats);
          
          const supportedFormats = ['data_matrix', 'qr_code', 'code_128', 'code_39', 'ean_13', 'ean_8'];
          const availableFormats = supportedFormats.filter(format => formats.includes(format));
          
          if (availableFormats.length === 0) {
            console.warn('Nenhum formato suportado encontrado, usando modo manual');
            setUseFallback(true);
            setLoading(false);
            return;
          }

          console.log('Formatos disponíveis:', availableFormats);

          detectorRef.current = new BarcodeDetector({
            formats: availableFormats
          });

          async function detectCode() {
            if (!videoRef.current || !detectorRef.current || !cameraStarted) return;

            try {
              const barcodes = await detectorRef.current.detect(videoRef.current);
              
              for (const barcode of barcodes) {
                if (barcode.rawValue) {
                  setScanning(true);
                  console.log('Código detectado:', barcode.rawValue, 'Formato:', barcode.format);
                  onScan(barcode.rawValue);
                  return;
                }
              }
              
              // Continue scanning
              if (detectorRef.current && !scanning && cameraStarted) {
                scannerRef.current = requestAnimationFrame(detectCode);
              }
            } catch (err) {
              console.debug('Detection error:', err);
              // Continue scanning even on detection errors
              if (detectorRef.current && !scanning && cameraStarted) {
                scannerRef.current = requestAnimationFrame(detectCode);
              }
            }
          }

          // Start detection loop
          detectCode();
          setLoading(false);
          
        } catch (detectorError) {
          console.error('Error initializing barcode detector:', detectorError);
          setUseFallback(true);
          setLoading(false);
        }
        
      } catch (err) {
        console.error('Error starting camera:', err);
        
        if (err instanceof Error) {
          if (err.name === 'NotAllowedError') {
            setError('Permissão de câmera negada. Permita o acesso à câmera.');
          } else if (err.name === 'NotFoundError') {
            setError('Câmera não encontrada ou não disponível.');
          } else if (err.name === 'NotReadableError') {
            setError('Câmera está sendo usada por outro aplicativo.');
          } else {
            setError(`Erro ao iniciar câmera: ${err.message}`);
          }
        } else {
          setError('Erro desconhecido ao iniciar câmera');
        }
        
        setLoading(false);
      }
    }

    startCamera();

    return () => {
      stopScanning();
    };
  }, [selectedDeviceId, onScan, stopScanning, scanning, cameraStarted]);

  // Cleanup on unmount
  useEffect(() => () => stopScanning(), [stopScanning]);

  const retryCamera = () => {
    setError(null);
    setLoading(true);
    setUseFallback(false);
    // Força re-inicialização
    if (selectedDeviceId) {
      setSelectedDeviceId(null);
      setTimeout(() => setSelectedDeviceId(selectedDeviceId), 100);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="p-4 bg-gray-50 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">
            {useFallback ? 'Captura Manual' : 'Scanner de Códigos'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="relative">
          {loading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
              <div className="flex items-center gap-2 text-white">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Iniciando câmera...</span>
              </div>
            </div>
          )}

          <video
            ref={videoRef}
            className="w-full aspect-[4/3] bg-black"
            autoPlay
            playsInline
            muted
          />

          <canvas
            ref={canvasRef}
            className="hidden"
          />

          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-[20%] border-2 border-white/50 rounded-lg" />
            <div className="absolute top-4 left-4 right-4 text-center">
              <p className="text-white text-sm bg-black/50 px-2 py-1 rounded">
                {useFallback 
                  ? 'Posicione o código e toque para capturar'
                  : 'Posicione o código dentro da área'
                }
              </p>
            </div>
          </div>

          {useFallback && cameraStarted && (
            <button
              onClick={captureImage}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-full flex items-center gap-2 shadow-lg"
            >
              <Image className="w-5 h-5" />
              Capturar
            </button>
          )}
        </div>

        {error ? (
          <div className="p-4 bg-red-50 border-t border-red-100">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-red-600 text-sm">{error}</p>
                <button
                  onClick={retryCamera}
                  className="mt-2 text-sm text-red-500 hover:text-red-700 underline"
                >
                  Tentar novamente
                </button>
              </div>
            </div>
          </div>
        ) : useFallback ? (
          <div className="p-4 bg-yellow-50 border-t border-yellow-100">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-yellow-700 text-sm">
                  Scanner automático não disponível. Use o botão "Capturar" para processar manualmente.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {devices.length > 1 && (
          <div className="p-4 bg-gray-50 border-t">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Selecionar Câmera
            </label>
            <div className="flex flex-wrap gap-2">
              {devices.map((device) => (
                <button
                  key={device.deviceId}
                  onClick={() => setSelectedDeviceId(device.deviceId)}
                  className={`
                    flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm
                    ${selectedDeviceId === device.deviceId
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }
                    transition-colors
                  `}
                >
                  <Camera className="w-4 h-4" />
                  {device.label || `Câmera ${devices.indexOf(device) + 1}`}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}