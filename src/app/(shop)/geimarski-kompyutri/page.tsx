import type { Metadata } from "next";
import { ShelfPage, type ShelfDef } from "@/components/catalog/ShelfPage";

const shelf: ShelfDef = {
  path: "/geimarski-kompyutri",
  title: "Геймърски компютри",
  tagline: "Конфигурации GSOL, сглобени и тествани под натоварване",
  category: "kompyutri",
  advice:
    "Всяка машина GSOL е проверена за съвместимост, захранване и охлаждане. Видеокартата определя колко кадъра ще имате в игрите, процесорът — дали картата ще бъде натоварена докрай. Желаете различна част? Изпратете запитване — ще проверим съвместимостта и цената.",
};

export const metadata: Metadata = { title: shelf.title, description: shelf.tagline };

export default function Page(props: PageProps<"/geimarski-kompyutri">) {
  return <ShelfPage shelf={shelf} searchParams={props.searchParams} />;
}
