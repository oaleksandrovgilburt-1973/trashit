/**
 * CreditCoin — SVG coin icons for TRASHit credits
 *
 * StandardCoin  — green (#388E3C) circle with white trash bin + "TRASHit"
 * RecyclingCoin — dark green (#1B5E20) circle with white "T" + green leaves + "CREDIT"
 */

interface CoinProps {
  size?: number;
  className?: string;
}

export function StandardCoin({ size = 32, className = "" }: CoinProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Coin body */}
      <circle cx="20" cy="20" r="19" fill="#388E3C" stroke="#2E7D32" strokeWidth="1.5" />
      {/* Inner ring */}
      <circle cx="20" cy="20" r="16" fill="none" stroke="#4CAF50" strokeWidth="0.8" opacity="0.5" />

      {/* Trash bin icon (white) */}
      {/* Lid */}
      <rect x="13" y="11" width="14" height="2.5" rx="1.2" fill="white" />
      {/* Handle on lid */}
      <rect x="17.5" y="9.5" width="5" height="2" rx="1" fill="white" />
      {/* Body */}
      <rect x="14.5" y="14.5" width="11" height="11" rx="1.5" fill="white" />
      {/* Lines inside bin */}
      <rect x="17.5" y="16.5" width="1.2" height="7" rx="0.6" fill="#388E3C" />
      <rect x="21.3" y="16.5" width="1.2" height="7" rx="0.6" fill="#388E3C" />

      {/* "TRASHit" label */}
      <text
        x="20"
        y="30.5"
        textAnchor="middle"
        fill="white"
        fontSize="4.2"
        fontWeight="700"
        fontFamily="Arial, sans-serif"
        letterSpacing="0.3"
      >
        TRASHit
      </text>
    </svg>
  );
}

export function RecyclingCoin({ size = 32, className = "" }: CoinProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Coin body */}
      <circle cx="20" cy="20" r="19" fill="#1B5E20" stroke="#145214" strokeWidth="1.5" />
      {/* Inner ring */}
      <circle cx="20" cy="20" r="16" fill="none" stroke="#2E7D32" strokeWidth="0.8" opacity="0.5" />

      {/* Big "T" letter (white) */}
      <rect x="13" y="10" width="14" height="3" rx="1.2" fill="white" />
      <rect x="18.5" y="13" width="3" height="12" rx="1.2" fill="white" />

      {/* Small green leaves */}
      {/* Left leaf */}
      <ellipse cx="14.5" cy="26.5" rx="2.5" ry="1.3" fill="#4CAF50" transform="rotate(-30 14.5 26.5)" />
      {/* Right leaf */}
      <ellipse cx="25.5" cy="26.5" rx="2.5" ry="1.3" fill="#4CAF50" transform="rotate(30 25.5 26.5)" />
      {/* Center leaf */}
      <ellipse cx="20" cy="27" rx="2" ry="1.2" fill="#66BB6A" />

      {/* "CREDIT" label */}
      <text
        x="20"
        y="35"
        textAnchor="middle"
        fill="white"
        fontSize="4"
        fontWeight="700"
        fontFamily="Arial, sans-serif"
        letterSpacing="0.5"
      >
        CREDIT
      </text>
    </svg>
  );
}

/**
 * CreditDisplay — shows credit count with the appropriate coin icon
 */
export function CreditDisplay({
  amount,
  type = "standard",
  size = 20,
  className = "",
  showLabel = true,
}: {
  amount: number | string;
  type?: "standard" | "recycling";
  size?: number;
  className?: string;
  showLabel?: boolean;
}) {
  const count = typeof amount === "string" ? parseFloat(amount) : amount;
  const displayCount = Number.isInteger(count) ? count : count.toFixed(2);

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      {type === "standard" ? (
        <StandardCoin size={size} />
      ) : (
        <RecyclingCoin size={size} />
      )}
      <span className="font-bold">{displayCount}</span>
      {showLabel && (
        <span className="text-xs opacity-75">
          {type === "standard" ? "кредита" : "рециклиращи"}
        </span>
      )}
    </span>
  );
}
