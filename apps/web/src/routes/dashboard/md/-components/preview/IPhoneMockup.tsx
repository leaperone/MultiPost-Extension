'use client'

import type { HTMLAttributes, ReactNode } from 'react'
import { useCallback, useLayoutEffect, useRef, useState } from 'react'

const SCREEN_WIDTH = 375
const BORDER = 20
const PHONE_WIDTH = SCREEN_WIDTH + BORDER * 2
const MIN_PHONE_HEIGHT = 650
const MAX_PHONE_HEIGHT = 850
const OUTER_RADIUS = 70
const OUTER_LEFT = 2
const OUTER_RIGHT = PHONE_WIDTH - 3
const SCREEN_X = BORDER
const SCREEN_Y = BORDER
const SCREEN_RADIUS = OUTER_RADIUS - BORDER
const INNER_OFFSET = 4
const INNER_RADIUS = 67
const INNER_LEFT = OUTER_LEFT + INNER_OFFSET
const INNER_RIGHT = OUTER_RIGHT - INNER_OFFSET
const INNER_TOP = INNER_OFFSET
const POWER_BUTTON_LEFT = PHONE_WIDTH - 3
const NOTCH_WIDTH = 100
const NOTCH_HEIGHT = 30
const NOTCH_Y = 28
const NOTCH_RADIUS = NOTCH_HEIGHT / 2
const NOTCH_X = (PHONE_WIDTH - NOTCH_WIDTH) / 2
const CAMERA_RADIUS_OUTER = 8
const CAMERA_RADIUS_INNER = 4
const CAMERA_Y = NOTCH_Y + NOTCH_HEIGHT / 2
const CAMERA_X = NOTCH_X + NOTCH_WIDTH - 24
const TOP_BAR_WIDTH = 80
const TOP_BAR_X = (PHONE_WIDTH - TOP_BAR_WIDTH) / 2
const BEZIER = 0.552

function generateOuterPath(height: number): string {
  const r = OUTER_RADIUS
  const c = r * BEZIER
  const l = OUTER_LEFT
  const right = OUTER_RIGHT
  const bottom = height
  return `M${l} ${r}C${l} ${r - c} ${l + r - c} 0 ${l + r} 0H${right - r}C${right - r + c} 0 ${right} ${r - c} ${right} ${r}V${bottom - r}C${right} ${bottom - r + c} ${right - r + c} ${bottom} ${right - r} ${bottom}H${l + r}C${l + r - c} ${bottom} ${l} ${bottom - r + c} ${l} ${bottom - r}V${r}Z`
}

function generateInnerPath(height: number): string {
  const r = INNER_RADIUS
  const c = r * BEZIER
  const l = INNER_LEFT
  const right = INNER_RIGHT
  const t = INNER_TOP
  const bottom = height - INNER_OFFSET
  return `M${l} ${t + r}C${l} ${t + r - c} ${l + r - c} ${t} ${l + r} ${t}H${right - r}C${right - r + c} ${t} ${right} ${t + r - c} ${right} ${t + r}V${bottom - r}C${right} ${bottom - r + c} ${right - r + c} ${bottom} ${right - r} ${bottom}H${l + r}C${l + r - c} ${bottom} ${l} ${bottom - r + c} ${l} ${bottom - r}V${t + r}Z`
}

function generateScreenPath(screenHeight: number): string {
  const r = SCREEN_RADIUS
  const c = r * BEZIER
  const l = SCREEN_X
  const right = SCREEN_X + SCREEN_WIDTH
  const t = SCREEN_Y
  const bottom = SCREEN_Y + screenHeight
  return `M${l} ${t + r}C${l} ${t + r - c} ${l + r - c} ${t} ${l + r} ${t}H${right - r}C${right - r + c} ${t} ${right} ${t + r - c} ${right} ${t + r}V${bottom - r}C${right} ${bottom - r + c} ${right - r + c} ${bottom} ${right - r} ${bottom}H${l + r}C${l + r - c} ${bottom} ${l} ${bottom - r + c} ${l} ${bottom - r}V${t + r}Z`
}

function generateNotchPath(): string {
  const l = NOTCH_X
  const r = NOTCH_X + NOTCH_WIDTH
  const t = NOTCH_Y
  const b = NOTCH_Y + NOTCH_HEIGHT
  const radius = NOTCH_RADIUS
  const c = radius * BEZIER
  return `M${l} ${t + radius}C${l} ${t + radius - c} ${l + radius - c} ${t} ${l + radius} ${t}H${r - radius}C${r - radius + c} ${t} ${r} ${t + radius - c} ${r} ${t + radius}V${b - radius}C${r} ${b - radius + c} ${r - radius + c} ${b} ${r - radius} ${b}H${l + radius}C${l + radius - c} ${b} ${l} ${b - radius + c} ${l} ${b - radius}V${t + radius}Z`
}

export interface IPhoneProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode
}

export function Phone({ children, className = '', style, ...props }: IPhoneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [phoneHeight, setPhoneHeight] = useState(MAX_PHONE_HEIGHT)

  const updateHeight = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    const parent = container.parentElement
    if (!parent) return
    const availableHeight = parent.clientHeight - 20
    setPhoneHeight(Math.min(Math.max(availableHeight, MIN_PHONE_HEIGHT), MAX_PHONE_HEIGHT))
  }, [])

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return
    updateHeight()
    const observer = new ResizeObserver(updateHeight)
    if (container.parentElement) observer.observe(container.parentElement)
    return () => observer.disconnect()
  }, [updateHeight])

  const screenHeight = phoneHeight - BORDER * 2
  const LEFT_PCT = (SCREEN_X / PHONE_WIDTH) * 100
  const TOP_PCT = (SCREEN_Y / phoneHeight) * 100
  const WIDTH_PCT = (SCREEN_WIDTH / PHONE_WIDTH) * 100
  const HEIGHT_PCT = (screenHeight / phoneHeight) * 100
  const RADIUS_H = (SCREEN_RADIUS / SCREEN_WIDTH) * 100
  const RADIUS_V = (SCREEN_RADIUS / screenHeight) * 100

  const outerPath = generateOuterPath(phoneHeight)
  const innerPath = generateInnerPath(phoneHeight)
  const screenPath = generateScreenPath(screenHeight)
  const notchPath = generateNotchPath()

  return (
    <div
      ref={containerRef}
      className={`relative block overflow-hidden align-middle leading-none ${className}`}
      style={{ width: PHONE_WIDTH, height: phoneHeight, minHeight: MIN_PHONE_HEIGHT, maxHeight: MAX_PHONE_HEIGHT, ...style }}
      {...props}
    >
      {children && (
        <div
          className="absolute z-0 overflow-hidden bg-white dark:bg-[#262626]"
          style={{
            left: `${LEFT_PCT}%`,
            top: `${TOP_PCT}%`,
            width: `${WIDTH_PCT}%`,
            height: `${HEIGHT_PCT}%`,
            borderRadius: `${RADIUS_H}% / ${RADIUS_V}%`,
          }}
        >
          {children}
        </div>
      )}

      <svg
        viewBox={`0 0 ${PHONE_WIDTH} ${phoneHeight}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="pointer-events-none absolute inset-0 size-full"
        style={{ transform: 'translateZ(0)' }}
      >
        <g mask="url(#screenPunch)">
          <path d={outerPath} className="fill-[#E5E5E5] dark:fill-[#404040]" />
          <path d="M0 171C0 170.448 0.447715 170 1 170H3V204H1C0.447715 204 0 203.552 0 203V171Z" className="fill-[#E5E5E5] dark:fill-[#404040]" />
          <path d="M1 234C1 233.448 1.44772 233 2 233H3.5V300H2C1.44772 300 1 299.552 1 299V234Z" className="fill-[#E5E5E5] dark:fill-[#404040]" />
          <path d="M1 319C1 318.448 1.44772 318 2 318H3.5V385H2C1.44772 385 1 384.552 1 384V319Z" className="fill-[#E5E5E5] dark:fill-[#404040]" />
          <path d={`M${POWER_BUTTON_LEFT} 279H${POWER_BUTTON_LEFT + 2}C${POWER_BUTTON_LEFT + 2.552} 279 ${PHONE_WIDTH} 279.448 ${PHONE_WIDTH} 280V384C${PHONE_WIDTH} 384.552 ${POWER_BUTTON_LEFT + 2.552} 385 ${POWER_BUTTON_LEFT + 2} 385H${POWER_BUTTON_LEFT}V279Z`} className="fill-[#E5E5E5] dark:fill-[#404040]" />
          <path d={innerPath} className="fill-white dark:fill-[#262626]" />
        </g>
        <path opacity="0.5" d={`M${TOP_BAR_X} 5H${TOP_BAR_X + TOP_BAR_WIDTH}V5.5C${TOP_BAR_X + TOP_BAR_WIDTH} 6.60457 ${TOP_BAR_X + TOP_BAR_WIDTH - 0.895} 7.5 ${TOP_BAR_X + TOP_BAR_WIDTH - 2} 7.5H${TOP_BAR_X + 2}C${TOP_BAR_X + 0.895} 7.5 ${TOP_BAR_X} 6.60457 ${TOP_BAR_X} 5.5V5Z`} className="fill-[#E5E5E5] dark:fill-[#404040]" />
        <path d={screenPath} className="fill-[#E5E5E5] stroke-[#E5E5E5] dark:fill-[#404040] dark:stroke-[#404040]" strokeWidth="0.5" mask="url(#screenPunch)" />
        <path d={notchPath} className="fill-[#F5F5F5] dark:fill-[#262626]" />
        <circle cx={CAMERA_X} cy={CAMERA_Y} r={CAMERA_RADIUS_OUTER} className="fill-[#F5F5F5] dark:fill-[#262626]" />
        <circle cx={CAMERA_X} cy={CAMERA_Y} r={CAMERA_RADIUS_INNER} className="fill-[#E5E5E5] dark:fill-[#404040]" />
        <defs>
          <mask id="screenPunch" maskUnits="userSpaceOnUse">
            <rect x="0" y="0" width={PHONE_WIDTH} height={phoneHeight} fill="white" />
            <rect x={SCREEN_X} y={SCREEN_Y} width={SCREEN_WIDTH} height={screenHeight} rx={SCREEN_RADIUS} ry={SCREEN_RADIUS} fill="black" />
          </mask>
        </defs>
      </svg>
    </div>
  )
}
