import type { Metadata } from "next";
import { ShelfPage, type ShelfDef } from "@/components/catalog/ShelfPage";

const shelf: ShelfDef = {
  path: "/geiming-laptopi",
  title: "Гейминг лаптопи",
  tagline: "Мощност за игри в мобилен формат",
  category: "laptopi",
  sub: "geiming-laptopi",
  advice:
    "При гейминг лаптопа видеокартата определя най-много колко игри и на какви настройки ще вървят; охлаждането решава дали тази мощност ще се задържи. Гледайте и екрана — честотата на опресняване има смисъл само ако картата я достига.",
};

export const metadata: Metadata = { title: shelf.title, description: shelf.tagline };

export default function Page(props: PageProps<"/geiming-laptopi">) {
  return <ShelfPage shelf={shelf} searchParams={props.searchParams} />;
}
