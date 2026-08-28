export function CornerSquares({ className = 'bg-line-strong' }: { className?: string }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <span className={`absolute -top-[3px] -left-[3px] size-1.5 ${className}`} />
      <span className={`absolute -top-[3px] -right-[3px] size-1.5 ${className}`} />
      <span className={`absolute -bottom-[3px] -left-[3px] size-1.5 ${className}`} />
      <span className={`absolute -bottom-[3px] -right-[3px] size-1.5 ${className}`} />
    </div>
  );
}
