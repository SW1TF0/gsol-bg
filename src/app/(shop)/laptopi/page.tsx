import type { Metadata } from "next";
import { ShelfPage, type ShelfDef } from "@/components/catalog/ShelfPage";

const shelf: ShelfDef = {
  path: "/laptopi",
  title: "Лаптопи",
  tagline: "Лаптопи за работа, учене и игри — с реална наличност и цена",
  category: "laptopi",
  advice:
    "Преди да изберете лаптоп, решете за какво ще го ползвате най-често: за офис и учене стигат съвременен процесор, 16 GB памет и SSD; за игри и графика водещи са видеокартата и охлаждането. Ако се колебаете, обадете се — ще сравним два-три модела според задачите ви.",
};

export const metadata: Metadata = { title: shelf.title, description: shelf.tagline };

export default function Page(props: PageProps<"/laptopi">) {
  return <ShelfPage shelf={shelf} searchParams={props.searchParams} />;
}
