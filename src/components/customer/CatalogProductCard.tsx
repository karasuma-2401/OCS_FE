import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatCatalogPrice, type CatalogProduct } from '@/data/catalogProducts';

export function CatalogProductCard({ product }: { product: CatalogProduct }) {
  return (
    <article className="product-card">
      <Link className="product-card__link" to={`/catalog?product=${encodeURIComponent(product.code)}`} aria-label={`Xem ${product.name}`}>
        <div className="product-card__image">
          <img src={product.image} alt="" loading="lazy" decoding="async" />
          <span className="product-card__arrow" aria-hidden="true"><ArrowUpRight size={18} /></span>
        </div>
        <div className="product-card__details">
          <div className="product-card__meta"><span>{product.category}</span><span>{product.code}</span></div>
          <h3>{product.name}</h3>
          <p>Size {product.size} <span aria-hidden="true">·</span> Tình trạng {product.condition}</p>
          <div className="product-card__bottom"><strong>{formatCatalogPrice(product.price)}</strong><span className={product.status === 'Đang bán' ? 'product-status' : 'product-status product-status--muted'}>{product.status}</span></div>
        </div>
      </Link>
    </article>
  );
}
