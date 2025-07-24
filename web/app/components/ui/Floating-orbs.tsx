"use client";

import { motion } from "framer-motion";

export const FloatingOrbs = () => {
  return (
    <div className="absolute inset-0 pointer-events-none z-0">
      {/* Large Orb */}
      <motion.div
        className="absolute top-20 left-20 w-96 h-96 bg-gradient-to-r from-cyan-400/10 to-blue-500/10 rounded-full blur-3xl"
        animate={{
          x: [0, 30, -20, 0],
          y: [0, -30, 20, 0],
          rotate: [0, 120, 240, 360],
        }}
        transition={{
          duration: 20,
          ease: "easeInOut",
          repeat: Infinity,
        }}
      />

      {/* Medium Orb */}
      <motion.div
        className="absolute top-1/3 right-32 w-64 h-64 bg-gradient-to-r from-purple-400/15 to-pink-500/10 rounded-full blur-2xl"
        animate={{
          x: [0, -40, 0],
          y: [0, -20, 0],
          rotate: [0, 180, 360],
        }}
        transition={{
          duration: 15,
          ease: "easeInOut",
          repeat: Infinity,
        }}
      />

      {/* Small Orb */}
      <motion.div
        className="absolute bottom-32 left-1/3 w-48 h-48 bg-gradient-to-r from-indigo-400/10 to-cyan-500/10 rounded-full blur-xl"
        animate={{
          x: [0, 20, -30, -10, 0],
          y: [0, -40, -20, 30, 0],
          rotate: [0, 90, 180, 270, 360],
        }}
        transition={{
          duration: 12,
          ease: "easeInOut",
          repeat: Infinity,
        }}
      />

      {/* Extra Orbs */}
      <motion.div
        className="absolute top-1/2 left-1/2 w-32 h-32 bg-gradient-to-r from-violet-400/10 to-purple-500/10 rounded-full blur-xl"
        animate={{
          x: [0, 25, 0],
          y: [0, 25, 0],
          rotate: [360, 180, 360],
        }}
        transition={{
          duration: 18,
          ease: "easeInOut",
          repeat: Infinity,
        }}
      />

      <motion.div
        className="absolute bottom-20 right-20 w-40 h-40 bg-gradient-to-r from-blue-400/8 to-indigo-500/8 rounded-full blur-2xl"
        animate={{
          x: [0, -25, 35, 0],
          y: [0, 35, -25, 0],
          rotate: [360, 240, 120, 360],
        }}
        transition={{
          duration: 25,
          ease: "easeInOut",
          repeat: Infinity,
        }}
      />
    </div>
  );
};
