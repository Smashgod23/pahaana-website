import React, { useRef, useEffect, useState, useCallback } from "react";
import * as tf from "@tensorflow/tfjs";
import { Stage, Layer, Rect, Text } from "react-konva"; // Import directly from npm package

// Helper function for drawing landmarks (for MediaPipe visualization)
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
  const canvasRef = useRef(null); // Added canvas ref for drawing
  const [model, setModel] = useState(null);
  const [prediction, setPrediction] = useState("Loading model...");
  const [buffer, setBuffer] = useState([]);
  const [playerPos, setPlayerPos] = useState({ x: 150, y: 200, vy: 0, jumping: false });
  const [loadingStatus, setLoadingStatus] = useState("Initializing...");
  const [error, setError] = useState(null);
  const [isMediaPipeReady, setIsMediaPipeReady] = useState(false);


  // Preprocess landmarks same as before
  const preprocessLandmarks = useCallback((landmarks) => {
    // MediaPipe Pose provides 33 landmarks. Your model expects 66 features (33 * 2 for x,y).
    // Normalize coordinates relative to the hip center (landmarks 23 and 24).
    const hipX = (landmarks[23].x + landmarks[24].x) / 2;
    const hipY = (landmarks[23].y + landmarks[24].y) / 2;

    let keypoints = [];
    for (const lm of landmarks) {
      keypoints.push(lm.x - hipX, lm.y - hipY);
    }
    return keypoints;
  }, []);

  // updatePlayer separated for clarity
  const updatePlayer = useCallback((action) => {
    setPlayerPos((pos) => {
      let { x, y, vy, jumping } = pos;
      const groundY = 200; // Define ground level for the player

      // Horizontal movement
      if (action === "left" || action === "jump_left") {
        x = Math.max(0, x - 5); // Prevent going off left edge
      }
      if (action === "right" || action === "jump_right") {
        x = Math.min(640 - 50, x + 5); // Prevent going off right edge (Stage width - player width)
      }

      // Jump logic
      if ((action === "jump" || action === "jump_left" || action === "jump_right") && !jumping) {
        vy = -15; // Initial jump velocity
        jumping = true;
      }

      // Crouch logic
      if (action === "crouch") {
        // Simple crouch: just lower the player's y position
        // This might conflict with gravity if not handled carefully.
        // For a simple demo, let's just make the player appear shorter.
        // The Rect height in JSX handles the visual aspect.
        // No change to y here, as gravity will pull it down.
      }

      // Apply gravity
      vy += 1;
      y += vy;

      // Ground collision
      if (y >= groundY) {
        y = groundY;
        vy = 0;
        jumping = false;
      }

      return { x, y, vy, jumping };
    });
  }, []); // No dependencies needed if playerPos is accessed via callback argument

  // onResults now handles buffer safely and prediction outside tidy
  const onResults = useCallback((results) => {
    const canvasElement = canvasRef.current;
    const canvasCtx = canvasElement.getContext('2d');

    // Debug: Log model pipeline status
    console.log("onResults called. Model loaded?", !!model, "Model object:", model);

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    if (results.poseLandmarks && window.POSE_CONNECTIONS) {
      drawConnectors(canvasCtx, results.poseLandmarks, window.POSE_CONNECTIONS, '#00FF00');
      drawLandmarks(canvasCtx, results.poseLandmarks, '#FF0000');

      if (!model) {
        setPrediction("Model not loaded yet...");
        canvasCtx.restore();
        return;
      }

      const keypoints = preprocessLandmarks(results.poseLandmarks);
      // Debug: Log preprocessed landmarks
      console.log("Preprocessed keypoints:", keypoints);

      setBuffer(prevBuffer => {
        const newBuffer = [...prevBuffer, keypoints];
        if (newBuffer.length > 5) newBuffer.shift(); // Keep only the last 5 frames

        if (newBuffer.length === 5 && newBuffer.every(frame => frame.length === 66)) {
          console.log("Buffer length:", newBuffer.length);
          console.log("Frame lengths:", newBuffer.map(f => f.length));
          (async () => {
            // Wrap newBuffer in an extra array to add the batch dimension
            const input = tf.tensor([newBuffer], [1, 5, 66], "float32");
            console.log("Model input shape:", input.shape);
            input.data().then(data => {
              console.log("Model input data:", Array.from(data));
            });

            let pred;
            try {
              console.log("Inputs for model execution:", input);
              pred = await model.executeAsync(input);
              if (Array.isArray(pred)) pred = pred[0];
              console.log("Prediction tensor:", pred);
            } catch (err) {
              console.error("Prediction error:", err);
              setPrediction("Prediction error: " + err.message);
              tf.dispose([input]);
              return;
            }

            if (pred && pred instanceof tf.Tensor) {
              const predArray = await pred.array();
              // Debug: Log prediction array
              console.log("Prediction array:", predArray);
              if (Array.isArray(predArray) && predArray.length > 0) {
                const topIndex = predArray[0].indexOf(Math.max(...predArray[0]));
                const action = LABELS[topIndex];
                // Debug: Log selected action and index
                console.log("Selected action:", action, "at index", topIndex);
                setPrediction(action);
                updatePlayer(action);
              } else {
                console.warn("Model prediction returned an empty or invalid array:", predArray);
                setPrediction("Prediction error: Invalid output array");
              }
            } else {
              console.warn("Model prediction returned an invalid tensor:", pred);
              setPrediction("Prediction error: Invalid output tensor");
            }

            tf.dispose([input, pred]);
          })();
        } else {
          console.warn("Skipping prediction. Buffer or frame lengths invalid:", {
            bufferLength: newBuffer.length,
            frameLengths: newBuffer.map(f => f.length)
          });
        }
        return newBuffer;
      });
    }
    canvasCtx.restore();
  }, [model, preprocessLandmarks, updatePlayer]); // Depend on model, preprocessLandmarks, and updatePlayer

  // Load model on mount, with cleanup flag
  useEffect(() => {

    const loadModel = async () => {
      await tf.setBackend("cpu");
      await tf.ready();

      let mounted = true;
      setLoadingStatus("Loading TensorFlow.js model...");

      tf.loadGraphModel("/model/model.json")
        .then(m => {
          if (mounted) {
            console.log("GameAI Model loaded successfully!");
            setModel(m);
            setPrediction("idle");
            setLoadingStatus("TensorFlow.js model loaded.");
          }
        })
        .catch(err => {
          console.error("GameAI Model load error:", err);
          setError(`GameAI Model load error: ${err.message || err.toString()}. Ensure model.json and .bin files are in public/model/ and are valid graph models.`);
          setLoadingStatus("Error loading GameAI model.");
        });

      return () => { mounted = false };
    };

    loadModel();
  }, []);

  // Check for MediaPipe readiness
  useEffect(() => {
    const checkMediaPipe = () => {
      if (window.Pose && window.Camera && window.POSE_CONNECTIONS) {
        setIsMediaPipeReady(true);
        setLoadingStatus("MediaPipe libraries loaded.");
      } else {
        // Retry checking after a short delay if not ready
        setTimeout(checkMediaPipe, 100);
      }
    };
    checkMediaPipe();
  }, []); // Run once on mount

  // Setup MediaPipe pose + camera with cleanup
  useEffect(() => {
    if (!videoRef.current || !model || !isMediaPipeReady) {
      if (!model) console.log("Waiting for model to load before initializing camera/MediaPipe.");
      if (!isMediaPipeReady) console.log("Waiting for MediaPipe libraries to load.");
      return;
    }

    const initializeMediaPipe = async () => {
      try {
        setLoadingStatus("Loading MediaPipe Pose...");
        const pose = new window.Pose({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
        });

        pose.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          minDetectionConfidence: 0.9,
          minTrackingConfidence: 0.5,
        });

        pose.onResults(onResults);

        setLoadingStatus("Accessing camera...");
        console.log("Attempting to access camera...");

        // Request camera access explicitly
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoRef.current.srcObject = stream;
        await videoRef.current.play(); // Ensure video is playing before sending frames

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
          if (stream) {
            stream.getTracks().forEach(track => track.stop()); // Stop all tracks
          }
        };
      } catch (err) {
        console.error("MediaPipe/Camera initialization error:", err);
        setError(`MediaPipe/Camera error: ${err.message || err.toString()}. Please ensure camera access is granted and CDN scripts are loaded.`);
        setLoadingStatus("Error initializing camera/MediaPipe.");
      }
    };

    initializeMediaPipe(); // Call directly now that isMediaPipeReady is a dependency

  }, [videoRef, model, isMediaPipeReady, onResults]); // Depend on model, isMediaPipeReady, and onResults

  return (
    <div style={{
      display: "flex", height: "100vh",
      background: "linear-gradient(135deg, #1e293b, #0f172a)",
      color: "white"
    }}>
      {/* Left: Webcam and Prediction Display */}
      <div style={{ flex: 1, position: "relative", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
        {loadingStatus !== "Camera started. Ready for detection." && (
          <div className="text-xl text-yellow-300 mb-4">{loadingStatus}</div>
        )}
        {error && (
          <div className="text-xl text-red-500 mb-4">Error: {error}</div>
        )}
        <video ref={videoRef} style={{ width: "100%", height: "auto", objectFit: "cover", display: "none" }} autoPlay muted playsInline />
        <canvas ref={canvasRef} width="640" height="480" style={{ width: "100%", maxWidth: "640px", height: "auto", border: "1px solid white", borderRadius: "8px" }}></canvas>
        <div style={{
          position: "absolute", top: 10, left: 10,
          backgroundColor: "rgba(0,0,0,0.5)", padding: 10,
          borderRadius: 8, fontSize: 24
        }}>
          Action: {prediction}
        </div>
      </div>

      {/* Right: Simple Game */}
      <div style={{
        flex: 1, backgroundColor: "rgba(255 255 255 / 0.1)",
        display: "flex", justifyContent: "center", alignItems: "flex-end",
        overflow: "hidden" // Hide overflow for player movement
      }}>
        <Stage width={640} height={480} style={{ border: "1px solid white", borderRadius: "8px", marginBottom: "20px" }}>
          <Layer>
            <Rect
              x={playerPos.x}
              y={playerPos.y}
              width={50}
              height={prediction === "crouch" ? 30 : 50} // Dynamic height for crouch
              fill={
                prediction === "punch" ? "#ef4444" : // Red for punch
                prediction === "kick" ? "#f59e0b" :   // Orange for kick
                prediction === "block" ? "#10b981" : // Green for block
                "#3b82f6"                             // Blue for others (idle, jump, move)
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
