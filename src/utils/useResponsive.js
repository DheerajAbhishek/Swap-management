import { useState, useEffect } from 'react';

/**
 * Custom hook for responsive design
 * Returns current breakpoint and helper functions
 */
export function useResponsive() {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowSize.width <= 480;
  const isTablet = windowSize.width > 480 && windowSize.width <= 768;
  const isDesktop = windowSize.width > 768 && windowSize.width <= 1024;
  const isLargeDesktop = windowSize.width > 1024;

  const breakpoint = isMobile 
    ? 'mobile' 
    : isTablet 
      ? 'tablet' 
      : isDesktop 
        ? 'desktop' 
        : 'largeDesktop';

  return {
    windowSize,
    isMobile,
    isTablet,
    isDesktop,
    isLargeDesktop,
    breakpoint,
    // Helper to get responsive value
    responsive: (mobile, tablet, desktop, largeDesktop) => {
      if (isMobile) return mobile;
      if (isTablet) return tablet ?? mobile;
      if (isDesktop) return desktop ?? tablet ?? mobile;
      return largeDesktop ?? desktop ?? tablet ?? mobile;
    }
  };
}

/**
 * Responsive style helper
 * Returns inline styles based on breakpoint
 */
export function getResponsiveStyles(isMobile, isTablet) {
  return {
    // Container padding
    containerPadding: isMobile ? 12 : isTablet ? 16 : 24,
    
    // Font sizes
    titleSize: isMobile ? 18 : isTablet ? 20 : 24,
    subtitleSize: isMobile ? 14 : isTablet ? 16 : 18,
    bodySize: isMobile ? 13 : 14,
    smallSize: isMobile ? 11 : 12,
    
    // Spacing
    gapSmall: isMobile ? 8 : 12,
    gapMedium: isMobile ? 12 : 16,
    gapLarge: isMobile ? 16 : 24,
    
    // Border radius
    radiusSmall: isMobile ? 6 : 8,
    radiusMedium: isMobile ? 10 : 12,
    radiusLarge: isMobile ? 12 : 16,
    
    // Button padding
    buttonPadding: isMobile ? '8px 12px' : '10px 20px',
    
    // Card padding
    cardPadding: isMobile ? 12 : isTablet ? 16 : 24,
    
    // Input padding
    inputPadding: isMobile ? '8px 12px' : '10px 14px',
    
    // Table cell padding
    tableCellPadding: isMobile ? '6px 8px' : isTablet ? '8px 12px' : '12px 16px'
  };
}

export default useResponsive;
