import type { ReactNode } from 'react';

export interface ShopBackgroundProps {
  children: ReactNode;
  className?: string;
}

/**
 * Background theo Figma:
 * Hồng pastel -> Tím lavender -> Xanh baby
 * hiệu ứng loang mềm thay vì linear gradient phẳng
 */
export function ShopBackground({
  children,
  className = '',
}: ShopBackgroundProps) {
  return (
    <div
      className={`min-h-screen transition-colors ${className}`}
      style={{
        background: `
    radial-gradient(
      circle at 10% 15%,
      rgba(221, 196, 253, 0.95) 0%,
      rgba(221, 196, 253, 0) 45%
    ),

    radial-gradient(
      circle at 45% 25%,
      rgba(249, 190, 218, 0.9) 0%,
      rgba(249, 190, 218, 0) 50%
    ),

    radial-gradient(
      circle at 95% 95%,
      rgba(145, 208, 255, 0.95) 0%,
      rgba(145, 208, 255, 0) 50%
    ),

    linear-gradient(
      135deg,
      #e9d7ff 0%,
      #f8d5e8 52%,
      #cfeeff 100%
    )
  `,
      }}
    >
      {children}
    </div>
  );
}

export default ShopBackground;