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
    <article className="product-card">
      <Link
        className="product-card__link"
        to={targetUrl}
        onClick={handleClick}
        aria-label={`Xem chi tiết ${product.name}`}
      >
        <div className="product-card__image">
          {!showPlaceholder ? (
            <img
              src={product.coverImageUrl!}
              alt=""
              loading="lazy"
              decoding="async"
              onError={() => setHasImageError(true)}
            />
          ) : (
            <div className="product-card__placeholder" aria-label="Sản phẩm chưa có ảnh bìa">
              <Shirt size={28} aria-hidden="true" />
              <span>Chưa có ảnh bìa</span>
            </div>
          )}
          <span className="product-card__arrow" aria-hidden="true">
            <ArrowUpRight size={18} />
          </span>
        </div>
        <div className="product-card__details">
          <div className="product-card__meta">
            <span>{product.category?.name || 'Sản phẩm'}</span>
            <span>{product.brand?.name || ''}</span>
          </div>
          <h3>{product.name}</h3>
          <p>
            Size {product.size} <span aria-hidden="true">·</span> Tình trạng {product.conditionPercentage}%
          </p>
          <div className="product-card__bottom">
            <strong>{formatVndPrice(product.listedPrice)}</strong>
            <span className="product-status">Đang bán</span>
          </div>
        </div>
      </Link>
    </article>
  );
}
