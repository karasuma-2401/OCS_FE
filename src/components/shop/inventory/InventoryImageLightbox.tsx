import { useEffect } from "react";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { Button, Modal } from "@/components/shared";

export interface LightboxImage {
  id: string;
  url: string;
  imageType: string;
}

interface InventoryImageLightboxProps {
  images: LightboxImage[];
  activeIndex: number | null;
  productName: string;
  onChangeIndex: (index: number) => void;
  onClose: () => void;
}

const imageTypeLabel = (type: string) =>
  type === "Cover" ? "Ảnh bìa" : type === "Detail" ? "Ảnh chi tiết" : type;

export function InventoryImageLightbox({
  images,
  activeIndex,
  productName,
  onChangeIndex,
  onClose,
}: InventoryImageLightboxProps) {
  const isOpen = activeIndex !== null && images.length > 0;
  const safeIndex =
    activeIndex !== null && images.length > 0
      ? Math.min(Math.max(0, activeIndex), images.length - 1)
      : 0;
  const current = images[safeIndex];

  useEffect(() => {
    if (!isOpen || images.length <= 1) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        onChangeIndex((safeIndex - 1 + images.length) % images.length);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        onChangeIndex((safeIndex + 1) % images.length);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, images.length, safeIndex, onChangeIndex]);

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={productName}
      description={
        current
          ? `${imageTypeLabel(current.imageType)} (${safeIndex + 1}/${images.length})`
          : undefined
      }
      className="max-w-3xl"
      footer={
        current ? (
          <div className="flex w-full items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {images.length > 1 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      onChangeIndex(
                        (safeIndex - 1 + images.length) % images.length,
                      )
                    }
                    startIcon={<ChevronLeft size={15} aria-hidden="true" />}
                  >
                    Trước
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      onChangeIndex((safeIndex + 1) % images.length)
                    }
                    endIcon={<ChevronRight size={15} aria-hidden="true" />}
                  >
                    Sau
                  </Button>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <a
                href={current.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-8 items-center gap-1.5 rounded-xl border border-border bg-paper px-3 py-1.5 text-xs font-semibold text-brand-ink hover:border-brand-pink hover:bg-brand-pink-surface"
              >
                <ExternalLink size={13} aria-hidden="true" />
                Mở tab mới
              </a>
              <Button size="sm" onClick={onClose}>
                Đóng
              </Button>
            </div>
          </div>
        ) : undefined
      }
    >
      {current && (
        <div className="space-y-3">
          <div className="flex max-h-[60vh] items-center justify-center overflow-hidden rounded-xl bg-surface-dashboard p-2">
            <img
              key={current.id}
              src={current.url}
              alt={`${productName} - ${imageTypeLabel(current.imageType)}`}
              className="max-h-[56vh] w-auto rounded-lg object-contain animate-inv-fade-in"
            />
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((image, index) => (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => onChangeIndex(index)}
                  aria-label={`Xem ${imageTypeLabel(image.imageType)} ${index + 1}`}
                  aria-current={index === safeIndex ? "true" : undefined}
                  className={`shrink-0 overflow-hidden rounded-lg border-2 transition ${
                    index === safeIndex
                      ? "border-brand-highlight"
                      : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                >
                  <img
                    src={image.url}
                    alt=""
                    width={56}
                    height={56}
                    className="size-14 object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
