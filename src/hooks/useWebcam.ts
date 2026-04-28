import { useRef, useCallback, useEffect, useState, useMemo } from "react";

interface UseWebcamOptions {
  width?: number;
  height?: number;
}

interface UseWebcamReturn {
  start: () => Promise<void>;
  stop: () => void;
  getFrame: () => ImageData | null;
  isActive: boolean;
  error: string | null;
}

export function useWebcam(options: UseWebcamOptions = {}): UseWebcamReturn {
  const { width = 320, height = 240 } = options;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isActiveRef = useRef(false);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const video = document.createElement("video");
    video.setAttribute("playsinline", "");
    video.setAttribute("autoplay", "");
    video.muted = true;
    videoRef.current = video;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvasRef.current = canvas;

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [width, height]);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: width }, height: { ideal: height } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      isActiveRef.current = true;
      setIsActive(true);
      setError(null);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to access webcam"
      );
      isActiveRef.current = false;
      setIsActive(false);
    }
  }, [width, height]);

  const stop = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    isActiveRef.current = false;
    setIsActive(false);
  }, []);

  const getFrame = useCallback((): ImageData | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !isActiveRef.current) return null;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, width, height);
    return ctx.getImageData(0, 0, width, height);
  }, [width, height]);

  return useMemo(
    () => ({ start, stop, getFrame, isActive, error }),
    [start, stop, getFrame, isActive, error]
  );
}
