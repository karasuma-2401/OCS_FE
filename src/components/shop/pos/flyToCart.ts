import { posAudio } from './posAudio';

export interface FlyToCartOptions {
  /**
   * Source element or CSS selector from which the flying clone originates
   */
  sourceElement: HTMLElement | string;
  /**
   * Target element or CSS selector where the clone flies and lands
   */
  targetElement: HTMLElement | string;
  /**
   * Optional image URL to display inside the shrinking flyer
   */
  imageUrl?: string | null;
  /**
   * Product name for accessibility & fallback display
   */
  name?: string;
  /**
   * Callback fired precisely when the flyer reaches the cart target
   */
  onLand?: () => void;
  /**
   * Animation flight duration in milliseconds (default: 1180ms - slowed down by 0.5s)
   */
  duration?: number;
}

/**
 * Default flight duration in ms (~1.05s).
 * Flow:
 * - 0% - 18% (~190ms): Overlay popup từ ảnh trên card sản phẩm (nhanh 1.2x)
 * - 18% - 68% (~530ms): Bay lên phía trên và thu nhỏ lại (chậm 0.7x)
 * - 68% - 100% (~330ms): Bay vào giỏ hàng (tăng tốc độ, đường bay thẳng dứt khoát)
 */
export const DEFAULT_FLY_DURATION = 1050;

/**
 * Calculates a point along a quadratic Bézier curve.
 * Ensures a continuously smooth, rounded path without any sharp corners or stutter.
 */
function getQuadraticBezierPoint(
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  t: number
): { x: number; y: number } {
  const oneMinusT = 1 - t;
  return {
    x: oneMinusT * oneMinusT * p0.x + 2 * oneMinusT * t * p1.x + t * t * p2.x,
    y: oneMinusT * oneMinusT * p0.y + 2 * oneMinusT * t * p1.y + t * t * p2.y,
  };
}

/**
 * Triggers visual and auditory feedback on the cart container when an item lands.
 */
export function triggerCartLandingEffects(targetEl?: HTMLElement | null): void {
  // 1. Play auditory feedback (delightful soft chime pop)
  posAudio.playCartDrop();

  // 2. Locate till element for bounce animation
  const tillEl =
    document.getElementById('pos-cart-till') ||
    (targetEl ? (targetEl.closest('#pos-cart-till') as HTMLElement | null) || targetEl : null);

  if (tillEl) {
    tillEl.classList.remove('pos-cart-bump');
    // Force DOM reflow to allow consecutive re-animations
    void tillEl.offsetWidth;
    tillEl.classList.add('pos-cart-bump');
  }

  // 3. Bounce the shopping cart icon directly
  const iconEl =
    document.getElementById('pos-cart-icon-target') ||
    (targetEl?.id === 'pos-cart-icon-target' ? targetEl : null);

  if (iconEl) {
    iconEl.classList.remove('pos-cart-icon-bump');
    void iconEl.offsetWidth;
    iconEl.classList.add('pos-cart-icon-bump');
  }

  // 4. Spawn floating "+1 món" pill badge at cart target
  try {
    const targetAnchor =
      iconEl ||
      document.getElementById('pos-cart-target') ||
      targetEl ||
      tillEl;

    if (targetAnchor) {
      const anchorRect = targetAnchor.getBoundingClientRect();
      const badge = document.createElement('div');
      badge.className = 'pos-plus-one-pill';
      badge.innerHTML = `<span>+1 món</span>`;

      // Position fixed at target coordinates to avoid container clipping
      const badgeX = anchorRect.left + anchorRect.width / 2;
      const badgeY =
        anchorRect.height <= 48
          ? anchorRect.top
          : anchorRect.top + Math.min(30, anchorRect.height * 0.2);
      badge.style.left = `${badgeX}px`;
      badge.style.top = `${badgeY}px`;

      document.body.appendChild(badge);
      window.setTimeout(() => {
        badge.remove();
      }, 900);

      // 5. Sparkle particles effect
      const sparkle = document.createElement('div');
      sparkle.className = 'pos-sparkle-fx';
      sparkle.innerHTML = `<span style="font-size: 16px;">✨</span>`;
      sparkle.style.left = `${badgeX + 20}px`;
      sparkle.style.top = `${badgeY - 8}px`;
      document.body.appendChild(sparkle);
      window.setTimeout(() => {
        sparkle.remove();
      }, 650);
    }
  } catch {
    // Non-blocking fallback
  }
}

/**
 * Creates a shrinking clone of a product item that flies in a smooth parabolic arc
 * from its source card into the shopping cart / receipt bay.
 *
 * @returns Promise that resolves when the flight completes and the item lands
 */
export function animateFlyToCart(options: FlyToCartOptions): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      options.onLand?.();
      resolve();
      return;
    }

    const srcEl =
      typeof options.sourceElement === 'string'
        ? document.querySelector<HTMLElement>(options.sourceElement)
        : options.sourceElement;

    const tgtEl =
      typeof options.targetElement === 'string'
        ? document.querySelector<HTMLElement>(options.targetElement)
        : options.targetElement;

    // Graceful fallback if elements are not present in DOM
    if (!srcEl || !tgtEl) {
      triggerCartLandingEffects(tgtEl);
      options.onLand?.();
      resolve();
      return;
    }

    const srcRect = srcEl.getBoundingClientRect();
    const tgtRect = tgtEl.getBoundingClientRect();

    // If source element is hidden or collapsed
    if (srcRect.width === 0 || srcRect.height === 0) {
      triggerCartLandingEffects(tgtEl);
      options.onLand?.();
      resolve();
      return;
    }

    // Target coordinates: if target element is compact (e.g. icon <= 48px), target exact center
    let targetX = tgtRect.left + tgtRect.width / 2;
    let targetY =
      tgtRect.height <= 48
        ? tgtRect.top + tgtRect.height / 2
        : tgtRect.top + Math.min(80, Math.max(30, tgtRect.height * 0.25));

    // Clamp coordinates within visible viewport boundaries
    if (targetY < 20) targetY = 30;
    if (targetY > window.innerHeight - 30) targetY = window.innerHeight - 50;
    if (targetX < 20) targetX = 30;
    if (targetX > window.innerWidth - 20) targetX = window.innerWidth - 50;

    // Initial flyer dimensions match the exact card image overlay
    const flyerW = srcRect.width;
    const flyerH = srcRect.height;

    // Create flying element clone starting as an exact overlay of the card image
    const flyer = document.createElement('div');
    flyer.className = 'pos-flyer-clone';
    flyer.setAttribute('aria-hidden', 'true');
    flyer.style.width = `${flyerW}px`;
    flyer.style.height = `${flyerH}px`;
    flyer.style.borderRadius = '8px';

    if (options.imageUrl) {
      const img = document.createElement('img');
      img.src = options.imageUrl;
      img.alt = options.name || 'Sản phẩm';
      img.onerror = () => {
        img.remove();
        flyer.innerHTML = `<span style="font-size: 26px;">🛍️</span>`;
      };
      flyer.appendChild(img);
    } else {
      flyer.innerHTML = `<span style="font-size: 26px;">🛍️</span>`;
    }

    document.body.appendChild(flyer);

    const startCenterX = srcRect.left + flyerW / 2;
    const startCenterY = srcRect.top + flyerH / 2;

    const dx = targetX - startCenterX;

    // Đường cong Bézier bậc hai mềm mại, bo tròn liên tục khử hoàn toàn góc gập và độ khựng
    const arcHeight = Math.max(35, Math.min(70, Math.abs(dx) * 0.12 + 20));
    const startPoint = { x: startCenterX, y: startCenterY };
    const controlPoint = {
      x: startCenterX + dx * 0.45,
      y: Math.min(startCenterY, targetY) - arcHeight,
    };
    const targetPoint = { x: targetX, y: targetY };

    // 10 mốc chuyển động được nội suy dọc theo đường cong Bézier bậc hai:
    // - 0% - 16%: Popup lớp overlay từ card (nhanh 1.2x, nhấc bổng 3D)
    // - 16% - 68%: Bay lượn và thu nhỏ chậm rãi qua đỉnh vòng cung mềm mại (chậm 0.7x, bo tròn nhẹ nhàng)
    // - 68% - 100%: Tăng tốc độ, lao thẳng dứt khoát vào giỏ hàng
    const trajectoryStages = [
      { u: 0.00, p: 0.00, scale: 1.00, opacity: 1.00, rot: 0,   lift: 0,  br: '8px',  shadow: '0 0 0 0 rgba(0,0,0,0)', border: '2px solid transparent' },
      { u: 0.08, p: 0.03, scale: 1.07, opacity: 1.00, rot: 0.5, lift: 8,  br: '11px', shadow: '0 10px 22px -2px rgba(141,83,108,0.32)', border: '2px solid #FA9BBF' },
      { u: 0.16, p: 0.08, scale: 1.10, opacity: 1.00, rot: 1.0, lift: 14, br: '14px', shadow: '0 18px 32px -4px rgba(141,83,108,0.42)', border: '2.5px solid #FA9BBF' },
      { u: 0.28, p: 0.18, scale: 1.00, opacity: 0.99, rot: 1.6, lift: 9,  br: '15px', shadow: '0 16px 28px rgba(141,83,108,0.38)', border: '2.5px solid #FA9BBF' },
      { u: 0.42, p: 0.32, scale: 0.84, opacity: 0.99, rot: 2.2, lift: 4,  br: '16px', shadow: '0 14px 24px rgba(141,83,108,0.34)', border: '2.5px solid #FA9BBF' },
      { u: 0.56, p: 0.48, scale: 0.68, opacity: 0.98, rot: 2.6, lift: 0,  br: '17px', shadow: '0 12px 20px rgba(141,83,108,0.3)', border: '2.5px solid #FA9BBF' },
      { u: 0.68, p: 0.62, scale: 0.52, opacity: 0.98, rot: 2.4, lift: 0,  br: '18px', shadow: '0 10px 18px rgba(141,83,108,0.28)', border: '2.5px solid #FA9BBF' },
      { u: 0.80, p: 0.77, scale: 0.36, opacity: 0.95, rot: 1.8, lift: 0,  br: '18px', shadow: '0 8px 14px rgba(141,83,108,0.24)', border: '2.5px solid #FA9BBF' },
      { u: 0.91, p: 0.90, scale: 0.20, opacity: 0.85, rot: 1.0, lift: 0,  br: '20px', shadow: '0 4px 8px rgba(141,83,108,0.18)', border: '1.5px solid #FA9BBF' },
      { u: 1.00, p: 1.00, scale: 0.04, opacity: 0.00, rot: 0.0, lift: 0,  br: '20px', shadow: 'none', border: '1px solid transparent' },
    ];

    const keyframes: Keyframe[] = trajectoryStages.map((st) => {
      const pt = getQuadraticBezierPoint(startPoint, controlPoint, targetPoint, st.p);
      return {
        transform: `translate3d(${pt.x - flyerW / 2}px, ${pt.y - flyerH / 2 - st.lift}px, 0) scale(${st.scale}) rotate(${st.rot}deg)`,
        opacity: st.opacity,
        borderRadius: st.br,
        border: st.border,
        boxShadow: st.shadow,
        offset: st.u,
      };
    });

    const duration = options.duration ?? DEFAULT_FLY_DURATION;

    // Check if element.animate is available
    if (typeof flyer.animate === 'function') {
      const anim = flyer.animate(keyframes, {
        duration,
        easing: 'ease-in-out',
        fill: 'forwards',
      });

      const onFinish = () => {
        flyer.remove();
        triggerCartLandingEffects(tgtEl);
        options.onLand?.();
        resolve();
      };

      anim.onfinish = onFinish;
      anim.oncancel = () => {
        flyer.remove();
        resolve();
      };
    } else {
      // Fallback for older environments without Web Animations API
      window.setTimeout(() => {
        flyer.remove();
        triggerCartLandingEffects(tgtEl);
        options.onLand?.();
        resolve();
      }, duration);
    }
  });
}
