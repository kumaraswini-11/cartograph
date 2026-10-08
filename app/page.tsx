export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">Cartograph</h1>
      <p className="max-w-xl text-lg text-zinc-600 dark:text-zinc-400">
        A dependency map of any public TypeScript or JavaScript repository,
        drawn from the code itself.
      </p>
    </main>
  );
}
