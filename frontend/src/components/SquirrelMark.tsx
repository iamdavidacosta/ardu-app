type SquirrelMarkProps = { size?: number; title?: string }

export function SquirrelMark({ size = 28, title = 'ARDU' }: SquirrelMarkProps) {
  return (
    <svg className="squirrel-mark" width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={title}>
      <path d="M19 39c-9-2-12-9-9-16 2-5 7-8 12-7-2-7 2-12 8-13 7-1 12 4 11 11 8-2 15 3 15 11 0 8-6 14-15 14H19Z" fill="currentColor" opacity=".22" />
      <path d="M25 25c-5-3-5-10-1-14 3-3 8-3 11 0l-2 7c-2 2-5 4-8 7Zm18-1c8-3 13 1 13 7 0 5-4 9-10 9h-8c-3 0-5 2-5 5 0 3 3 5 7 5h12" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="40" cy="27" r="2" fill="currentColor" />
      <path d="M28 39c4 4 10 5 15 2M20 49c-3 4-2 8 2 10" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  )
}
