'use client';

import React from 'react';

interface AppLogoProps {
  className?: string;
  width?: number;
  height?: number;
}

const AppLogo: React.FC<AppLogoProps> = ({
  className = '',
  width = 160,
  height = 40
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 50"
      width={width}
      height={height}
      className={className}
      aria-label="BauPM Logo"
    >
      <text
        x="5"
        y="35"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="28"
        fontWeight="bold"
        fill="#002D5A"
        letterSpacing="1"
      >
        BauPM
      </text>
    </svg>
  );
};

export default AppLogo;
