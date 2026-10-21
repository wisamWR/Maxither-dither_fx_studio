import { useCallback, useRef, useState } from 'react';

interface ImageLoaderProps {
  onImageLoad: (imageData: ImageData) => void;
}

export default function ImageLoader({ onImageLoad }: ImageLoaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) return;
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        onImageLoad(imageData);
        URL.revokeObjectURL(url);
      };
      img.src = url;
    },
    [onImageLoad],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
        isDragging ? 'border-green-400 bg-green-400/10' : 'border-neutral-600 hover:border-neutral-400'
      }`}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      tabIndex={0}
    >
      <p className="text-lg mb-2">Drop image here, paste, or click to browse</p>
      <p className="text-sm text-neutral-400">PNG, JPG, SVG, WebP</p>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) processFile(file);
        }}
      />
    </div>
  );
}
