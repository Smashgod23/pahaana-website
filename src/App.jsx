import React, { useRef, useEffect, useState, useCallback } from "react";
import { motion, useMotionValue, useTransform, useSpring, AnimatePresence } from "framer-motion";
import Particles from "react-tsparticles";
import { loadSlim } from "tsparticles-slim";

// Import TensorFlow.js (if used in App.jsx directly, otherwise can be removed)
import * as tf from '@tensorflow/tfjs';

// Import the GameAI component from the 'pages' folder
import GameAI from './pages/GameAI.jsx'; // Corrected import path

// Helper function for drawing landmarks (for MediaPipe visualization)
// These helpers are only needed if MediaPipe is used in App.jsx directly.
// Since it's moved to GameAI.jsx, these can be removed from App.jsx if not used elsewhere.
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

const Home = ({ navigate }) => { // Pass navigate prop
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  // Removed rotateX and rotateY as they are not used in the JSX

  return (
    <>
      <div
        onMouseMove={(e) => {
          x.set(e.clientX);
          y.set(e.clientY);
        }}
        className="relative min-h-screen flex items-center justify-center overflow-hidden text-white"
      >
        <motion.div className="absolute inset-0 z-0 pointer-events-none">
          <motion.div
            style={{
              x: useTransform(x, [0, window.innerWidth], [-100, 100]),
              y: useTransform(y, [0, window.innerHeight], [-100, 100]),
              willChange: "transform, opacity",
              mixBlendMode: "screen",
              transition: "none"
            }}
            className="absolute top-[10%] left-[10%] w-[30rem] h-[30rem] bg-blue-400 opacity-20 blur-3xl rounded-full"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 8 }}
          />
          <motion.div
            style={{
              x: useTransform(x, [0, window.innerWidth], [50, -50]),
              y: useTransform(y, [0, window.innerHeight], [50, -50]),
              willChange: "transform, opacity",
              mixBlendMode: "screen",
              transition: "none"
            }}
            className="absolute bottom-[15%] right-[15%] w-[30rem] h-[30rem] bg-fuchsia-500 opacity-20 blur-3xl rounded-full"
            animate={{ scale: [1, 0.95, 1] }}
            transition={{ repeat: Infinity, duration: 6 }}
          />
        </motion.div>
        <motion.div
          className="z-10 backdrop-blur-xl bg-white/10 border border-white/10 rounded-xl p-10 shadow-2xl text-center max-w-2xl"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
        >
          <h1 className="text-6xl font-bold mb-6 tracking-tight">
            Welcome to <span className="text-blue-400">PAHAANA</span>
          </h1>
          <p className="text-xl text-gray-200 leading-relaxed">
            Revolutionizing human motion analysis with intelligent AI tools to understand movement, improve performance, and play smarter.
          </p>
        </motion.div>
      </div>
    </>
  );
};

const Navbar = ({ navigate, currentPage }) => { // Pass navigate and currentPage
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [isInside, setIsInside] = useState(false);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseEnter = () => setIsInside(true);
  const handleMouseLeave = () => setIsInside(false);

  // Helper for nav magnetic effect using Framer Motion animate API
  const magneticMotionDiv = (to, label) => {
    const [x, setX] = useState(0);
    const [y, setY] = useState(0);

    return (
      <motion.div
        className="inline-block"
        animate={{ x, y }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        onMouseMove={(e) => {
          const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
          const newX = (e.clientX - (left + width / 2)) * 0.3;
          const newY = (e.clientY - (top + height / 2)) * 0.3;
          setX(newX);
          setY(newY);
        }}
        onMouseLeave={() => {
          setX(0);
          setY(0);
        }}
      >
        <button
          onClick={() => navigate(to)} // Use navigate prop
          className="relative px-2 py-1 rounded transition duration-300 hover:bg-white/10 hover:shadow-glow nav-item"
        >
          {label}
        </button>
      </motion.div>
    );
  };

  return (
    <nav
      className="relative z-20 flex justify-between items-center px-6 py-4 bg-black/30 text-white shadow-md backdrop-blur-lg overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div
        className="absolute w-56 h-56 pointer-events-none rounded-full z-0"
        style={{
          background:
            "radial-gradient(circle at center, rgba(96,165,250,0.7), rgba(139,92,246,0.4), rgba(236,72,153,0.2))",
          mixBlendMode: "screen",
          filter: "blur(60px)",
          willChange: "transform, opacity",
          transition: "none",
        }}
        animate={{
          top: cursorPos.y - 112,
          left: cursorPos.x - 112,
          opacity: isInside ? 1 : 0,
        }}
        transition={{
          type: "spring",
          stiffness: 100,
          damping: 24,
        }}
      />
      <button
        onClick={() => navigate("/")} // Use navigate prop
        className="text-2xl font-bold transition duration-300 hover:text-blue-400 hover:drop-shadow-glow nav-item"
      >
        PAHAANA
      </button>
      <div className="space-x-6 flex items-center">
        {magneticMotionDiv("/", "Home")}
        {magneticMotionDiv("/pushup", "Push-Up AI")}
        {magneticMotionDiv("/game", "Game Control AI")}
        {magneticMotionDiv("/about", "About Us")}
      </div>
    </nav>
  );
}

const PushUpAI = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const modelRef = useRef(null); // For the loaded TensorFlow.js model
  const poseRef = useRef(null); // For MediaPipe Pose
  const cameraRef = useRef(null); // For MediaPipe Camera

  const [loadingStatus, setLoadingStatus] = useState("Initializing...");
  const [error, setError] = useState(null);
  const [pushupCount, setPushupCount] = useState(0);
  const [formFeedback, setFormFeedback] = useState("Ready");
  const [isDetecting, setIsDetecting] = useState(false);

  // Load the TensorFlow.js model and MediaPipe Pose
  useEffect(() => {
    const loadAssets = async () => {
      try {
        setLoadingStatus("Loading TensorFlow.js model...");
        // Changed tf.loadLayersModel to tf.loadGraphModel
        const loadedModel = await tf.loadGraphModel('/model/model.json');
        modelRef.current = loadedModel;
        console.log('TensorFlow.js model loaded successfully!');
        setLoadingStatus("TensorFlow.js model loaded.");

        setLoadingStatus("Loading MediaPipe Pose...");
        // Initialize MediaPipe Pose
        // Access Pose from global window object after CDN script loads
        if (!window.Pose || !window.Camera) {
          throw new Error("MediaPipe Pose or Camera utilities not found. Ensure CDN scripts are loaded.");
        }
        const pose = new window.Pose({
          locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
          }
        });

        pose.setOptions({
          modelComplexity: 1, // 0, 1, or 2 (higher is more accurate but slower)
          smoothLandmarks: true,
          enableSegmentation: false,
          smoothSegmentation: false,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        pose.onResults(onResults); // Set up the callback for results
        poseRef.current = pose;
        console.log('MediaPipe Pose loaded successfully!');
        setLoadingStatus("MediaPipe Pose loaded.");

        setLoadingStatus("Accessing camera...");
        // Access camera
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          // Access Camera from global window object after CDN script loads
          const camera = new window.Camera(videoRef.current, {
            onFrame: async () => {
              if (poseRef.current && videoRef.current) {
                await poseRef.current.send({ image: videoRef.current });
              }
            },
            width: 640,
            height: 480
          });
          camera.start();
          cameraRef.current = camera;
          console.log('Camera started.');
          setLoadingStatus("Camera started. Ready for detection.");
          setIsDetecting(true);
        } else {
          throw new Error("Camera not supported on this browser.");
        }

      } catch (err) {
        console.error("Error loading assets:", err);
        setError(`Failed to load: ${err.message}`);
        setLoadingStatus("Error loading assets.");
      }
    };

    loadAssets();

    // Cleanup function
    return () => {
      if (modelRef.current) {
        modelRef.current.dispose();
        console.log('TensorFlow.js model disposed.');
      }
      if (poseRef.current) {
        poseRef.current.close();
        console.log('MediaPipe Pose closed.');
      }
      if (cameraRef.current) {
        cameraRef.current.stop();
        console.log('Camera stopped.');
      }
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // MediaPipe results callback
  const onResults = useCallback(async (results) => {
    const canvasElement = canvasRef.current;
    const canvasCtx = canvasElement.getContext('2d');

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    // Access POSE_CONNECTIONS from global window object
    if (results.poseLandmarks && window.POSE_CONNECTIONS) {
      drawConnectors(canvasCtx, results.poseLandmarks, window.POSE_CONNECTIONS, '#00FF00');
      drawLandmarks(canvasCtx, results.poseLandmarks, '#FF0000');

      // --- Inference with TensorFlow.js model ---
      if (modelRef.current) {
        // Preprocess landmarks for the model
        // This is a placeholder. You need to adapt this based on your model's input
        // Your model expects input_shape: [-1, 5, 66]
        // This means a batch of sequences, where each sequence has 5 frames, and each frame has 66 features.
        // 66 features likely come from 22 landmarks * 3 (x, y, z) or 33 landmarks * 2 (x, y)
        // You'll need to collect a sequence of 5 frames of landmark data.
        // For simplicity, let's just use the current frame's landmarks as a single input for now,
        // but you'll need to implement a proper sequence buffer.

        const landmarksArray = [];
        if (results.poseLandmarks) {
            // Assuming 33 landmarks from MediaPipe Pose, each with x, y, z, visibility
            // We need to flatten this to 66 features (33 * 2 for x,y or 22*3 for x,y,z)
            // The model input shape is [batch_size, sequence_length, features] = [-1, 5, 66]
            // Let's assume your model expects 33 landmarks * 2 (x, y) = 66 features.
            // You might need to filter out z and visibility if your model was trained only on x,y
            results.poseLandmarks.forEach(landmark => {
                landmarksArray.push(landmark.x);
                landmarksArray.push(landmark.y);
                // If your model uses z, add it: landmarksArray.push(landmark.z);
            });
        }

        if (landmarksArray.length === 66) { // Ensure we have 66 features
            // This is a single frame. Your model expects a sequence of 5 frames.
            // You need to buffer frames and then pass a sequence of 5 frames to the model.
            // For demonstration, let's just create a dummy sequence of 5 identical frames.
            // In a real app, you'd collect 5 actual frames.
            const sequenceLength = 5;
            let inputTensorData = [];
            for (let i = 0; i < sequenceLength; i++) {
                inputTensorData = inputTensorData.concat(landmarksArray);
            }

            // Reshape to [1, 5, 66] (batch size 1, sequence length 5, 66 features)
            const inputTensor = tf.tensor(inputTensorData, [1, sequenceLength, 66]);

            try {
                const prediction = modelRef.current.predict(inputTensor);
                const outputData = await prediction.data();
                // console.log("Model output:", outputData); // Log the raw output

                // Process your model's output here
                // Example: If your model outputs a class probability for "pushup_state"
                // You'll need to map this to your specific push-up logic.
                // For now, let's just show a dummy output based on some landmark positions.
                const leftShoulder = results.poseLandmarks[11]; // Example landmark index
                const leftElbow = results.poseLandmarks[13];
                const leftWrist = results.poseLandmarks[15];

                if (leftShoulder && leftElbow && leftWrist) {
                    // Simple angle calculation for demonstration
                    // This is NOT a robust push-up counter, just an example.
                    const angle = Math.atan2(leftWrist.y - leftElbow.y, leftWrist.x - leftElbow.x) -
                                  Math.atan2(leftShoulder.y - leftElbow.y, leftShoulder.x - leftElbow.x);
                    const angleDeg = Math.abs(angle * 180 / Math.PI);

                    if (angleDeg > 160) { // Arm relatively straight
                        setFormFeedback("Up Position");
                    } else if (angleDeg < 90) { // Arm bent
                        setFormFeedback("Down Position");
                    } else {
                        setFormFeedback("Mid-way");
                    }
                }

                prediction.dispose(); // Clean up tensor
                inputTensor.dispose(); // Clean up input tensor

            } catch (predError) {
                console.error("Error during model prediction:", predError);
                setFormFeedback("Prediction Error");
            }
        }
      }
    }
    canvasCtx.restore();
  }, []); // Dependencies for useCallback

  return (
    <>
      <div className="p-6 min-h-screen text-white flex flex-col gap-6 items-center bg-blue-900/20 transition-colors duration-1000">
        <motion.h2
          className="text-4xl font-bold"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Push-Up Form Analyzer
        </motion.h2>

        <div className="backdrop-blur-xl bg-white/10 p-6 rounded-xl border border-white/10 w-full max-w-lg text-center">
          {loadingStatus !== "Camera started. Ready for detection." && (
            <div className="text-xl text-yellow-300 mb-4">{loadingStatus}</div>
          )}
          {error && (
            <div className="text-xl text-red-500 mb-4">Error: {error}</div>
          )}
          <video ref={videoRef} autoPlay playsInline className="rounded w-full hidden" /> {/* Hidden video */}
          <canvas ref={canvasRef} className="rounded w-full"></canvas> {/* Visible canvas */}
        </div>

        <div className="mt-4 text-xl">
          <p>Push-ups: <span className="font-bold text-green-400">{pushupCount}</span></p>
          <p>Form: <span className="font-bold text-blue-400">{formFeedback}</span></p>
        </div>

        {/* Removed the capture button as we are streaming now */}
      </div>
    </>
  );
};

const About = () => (
  <>
    <div className="p-6 min-h-screen text-white flex items-center justify-center bg-gray-900/20 transition-colors duration-1000">
      <motion.div
        className="max-w-2xl bg-white/10 backdrop-blur-lg border border-white/10 p-8 rounded-xl text-white shadow-lg"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <h2 className="text-4xl font-bold mb-4">About Us</h2>
        <p className="text-gray-200 leading-relaxed">
          PAHAANA is a research-driven initiative aimed at merging cutting-edge computer vision with intelligent movement analysis.
          From posture correction to interactive motion control, we build tools that observe and understand the human body in motion—
          enhancing health, gaming, and performance in the modern world.
        </p>
      </motion.div>
    </div>
  </>
);

export default function App() {
  const [currentPage, setCurrentPage] = useState("/");
  const [prevPath, setPrevPath] = useState("/");
  const [transitionDirection, setTransitionDirection] = useState(1);

  const navigate = (path) => {
    setPrevPath(currentPage);
    setCurrentPage(path);
  };

  const [isTransitioning, setIsTransitioning] = useState(true);

  useEffect(() => {
    const isFromHome = prevPath === "/";
    setIsTransitioning(isFromHome);
    const timeout = setTimeout(() => setIsTransitioning(false), isFromHome ? 600 : 0);
    return () => clearTimeout(timeout);
  }, [currentPage, prevPath]);

  useEffect(() => {
    const modelOrder = ["/pushup", "/game"];
    const fromIndex = modelOrder.indexOf(prevPath);
    const toIndex = modelOrder.indexOf(currentPage);
    if (fromIndex !== -1 && toIndex !== -1) {
      setTransitionDirection(toIndex > fromIndex ? 1 : -1);
    } else {
      setTransitionDirection(1); // Default direction for other transitions
    }
  }, [currentPage, prevPath]);

  const isBetweenModels =
    ["/pushup", "/game"].includes(prevPath) && ["/pushup", "/game"].includes(currentPage);

  let transitionColor = "#0f172a";
  switch (currentPage) {
    case "/pushup":
      transitionColor = "#1e3a8a";
      break;
    case "/game":
      transitionColor = "#991b1b";
      break;
    case "/about":
      transitionColor = "#111827";
      break;
    default:
      transitionColor = "#0f172a";
  }

  return (
    <>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap');
          body {
            font-family: 'Inter', sans-serif;
            margin: 0;
            padding: 0;
            background-color: #0f172a; /* Default background */
            transition: background-color 0.5s ease-in-out;
          }
          .shadow-glow {
            text-shadow: 0 0 8px rgba(96, 165, 250, 0.6), 0 0 12px rgba(96, 165, 250, 0.4);
          }
          .nav-item:hover {
            box-shadow: 0 0 10px rgba(255, 255, 255, 0.3), 0 0 20px rgba(255, 255, 255, 0.1);
          }
        `}
      </style>
      {/* Include MediaPipe CDN scripts here.
          These should be in your public/index.html or equivalent.
          Example:
          <script src="https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js"></script>
          <script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js"></script>
          <script src="https://unpkg.com/react-konva/react-konva.min.js"></script>
          <script src="https://unpkg.com/konva/konva.min.js"></script>
      */}
      {/* Animated particles background */}
      <Particles
        id="tsparticles"
        init={async (engine) => { await loadSlim(engine); }}
        className="fixed top-0 left-0 w-full h-full z-0"
        options={{
          fullScreen: false,
          particles: {
            number: { value: 30 },
            color: { value: "#ffffff" },
            shape: { type: "circle" },
            opacity: { value: 0.2 },
            size: { value: 2 },
            move: { enable: true, speed: 0.5 }
          },
          interactivity: {
            events: { onHover: { enable: true, mode: "repulse" } },
            modes: { repulse: { distance: 100 } }
          },
          background: { color: "transparent" }
        }}
      />
      {/* Animated orb morphing transition */}
      <AnimatePresence mode="wait">
        {isTransitioning && prevPath === "/" && (
          <motion.div
            key="model-orb"
            className="fixed top-1/2 left-1/2 w-48 h-48 rounded-full z-50"
            style={{
              backgroundColor:
                currentPage === "/pushup"
                  ? "#3b82f6"
                  : currentPage === "/game"
                  ? "#ec4899"
                  : "#111827",
              filter: "blur(80px)",
              mixBlendMode: "screen",
              transform: "translate(-50%, -50%)",
            }}
            initial={{ scale: 1, opacity: 0.4 }}
            animate={{ scale: 40, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          />
        )}
      </AnimatePresence>
      <Navbar navigate={navigate} currentPage={currentPage} />
      {/* Always mount content; orb overlays on top during transition */}
      <AnimatePresence mode="wait">
        {/* Using key for AnimatePresence to detect route changes */}
        <motion.div
          key={currentPage} // Key ensures component remounts on route change for exit animations
          initial={{ opacity: 0, x: isBetweenModels ? 30 * transitionDirection : 0 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: isBetweenModels ? -30 * transitionDirection : 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10" // Ensure content is above particles
        >
          {(() => {
            switch (currentPage) {
              case "/":
                return <Home navigate={navigate} />;
              case "/pushup":
                return <PushUpAI />;
              case "/game":
                return <GameAI />;
              case "/about":
                return <About />;
              default:
                return <Home navigate={navigate} />;
            }
          })()}
        </motion.div>
      </AnimatePresence>
    </>
  );
}