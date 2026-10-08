export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">Cartograph</h1>
      <p className="max-w-xl text-lg text-zinc-600 dark:text-zinc-400">
        Turn any GitHub repo into an interactive dependency map, built from real
        parsed code, not guessed edges.
      </p>
    </main>
  );
}
