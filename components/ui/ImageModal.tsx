"use client";

import Modal from "./Modal";
import Image from "next/image";
import { useState } from "react";

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  altText?: string;
}

export function ImageModal({ isOpen, onClose, imageSrc, altText = "Image" }: ImageModalProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Payment Proof Image" size="xl">
      <div className="relative aspect-video bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
        {!imageError ? (
          <Image
            src={imageSrc}
            alt={altText}
            fill
            className="object-contain"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="text-center p-8">
            <svg className="w-24 h-24 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-gray-600 font-medium mb-2">Image not available</p>
            <p className="text-sm text-gray-500">{imageSrc}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
