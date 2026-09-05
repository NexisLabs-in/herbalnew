/** A rating, drawn.
 *
 *  The number is given to screen readers as text; the stars are decoration.
 *  Reading out "star star star half-star" helps nobody.
 */
export function Stars({ rating, size = 15 }: { rating: number; size?: number }) {
  const rounded = Math.round(rating * 2) / 2;

  return (
    <span className="stars" role="img" aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const fill = rounded >= star ? 1 : rounded >= star - 0.5 ? 0.5 : 0;
        return (
          <svg key={star} width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
            <defs>
              <linearGradient id={`half-${star}-${size}`}>
                <stop offset="50%" stopColor="currentColor" />
                <stop offset="50%" stopColor="transparent" />
              </linearGradient>
            </defs>
            <path
              d="M10 1.6l2.5 5.3 5.6.8-4.1 4 1 5.7-5-2.7-5 2.7 1-5.7-4.1-4 5.6-.8z"
              fill={fill === 1 ? "currentColor" : fill === 0.5 ? `url(#half-${star}-${size})` : "none"}
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
          </svg>
        );
      })}
    </span>
  );
}
