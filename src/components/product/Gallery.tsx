"use client";

import { useState } from "react";
import Image from "next/image";

export function Gallery({ images, alt }: { images: string[]; alt: string }) {
  const [index, setIndex] = useState(0);
  const current = images[index];

  return (
    <div className="space-y-3">
      <div className="cut-frame cut-lg">
        <div className="cut-inner relative aspect-square bg-plate">
          {current && (
            <Image
              src={current}
              alt={alt}
              fill
              priority
              sizes="(min-width: 1024px) 560px, 95vw"
              className="object-contain p-10 mix-blend-multiply"
            />
          )}
        </div>
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Снимка ${i + 1} от ${images.length}`}
              aria-current={i === index}
              className={`relative h-20 w-20 flex-none bg-plate ring-2 transition ${i === index ? "ring-accent" : "ring-transparent hover:ring-line"}`}
            >
              <Image src={src} alt="" fill sizes="80px" className="object-contain p-2 mix-blend-multiply" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
