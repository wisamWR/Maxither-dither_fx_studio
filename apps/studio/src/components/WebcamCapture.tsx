import { useCallback, useEffect, useRef, useState } from 'react';

interface Props {
  onCapture: (imageData: ImageData) => void;
}

type Status = 'idle' | 'loading' | 'active' | 'error';

export default function WebcamCapture({ onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);

  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string>('');
  const [liveMode, setLiveMode] = useState(false);

  const stopStream = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setLiveMode(false);
    setStatus('idle');
  }, []);

  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState < video.HAVE_CURRENT_DATA) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    onCapture(imageData);
  }, [onCapture]);

  const startCamera = useCallback(async () => {
    setStatus('loading');
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      setStatus('active');
    } catch (err) {
      const message =
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow access and try again.'
          : err instanceof DOMException && err.name === 'NotFoundError'
            ? 'No camera found on this device.'
            : 'Could not access camera. Please check your device settings.';
      setError(message);
      setStatus('error');
    }
  }, []);

  // Attach stream to video element after it mounts
  useEffect(() => {
    if (status === 'active' && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [status]);

  const toggleLiveMode = useCallback(() => {
    if (liveMode) {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setLiveMode(false);
    } else {
      captureFrame();
      intervalRef.current = window.setInterval(captureFrame, 500);
      setLiveMode(true);
    }
  }, [liveMode, captureFrame]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) clearInterval(intervalRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  if (status === 'idle' || status === 'error') {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-neutral-600 p-12 text-center">
        <button
          onClick={startCamera}
          className="rounded bg-neutral-800 px-4 py-2 text-sm text-neutral-100 transition-colors hover:bg-neutral-700"
        >
          Use Webcam
        </button>
        {error && (
          <p className="text-xs text-red-400">{error}</p>
        )}
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-neutral-600 p-12 text-center">
        <p className="text-sm text-neutral-400">Requesting camera access...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-lg bg-neutral-950">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full"
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={captureFrame}
          className="rounded bg-neutral-800 px-3 py-1.5 text-xs text-neutral-100 transition-colors hover:bg-neutral-700"
        >
          Capture
        </button>

        <button
          onClick={toggleLiveMode}
          className={`rounded px-3 py-1.5 text-xs transition-colors ${
            liveMode
              ? 'bg-green-500/20 text-green-400'
              : 'bg-neutral-800 text-neutral-100 hover:bg-neutral-700'
          }`}
        >
          {liveMode ? 'Live ●' : 'Live Mode'}
        </button>

        <button
          onClick={stopStream}
          className="ml-auto rounded bg-neutral-800 px-3 py-1.5 text-xs text-neutral-500 transition-colors hover:bg-neutral-700 hover:text-neutral-100"
        >
          Stop
        </button>
      </div>
    </div>
  );
}
