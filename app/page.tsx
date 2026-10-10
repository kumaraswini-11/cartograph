export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-1 p-4 text-center">
      <h1 className="text-sm font-semibold">Cartograph</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        A dependency map of any public TypeScript or JavaScript repository,
        drawn from the code itself.
      </p>
    </main>
  );
}
