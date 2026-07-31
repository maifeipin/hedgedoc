/*
 * SPDX-FileCopyrightText: 2026 The HDNote developers
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { LogoSize } from './logo-size'
import React from 'react'

interface HedgeDocLogoHorizontalGreyProps {
  color: 'dark' | 'light'
  size?: LogoSize | number
  showText?: boolean
  width?: string | number
  className?: string
}

export const HedgeDocLogoHorizontalGrey: React.FC<HedgeDocLogoHorizontalGreyProps> = ({
  color,
  size = LogoSize.MEDIUM,
  showText = true,
  className
}) => {
  const isDark = color === 'dark'
  const textColor = isDark ? '#f8fafc' : '#0f172a'
  const subTextColor = isDark ? '#94a3b8' : '#475569'

  return (
    <svg
      height={`${size}px`}
      style={{
        height: `${size}px`,
        width: showText ? 'auto' : `${size}px`,
        minWidth: showText ? '120px' : `${size}px`
      }}
      viewBox={showText ? '0 0 320 100' : '0 0 100 100'}
      className={className}
      fill='none'
      xmlns='http://www.w3.org/2000/svg'>
      <defs>
        <linearGradient id='hdTechGradH' x1='0%' y1='0%' x2='100%' y2='100%'>
          <stop offset='0%' stopColor='#38bdf8' />
          <stop offset='50%' stopColor='#2563eb' />
          <stop offset='100%' stopColor='#8b5cf6' />
        </linearGradient>

        <linearGradient id='hdGlowGradH' x1='0%' y1='0%' x2='100%' y2='0%'>
          <stop offset='0%' stopColor='#00f2fe' />
          <stop offset='100%' stopColor='#4facfe' />
        </linearGradient>

        <filter id='hdGlowFilterH' x='-20%' y='-20%' width='140%' height='140%'>
          <feGaussianBlur stdDeviation='2.5' result='blur' />
          <feComposite in='SourceGraphic' in2='blur' operator='over' />
        </filter>
      </defs>

      {/* Futuristic Emblem Icon */}
      <g transform='translate(5, 5)'>
        {/* Outer Tech Hexagon Chassis */}
        <polygon
          points='45,5 85,27.5 85,72.5 45,95 5,72.5 5,27.5'
          fill={isDark ? '#0f172a' : '#f1f5f9'}
          stroke='url(#hdTechGradH)'
          strokeWidth='4'
          strokeLinejoin='round'
        />
        {/* Inner Tech Circuit Lines */}
        <polygon
          points='45,14 77,32 77,68 45,86 13,68 13,32'
          fill='none'
          stroke='url(#hdTechGradH)'
          strokeWidth='1.2'
          strokeOpacity='0.4'
          strokeDasharray='4 2'
        />

        {/* Monogram 'H' */}
        <path
          d='M27 33 V67 M27 50 H43 M43 33 V67'
          stroke='url(#hdGlowGradH)'
          strokeWidth='6'
          strokeLinecap='round'
          strokeLinejoin='round'
          filter='url(#hdGlowFilterH)'
        />

        {/* Monogram 'D' */}
        <path
          d='M51 33 H60 C69 33, 74 41, 74 50 C74 59, 69 67, 60 67 H51 V33 Z'
          stroke='url(#hdGlowGradH)'
          strokeWidth='6'
          strokeLinecap='round'
          strokeLinejoin='round'
          fill='none'
          filter='url(#hdGlowFilterH)'
        />

        {/* Laser Note Accent Dot */}
        <circle cx='68' cy='27' r='3.5' fill='#38bdf8' />
      </g>

      {/* Brand Text 'HDNote' */}
      {showText && (
        <g transform='translate(108, 62)'>
          <text
            fontFamily='-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif'
            fontWeight='900'
            fontSize='42'
            letterSpacing='-0.5px'>
            <tspan fill='url(#hdGlowGradH)'>HD</tspan>
            <tspan fill={textColor}>Note</tspan>
          </text>

          {/* Subtitle / Tech Tagline */}
          <text
            x='2'
            y='20'
            fontFamily='-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            fontWeight='600'
            fontSize='10'
            letterSpacing='2.5px'
            fill={subTextColor}>
            HYPER DIGITAL NOTE
          </text>
        </g>
      )}
    </svg>
  )
}
