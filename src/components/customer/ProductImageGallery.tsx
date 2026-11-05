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
  const thumbnails = useRef<Array<HTMLButtonElement | null>>([]);
  const index = Math.min(activeIndex, Math.max(images.length - 1, 0));
  const active = images[index];
  if (!active) return null;

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

  return (
    <div className="product-gallery" role="group" aria-label={`Ảnh sản phẩm ${productName}`}>
      <div className="product-gallery__main">
        <img src={active.src} alt={`${productName} - ${active.label}`} />
        {images.length > 1 && <>
          <button type="button" className="product-gallery__nav product-gallery__nav--previous" onClick={() => goTo(index - 1)} aria-label="Ảnh trước"><ChevronLeft size={18} aria-hidden="true" /></button>
          <button type="button" className="product-gallery__nav product-gallery__nav--next" onClick={() => goTo(index + 1)} aria-label="Ảnh tiếp theo"><ChevronRight size={18} aria-hidden="true" /></button>
          <span className="product-gallery__count" aria-hidden="true">{index + 1} / {images.length}</span>
        </>}
      </div>
      <p className="sr-only" aria-live="polite">{active.label}, ảnh {index + 1} trên {images.length}</p>
      {images.length > 1 && <div className="product-gallery__thumbnails" role="group" aria-label="Chọn góc ảnh sản phẩm" onKeyDown={handleThumbnailKey}>
        {images.map((image, i) => <button
          key={`${image.src}-${i}`}
          ref={(node) => { thumbnails.current[i] = node; }}
          type="button"
          aria-label={`Xem ${image.label.toLocaleLowerCase('vi-VN')}`}
          aria-pressed={index === i}
          className="product-gallery__thumbnail"
          onClick={() => goTo(i)}
        ><img src={image.src} alt="" loading="lazy" /></button>)}
      </div>}
    </div>
  );
}
