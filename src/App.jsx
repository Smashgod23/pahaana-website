import React, { useRef, useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import { motion, useMotionValue, useTransform, useSpring, AnimatePresence } from "framer-motion";
import Particles from "react-tsparticles";
import { loadFull } from "tsparticles";

const Home = () => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [0, window.innerHeight], [15, -15]);
  const rotateY = useTransform(x, [0, window.innerWidth], [-15, 15]);

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

const Navbar = () => {
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
        <Link
          to={to}
          className="relative px-2 py-1 rounded transition duration-300 hover:bg-white/10 hover:shadow-glow nav-item"
        >
          {label}
        </Link>
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
      <Link
        to="/"
        className="text-2xl font-bold transition duration-300 hover:text-blue-400 hover:drop-shadow-glow nav-item"
      >
        PAHAANA
      </Link>
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
  const camera = useRef(null);
  const [image, setImage] = useState(null);

  // Helper to get current frame as canvas from video
  const getVideoFrame = () => {
    if (!camera.current) return null;
    const video = camera.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas;
  };

  const capture = () => {
    const photo = camera.current?.takePhoto();
    setImage(photo);
  };

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
          <video ref={camera} autoPlay playsInline className="rounded w-full" />
        </div>

        <motion.button
          onClick={capture}
          whileHover={{ scale: 1.05 }}
          className="px-6 py-2 rounded bg-blue-600 hover:bg-blue-500 transition-all"
        >
          Capture
        </motion.button>

        {image && (
          <img
            src={image}
            alt="Captured"
            className="rounded border-2 border-white mt-4 w-full max-w-sm"
          />
        )}
      </div>
    </>
  );
};

const GameAI = () => {
  const camera = useRef(null);
  const [frame, setFrame] = useState(null);

  // Helper to get current frame as canvas from video
  const getVideoFrame = () => {
    if (!camera.current) return null;
    const video = camera.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas;
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const photo = camera.current?.takePhoto();
      setFrame(photo);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <div className="p-6 min-h-screen text-white flex flex-col gap-6 items-center bg-pink-900/20 transition-colors duration-1000">
        <motion.h2
          className="text-4xl font-bold"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Game Input AI
        </motion.h2>

        <div className="backdrop-blur-xl bg-white/10 p-6 rounded-xl border border-white/10 w-full max-w-lg text-center">
          <video ref={camera} autoPlay playsInline className="rounded w-full" />
        </div>

        {frame && (
          <img
            src={frame}
            alt="Game Input Frame"
            className="rounded border-2 border-white mt-4 w-full max-w-sm"
          />
        )}
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
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

function AppContent() {
  const location = useLocation();

  const [transitionColor, setTransitionColor] = useState("#0f172a");
  // Track if we're in a route transition and should show orbs
  const [isTransitioning, setIsTransitioning] = useState(true);
  const [prevPath, setPrevPath] = useState(location.pathname);
  const [transitionDirection, setTransitionDirection] = useState(1);

  useEffect(() => {
    const isFromHome = prevPath === "/";
    setIsTransitioning(isFromHome);
    const timeout = setTimeout(() => setIsTransitioning(false), isFromHome ? 600 : 0);
    return () => clearTimeout(timeout);
  }, [location, prevPath]);

  useEffect(() => {
    setPrevPath(location.pathname);
  }, [location]);

  useEffect(() => {
    switch (location.pathname) {
      case "/pushup":
        setTransitionColor("#1e3a8a");
        break;
      case "/game":
        setTransitionColor("#991b1b");
        break;
      case "/about":
        setTransitionColor("#111827");
        break;
      default:
        setTransitionColor("#0f172a");
    }
  }, [location]);

  useEffect(() => {
    const modelOrder = ["/pushup", "/game"];
    const fromIndex = modelOrder.indexOf(prevPath);
    const toIndex = modelOrder.indexOf(location.pathname);
    if (fromIndex !== -1 && toIndex !== -1) {
      setTransitionDirection(toIndex > fromIndex ? 1 : -1);
    }
  }, [location.pathname]);

  const isBetweenModels =
    ["/pushup", "/game"].includes(prevPath) && ["/pushup", "/game"].includes(location.pathname);

  return (
    <>
      {/* Animated particles background */}
      <Particles
        id="tsparticles"
        init={loadFull}
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
                location.pathname === "/pushup"
                  ? "#3b82f6"
                  : location.pathname === "/game"
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
      <Navbar />
      {/* Always mount content; orb overlays on top during transition */}
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Home />} />
          <Route
            path="/pushup"
            element={
              <motion.div
                initial={{ opacity: 0, x: 30 * transitionDirection }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 * transitionDirection }}
                transition={{ duration: 0.5 }}
              >
                <PushUpAI />
              </motion.div>
            }
          />
          <Route
            path="/game"
            element={
              <motion.div
                initial={{ opacity: 0, x: 30 * transitionDirection }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 * transitionDirection }}
                transition={{ duration: 0.5 }}
              >
                <GameAI />
              </motion.div>
            }
          />
          <Route
            path="/about"
            element={
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.5 }}
              >
                <About />
              </motion.div>
            }
          />
        </Routes>
      </AnimatePresence>
    </>
  );
}