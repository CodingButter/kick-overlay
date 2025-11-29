"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex w-full touch-none select-none items-center",
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track
      style={{
        backgroundColor: '#475569',
        height: '10px',
        borderRadius: '9999px',
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <SliderPrimitive.Range
        style={{
          backgroundColor: '#22c55e',
          height: '100%',
          position: 'absolute',
          borderRadius: '9999px',
        }}
      />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb
      style={{
        backgroundColor: '#22c55e',
        width: '22px',
        height: '22px',
        borderRadius: '9999px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
        cursor: 'grab',
        border: '2px solid #ffffff',
      }}
      className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
    />
  </SliderPrimitive.Root>
))
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
