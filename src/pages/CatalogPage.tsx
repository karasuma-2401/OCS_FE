import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, RefreshCw, RotateCcw, Search, Sparkles, X } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { CatalogProductCard } from '@/components/customer/CatalogProductCard';
import { ProductDetailModal } from '@/components/customer/ProductDetailModal';
import { Combobox, SkeletonLoading } from '@/components/shared';
import {
  CATEGORY_NAMES,
  CATEGORY_SEED_MAP,
  getCategoryNameById,
  getPublicProducts,
  type PagedResponse,
  type ProductSortOption,
  type PublicProduct,
} from '@/api/products';
import './CustomerPages.css';

const SIZE_OPTIONS = [
  { value: '', label: 'Tất cả size' },
  { value: 'S', label: 'Size S' },
  { value: 'M', label: 'Size M' },
  { value: 'L', label: 'Size L' },
  { value: 'XL', label: 'Size XL' },
  { value: '29', label: 'Size 29' },
  { value: '30', label: 'Size 30' },
  { value: '31', label: 'Size 31' },
  { value: '32', label: 'Size 32' },
  { value: 'FreeSize', label: 'FreeSize' },
];

const CONDITION_OPTIONS = [
  { value: '', label: 'Tất cả tình trạng' },
  { value: '95', label: 'Như mới (95%+)' },
  { value: '90', label: 'Rất tốt (90%+)' },
  { value: '80', label: 'Tốt (80%+)' },
];

const PRICE_OPTIONS = [
  { value: '', label: 'Tất cả mức giá' },
  { value: 'under-200', label: 'Dưới 200.000 đ' },
  { value: '200-500', label: '200.000 đ – 500.000 đ' },
  { value: 'over-500', label: 'Từ 500.000 đ' },
];

const SORT_OPTIONS: Array<{ value: ProductSortOption; label: string }> = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'priceAsc', label: 'Giá: thấp đến cao' },
  { value: 'priceDesc', label: 'Giá: cao đến thấp' },
];

export function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Parse parameters from URL
  const urlPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const urlQ = searchParams.get('q') || '';
  const rawCategoryParam = searchParams.get('category') || '';
  const urlSize = searchParams.get('size') || '';
  const urlCondition = searchParams.get('condition') || '';
  const urlPrice = searchParams.get('price') || '';
  const rawSortParam = searchParams.get('sort') || '';
  const selectedProductId = searchParams.get('product');

  // Normalize sort from legacy/URL values
  const urlSort: ProductSortOption =
    rawSortParam === 'price-asc' || rawSortParam === 'priceAsc'
      ? 'priceAsc'
      : rawSortParam === 'price-desc' || rawSortParam === 'priceDesc'
      ? 'priceDesc'
      : 'newest';

  // Resolve Category name and ID safely with fallback
  const resolvedCategory = useMemo(() => {
    if (!rawCategoryParam || rawCategoryParam === 'Tất cả') {
      return { name: 'Tất cả', id: undefined };
    }
    // Check if rawCategoryParam is a known name
    if (rawCategoryParam in CATEGORY_SEED_MAP) {
      return { name: rawCategoryParam, id: CATEGORY_SEED_MAP[rawCategoryParam] };
    }
    // Check if rawCategoryParam is a known GUID
    const nameByGuid = getCategoryNameById(rawCategoryParam);
    if (nameByGuid !== 'Tất cả') {
      return { name: nameByGuid, id: rawCategoryParam };
    }
    // Fallback: unknown category name or GUID falls back to "Tất cả"
    return { name: 'Tất cả', id: undefined };
  }, [rawCategoryParam]);

  // Local search input for debouncing
  const [searchInput, setSearchInput] = useState(urlQ);
  const catalogTopRef = useRef<HTMLDivElement>(null);

  // Sync search input if URL changes externally
  useEffect(() => {
    setSearchInput(urlQ);
  }, [urlQ]);

  // Debounce search input into URL query
  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = searchInput.trim();
      if (trimmed !== urlQ) {
        updateUrlParams({ q: trimmed || undefined, page: 1 });
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Catalog data state
  const [data, setData] = useState<PagedResponse<PublicProduct>>({
    items: [],
    page: 1,
    pageSize: 9,
    totalCount: 0,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadCounter, setReloadCounter] = useState(0);

  // Fetch Catalog items
  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    // Compute min/max price from filter
    let minPrice: number | undefined;
    let maxPrice: number | undefined;
    if (urlPrice === 'under-200') {
      maxPrice = 200000;
    } else if (urlPrice === '200-500') {
      minPrice = 200000;
      maxPrice = 500000;
    } else if (urlPrice === 'over-500' || urlPrice === 'over-200') {
      minPrice = urlPrice === 'over-500' ? 500000 : 200000;
    }

    const minCondition = urlCondition ? parseInt(urlCondition, 10) : undefined;

    getPublicProducts(
      {
        page: urlPage,
        pageSize: 9,
        q: urlQ || undefined,
        categoryId: resolvedCategory.id,
        size: urlSize || undefined,
        minPrice,
        maxPrice,
        minCondition,
        sort: urlSort,
      },
      controller.signal
    )
      .then((res) => {
        setData(res);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        if (err?.response?.status === 400) {
          setError('Tham số lọc không hợp lệ. Vui lòng thử xóa bộ lọc.');
        } else {
          setError('Không thể tải danh sách sản phẩm. Vui lòng kiểm tra kết nối.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [urlPage, urlQ, resolvedCategory.id, urlSize, urlCondition, urlPrice, urlSort, reloadCounter]);

  // Helper to update URL search parameters
  function updateUrlParams(updates: Record<string, string | number | undefined>) {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined || value === '' || (key === 'page' && value === 1)) {
        next.delete(key);
      } else {
        next.set(key, String(value));
      }
    }
    setSearchParams(next, { replace: true });
  }

  function handleCategoryChange(categoryName: string) {
    updateUrlParams({
      category: categoryName === 'Tất cả' ? undefined : categoryName,
      page: 1,
    });
  }

  function handleSizeChange(newSize: string) {
    updateUrlParams({ size: newSize || undefined, page: 1 });
  }

  function handleConditionChange(newCondition: string) {
    updateUrlParams({ condition: newCondition || undefined, page: 1 });
  }

  function handlePriceChange(newPrice: string) {
    updateUrlParams({ price: newPrice || undefined, page: 1 });
  }

  function handleSortChange(newSort: string) {
    updateUrlParams({ sort: newSort === 'newest' ? undefined : newSort, page: 1 });
  }

  function handlePageChange(newPage: number) {
    updateUrlParams({ page: newPage });
    catalogTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function resetFilters() {
    setSearchInput('');
    const next = new URLSearchParams();
    if (selectedProductId) {
      next.set('product', selectedProductId);
    }
    setSearchParams(next, { replace: true });
  }

  function closeDetails() {
    const next = new URLSearchParams(searchParams);
    next.delete('product');
    setSearchParams(next, { replace: true });
  }

  function handleSelectProduct(product: PublicProduct) {
    const next = new URLSearchParams(searchParams);
    next.set('product', product.id);
    setSearchParams(next, { replace: true });
  }

  const hasFilters = Boolean(urlQ || resolvedCategory.name !== 'Tất cả' || urlSize || urlCondition || urlPrice || urlSort !== 'newest');

  return (
    <div className="customer-page landing-container">
      <div className="customer-breadcrumb">
        <Link to="/">Trang chủ</Link>
        <span aria-hidden="true">/</span>
        <span>Khám phá</span>
      </div>

      <header className="customer-page__heading catalog-heading">
        <div>
          <span className="landing-eyebrow">
            <span /> THE OCS COLLECTION
          </span>
          <h1>
            Khám phá món đồ
            <br />
            <span>hợp với bạn.</span>
          </h1>
          <p>Mỗi món đồ đều có một câu chuyện. Biết đâu bạn sẽ tìm thấy điều mình yêu thích ở đây.</p>
        </div>
        <div className="customer-heading-note">
          <Sparkles size={18} aria-hidden="true" />
          <span>
            Chọn điều bạn thích.
            <br />
            Mặc theo cách của bạn.
          </span>
        </div>
      </header>

      <section className="catalog-section" aria-labelledby="catalog-title" ref={catalogTopRef}>
        <div className="customer-section-heading">
          <div>
            <span className="landing-eyebrow">THE OCS EDIT</span>
            <h2 id="catalog-title">Một chút cảm hứng cho bạn.</h2>
            <p>Chọn một danh mục hoặc tìm kiếm món đồ yêu thích.</p>
          </div>
        </div>

        <div className="catalog-categories" role="group" aria-label="Danh mục sản phẩm">
          {CATEGORY_NAMES.map((item) => (
            <button
              type="button"
              key={item}
              aria-pressed={resolvedCategory.name === item}
              className={resolvedCategory.name === item ? 'catalog-category is-active' : 'catalog-category'}
              onClick={() => handleCategoryChange(item)}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="catalog-toolbar">
          <label className="catalog-search">
            <Search size={17} aria-hidden="true" />
            <span className="sr-only">Tìm kiếm sản phẩm</span>
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Tìm kiếm theo tên sản phẩm"
            />
          </label>
          <div className="catalog-selects">
            <Combobox
              className="catalog-combobox"
              ariaLabel="Size"
              value={urlSize}
              onChange={handleSizeChange}
              options={SIZE_OPTIONS}
            />
            <Combobox
              className="catalog-combobox"
              ariaLabel="Tình trạng"
              value={urlCondition}
              onChange={handleConditionChange}
              options={CONDITION_OPTIONS}
            />
            <Combobox
              className="catalog-combobox"
              ariaLabel="Khoảng giá"
              value={urlPrice}
              onChange={handlePriceChange}
              options={PRICE_OPTIONS}
            />
            <Combobox
              className="catalog-combobox"
              ariaLabel="Sắp xếp sản phẩm"
              value={urlSort}
              onChange={handleSortChange}
              options={SORT_OPTIONS}
            />
          </div>
        </div>

        <div className="catalog-results">
          <p aria-live="polite">
            {isLoading ? 'Đang tải sản phẩm...' : `${data.totalCount} sản phẩm`}
          </p>
          {hasFilters && (
            <button type="button" onClick={resetFilters}>
              <X size={14} aria-hidden="true" /> Xóa bộ lọc
            </button>
          )}
        </div>

        {isLoading ? (
          <SkeletonLoading variant="products" count={9} label="Đang tải danh sách sản phẩm..." />
        ) : error ? (
          <div className="catalog-error-state">
            <h3>Đã có lỗi xảy ra</h3>
            <p>{error}</p>
            <button type="button" onClick={() => setReloadCounter((c) => c + 1)}>
              <RefreshCw size={14} aria-hidden="true" style={{ marginRight: 6 }} /> Thử lại
            </button>
          </div>
        ) : data.items.length > 0 ? (
          <>
            <div className="catalog-grid">
              {data.items.map((product) => (
                <CatalogProductCard
                  key={product.id}
                  product={product}
                  onSelect={handleSelectProduct}
                />
              ))}
            </div>

            {/* Thanh phân trang Server-side */}
            {data.totalPages > 1 && (
              <nav className="catalog-pagination" aria-label="Phân trang sản phẩm">
                <button
                  type="button"
                  className="catalog-pagination__button"
                  disabled={data.page <= 1}
                  onClick={() => handlePageChange(data.page - 1)}
                  aria-label="Chuyển đến trang trước"
                >
                  <ChevronLeft size={16} aria-hidden="true" /> Trước
                </button>

                <span className="catalog-pagination__info" aria-current="page">
                  Trang {data.page} / {data.totalPages}
                </span>

                <button
                  type="button"
                  className="catalog-pagination__button"
                  disabled={data.page >= data.totalPages}
                  onClick={() => handlePageChange(data.page + 1)}
                  aria-label="Chuyển đến trang tiếp theo"
                >
                  Sau <ChevronRight size={16} aria-hidden="true" />
                </button>
              </nav>
            )}
          </>
        ) : (
          <div className="catalog-empty">
            <Search size={25} aria-hidden="true" />
            <h3>Chưa tìm thấy món đồ phù hợp</h3>
            <p>Thử từ khóa hoặc bộ lọc khác nhé.</p>
            {hasFilters && (
              <button type="button" onClick={resetFilters}>
                <RotateCcw size={14} aria-hidden="true" style={{ marginRight: 6 }} /> Xóa bộ lọc
              </button>
            )}
          </div>
        )}
      </section>

      <section className="customer-cta">
        <div>
          <span className="landing-eyebrow">CÙNG OCS</span>
          <h2>Đồ đẹp cần một hành trình mới?</h2>
          <p>Khám phá cách ký gửi cùng OCS.</p>
        </div>
        <Link to="/consign" className="landing-button">
          Tìm hiểu ký gửi <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </section>

      {/* Modal chi tiết sản phẩm kết nối API Public Detail */}
      <ProductDetailModal
        productId={selectedProductId}
        onClose={closeDetails}
      />
    </div>
  );
}
