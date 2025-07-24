'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Play, Square, Zap, Smile, Trophy, Star } from 'lucide-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { toast } from 'sonner';

interface BlendShape {
  categoryName: string;
  displayName?: string;
  score: number;
}

interface SmileDetectorProps {
  setMaxSmileScore: React.Dispatch<React.SetStateAction<number>>;
  maxSmileScore: number;
  onClick?: (imageData?: string) => void;
}

const SmileDetector = ({ maxSmileScore, setMaxSmileScore, onClick }: SmileDetectorProps) => {
  const [faceLandmarker, setFaceLandmarker] = useState<any>(null);
  const [webcamRunning, setWebcamRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [currentSmileScore, setCurrentSmileScore] = useState(0);
  const [captureAnimation, setCaptureAnimation] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const lastVideoTimeRef = useRef(-1);

  const createFaceLandmarker = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');

      const vision = await import('@mediapipe/tasks-vision');
      const { FaceLandmarker, FilesetResolver } = vision;

      const filesetResolver = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
      );

      const landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
          delegate: "GPU"
        },
        outputFaceBlendshapes: true,
        runningMode: "VIDEO",
        numFaces: 1
      });

      setFaceLandmarker(landmarker);
      setIsLoading(false);
    } catch (err) {
      console.error('Error initializing face landmarker:', err);
      setError('Failed to initialize face landmarker. Using demo mode.');

      const mockLandmarker = {
        detectForVideo: () => ({
          faceLandmarks: [[]],
          faceBlendshapes: [{
            categories: [
              { categoryName: 'mouthSmileLeft', score: Math.random() * 0.8 },
              { categoryName: 'mouthSmileRight', score: Math.random() * 0.8 },
              { categoryName: 'jawOpen', score: Math.random() * 0.4 },
              { categoryName: 'cheekPuff', score: Math.random() * 0.3 },
              { categoryName: 'mouthUpperUpLeft', score: Math.random() * 0.2 },
              { categoryName: 'mouthUpperUpRight', score: Math.random() * 0.2 },
            ]
          }]
        })
      };

      setFaceLandmarker(mockLandmarker);
      setIsLoading(false);
    }
  }, []);

  const calculateSmileScore = (blendShapes: BlendShape[]): number => {
    const getScore = (name: string) => blendShapes.find(s => s.categoryName === name)?.score || 0;

    const mouthSmileLeft = getScore('mouthSmileLeft');
    const mouthSmileRight = getScore('mouthSmileRight');
    const jawOpen = getScore('jawOpen');
    const cheekPuff = getScore('cheekPuff');
    const mouthUpperUpLeft = getScore('mouthUpperUpLeft');
    const mouthUpperUpRight = getScore('mouthUpperUpRight');
    const eyeSquintLeft = getScore('eyeSquintLeft');
    const eyeSquintRight = getScore('eyeSquintRight');

    const avgMouthSmile = (mouthSmileLeft + mouthSmileRight) / 2;
    const avgMouthUpperUp = (mouthUpperUpLeft + mouthUpperUpRight) / 2;
    const avgEyeSquint = (eyeSquintLeft + eyeSquintRight) / 2;

    const compositeScore = (
      avgMouthSmile * 0.60 +
      jawOpen * 0.20 +
      avgMouthUpperUp * 0.10 +
      avgEyeSquint * 0.10
    );

    const adjustedScore = compositeScore - (cheekPuff * 0.1);
    const percentage = Math.max(0, Math.min(100, adjustedScore * 100));

    return percentage > 8 ? percentage : 0;
  };

  const handleSubmit = useCallback(() => {
    if (!canvasRef.current || !videoRef.current) return;

    setCaptureAnimation(true);
    setTimeout(() => setCaptureAnimation(false), 300);

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    ctx.restore();

    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    if (onClick) {
      onClick(imageData || undefined);
    }
  }, [onClick]);

  useEffect(() => {
    createFaceLandmarker();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [createFaceLandmarker]);

  const predictWebcam = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !faceLandmarker || !webcamRunning) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx || video.videoWidth === 0 || video.videoHeight === 0) {
      if (webcamRunning) {
        animationRef.current = requestAnimationFrame(predictWebcam);
      }
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    if (lastVideoTimeRef.current !== video.currentTime) {
      lastVideoTimeRef.current = video.currentTime;

      try {
        const startTimeMs = performance.now();
        const results = faceLandmarker.detectForVideo(video, startTimeMs);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
        ctx.restore();

        if (results.faceBlendshapes && results.faceBlendshapes.length > 0) {
          const blendShapes = results.faceBlendshapes[0].categories;
          const score = calculateSmileScore(blendShapes);
          setCurrentSmileScore(score);
          if (score > maxSmileScore) {
            setMaxSmileScore(score);
          }
        }
      } catch (err) {
        console.error('Prediction error:', err);
      }
    }

    if (webcamRunning) {
      animationRef.current = requestAnimationFrame(predictWebcam);
    }
  }, [faceLandmarker, webcamRunning, maxSmileScore, setMaxSmileScore]);

  const toggleWebcam = async () => {
    if (!faceLandmarker) {
      toast.warning('Face landmarker not ready yet.');
      return;
    }

    if (webcamRunning) {
      setWebcamRunning(false);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }

      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
      setMaxSmileScore(0);
      setCurrentSmileScore(0);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: 640,
            height: 480,
            frameRate: 60
          }
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.addEventListener('loadeddata', () => {
            setWebcamRunning(true);
          });
        }
      } catch (err) {
        console.error('Error accessing webcam:', err);
        setError('Failed to access webcam. Please ensure camera permissions are granted.');
      }
    }
  };

  useEffect(() => {
    if (webcamRunning && faceLandmarker) {
      predictWebcam();
    }
  }, [webcamRunning, faceLandmarker, predictWebcam]);

  const getSmileLevel = (score: number) => {
    if (score < 20) return { label: 'Neutral', color: 'text-purple-300', icon: '😐' };
    if (score < 40) return { label: 'Slight Smile', color: 'text-purple-400', icon: '🙂' };
    if (score < 60) return { label: 'Happy', color: 'text-purple-500', icon: '😊' };
    if (score < 80) return { label: 'Big Smile', color: 'text-purple-600', icon: '😄' };
    return { label: 'Pure Joy!', color: 'text-purple-300', icon: '🤩' };
  };

  const smileLevel = getSmileLevel(currentSmileScore);

  return (
    <div className="w-full h-full">
       <div className='flex justify-between p-6 absolute top-0 left-0 w-full z-10'>
              <h1 className='relative z-10'>Capture Smile</h1>
              <WalletMultiButton/>
          </div>
      <div className='w-full h-[90vh] flex justify-center items-center'>
        {/* Error Message */}
      {error && (
        <div className="mb-8">
          <div className="bg-yellow-900/20 backdrop-blur-sm border border-yellow-500/30 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-yellow-400" />
              <p className="text-yellow-200 text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className=" space-y-6 flex flex-col items-center justify-center">
        {/* Video Display */}
        <div className="relative">
          <div className=" rounded-2xl overflow-hidden ">
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 opacity-0 pointer-events-none"
            />
            <video
              ref={videoRef}
              className={`w-full h-full object-cover bg-purple-900/20 ${
                webcamRunning ? 'block' : 'hidden'
              } ${captureAnimation ? 'ring-4 ring-purple-400/50 animate-pulse' : ''}`}
              style={{ transform: 'scaleX(-1)' }}
              autoPlay
              playsInline
              muted
            />

            {!webcamRunning && (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center flex flex-col items-center gap-4">
                    <Camera className="w-16 h-16 text-purple-300" />
                  <h3 className="text-2xl font-bold text-white ">Camera Ready</h3>
                  <p className="text-purple-200">Click "Start Detection" to begin</p>
                </div>
              </div>
            )}

            {/* Live Score Overlay */}
            {webcamRunning && (
              <div className="absolute top-4 right-4">
                <div className="bg-purple-900/80 backdrop-blur-sm border border-purple-400/30 rounded-xl p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <span className="text-2xl">{smileLevel.icon}</span>
                    <span className="text-sm font-medium text-purple-200">{smileLevel.label}</span>
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {currentSmileScore.toFixed(1)}%
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex gap-4 relative z-10 w-full justify-center">
          <button
            onClick={toggleWebcam}
            disabled={isLoading}
            className={`flex-1 py-3 max-w-1/2 rounded font-semibold text-lg transition-all duration-300 ${
              webcamRunning
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-[#512da8] hover:bg-purple-700 text-white'
            } disabled:opacity-50 disabled:cursor-not-allowed transform`}
          >
            <div className="flex items-center justify-center gap-3">
              {webcamRunning ? (
                <>
                  Stop
                </>
              ) : (
                <>
                  {isLoading ? 'Initializing...' : 'Start'}
                </>
              )}
            </div>
          </button>

          {webcamRunning && <button
            onClick={handleSubmit}
            disabled={ maxSmileScore <= 60}
            className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800/50 disabled:text-purple-400 rounded font-semibold text-lg text-white transition-all duration-300 transform disabled:transform-none disabled:cursor-not-allowed"
          >
            <div className="flex items-center justify-center gap-3">
              Capture Smile
            </div>
          </button>}
        </div>

        {/* Helper Text */}
        {webcamRunning && (
          <div className="text-center">
            <p className="text-purple-200 text-sm">
              {maxSmileScore <= 60 
                ? `Keep smiling! You need a score above 60 to capture.`
                : `Great smile! Score: ${maxSmileScore.toFixed(1)} - Ready to capture! 🎉`
              }
            </p>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default SmileDetector;