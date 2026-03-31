'use client';

import { ChevronDown } from 'lucide-react';
import { useState, useEffect } from 'react';

interface ScrollScreenChevronDownProps {
  color?: string;
}

const ScrollScreenChevronDown = ({ color = 'text-foreground' }: ScrollScreenChevronDownProps) => {
  const [currentScreen, setCurrentScreen] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const screenHeight = window.innerHeight;
      setCurrentScreen(Math.floor(scrollPosition / screenHeight));
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleScrollDown = () => {
    const nextScreen = currentScreen + 1;
    window.scrollTo({
      top: nextScreen * window.innerHeight,
      behavior: 'smooth',
    });
  };

  return (
    <button
      onClick={handleScrollDown}
      className="animate-bounce cursor-pointer focus:outline-hidden"
      aria-label="向下滚动">
      <ChevronDown className={`size-12 ${color} transition-colors hover:opacity-80`} />
    </button>
  );
};

export default ScrollScreenChevronDown;
