import { permanentRedirect } from "next/navigation";

// Старите адреси на WooCommerce (/product-category/лаптопи-и-компютри/лаптопи/) водят към новите рафтове.
// Последната част от пътя е категорията; непознатата води към магазина.

const map: Record<string, string> = {
  "лаптопи": "/laptopi",
  "лаптопи-и-компютри": "/laptopi",
  "гейминг-лаптопи": "/geiming-laptopi",
  "гейминг-конфигурации": "/geimarski-kompyutri",
  "геймърски-компютри": "/geimarski-kompyutri",
  "компютри-за-офис": "/kompyutri-za-ofis",
  "настолни-компютри": "/nastolni-kompyutri",
  "компютърни-компоненти": "/katalog/komponenti",
  "процесори": "/katalog/komponenti?sub=procesori",
  "видеокарти": "/katalog/komponenti?sub=videokarti",
  "монитори": "/katalog/periferiya?sub=monitori",
  "периферия": "/katalog/periferiya",
  "реновирани": "/katalog/renovirani",
  "промоции": "/promocii",
  "принтери-и-консумативи": "/za-gsol#gsol-print",
};

export async function GET(_req: Request, ctx: RouteContext<"/product-category/[...path]">) {
  const parts = (await ctx.params).path.map((p) => decodeURIComponent(p).toLocaleLowerCase("bg"));
  for (const part of [...parts].reverse()) {
    if (map[part]) permanentRedirect(map[part]);
  }
  permanentRedirect("/magazin");
}
