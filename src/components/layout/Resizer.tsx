import { type PointerEvent } from "react";

interface ResizerProps {
  className: string;
  ariaLabel: string;
  /** vertical = dragged left/right (panel widths), horizontal = dragged up/down (timeline height) */
  orientation: "vertical" | "horizontal";
  onResize: (clientX: number, clientY: number) => void;
  onReset: () => void;
}

/** Thin drag handle that reports pointer positions; sizing logic lives in the caller. */
export function Resizer({ className, ariaLabel, orientation, onResize, onReset }: ResizerProps) {
  const begin = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const move = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    onResize(event.clientX, event.clientY);
  };
  const end = (event: PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <div
      role="separator"
      aria-orientation={orientation}
      aria-label={ariaLabel}
      className={`resizer ${className}`}
      onPointerDown={begin}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
      onDoubleClick={onReset}
      title="Seret untuk mengubah ukuran · klik dua kali untuk reset"
    />
  );
}
