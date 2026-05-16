import React from 'react';

/**
 * Custom SVG Vector Illustrations for Chemistry
 * All designs follow the Red and White theme
 */

export const BeakerVector = ({ className = "w-full h-full" }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M30 20V80C30 85.5228 34.4772 90 40 90H80C85.5228 90 90 85.5228 90 80V20" stroke="currentColor" strokeWidth="3" strokeLinejoin="round"/>
    <path d="M30 30H90" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4"/>
    <path d="M30 45H90" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4"/>
    <path d="M30 60H90" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4"/>
    <path d="M32 65H88V80C88 84.4183 84.4183 88 80 88H40C35.5817 88 32 84.4183 32 80V65Z" fill="currentColor" fillOpacity="0.1"/>
    <rect x="25" y="15" width="70" height="5" rx="2.5" fill="currentColor"/>
  </svg>
);

export const AtomicVector = ({ className = "w-full h-full" }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="8" fill="currentColor"/>
    <ellipse cx="50" cy="50" rx="45" ry="15" stroke="currentColor" strokeWidth="2" transform="rotate(45 50 50)"/>
    <ellipse cx="50" cy="50" rx="45" ry="15" stroke="currentColor" strokeWidth="2" transform="rotate(-45 50 50)"/>
    <ellipse cx="50" cy="50" rx="45" ry="15" stroke="currentColor" strokeWidth="2" transform="rotate(90 50 50)"/>
    <circle cx="82" cy="18" r="4" fill="currentColor">
      <animate attributeName="opacity" values="1;0.2;1" dur="2s" repeatCount="indefinite" />
    </circle>
    <circle cx="18" cy="82" r="4" fill="currentColor">
      <animate attributeName="opacity" values="1;0.2;1" dur="2s" begin="1s" repeatCount="indefinite" />
    </circle>
  </svg>
);

export const DNAVector = ({ className = "w-full h-full" }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {[...Array(8)].map((_, i) => (
      <React.Fragment key={i}>
        <circle cx="30" cy={20 + i * 10} r="4" fill="currentColor" />
        <circle cx="70" cy={20 + i * 10} r="4" fill="currentColor" />
        <line x1="34" y1={20 + i * 10} x2="66" y2={20 + i * 10} stroke="currentColor" strokeWidth="2" strokeDasharray="2 2" />
      </React.Fragment>
    ))}
    <path d="M30 10C30 10 70 30 70 50C70 70 30 90 30 90" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.3" />
    <path d="M70 10C70 10 30 30 30 50C30 70 70 90 70 90" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.3" />
  </svg>
);

export const LabStructureVector = ({ className = "w-full h-full" }: { className?: string }) => (
  <svg viewBox="0 0 200 200" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M40 160H160" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
    <path d="M60 160V60C60 54.4772 64.4772 50 70 50H130C135.523 50 140 54.4772 140 60V160" stroke="currentColor" strokeWidth="4"/>
    <circle cx="100" cy="100" r="20" stroke="currentColor" strokeWidth="4"/>
    <path d="M100 80V50" stroke="currentColor" strokeWidth="4"/>
    <path d="M100 120V160" stroke="currentColor" strokeWidth="4"/>
    <rect x="85" y="95" width="30" height="10" rx="2" fill="currentColor" opacity="0.2"/>
  </svg>
);
