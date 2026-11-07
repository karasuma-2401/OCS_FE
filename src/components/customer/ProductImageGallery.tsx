import { useRef, useState, type KeyboardEvent } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface ProductGalleryImage {
  src: string;
  label: string;
}

export interface ProductImageGalleryProps {
  productName: string;
  images: ProductGalleryImage[];
}

export function ProductImageGallery({ productName, images }: ProductImageGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [brokenUrls, setBrokenUrls] = useState<Set<string>>(() => new Set());
  const thumbnails = useRef<Array<HTMLButtonElement | null>>([]);
  const index = Math.min(activeIndex, Math.max(images.length - 1, 0));
  const active = images[index];
  if (!active) return null;

  function markBroken(url: string) {
    setBrokenUrls((prev) => {
      const next = new Set(prev);
      next.add(url);
      return next;
    });
  }

  function goTo(next: number, focus = false) {
    const target = (next + images.length) % images.length;
    setActiveIndex(target);
    if (focus) thumbnails.current[target]?.focus();
  }

  function handleThumbnailKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowRight') { event.preventDefault(); goTo(index + 1, true); }
    else if (event.key === 'ArrowLeft') { event.preventDefault(); goTo(index - 1, true); }
    else if (event.key === 'Home') { event.preventDefault(); goTo(0, true); }
    else if (event.key === 'End') { event.preventDefault(); goTo(images.length - 1, true); }
  }

  const isMainBroken = brokenUrls.has(active.src);

  return (
    <div className="product-gallery" role="group" aria-label={`Ảnh sản phẩm ${productName}`}>
      <div className="product-gallery__main relative h-[clamp(190px,36vh,300px)] overflow-hidden rounded-[9px] bg-[#f2e8e9]">
        {!isMainBroken ? (
          <img
            className="absolute inset-0 h-full w-full object-contain"
            src={active.src}
            alt={`${productName} - ${active.label}`}
            onError={() => markBroken(active.src)}
          />
        ) : (
          <div className="product-gallery__placeholder flex size-full flex-col items-center justify-center gap-[.4rem] bg-[#f7f1f3] text-[.8rem] text-[#a89aa1]" aria-label="Hình ảnh không khả dụng">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/>
            </svg>
            <span>Hình ảnh không khả dụng</span>
          </div>
        )}
        {images.length > 1 && <>
          <button type="button" className={`
            product-gallery__nav absolute top-1/2 grid size-[34px] -translate-y-1/2 cursor-pointer place-items-center
            rounded-full border-0 bg-white/90 text-[#51414b] shadow-[0_2px_8px_rgba(56,37,48,.12)] hover:bg-white
            hover:text-[#a65f7a] focus-visible:outline-2 focus-visible:outline-offset-2
            focus-visible:outline-[#bd6b8a] product-gallery__nav--previous left-3
          `} onClick={() => goTo(index - 1)} aria-label="Ảnh trước"><ChevronLeft size={18} aria-hidden="true" /></button>
          <button type="button" className={`
            product-gallery__nav absolute top-1/2 grid size-[34px] -translate-y-1/2 cursor-pointer place-items-center
            rounded-full border-0 bg-white/90 text-[#51414b] shadow-[0_2px_8px_rgba(56,37,48,.12)] hover:bg-white
            hover:text-[#a65f7a] focus-visible:outline-2 focus-visible:outline-offset-2
            focus-visible:outline-[#bd6b8a] product-gallery__nav--next right-3
          `} onClick={() => goTo(index + 1)} aria-label="Ảnh tiếp theo"><ChevronRight size={18} aria-hidden="true" /></button>
          <span className="product-gallery__count absolute right-3 bottom-[.65rem] rounded-full bg-[rgba(56,37,48,.7)] px-[.55rem] py-1 text-[.68rem] text-white" aria-hidden="true">{index + 1} / {images.length}</span>
        </>}
      </div>
      <p className="sr-only" aria-live="polite">{active.label}, ảnh {index + 1} trên {images.length}</p>
      {images.length > 1 && <div className="product-gallery__thumbnails flex gap-[.65rem] overflow-x-auto px-[.2rem] pt-[.8rem] pb-[.2rem]" role="group" aria-label="Chọn góc ảnh sản phẩm" onKeyDown={handleThumbnailKey}>
        {images.map((image, i) => {
          const isThumbBroken = brokenUrls.has(image.src);
          return (
            <button
              key={`${image.src}-${i}`}
              ref={(node) => { thumbnails.current[i] = node; }}
              type="button"
              aria-label={`Xem ${image.label.toLocaleLowerCase('vi-VN')}`}
              aria-pressed={index === i}
              className={`
                product-gallery__thumbnail size-[62px] shrink-0 cursor-pointer overflow-hidden rounded-[9px] border-2
                border-transparent bg-white p-0.5 hover:border-[#e8bbc9] focus-visible:outline-2
                focus-visible:outline-offset-2 focus-visible:outline-[#bd6b8a] aria-pressed:border-[#d982a1]
                [&_img]:size-full [&_img]:rounded-[5px] [&_img]:object-cover
              `}
              onClick={() => goTo(i)}
            >
              {!isThumbBroken ? (
                <img
                  src={image.src}
                  alt=""
                  loading="lazy"
                  onError={() => markBroken(image.src)}
                />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#f5eff1', color: '#a89aa1' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/>
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>}
    </div>
  );
}
