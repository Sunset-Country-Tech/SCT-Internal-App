export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 px-4">
      <section className="max-w-md rounded-[8px] border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-2xl font-black">Not found</h1>
        <p className="mt-2 text-sm text-slate-600">This route is not part of the internal operations app.</p>
      </section>
    </main>
  );
}
