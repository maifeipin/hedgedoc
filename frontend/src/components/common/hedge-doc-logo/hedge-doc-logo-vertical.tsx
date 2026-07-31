/*
 * SPDX-FileCopyrightText: 2026 The HDNote developers
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { LogoSize } from './logo-size'
import React from 'react'

interface HedgeDocLogoVerticalProps {
  autoTextColor?: boolean
  size?: LogoSize | number
}

export const HedgeDocLogoVertical: React.FC<HedgeDocLogoVerticalProps> = ({
  size = LogoSize.MEDIUM
}) => {
  return (
    <svg
      height={`${size}px`}
      style={{ height: `${size}px`, width: 'auto' }}
      viewBox='0 0 300 240'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'>
      <defs>
        <linearGradient id='hdTechGradV' x1='0%' y1='0%' x2='100%' y2='100%'>
          <stop offset='0%' stopColor='#38bdf8' />
          <stop offset='50%' stopColor='#2563eb' />
          <stop offset='100%' stopColor='#8b5cf6' />
        </linearGradient>

        <linearGradient id='hdGlowGradV' x1='0%' y1='0%' x2='100%' y2='0%'>
          <stop offset='0%' stopColor='#00f2fe' />
          <stop offset='100%' stopColor='#4facfe' />
        </linearGradient>

        <filter id='hdGlowFilterV' x='-20%' y='-20%' width='140%' height='140%'>
          <feGaussianBlur stdDeviation='3' result='blur' />
          <feComposite in='SourceGraphic' in2='blur' operator='over' />
        </filter>
      </defs>

      {/* Large Center Futuristic Tech Hexagon Emblem */}
      <g transform='translate(90, 5)'>
        <polygon
          points='60,5 115,35 115,95 60,125 5,95 5,35'
          fill='#0f172a'
          stroke='url(#hdTechGradV)'
          strokeWidth='5'
          strokeLinejoin='round'
        />
        <polygon
          points='60,16 104,41 104,89 60,114 16,89 16,41'
          fill='none'
          stroke='url(#hdTechGradV)'
          strokeWidth='1.5'
          strokeOpacity='0.4'
          strokeDasharray='5 3'
        />

        {/* Monogram 'H' */}
        <path
          d='M36 43 V87 M36 65 H58 M58 43 V87'
          stroke='url(#hdGlowGradV)'
          strokeWidth='7.5'
          strokeLinecap='round'
          strokeLinejoin='round'
          filter='url(#hdGlowFilterV)'
        />

        {/* Monogram 'D' */}
        <path
          d='M68 43 H80 C92 43, 98 53, 98 65 C98 77, 92 87, 80 87 H68 V43 Z'
          stroke='url(#hdGlowGradV)'
          strokeWidth='7.5'
          strokeLinecap='round'
          strokeLinejoin='round'
          fill='none'
          filter='url(#hdGlowFilterV)'
        />

        {/* Laser Accent Dot */}
        <circle cx='90' cy='35' r='4.5' fill='#38bdf8' />
      </g>

      {/* Main Title 'HDNote' */}
      <g transform='translate(150, 185)'>
        <text
          textAnchor='middle'
          fontFamily='-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          fontWeight='900'
          fontSize='46'
          letterSpacing='-0.5px'>
          <tspan fill='url(#hdGlowGradV)'>HD</tspan>
          <tspan fill='#f8fafc'>Note</tspan>
        </text>

        {/* Subtitle / Tech Tagline */}
        <text
          y='26'
          textAnchor='middle'
          fontFamily='-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          fontWeight='600'
          fontSize='12'
          letterSpacing='4px'
          fill='#94a3b8'>
          HYPER DIGITAL NOTE
        </text>
      </g>
    </svg>
  )
}
