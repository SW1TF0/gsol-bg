import type { Metadata } from "next";
import { ShelfPage, type ShelfDef } from "@/components/catalog/ShelfPage";

const shelf: ShelfDef = {
  path: "/nastolni-kompyutri",
  title: "Настолни компютри",
  tagline: "Гейминг, офис и машини по поръчка",
  category: "kompyutri",
  advice:
    "Настолният компютър се надгражда по-лесно от лаптопа: по-късно може да смените видеокарта, да добавите памет или диск. Изберете линия според задачите и бюджета, а ако търсите нещо различно — използвайте конфигуратора.",
};

export const metadata: Metadata = { title: shelf.title, description: shelf.tagline };

export default function Page(props: PageProps<"/nastolni-kompyutri">) {
  return <ShelfPage shelf={shelf} searchParams={props.searchParams} />;
}
