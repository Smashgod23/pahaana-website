import React, { useRef, useEffect, useState, useCallback } from "react";
import * as tf from "@tensorflow/tfjs";
import { Stage, Layer, Rect, Text } from "react-konva";

const drawConnectors = (ctx, landmarks, connections, color) => {
  if (!landmarks) return;
  for (const connection of connections) {
    const [startIdx, endIdx] = connection;
    const start = landmarks[startIdx];
    const end = landmarks[endIdx];
    if (start && end) {
      ctx.beginPath();
      ctx.moveTo(start.x * ctx.canvas.width, start.y * ctx.canvas.height);
      ctx.lineTo(end.x * ctx.canvas.width, end.y * ctx.canvas.height);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
};

const drawLandmarks = (ctx, landmarks, color) => {
  if (!landmarks) return;
  for (const landmark of landmarks) {
    ctx.beginPath();
    ctx.arc(landmark.x * ctx.canvas.width, landmark.y * ctx.canvas.height, 5, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
  }
};

const LABELS = [
  "block", "crouch", "idle", "jump", "jump_left", "jump_right",
  "kick", "left", "punch", "right"
];

export default function GameAI() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  // Keep model and buffer in refs so onResults stays stable and never causes
  // the camera effect to re-run. Stale-closure problems disappear.
  const modelRef = useRef(null);
  const bufferRef = useRef([]);

  const [prediction, setPrediction] = useState("Loading model...");
  const [playerPos, setPlayerPos] = useState({ x: 150, y: 200, vy: 0, jumping: false });
  const [loadingStatus, setLoadingStatus] = useState("Initializing...");
  const [modelLoaded, setModelLoaded] = useState(false); // triggers camera effect
  const [error, setError] = useState(null);
  const [isMediaPipeReady, setIsMediaPipeReady] = useState(false);

  const preprocessLandmarks = useCallback((landmarks) => {
    const hipX = (landmarks[23].x + landmarks[24].x) / 2;
    const hipY = (landmarks[23].y + landmarks[24].y) / 2;
    const keypoints = [];
    for (const lm of landmarks) {
      keypoints.push(lm.x - hipX, lm.y - hipY);
    }
    return keypoints;
  }, []);

  const updatePlayer = useCallback((action) => {
    setPlayerPos((pos) => {
      let { x, y, vy, jumping } = pos;
      const groundY = 200;

      if (action === "left" || action === "jump_left") x = Math.max(0, x - 5);
      if (action === "right" || action === "jump_right") x = Math.min(640 - 50, x + 5);
      if ((action === "jump" || action === "jump_left" || action === "jump_right") && !jumping) {
        vy = -15;
        jumping = true;
      }

      vy += 1;
      y += vy;

      if (y >= groundY) {
        y = groundY;
        vy = 0;
        jumping = false;
      }

      return { x, y, vy, jumping };
    });
  }, []);

  // onResults reads model and buffer from refs — no reactive dependencies,
  // so this callback never changes and never triggers a camera re-init.
  const onResults = useCallback((results) => {
    const canvasElement = canvasRef.current;
    if (!canvasElement) return;
    const canvasCtx = canvasElement.getContext('2d');

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    if (results.poseLandmarks && window.POSE_CONNECTIONS) {
      drawConnectors(canvasCtx, results.poseLandmarks, window.POSE_CONNECTIONS, '#00FF00');
      drawLandmarks(canvasCtx, results.poseLandmarks, '#FF0000');

      if (!modelRef.current) {
        setPrediction("Model not loaded yet...");
        canvasCtx.restore();
        return;
      }

      const keypoints = preprocessLandmarks(results.poseLandmarks);
      bufferRef.current.push(keypoints);
      if (bufferRef.current.length > 5) bufferRef.current.shift();

      if (bufferRef.current.length === 5 && bufferRef.current.every(f => f.length === 66)) {
        (async () => {
          // Pass input as named dict matching the model signature key "inputs"
          const input = tf.tensor([bufferRef.current], [1, 5, 66], "float32");
          let pred;
          try {
            // Layers model: predict() handles LSTM natively (no graph while-loop issues)
            pred = modelRef.current.predict(input);
            const predArray = await pred.array();
            if (Array.isArray(predArray) && predArray.length > 0) {
              const topIndex = predArray[0].indexOf(Math.max(...predArray[0]));
              const action = LABELS[topIndex];
              setPrediction(action);
              updatePlayer(action);
            }
          } catch (err) {
            console.error("Prediction error:", err);
            setPrediction("Prediction error: " + err.message);
          } finally {
            tf.dispose([input, pred]);
          }
        })();
      }
    }
    canvasCtx.restore();
  }, [preprocessLandmarks, updatePlayer]); // model and buffer read from refs — no dependency needed

  // Load model once on mount
  useEffect(() => {
    let mounted = true;

    const loadModel = async () => {
      await tf.ready();
      setLoadingStatus("Loading TensorFlow.js model...");

      try {
        const m = await tf.loadLayersModel("/model/model.json");
        if (mounted) {
          modelRef.current = m;
          setModelLoaded(true);
          setPrediction("idle");
          setLoadingStatus("TensorFlow.js model loaded.");
          console.log("GameAI model loaded.");
        }
      } catch (err) {
        console.error("Model load error:", err);
        if (mounted) {
          setError(`Model load error: ${err.message}. Ensure /public/model/model.json and .bin exist.`);
          setLoadingStatus("Error loading model.");
        }
      }
    };

    loadModel();
    return () => { mounted = false; };
  }, []);

  // Check for MediaPipe CDN scripts
  useEffect(() => {
    const check = () => {
      if (window.Pose && window.Camera && window.POSE_CONNECTIONS) {
        setIsMediaPipeReady(true);
      } else {
        setTimeout(check, 100);
      }
    };
    check();
  }, []);

  // Setup camera/pose only once both model and MediaPipe are ready
  useEffect(() => {
    if (!videoRef.current || !modelLoaded || !isMediaPipeReady) return;

    let cleanupFn;

    const init = async () => {
      try {
        setLoadingStatus("Loading MediaPipe Pose...");
        const pose = new window.Pose({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
        });

        pose.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          minDetectionConfidence: 0.5, // was 0.9 — too high, poses rarely triggered
          minTrackingConfidence: 0.5,
        });

        pose.onResults(onResults);

        setLoadingStatus("Accessing camera...");
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        const camera = new window.Camera(videoRef.current, {
          onFrame: async () => {
            await pose.send({ image: videoRef.current });
          },
          width: 640,
          height: 480,
        });

        camera.start();
        setLoadingStatus("Camera started. Ready for detection.");

        return () => {
          camera.stop();
          if (pose.close) pose.close();
          stream.getTracks().forEach(t => t.stop());
        };
      } catch (err) {
        console.error("Camera/MediaPipe init error:", err);
        setError(`Camera error: ${err.message}`);
        setLoadingStatus("Error initializing camera.");
      }
    };

    init().then(fn => { cleanupFn = fn; });
    return () => { if (cleanupFn) cleanupFn(); };

  }, [modelLoaded, isMediaPipeReady, onResults]); // onResults is now stable — won't re-trigger

  return (
    <div style={{
      display: "flex", height: "100vh",
      background: "linear-gradient(135deg, #1e293b, #0f172a)",
      color: "white"
    }}>
      <div style={{ flex: 1, position: "relative", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
        {loadingStatus !== "Camera started. Ready for detection." && (
          <div className="text-xl text-yellow-300 mb-4">{loadingStatus}</div>
        )}
        {error && (
          <div className="text-xl text-red-500 mb-4">Error: {error}</div>
        )}
        <video ref={videoRef} style={{ display: "none" }} autoPlay muted playsInline />
        <canvas ref={canvasRef} width="640" height="480" style={{ width: "100%", maxWidth: "640px", height: "auto", border: "1px solid white", borderRadius: "8px" }} />
        <div style={{
          position: "absolute", top: 10, left: 10,
          backgroundColor: "rgba(0,0,0,0.5)", padding: 10,
          borderRadius: 8, fontSize: 24
        }}>
          Action: {prediction}
        </div>
      </div>

      <div style={{
        flex: 1, backgroundColor: "rgba(255,255,255,0.1)",
        display: "flex", justifyContent: "center", alignItems: "flex-end",
        overflow: "hidden"
      }}>
        <Stage width={640} height={480} style={{ border: "1px solid white", borderRadius: "8px", marginBottom: "20px" }}>
          <Layer>
            <Rect
              x={playerPos.x}
              y={playerPos.y}
              width={50}
              height={prediction === "crouch" ? 30 : 50}
              fill={
                prediction === "punch" ? "#ef4444" :
                prediction === "kick" ? "#f59e0b" :
                prediction === "block" ? "#10b981" :
                "#3b82f6"
              }
              cornerRadius={8}
              shadowBlur={10}
            />
            <Text text="Use your body to control!" x={10} y={10} fontSize={18} fill="white" />
            <Text text={`Player X: ${Math.round(playerPos.x)}, Y: ${Math.round(playerPos.y)}`} x={10} y={30} fontSize={14} fill="white" />
          </Layer>
        </Stage>
      </div>
    </div>
  );
}
