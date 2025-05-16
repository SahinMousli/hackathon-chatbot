'use client';
import React from 'react';

const ArrowUpward: React.FC<{ size?: number; rotate?: boolean; opacity?: number }> = ({
  size = 16,
  rotate = false,
  opacity = 1,
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    height={`${size}px`}
    width={`${size}px`}
    viewBox="0 0 24 24"
    fill="currentColor"
    style={{
      transform: rotate ? 'rotate(180deg)' : 'none',
      transition: 'transform 0.2s ease',
      opacity,
    }}
  >
    <path d="M4 12l1.41 1.41L11 7.83v12.17h2V7.83l5.59 5.58L20 12l-8-8z" />
  </svg>
);


export default ArrowUpward;
