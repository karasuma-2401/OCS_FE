import { useMemo, useState } from 'react';
import { ArrowRight, Search, Sparkles, X } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { CatalogProductCard } from '@/components/customer/CatalogProductCard';
import { ProductImageGallery } from '@/components/customer/ProductImageGallery';
import { Combobox, Modal } from '@/components/shared';
import { catalogProducts, formatCatalogPrice } from '@/data/catalogProducts';
import { filterCatalog } from '@/utils/catalog';
import './CustomerPages.css';

const categories = ['Tất cả', ...new Set(catalogProducts.map((product) => product.category))];
const sizes = [...new Set(catalogProducts.map((product) => product.size))];
const conditions = [...new Set(catalogProducts.map((product) => product.condition))];

export function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Tất cả');
  const [size, setSize] = useState('');
  const [condition, setCondition] = useState('');
  const [price, setPrice] = useState('');
  const [sort, setSort] = useState('featured');
  const selected = catalogProducts.find((product) => product.code === searchParams.get('product'));
  const hasFilters = Boolean(query || category !== 'Tất cả' || size || condition || price);

  const products = useMemo(() => filterCatalog(catalogProducts, { query, category, size, condition, price, sort }), [query, category, size, condition, price, sort]);

  function resetFilters() { setQuery(''); setCategory('Tất cả'); setSize(''); setCondition(''); setPrice(''); setSort('featured'); }
  function closeDetails() {
    const next = new URLSearchParams(searchParams);
    next.delete('product');
    setSearchParams(next, { replace: true });
  }

  return (
    <div className="customer-page landing-container">
      <div className="customer-breadcrumb"><Link to="/">Trang chủ</Link><span aria-hidden="true">/</span><span>Khám phá</span></div>
      <header className="customer-page__heading catalog-heading">
        <div><span className="landing-eyebrow"><span /> THE OCS COLLECTION</span><h1>Khám phá món đồ<br /><span>hợp với bạn.</span></h1><p>Mỗi món đồ đều có một câu chuyện. Biết đâu bạn sẽ tìm thấy điều mình yêu thích ở đây.</p></div>
        <div className="customer-heading-note"><Sparkles size={18} aria-hidden="true" /><span>Chọn điều bạn thích.<br />Mặc theo cách của bạn.</span></div>
      </header>
      <section className="catalog-section" aria-labelledby="catalog-title">
        <div className="customer-section-heading"><div><span className="landing-eyebrow">THE OCS EDIT</span><h2 id="catalog-title">Một chút cảm hứng cho bạn.</h2><p>Chọn một danh mục hoặc tìm kiếm món đồ yêu thích.</p></div><span className="catalog-demo-note">Sản phẩm và giá hiển thị chỉ mang tính minh họa</span></div>
        <div className="catalog-categories" role="group" aria-label="Danh mục sản phẩm">
          {categories.map((item) => <button type="button" key={item} aria-pressed={category === item} className={category === item ? 'catalog-category is-active' : 'catalog-category'} onClick={() => setCategory(item)}>{item}</button>)}
        </div>
        <div className="catalog-toolbar">
          <label className="catalog-search"><Search size={17} aria-hidden="true" /><span className="sr-only">Tìm kiếm sản phẩm</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm tên hoặc mã sản phẩm" /></label>
          <div className="catalog-selects">
            <Combobox className="catalog-combobox" ariaLabel="Size" value={size} onChange={setSize} options={[{ value: '', label: 'Tất cả size' }, ...sizes.map((item) => ({ value: item, label: item }))]} />
            <Combobox className="catalog-combobox" ariaLabel="Tình trạng" value={condition} onChange={setCondition} options={[{ value: '', label: 'Tất cả tình trạng' }, ...conditions.map((item) => ({ value: item, label: item }))]} />
            <Combobox className="catalog-combobox" ariaLabel="Khoảng giá" value={price} onChange={setPrice} options={[{ value: '', label: 'Tất cả mức giá' }, { value: 'under-200', label: 'Dưới 200.000 đ' }, { value: 'over-200', label: 'Từ 200.000 đ' }]} />
            <Combobox className="catalog-combobox" ariaLabel="Sắp xếp sản phẩm" value={sort} onChange={setSort} options={[{ value: 'featured', label: 'Gợi ý' }, { value: 'price-asc', label: 'Giá: thấp đến cao' }, { value: 'price-desc', label: 'Giá: cao đến thấp' }]} />
          </div>
        </div>
        <div className="catalog-results"><p aria-live="polite">{products.length} sản phẩm minh họa</p>{hasFilters && <button type="button" onClick={resetFilters}><X size={14} aria-hidden="true" /> Xóa bộ lọc</button>}</div>
        {products.length ? <div className="catalog-grid">{products.map((product) => <CatalogProductCard key={product.code} product={product} />)}</div> : <div className="catalog-empty"><Search size={25} aria-hidden="true" /><h3>Chưa tìm thấy món đồ phù hợp</h3><p>Thử từ khóa hoặc bộ lọc khác nhé.</p><button type="button" onClick={resetFilters}>Xóa bộ lọc</button></div>}
      </section>
      <section className="customer-cta"><div><span className="landing-eyebrow">CÙNG OCS</span><h2>Đồ đẹp cần một hành trình mới?</h2><p>Khám phá cách ký gửi cùng OCS.</p></div><Link to="/consign" className="landing-button">Tìm hiểu ký gửi <ArrowRight size={16} aria-hidden="true" /></Link></section>
      <Modal open={Boolean(selected)} onClose={closeDetails} title={selected?.name ?? ''} description="Thông tin sản phẩm minh họa">
        {selected && <div className="catalog-detail"><ProductImageGallery key={selected.code} productName={selected.name} images={selected.images?.length ? selected.images : [{ src: selected.image, label: 'Mặt trước' }]} /><div><span className="catalog-detail__category">{selected.category} · {selected.code}</span><p>{selected.description}</p><dl><div><dt>Size</dt><dd>{selected.size}</dd></div><div><dt>Tình trạng</dt><dd>{selected.condition}</dd></div><div><dt>Trạng thái</dt><dd>{selected.status}</dd></div></dl><strong>{formatCatalogPrice(selected.price)}</strong><p className="catalog-detail__note">Hình ảnh, giá và thông tin chỉ mang tính minh họa.</p></div></div>}
      </Modal>
    </div>
  );
}
