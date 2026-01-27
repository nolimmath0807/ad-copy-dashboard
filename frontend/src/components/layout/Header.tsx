export function Header({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center border-b bg-background px-6">
      <h2 className="text-lg font-semibold">{title}</h2>
    </header>
  );
}
