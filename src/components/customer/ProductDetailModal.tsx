import { useEffect, useMemo, useState } from 'react';
import { Modal, SkeletonLoading } from '@/components/shared';
import { ProductImageGallery } from './ProductImageGallery';
import { formatVndPrice, getPublicProductDetail, type PublicProductDetail } from '@/api/products';

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
        <SkeletonLoading variant="detail" label="Đang tải chi tiết sản phẩm..." />
      ) : detailError ? (
        <div className={`
          catalog-error-state my-6 rounded-xl border border-[#f5d0d8] bg-[#fff8f9] px-6 py-12 text-center
          text-[#8e536a] [&_h3]:my-2 [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-[#7a2e46] [&_p]:mb-4
          [&_p]:text-[.82rem] [&_p]:text-[#6a575f] [&_button]:cursor-pointer [&_button]:rounded-md
          [&_button]:border-0 [&_button]:bg-[#8e536a] [&_button]:px-[1.2rem] [&_button]:py-2
          [&_button]:text-[.8rem] [&_button]:font-semibold [&_button]:text-white [&_button:hover]:bg-[#733c51]
        `} style={{ margin: '1rem 0' }}>
          <h3>Không thể hiển thị sản phẩm</h3>
          <p>{detailError}</p>
          <button type="button" onClick={onClose}>
            Đóng
          </button>
        </div>
      ) : detailProduct ? (
        <div className={`
          catalog-detail grid gap-5 [&_p]:mt-[.6rem] [&_p]:text-[.8rem] [&_p]:leading-[1.65] [&_p]:text-[#756b72]
          [&_dl]:my-4 [&_dl]:border-t [&_dl]:border-[#eee6e9] [&_dl_div]:flex [&_dl_div]:justify-between
          [&_dl_div]:gap-4 [&_dl_div]:border-b [&_dl_div]:border-[#eee6e9] [&_dl_div]:py-[.55rem]
          [&_dl_div]:text-xs [&_dt]:text-[#91838c] [&_dd]:font-semibold [&_dd]:text-[#453a43]
          [&_strong]:text-[1.1rem] [&_strong]:text-[#a95676]
        `}>
          <ProductImageGallery
            key={detailProduct.id}
            productName={detailProduct.name}
            images={galleryImages}
          />
          <div>
            <span className="catalog-detail__category text-[.7rem] font-bold tracking-[.06em] text-[#a37989] uppercase">
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
