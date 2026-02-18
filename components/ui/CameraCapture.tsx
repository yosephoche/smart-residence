"use client";

import { useState, useRef, useEffect } from "react";
import { Camera, X, RotateCcw, CheckCircle } from "lucide-react";

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

export default function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    startCamera();

    // Timeout safety - if camera doesn't load in 10 seconds, show error
    const timeout = setTimeout(() => {
      if (loading) {
        setLoading(false);
        setError("Camera is taking too long to load. Please try again.");
      }
    }, 10000);

    return () => {
      stopCamera();
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startCamera = async () => {
    try {
      setLoading(true);
      setError(null);

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user", // Front camera for selfies
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      setStream(mediaStream);

      // Video element is always in DOM, so we can safely set srcObject
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        // Don't set loading to false yet - wait for video to be ready via onLoadedMetadata
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      setLoading(false);

      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setError("Camera permission denied. Please allow camera access in your browser settings.");
      } else if (err.name === "NotFoundError") {
        setError("No camera found on this device.");
      } else {
        setError("Failed to access camera. Please check your browser permissions.");
      }
    }
  };

  const handleLoadedMetadata = async () => {
    if (!videoRef.current) return;

    try {
      // Explicitly play the video (autoPlay attribute alone is not reliable, especially on mobile Safari)
      await videoRef.current.play();
      setLoading(false);
    } catch (err) {
      console.error("Video play error:", err);
      setError("Failed to start camera preview. Please try again.");
      setLoading(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    const context = canvas.getContext("2d");
    if (!context) return;

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to data URL
    const imageDataUrl = canvas.toDataURL("image/jpeg", 0.8);
    setCapturedImage(imageDataUrl);

    // Stop camera preview
    stopCamera();
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    startCamera();
  };

  const confirmPhoto = () => {
    if (!capturedImage) return;

    // Convert data URL to File object
    fetch(capturedImage)
      .then((res) => res.blob())
      .then((blob) => {
        const file = new File([blob], `selfie-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        onCapture(file);
        stopCamera();
      })
      .catch((err) => {
        console.error("Failed to convert image:", err);
        setError("Failed to process image. Please try again.");
      });
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/50">
        <h2 className="text-white text-lg font-medium">Take a Selfie</h2>
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
          aria-label="Close camera"
        >
          <X className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* Camera/Preview Area */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden">
        {/* Error Message */}
        {error && (
          <div className="text-center p-6 max-w-md">
            <p className="text-white text-lg mb-4">{error}</p>
            <button
              onClick={startCamera}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Loading Message */}
        {loading && !error && (
          <div className="text-white text-lg">Loading camera...</div>
        )}

        {/* Captured Image */}
        {capturedImage && (
          <img
            src={capturedImage}
            alt="Captured selfie"
            className="max-w-full max-h-full object-contain transform scale-x-[-1]"
            style={{ minHeight: '300px' }}
          />
        )}

        {/* Video Element - Always rendered but hidden when not in use */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          onLoadedMetadata={handleLoadedMetadata}
          className={`max-w-full max-h-full object-contain transform scale-x-[-1] ${
            error || loading || capturedImage ? 'hidden' : ''
          }`}
          style={{ minHeight: '300px' }}
        />

        {/* Hidden canvas for capturing */}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Controls */}
      {!error && !loading && (
        <div className="px-6 pt-6 pb-[calc(4rem+env(safe-area-inset-bottom))] bg-black/50 min-h-[220px] flex items-center justify-center">
          {capturedImage ? (
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full max-w-md px-2 sm:px-0">
              <button
                onClick={retakePhoto}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-2xl hover:bg-gray-700 active:scale-[0.98] transition-all duration-150 min-h-[52px] sm:flex-1"
              >
                <RotateCcw className="w-5 h-5" />
                <span className="font-medium">Retake</span>
              </button>
              <button
                onClick={confirmPhoto}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 active:scale-[0.98] transition-all duration-150 min-h-[52px] font-medium sm:flex-1"
              >
                <CheckCircle className="w-5 h-5" />
                <span>Use Photo</span>
              </button>
            </div>
          ) : (
            <div className="flex justify-center">
              <button
                onClick={capturePhoto}
                className="p-3 bg-white rounded-full hover:bg-gray-100 transition-colors min-h-[56px] min-w-[56px] flex items-center justify-center"
                aria-label="Capture photo"
              >
                <Camera className="w-7 h-7 text-gray-900" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
