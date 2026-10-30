import type { FacetKey } from "@/lib/facets";

// Рафтовете на помощника „Избери решение“: всеки води в точния каталог. steps — техническите въпроси
// след цената (цената винаги е първа); ако групата липсва в данните, се взима следващата налична.
// path — собствената страница на рафта, когато има такава (иначе каталогът с ?sub=).

export type Shelf = {
  id: string;
  group: "computers" | "parts";
  label: string;
  hint: string;
  category: string;
  sub?: string;
  path?: string;
  steps: FacetKey[];
};

export const shelves: Shelf[] = [
  { id: "gaming-pc", group: "computers", label: "Гейминг компютър", hint: "Цена → процесор → видеокарта", category: "kompyutri", path: "/geimarski-kompyutri", steps: ["cpu", "gpu"] },
  { id: "office-pc", group: "computers", label: "Компютър за офис или дом", hint: "Цена → процесор → памет", category: "kompyutri", sub: "gsol-office", path: "/kompyutri-za-ofis", steps: ["cpu", "ram"] },
  { id: "laptop", group: "computers", label: "Лаптоп", hint: "Цена → процесор → екран", category: "laptopi", sub: "rabota-i-dom", steps: ["cpu", "screen"] },
  { id: "gaming-laptop", group: "computers", label: "Гейминг лаптоп", hint: "Цена → процесор → видеокарта", category: "laptopi", sub: "geiming-laptopi", path: "/geiming-laptopi", steps: ["cpu", "gpu"] },
  { id: "cpu", group: "parts", label: "Процесори", hint: "Цена → производител", category: "komponenti", sub: "procesori", steps: ["cpu"] },
  { id: "gpu", group: "parts", label: "Видеокарти", hint: "Цена → серия → памет", category: "komponenti", sub: "videokarti", steps: ["gpu", "vram"] },
  { id: "ram", group: "parts", label: "RAM памет", hint: "Цена → капацитет", category: "komponenti", sub: "ram", steps: ["ram"] },
  { id: "ssd", group: "parts", label: "SSD и HDD", hint: "Цена → капацитет", category: "komponenti", sub: "ssd", steps: ["storage"] },
  { id: "monitor", group: "parts", label: "Монитори", hint: "Цена → размер → матрица", category: "periferiya", sub: "monitori", steps: ["screen", "panel"] },
  { id: "gaming-monitor", group: "parts", label: "Гейминг монитори", hint: "Цена → размер → честота", category: "periferiya", sub: "geiming-monitori", steps: ["screen", "refresh"] },
  { id: "mouse", group: "parts", label: "Мишки", hint: "Цена → марка", category: "periferiya", sub: "mishki", steps: [] },
  { id: "keyboard", group: "parts", label: "Клавиатури", hint: "Цена → марка", category: "periferiya", sub: "klaviaturi", steps: [] },
  { id: "headset", group: "parts", label: "Слушалки", hint: "Цена → марка", category: "periferiya", sub: "slushalki", steps: [] },
];
