import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, Truck } from "lucide-react";
import { AddToCartButton } from "@/components/cart/AddToCart";
import { formatPrice } from "@/lib/format";
import { tierInfo, type Product } from "@/lib/catalog";

export function ProductBadge({ product }: { product: Product }) {
  if (product.isPromo) return <Badge tone="accent">Промоция</Badge>;
  if (product.tier === "premium") return <Badge tone="light">Premium</Badge>;
  if (product.category === "renovirani") return <Badge tone="light">Реновиран</Badge>;
  return product.inStock ? <Badge tone="ok">Налично</Badge> : <Badge tone="light">По запитване</Badge>;
}

function Badge({ tone, children }: { tone: "accent" | "ok" | "light"; children: React.ReactNode }) {
  const tones = {
    accent: "bg-accent text-on-accent",
    ok: "bg-black/80 text-ok",
    light: "bg-black/80 text-white",
  };
  return (
    <span
      className={`inline-flex h-6 items-center px-2.5 font-display text-[11px] font-medium uppercase tracking-wide ${tones[tone]}`}
      style={{ clipPath: "polygon(0 100%, 4px 0, 100% 0, calc(100% - 4px) 100%)" }}
    >
      {children}
    </span>
  );
}

export function PriceBlock({ product, size = "md" }: { product: Product; size?: "md" | "lg" }) {
  const saving = product.regularPrice - product.price;
  return (
    <div>
      {saving > 0 && (
        <div className="flex items-baseline gap-2 text-[13px]">
          <s className="text-dim">{formatPrice(product.regularPrice)}</s>
          <span className="font-medium text-accent-ink">−{formatPrice(saving)}</span>
        </div>
      )}
      <div className={`font-display font-medium text-white ${size === "lg" ? "text-[36px]" : "text-[22px]"}`}>
        {formatPrice(product.price)}
      </div>
      <div className="text-[12px] text-dim">Крайна цена с ДДС</div>
    </div>
  );
}

export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const href = `/produkt/${product.slug}`;
  return (
    <article className="cut-frame group h-full hover:[--frame:var(--color-accent)]">
      <div className="cut-inner flex flex-col bg-surface-2">
        <Link href={href} className="relative block aspect-[4/3] bg-plate" tabIndex={-1}>
          {product.images[0] && (
            <Image
              src={product.images[0]}
              alt=""
              fill
              priority={priority}
              sizes="(min-width: 1200px) 280px, (min-width: 640px) 45vw, 90vw"
              className="object-contain p-5 mix-blend-multiply transition-transform duration-300 group-hover:scale-[1.03]"
            />
          )}
          <span className="absolute left-3 top-3">
            <ProductBadge product={product} />
          </span>
        </Link>

        <div className="flex flex-1 flex-col gap-3 p-4">
          <div className="tagline !text-[11px]">{product.tier ? tierInfo[product.tier].name : product.brand}</div>
          <h3 className="line-clamp-3 text-[14px] font-normal leading-snug text-white">
            <Link href={href} className="hover:text-accent-ink">
              {product.name}
            </Link>
          </h3>

          {product.components && (
            <dl className="grid grid-cols-[36px_1fr] gap-x-2 gap-y-1 text-[12px]">
              <dt className="font-display text-accent-ink">CPU</dt>
              <dd className="truncate text-muted">{product.components.cpu}</dd>
              <dt className="font-display text-accent-ink">GPU</dt>
              <dd className="truncate text-muted">{product.components.gpu}</dd>
            </dl>
          )}

          <ul className="space-y-1 text-[12px] text-muted">
            <li className="flex items-center gap-1.5">
              <Truck className="h-3.5 w-3.5 text-dim" strokeWidth={1.75} />
              {product.inStock ? "Налично" : "По запитване"} · {product.deliveryDays} работни дни
            </li>
            {product.freeWindows && (
              <li className="flex items-center gap-1.5">
                <BadgeCheck className="h-3.5 w-3.5 text-dim" strokeWidth={1.75} />
                Безплатна настройка на Windows
              </li>
            )}
          </ul>

          <div className="mt-auto space-y-3 pt-2">
            <PriceBlock product={product} />
            <AddToCartButton
              item={{ id: product.id, slug: product.slug, name: product.name, price: product.price, image: product.images[0] }}
            />
          </div>
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} priority={i < 4} />
      ))}
    </div>
  );
}
