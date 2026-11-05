import { useEffect, useMemo, useState } from 'react';
import { Modal } from '@/components/shared';
import { ProductImageGallery } from './ProductImageGallery';
import { formatVndPrice, getPublicProductDetail, type PublicProductDetail } from '@/api/products';
import '@/pages/CustomerPages.css';

const EMPTY_IMAGE_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='500' viewBox='0 0 400 500'%3E%3Crect width='400' height='500' fill='%23f2e8e9'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23a89aa1' font-family='sans-serif' font-size='16'%3ECh%C6%B0a c%C3%B3 %E1%BA%A3nh%3C/text%3E%3C/svg%3E";

export interface ProductDetailModalProps {
  productId: string | null;
  onClose: () => void;
}

export function ProductDetailModal({ productId, onClose }: ProductDetailModalProps) {
  const [detailProduct, setDetailProduct] = useState<PublicProductDetail | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    if (!productId) {
      setDetailProduct(null);
      setIsDetailLoading(false);
      setDetailError(null);
      return;
    }

    const controller = new AbortController();
    setIsDetailLoading(true);
    setDetailError(null);

    getPublicProductDetail(productId, controller.signal)
      .then((detail) => {
        setDetailProduct(detail);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        if (err?.response?.status === 404 || err?.response?.data?.code === 'PRODUCT.NOT_FOUND') {
          setDetailError('Không tìm thấy sản phẩm hoặc sản phẩm không còn mở bán công khai.');
        } else {
          setDetailError('Không thể tải thông tin chi tiết sản phẩm. Vui lòng thử lại sau.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsDetailLoading(false);
        }
      });

    return () => controller.abort();
  }, [productId]);

  const galleryImages = useMemo(() => {
    if (!detailProduct) return [];
    if (!detailProduct.images || detailProduct.images.length === 0) {
      return [{ src: EMPTY_IMAGE_PLACEHOLDER, label: 'Ảnh sản phẩm' }];
    }
    return detailProduct.images.map((img, index) => ({
      src: img.url,
      label: img.imageType === 'Cover' ? 'Ảnh bìa' : (index > 0 ? `Ảnh chi tiết ${index}` : 'Ảnh chi tiết'),
    }));
  }, [detailProduct]);

  return (
    <Modal
      open={Boolean(productId)}
      onClose={onClose}
      title={detailProduct?.name ?? (isDetailLoading ? 'Đang tải thông tin...' : 'Chi tiết sản phẩm')}
      description="Thông tin sản phẩm đang bán tại OCS"
    >
      {isDetailLoading ? (
        <div className="catalog-detail" aria-label="Đang tải chi tiết sản phẩm">
          <div className="catalog-skeleton-image" style={{ width: '100%', height: '240px', borderRadius: 9 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <div className="catalog-skeleton-line catalog-skeleton-line--short" />
            <div className="catalog-skeleton-line catalog-skeleton-line--title" />
            <div className="catalog-skeleton-line" />
            <div className="catalog-skeleton-line catalog-skeleton-line--price" />
          </div>
        </div>
      ) : detailError ? (
        <div className="catalog-error-state" style={{ margin: '1rem 0' }}>
          <h3>Không thể hiển thị sản phẩm</h3>
          <p>{detailError}</p>
          <button type="button" onClick={onClose}>
            Đóng
          </button>
        </div>
      ) : detailProduct ? (
        <div className="catalog-detail">
          <ProductImageGallery
            key={detailProduct.id}
            productName={detailProduct.name}
            images={galleryImages}
          />
          <div>
            <span className="catalog-detail__category">
              {detailProduct.category?.name || 'Sản phẩm'} · {detailProduct.brand?.name || 'Chính hãng'}
            </span>
            <p>{detailProduct.description || 'Chưa có mô tả chi tiết cho sản phẩm này.'}</p>
            <dl>
              <div>
                <dt>Size</dt>
                <dd>{detailProduct.size}</dd>
              </div>
              <div>
                <dt>Tình trạng</dt>
                <dd>{detailProduct.conditionPercentage}%</dd>
              </div>
              <div>
                <dt>Trạng thái</dt>
                <dd>Đang bán</dd>
              </div>
            </dl>
            <strong>{formatVndPrice(detailProduct.listedPrice)}</strong>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
