import { ArrowUpRight, Shirt } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatVndPrice, type PublicProduct } from '@/api/products';

export interface CatalogProductCardProps {
  product: PublicProduct;
}

export function CatalogProductCard({ product }: CatalogProductCardProps) {
  return (
    <article className="product-card">
      <Link
        className="product-card__link"
        to={`/catalog?product=${encodeURIComponent(product.id)}`}
        aria-label={`Xem chi tiết ${product.name}`}
      >
        <div className="product-card__image">
          {product.coverImageUrl ? (
            <img src={product.coverImageUrl} alt={product.name} loading="lazy" decoding="async" />
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
