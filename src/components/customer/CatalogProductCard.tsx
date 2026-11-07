import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Shirt } from 'lucide-react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { formatVndPrice, type PublicProduct } from '@/api/products';

export interface CatalogProductCardProps {
  product: PublicProduct;
  onSelect?: (product: PublicProduct) => void;
}

export function CatalogProductCard({ product, onSelect }: CatalogProductCardProps) {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [hasImageError, setHasImageError] = useState(false);

  useEffect(() => {
    setHasImageError(false);
  }, [product.coverImageUrl]);

  const showPlaceholder = !product.coverImageUrl || hasImageError;

  // Build target URL by keeping all existing search parameters and adding/updating `product`
  const targetUrl = useMemo(() => {
    const next = new URLSearchParams(searchParams);
    next.set('product', product.id);
    return `${location.pathname}?${next.toString()}`;
  }, [location.pathname, searchParams, product.id]);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Only intercept standard left-click without modifier keys (allow middle click or Ctrl/Cmd click to open in new tab)
    if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && e.button === 0) {
      if (onSelect) {
        e.preventDefault();
        onSelect(product);
      }
    }
  };

  return (
    <article className={`
      product-card group/product min-w-0 overflow-hidden rounded-xl border border-[#f0e9ec] bg-white p-[.55rem]
      transition-[transform,box-shadow] duration-[250ms] hover:-translate-y-[3px]
      hover:shadow-[0_12px_28px_rgba(85,60,72,.08)] max-[600px]:p-[.4rem] motion-reduce:transition-none
    `}>
      <Link
        className="product-card__link block text-inherit"
        to={targetUrl}
        onClick={handleClick}
        aria-label={`Xem chi tiết ${product.name}`}
      >
        <div className={`
          product-card__image relative aspect-[4/5] overflow-hidden rounded-lg bg-[#f0e6e8] [&_img]:block
          [&_img]:size-full [&_img]:object-cover [&_img]:transition-transform [&_img]:duration-[350ms]
          motion-reduce:[&_img]:transition-none group-hover/product:[&_img]:scale-[1.035]
        `}>
          {!showPlaceholder ? (
            <img
              src={product.coverImageUrl!}
              alt=""
              loading="lazy"
              decoding="async"
              onError={() => setHasImageError(true)}
            />
          ) : (
            <div className="product-card__placeholder flex size-full flex-col items-center justify-center gap-[.35rem] bg-[#f7f1f3] text-xs text-[#a89aa1]" aria-label="Sản phẩm chưa có ảnh bìa">
              <Shirt size={28} aria-hidden="true" />
              <span>Chưa có ảnh bìa</span>
            </div>
          )}
          <span className={`
            product-card__arrow group-hover/product:translate-x-[2px] group-hover/product:-translate-y-[2px] absolute
            right-[.8rem] bottom-[.8rem] grid size-9 place-items-center rounded-full bg-white/92 text-[#51414b]
            transition-transform duration-200 motion-reduce:transition-none
          `} aria-hidden="true">
            <ArrowUpRight size={18} />
          </span>
        </div>
        <div className={`
          product-card__details px-[.55rem] pt-4 pb-[.55rem] max-[600px]:px-1 max-[600px]:pt-[.8rem]
          max-[600px]:pb-[.35rem] [&_h3]:mt-[.55rem] [&_h3]:text-[.92rem] [&_h3]:leading-[1.4] [&_h3]:font-bold
          [&_h3]:text-[#302a32] max-[600px]:[&_h3]:text-[.8rem] [&_p]:mt-[.45rem] [&_p]:text-[.73rem]
          [&_p]:leading-normal [&_p]:text-[#9a8e95] max-[600px]:[&_p]:text-[.66rem]
        `}>
          <div className="product-card__meta flex justify-between gap-2 text-[.62rem] font-semibold tracking-[.05em] text-[#a5939d] uppercase max-[600px]:text-[.56rem]">
            <span>{product.category?.name || 'Sản phẩm'}</span>
            <span>{product.brand?.name || ''}</span>
          </div>
          <h3>{product.name}</h3>
          <p>
            Size {product.size} <span aria-hidden="true">·</span> Tình trạng {product.conditionPercentage}%
          </p>
          <div className={`
            product-card__bottom mt-[1.3rem] flex items-center justify-between gap-2 max-[600px]:mt-[.85rem]
            max-[600px]:flex-col max-[600px]:items-start max-[600px]:gap-[.3rem] [&_strong]:text-base
            [&_strong]:text-[#a95676] [&_span]:text-[.65rem] [&_span]:text-[#aaa0a6]
          `}>
            <strong>{formatVndPrice(product.listedPrice)}</strong>
            <span className="product-status shrink-0 rounded-full bg-[#edf4ee] px-2 py-[.3rem] text-[.6rem] font-bold text-[#618169]">Đang bán</span>
          </div>
        </div>
      </Link>
    </article>
  );
}
