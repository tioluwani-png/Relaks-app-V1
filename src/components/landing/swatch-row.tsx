import { RotateCcw, Undo2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Swatch } from '@/lib/landing/content'

/**
 * Swatches plus Undo/Reset. Rendered disabled on the server as a same-size placeholder,
 * then interactive once the coloring island loads (so nothing shifts).
 */
export function SwatchRow({
  palette,
  selected = 0,
  onSelect,
  onUndo,
  onReset,
  canUndo = false,
  canReset = false,
  disabled = false,
}: {
  palette: Swatch[]
  selected?: number
  onSelect?: (index: number) => void
  onUndo?: () => void
  onReset?: () => void
  canUndo?: boolean
  canReset?: boolean
  disabled?: boolean
}) {
  const iconButton =
    'flex h-11 w-11 items-center justify-center rounded-full text-gray-700 transition-colors hover:bg-relaks-tint hover:text-relaks-ink disabled:opacity-40 disabled:hover:bg-transparent'

  return (
    <div className="flex items-center gap-2">
      <div role="group" aria-label="Colours" className="grid flex-1 grid-cols-4 justify-items-center sm:grid-cols-8 lg:grid-cols-4">
        {palette.map((swatch, i) => {
          const isSelected = i === selected
          return (
            <button
              key={swatch.hex}
              type="button"
              disabled={disabled}
              // No handler on the server-rendered placeholder
              onClick={onSelect ? () => onSelect(i) : undefined}
              aria-label={swatch.name}
              aria-pressed={isSelected}
              className="flex h-11 w-11 items-center justify-center rounded-full"
            >
              <span
                className={cn(
                  'block h-8 w-8 rounded-full border border-black/10 transition-[transform,box-shadow] duration-200 ease-out',
                  isSelected && !disabled && 'scale-110'
                )}
                style={{
                  backgroundColor: swatch.hex,
                  boxShadow: isSelected && !disabled ? `0 0 0 3px #fff, 0 0 0 5px ${swatch.hex}66` : undefined,
                }}
              />
            </button>
          )
        })}
      </div>
      <div className="flex shrink-0">
        <button type="button" onClick={onUndo} disabled={disabled || !canUndo} aria-label="Undo" className={iconButton}>
          <Undo2 className="h-5 w-5" aria-hidden="true" />
        </button>
        <button type="button" onClick={onReset} disabled={disabled || !canReset} aria-label="Reset" className={iconButton}>
          <RotateCcw className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
