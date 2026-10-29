import { startTransition, type FormEvent } from "react";

/**
 * onSubmit за форми с useActionState. При action={…} React 19 нулира формата след всяко изпращане —
 * и при грешка, така че въведеното се губи, а падащите менюта се връщат към първоначалната стойност.
 * Така полетата остават както са; форма, която трябва да се изчисти след успех, го прави сама.
 */
export function keepValues(action: (form: FormData) => void) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget, (event.nativeEvent as SubmitEvent).submitter);
    startTransition(() => action(form));
  };
}
