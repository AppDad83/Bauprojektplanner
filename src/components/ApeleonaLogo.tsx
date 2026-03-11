'use client';

import React from 'react';

interface ApeleonaLogoProps {
  className?: string;
  width?: number;
  height?: number;
}

const ApeleonaLogo: React.FC<ApeleonaLogoProps> = ({
  className = '',
  width = 160,
  height = 40
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 180 50"
      width={width}
      height={height}
      className={className}
      aria-label="Apleona Logo"
    >
      <text
        x="5"
        y="35"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="32"
        fontWeight="bold"
        fill="#E30613"
        letterSpacing="2"
      >
        APLEONA
      </text>
    </svg>
  );
};

export default ApeleonaLogo;
