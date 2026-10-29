import { CartProvider } from "@/components/cart/CartProvider";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";

export default function ShopLayout({ children }: LayoutProps<"/">) {
  return (
    <CartProvider>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-20 focus:z-[60] focus:bg-accent focus:px-4 focus:py-2 focus:text-on-accent"
      >
        Към основното съдържание
      </a>
      <Header />
      <main id="main" className="flex-1 pt-[70px]">
        {children}
      </main>
      <Footer />
    </CartProvider>
  );
}
