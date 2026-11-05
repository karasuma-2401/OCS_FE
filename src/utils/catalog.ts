import type { CatalogProduct } from '@/data/catalogProducts';

export interface CatalogFilters {
  query: string;
  category: string;
  size: string;
  condition: string;
  price: string;
  sort: string;
}

export function filterCatalog(products: CatalogProduct[], { query, category, size, condition, price, sort }: CatalogFilters): CatalogProduct[] {
  const term = query.trim().toLocaleLowerCase('vi-VN');
  const filtered = products.filter((product) => {
    const matchesQuery = !term || `${product.name} ${product.category} ${product.code}`.toLocaleLowerCase('vi-VN').includes(term);
    const matchesPrice = !price || (price === 'under-200' ? product.price < 200000 : product.price >= 200000);
    return matchesQuery && (category === 'Tất cả' || product.category === category) && (!size || product.size === size) && (!condition || product.condition === condition) && matchesPrice;
  });
  if (sort === 'price-asc') return filtered.sort((a, b) => a.price - b.price);
  if (sort === 'price-desc') return filtered.sort((a, b) => b.price - a.price);
  return filtered;
}
