/** Resize camera captures before submitting them to the 2 MB/image API limit. */
export async function prepareCameraPhoto(file: File): Promise<File> {
  if (!['image/jpeg', 'image/png'].includes(file.type) || !file.size || file.size > 30 * 1024 * 1024) {
    throw new Error('Ảnh chụp phải là JPEG hoặc PNG và không vượt quá 30 MB.');
  }
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('Không thể đọc ảnh từ camera.'));
      element.src = url;
    });
    if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > 100_000_000) {
      throw new Error('Kích thước ảnh chụp không hợp lệ.');
    }
    const scale = Math.min(1, 2048 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Không thể xử lý ảnh chụp trên thiết bị này.');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.86, 0.72, 0.58, 0.44]) {
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
      if (blob?.type === 'image/jpeg' && blob.size > 0 && blob.size <= 2 * 1024 * 1024) {
        return new File([blob], 'anh-san-pham.jpg', { type: 'image/jpeg', lastModified: Date.now() });
      }
    }
    throw new Error('Không thể giảm ảnh xuống dưới 2 MB. Hãy thử chụp lại.');
  } finally {
    URL.revokeObjectURL(url);
  }
}
