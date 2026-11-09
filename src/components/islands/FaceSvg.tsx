import * as React from 'react'
import {
  faceShapes,
  faceViewBox,
  frameRadius,
  MIRROR_TRANSFORM,
  paletteOf,
  shapeAttributes,
  type FaceFrame,
  type FaceSelection
} from '@/lib/face'

/**
 * Draws a selection with the same shape vocabulary the serializer uses, so the
 * preview and the copied or downloaded SVG always agree.
 */
export default function FaceSvg({
  selection,
  frame = 'rounded',
  label,
  className
}: {
  selection: FaceSelection
  frame?: FaceFrame
  /** Image label; omit for decorative previews that have a text label nearby. */
  label?: string
  className?: string
}) {
  const uid = React.useId().replace(/:/gu, '')
  const palette = paletteOf(selection)
  const radius = frameRadius(frame)
  const shapes = faceShapes(selection)

  return (
    <svg
      viewBox={faceViewBox}
      className={className}
      role='img'
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {radius > 0 && (
        <defs>
          <clipPath id={`${uid}-frame`}>
            <rect
              x={0}
              y={0}
              width={100}
              height={100}
              rx={radius}
              ry={radius}
            />
          </clipPath>
        </defs>
      )}
      <g clipPath={radius > 0 ? `url(#${uid}-frame)` : undefined}>
        {shapes.map(({ shape, mirrored }, index) => {
          const attributes = shapeAttributes(shape, palette)
          const element =
            shape.t === 'path' ? (
              <path {...attributes} />
            ) : shape.t === 'circle' ? (
              <circle {...attributes} />
            ) : shape.t === 'ellipse' ? (
              <ellipse {...attributes} />
            ) : (
              <rect {...attributes} />
            )
          return mirrored ? (
            <g key={index} transform={MIRROR_TRANSFORM}>
              {element}
            </g>
          ) : (
            <React.Fragment key={index}>{element}</React.Fragment>
          )
        })}
      </g>
    </svg>
  )
}
