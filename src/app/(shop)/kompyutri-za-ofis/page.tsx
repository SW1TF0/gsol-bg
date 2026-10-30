import type { Metadata } from "next";
import { ShelfPage, type ShelfDef } from "@/components/catalog/ShelfPage";

const shelf: ShelfDef = {
  path: "/kompyutri-za-ofis",
  title: "Компютри за офис",
  tagline: "Тихи и надеждни машини за работа",
  category: "kompyutri",
  sub: "gsol-office",
  advice:
    "За офис работа решаващи са бързият SSD, достатъчната памет и надеждното захранване — не видеокартата. Машините GSOL Office са с вградена графика и минават тест преди предаване.",
};

export const metadata: Metadata = { title: shelf.title, description: shelf.tagline };

export default function Page(props: PageProps<"/kompyutri-za-ofis">) {
  return <ShelfPage shelf={shelf} searchParams={props.searchParams} />;
}
