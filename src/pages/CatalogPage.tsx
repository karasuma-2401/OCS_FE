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
    <div className={`
      customer-page pt-8 pb-20 max-[600px]:pt-6 max-[600px]:pb-12 [&_h1]:mt-5 [&_h1]:mb-4
      [&_h1]:text-[clamp(2.8rem,5vw,5rem)] [&_h1]:leading-[1.05] [&_h1]:font-[750] [&_h1]:tracking-[-.065em]
      [&_h1]:text-[#29252d] [&_h1_span]:text-[#b97891] landing-container mx-auto
      w-[min(calc(100%_-_5rem),1320px)] max-[850px]:w-[min(calc(100%_-_2.5rem),1320px)]
    `}>
      <div className="customer-breadcrumb flex items-center gap-[.65rem] text-[.72rem] text-[#9c8e96] [&_a]:text-[#81747d] [&_a:hover]:text-[#ae6580]">
        <Link to="/">Trang chủ</Link>
        <span aria-hidden="true">/</span>
        <span>Khám phá</span>
      </div>

      <header className={`
        customer-page__heading flex items-end justify-between gap-8 pt-[4.5rem] pb-16 max-[600px]:pt-[3.25rem]
        max-[600px]:pb-11 [&>div>p]:max-w-[430px] [&>div>p]:text-[.9rem] [&>div>p]:leading-[1.8]
        [&>div>p]:text-[#817780] catalog-heading
      `}>
        <div>
          <span className="landing-eyebrow inline-flex items-center gap-2 text-[.65rem] font-bold tracking-[.13em] text-[#9b7281] [&>span]:h-0.5 [&>span]:w-6 [&>span]:bg-[#dfa0b5]">
            <span /> THE OCS COLLECTION
          </span>
          <h1>
            Khám phá món đồ
            <br />
            <span>hợp với bạn.</span>
          </h1>
          <p>Mỗi món đồ đều có một câu chuyện. Biết đâu bạn sẽ tìm thấy điều mình yêu thích ở đây.</p>
        </div>
        <div className="customer-heading-note flex items-center gap-[.85rem] border-l border-[#e6d5dc] px-[1.2rem] py-4 text-xs leading-[1.6] text-[#a37686] max-[600px]:hidden">
          <Sparkles size={18} aria-hidden="true" />
          <span>
            Chọn điều bạn thích.
            <br />
            Mặc theo cách của bạn.
          </span>
        </div>
      </header>

      <section className="catalog-section border-t border-[#ebe3e7] pt-8 pb-[4.5rem]" aria-labelledby="catalog-title" ref={catalogTopRef}>
        <div className={`
          customer-section-heading mb-[1.7rem] flex items-end justify-between gap-4 max-[600px]:flex-col
          max-[600px]:items-start [&_h2]:!mt-[.65rem] [&_h2]:!text-[clamp(1.45rem,2.3vw,2rem)]
          [&_h2]:!tracking-[-.045em] [&_h2]:text-[#302a32] [&_p]:mt-[.55rem] [&_p]:text-[.8rem]
          [&_p]:text-[#8a8087]
        `}>
          <div>
            <span className="landing-eyebrow inline-flex items-center gap-2 text-[.65rem] font-bold tracking-[.13em] text-[#9b7281] [&>span]:h-0.5 [&>span]:w-6 [&>span]:bg-[#dfa0b5]">THE OCS EDIT</span>
            <h2 id="catalog-title">Một chút cảm hứng cho bạn.</h2>
            <p>Chọn một danh mục hoặc tìm kiếm món đồ yêu thích.</p>
          </div>
        </div>

        <div className="catalog-categories mt-[1.8rem] mb-5 flex flex-wrap gap-[.55rem] max-[600px]:flex-nowrap max-[600px]:overflow-x-auto max-[600px]:pb-[.3rem]" role="group" aria-label="Danh mục sản phẩm">
          {CATEGORY_NAMES.map((item) => (
            <button
              type="button"
              key={item}
              aria-pressed={resolvedCategory.name === item}
              className={resolvedCategory.name === item ? 'catalog-category min-h-[38px] cursor-pointer rounded-full border border-[#e8dfe3] bg-transparent px-[1.05rem] py-2 text-xs font-semibold text-[#756a72] transition-[background,color,border-color] duration-200 hover:border-[#d4a4b6] hover:text-[#8e536a] max-[600px]:shrink-0 motion-reduce:transition-none [&.is-active]:border-[#3c3139] [&.is-active]:bg-[#3c3139] [&.is-active]:text-white is-active' : 'catalog-category min-h-[38px] cursor-pointer rounded-full border border-[#e8dfe3] bg-transparent px-[1.05rem] py-2 text-xs font-semibold text-[#756a72] transition-[background,color,border-color] duration-200 hover:border-[#d4a4b6] hover:text-[#8e536a] max-[600px]:shrink-0 motion-reduce:transition-none [&.is-active]:border-[#3c3139] [&.is-active]:bg-[#3c3139] [&.is-active]:text-white'}
              onClick={() => handleCategoryChange(item)}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="catalog-toolbar flex items-stretch justify-between gap-4 rounded-xl border border-[#eee6e9] bg-white p-[.85rem] max-[850px]:flex-col">
          <label className={`
            catalog-search flex min-w-40 flex-1 items-center gap-[.7rem] px-2 text-[#a18e97] focus-within:rounded
            focus-within:outline-2 focus-within:outline-offset-[3px] focus-within:outline-[#bd6b8a]
            max-[850px]:min-h-[38px] [&_input]:w-full [&_input]:min-w-0 [&_input]:border-0 [&_input]:bg-transparent
            [&_input]:text-[.78rem] [&_input]:text-[#39313a] [&_input]:outline-none
          `}>
            <Search size={17} aria-hidden="true" />
            <span className="sr-only">Tìm kiếm sản phẩm</span>
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Tìm kiếm theo tên sản phẩm"
            />
          </label>
          <div className="catalog-selects flex flex-wrap gap-2 max-[600px]:grid max-[600px]:grid-cols-2">
            <Combobox
              className="catalog-combobox w-40 min-w-0 max-[600px]:w-full max-[600px]:[&:nth-child(even)_ul]:right-0"
              ariaLabel="Size"
              value={urlSize}
              onChange={handleSizeChange}
              options={SIZE_OPTIONS}
            />
            <Combobox
              className="catalog-combobox w-40 min-w-0 max-[600px]:w-full max-[600px]:[&:nth-child(even)_ul]:right-0"
              ariaLabel="Tình trạng"
              value={urlCondition}
              onChange={handleConditionChange}
              options={CONDITION_OPTIONS}
            />
            <Combobox
              className="catalog-combobox w-40 min-w-0 max-[600px]:w-full max-[600px]:[&:nth-child(even)_ul]:right-0"
              ariaLabel="Khoảng giá"
              value={urlPrice}
              onChange={handlePriceChange}
              options={PRICE_OPTIONS}
            />
            <Combobox
              className="catalog-combobox w-40 min-w-0 max-[600px]:w-full max-[600px]:[&:nth-child(even)_ul]:right-0"
              ariaLabel="Sắp xếp sản phẩm"
              value={urlSort}
              onChange={handleSortChange}
              options={SORT_OPTIONS}
            />
          </div>
        </div>

        <div className={`
          catalog-results flex min-h-[3.8rem] items-center justify-between gap-4 text-[.72rem] text-[#92868e]
          [&_button]:inline-flex [&_button]:cursor-pointer [&_button]:items-center [&_button]:gap-[.3rem]
          [&_button]:font-semibold [&_button]:text-[#a65f7a]
        `}>
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
          <div className={`
            catalog-error-state my-6 rounded-xl border border-[#f5d0d8] bg-[#fff8f9] px-6 py-12 text-center
            text-[#8e536a] [&_h3]:my-2 [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-[#7a2e46] [&_p]:mb-4
            [&_p]:text-[.82rem] [&_p]:text-[#6a575f] [&_button]:cursor-pointer [&_button]:rounded-md
            [&_button]:border-0 [&_button]:bg-[#8e536a] [&_button]:px-[1.2rem] [&_button]:py-2
            [&_button]:text-[.8rem] [&_button]:font-semibold [&_button]:text-white [&_button:hover]:bg-[#733c51]
          `}>
            <h3>Đã có lỗi xảy ra</h3>
            <p>{error}</p>
            <button type="button" onClick={() => setReloadCounter((c) => c + 1)}>
              <RefreshCw size={14} aria-hidden="true" style={{ marginRight: 6 }} /> Thử lại
            </button>
          </div>
        ) : data.items.length > 0 ? (
          <>
            <div className="catalog-grid grid grid-cols-3 gap-[1.15rem] max-[850px]:grid-cols-2 max-[600px]:gap-[.65rem]">
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
              <nav className="catalog-pagination mt-10 flex items-center justify-center gap-3 py-4" aria-label="Phân trang sản phẩm">
                <button
                  type="button"
                  className={`
                    catalog-pagination__button inline-flex cursor-pointer items-center gap-[.4rem] rounded-lg border
                    border-[#e8dfe3] bg-white px-4 py-[.55rem] text-[.8rem] font-semibold text-[#453943] transition-all
                    duration-200 enabled:hover:border-[#bd6b8a] enabled:hover:bg-[#fdf8f9] enabled:hover:text-[#8e536a]
                    disabled:cursor-not-allowed disabled:border-[#eee] disabled:opacity-45
                  `}
                  disabled={data.page <= 1}
                  onClick={() => handlePageChange(data.page - 1)}
                  aria-label="Chuyển đến trang trước"
                >
                  <ChevronLeft size={16} aria-hidden="true" /> Trước
                </button>

                <span className="catalog-pagination__info px-2 text-[.82rem] font-medium text-[#756a72]" aria-current="page">
                  Trang {data.page} / {data.totalPages}
                </span>

                <button
                  type="button"
                  className={`
                    catalog-pagination__button inline-flex cursor-pointer items-center gap-[.4rem] rounded-lg border
                    border-[#e8dfe3] bg-white px-4 py-[.55rem] text-[.8rem] font-semibold text-[#453943] transition-all
                    duration-200 enabled:hover:border-[#bd6b8a] enabled:hover:bg-[#fdf8f9] enabled:hover:text-[#8e536a]
                    disabled:cursor-not-allowed disabled:border-[#eee] disabled:opacity-45
                  `}
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
          <div className={`
            catalog-empty rounded-xl border border-dashed border-[#e6d9df] px-6 py-16 text-center text-[#a37b8a]
            [&_svg]:mx-auto [&_svg]:mb-4 [&_h3]:text-[.95rem] [&_h3]:font-bold [&_h3]:text-[#453943] [&_p]:mt-2
            [&_p]:mb-4 [&_p]:text-[.8rem] [&_p]:text-[#8d8088] [&_button]:cursor-pointer [&_button]:text-[.8rem]
            [&_button]:font-bold [&_button]:text-[#a65f7a]
          `}>
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

      <section className={`
        customer-cta flex items-center justify-between gap-8 rounded-xl bg-[#f0e1e5] px-12 py-11
        max-[600px]:flex-col max-[600px]:items-start max-[600px]:p-8 [&_h2]:!mt-[.65rem]
        [&_h2]:!text-[clamp(1.45rem,2.3vw,2rem)] [&_h2]:!tracking-[-.045em] [&_h2]:text-[#302a32] [&_p]:mt-2
        [&_p]:text-[.8rem] [&_p]:text-[#8a7b83]
      `}>
        <div>
          <span className="landing-eyebrow inline-flex items-center gap-2 text-[.65rem] font-bold tracking-[.13em] text-[#9b7281] [&>span]:h-0.5 [&>span]:w-6 [&>span]:bg-[#dfa0b5]">CÙNG OCS</span>
          <h2>Đồ đẹp cần một hành trình mới?</h2>
          <p>Khám phá cách ký gửi cùng OCS.</p>
        </div>
        <Link to="/consign" className={`
          landing-button inline-flex min-h-12 items-center justify-center gap-4 rounded-[7px] bg-button-pastel px-5
          py-[.8rem] text-[.8rem] font-bold text-[#332832] transition-[background,transform] duration-200
          hover:-translate-y-px hover:bg-button-pastel-hover
        `}>
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
