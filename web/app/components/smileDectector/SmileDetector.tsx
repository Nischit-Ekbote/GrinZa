'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Play, Square, Zap, Smile, Trophy, Star } from 'lucide-react';

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
      console.log('Face landmarker not ready yet.');
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
            frameRate: 30
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
    if (score < 20) return { label: 'Neutral', color: 'text-slate-400', glow: 'shadow-slate-500/20' };
    if (score < 40) return { label: 'Slight Smile', color: 'text-cyan-400', glow: 'shadow-cyan-500/30' };
    if (score < 60) return { label: 'Happy', color: 'text-blue-400', glow: 'shadow-blue-500/40' };
    if (score < 80) return { label: 'Big Smile', color: 'text-purple-400', glow: 'shadow-purple-500/40' };
    return { label: 'Pure Joy!', color: 'text-pink-400', glow: 'shadow-pink-500/50' };
  };

  const smileLevel = getSmileLevel(currentSmileScore);
  const maxSmileLevel = getSmileLevel(maxSmileScore);

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-6 py-12 relative z-10">

        {error && (
          <div className="mb-12 max-w-4xl mx-auto">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-2xl blur" />
              <div className="relative p-6 bg-slate-800/90 backdrop-blur-xl rounded-2xl border border-amber-500/30">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-amber-500/20 rounded-lg">
                    <Zap className="w-5 h-5 text-amber-400" />
                  </div>
                  <p className="text-amber-100 text-lg">{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="max-w-7xl mx-auto">
          <div className="flex gap-8 justify-center" >

            {/* Main Video Section */}
            <div className=" space-y-8 w-1/2">

              {/* Control Panel */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-slate-800/40 to-slate-700/40 rounded-3xl blur-xl" />
                <div className="relative">

                </div>
              </div>

              {/* Video Display */}
              <div className="relative w-full max-w-2xl mx-auto rounded-3xl overflow-hidden shadow-lg">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-800/30 to-slate-900/30 rounded-3xl blur-xl" />
                <div className="relative bg-slate-800/40 backdrop-blur-2xl rounded-3xl p-8 border border-slate-700/50">
                  <div className="relative w-full aspect-video">
                    <canvas
                      ref={canvasRef}
                      className="absolute top-0 left-0  opacity-0 pointer-events-none"
                    />
                    <video
                      ref={videoRef}
                      className={` rounded-2xl object-cover bg-slate-900/50 ${webcamRunning ? 'block' : 'hidden'} ${captureAnimation ? 'ring-4 ring-cyan-400/50 animate-pulse' : ''}`}
                      style={{ transform: 'scaleX(-1)' }}
                      autoPlay
                      playsInline
                      muted
                    />

                    {!webcamRunning && (
                      <div className="absolute w-full h-full bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-2xl flex items-center justify-center backdrop<Camera/>-blur-sm border border-slate-700/30">
                        <div className="text-center flex flex-col items-center gap-2">
                          <Camera size={70}/>
                          <h3 className="text-3xl font-bold text-white mt-3">Ready to Detect</h3>
                          <p className="text-lg text-slate-400">Click "Start" to begin AI-powered smile analysis</p>
                        </div>
                      </div>
                    )}

                    {/* Live Score Overlay */}
                    {webcamRunning && (
                      <div className="absolute top-6 left-6 right-6 ">
                        <div className="relative">
                          <div className="absolute backdrop-blur-sm rounded-2xl" />
                          <div className="relative p-3 flex flex-col rounded-2xl w-fit justify-center items-center bg-slate-800/50   backdrop-blur-sm">
                            <div className="flex items-center justify-between mb-4 ">

                              <div className={`px-4 py-2 rounded-full text-sm font-bold ${smileLevel.color} bg-slate-800/50 backdrop-blur`}>
                                {smileLevel.label}
                              </div>
                            </div>
                              <span className={`text-2xl font-bold w-fit text-white`}>{currentSmileScore.toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Capture Button */}
              <div className="relative flex gap-8">
                <div className="absolute inset-0 rounded-2xl blur-xl  " />
                <button
                  onClick={toggleWebcam}
                  disabled={isLoading}
                  className={`relative w-1/2  px-8 rounded font-bold text-lg transition-all duration-500 group overflow-hidden ${webcamRunning
                      ? 'bg-gradient-to-r from-red-500/90 to-pink-500/90 hover:from-red-400 hover:to-pink-400 text-white'
                      : 'bg-gradient-to-r from-cyan-500/90 to-blue-500/90 hover:from-cyan-400 hover:to-blue-400 text-white'
                    } disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 hover:shadow-2xl ${webcamRunning ? 'hover:shadow-red-500/25' : 'hover:shadow-cyan-500/25'}`}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative flex items-center justify-center gap-4">
                    {webcamRunning ? (
                      <>
                        Stop Detection
                      </>
                    ) : (
                      <>
                        {isLoading ? 'Initializing AI Model...' : 'Start '}
                      </>
                    )}
                  </div>
                </button>
                <button
                  onClick={handleSubmit}
                  className="relative w-1/2 py-4 px-8 bg-gradient-to-r from-blue-500/90 to-purple-500/90 hover:from-blue-400 hover:to-purple-400 rounded font-bold text-xl text-white transition-all duration-500 shadow-2xl hover:shadow-blue-500/25 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed group overflow-hidden"
                  disabled={!webcamRunning}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative flex items-center justify-center gap-4">
                    Capture
                  </div>
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default SmileDetector;