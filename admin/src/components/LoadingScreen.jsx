import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { assets } from '../assets/assets';
import shithaLogo from '../assets/shithaa_logo.jpg'; 

const LoadingScreen = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [bgToWhite, setBgToWhite] = useState(false);
  const [showLogo, setShowLogo] = useState(false);

  useEffect(() => {
    // Start transition after short delay
    const bgTimer = setTimeout(() => {
      setBgToWhite(true);
      setTimeout(() => setShowLogo(true), 400); // Show logo after bg starts transitioning
    }, 400);

    // Hide loading screen after animation
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 2000);

    return () => {
      clearTimeout(timer);
      clearTimeout(bgTimer);
    };
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{
            background: '#4D1E64',
            transition: 'background 0.7s cubic-bezier(0.4,0,0.2,1)'
          }}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: showLogo ? 1 : 0.8, opacity: showLogo ? 1 : 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
            className="flex flex-col items-center"
          >
            <motion.img
              src={shithaLogo}
              alt="Shitha Logo"
              className="w-48 mb-4"
              initial={{ y: 40, opacity: 0, scale: 0.7 }}
              animate={{ y: showLogo ? 0 : 40, opacity: showLogo ? 1 : 0, scale: showLogo ? 1 : 0.7 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            />
            <motion.div
              className="w-12 h-12 relative"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: showLogo ? 1 : 0, opacity: showLogo ? 1 : 0 }}
              transition={{ duration: 0.5, delay: 0.3, ease: 'backOut' }}
            >
              <motion.div
                className="absolute inset-0 border-t-4 border-theme-400 rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              />
              <div className="absolute inset-0 border-l-4 border-transparent rounded-full"></div>
              <div className="absolute inset-0 border-b-4 border-transparent rounded-full"></div>
              <div className="absolute inset-0 border-r-4 border-transparent rounded-full"></div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoadingScreen; 