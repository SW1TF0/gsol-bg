import { ButtonLink, Container } from "@/components/ui";

export default function NotFound() {
  return (
    <Container className="py-32 text-center">
      <p className="font-display text-[96px] leading-none text-accent-ink">404</p>
      <h1 className="h-display mt-4 text-[28px]">Страницата не е намерена</h1>
      <p className="mt-3 text-muted">Възможно е продуктът вече да не се предлага или адресът да е сгрешен.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/">Към началото</ButtonLink>
        <ButtonLink href="/promocii" variant="outline">
          Промоции
        </ButtonLink>
      </div>
    </Container>
  );
}
