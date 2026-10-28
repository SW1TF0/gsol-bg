// Показва се веднага при преминаване между админ страниците, докато данните се зареждат
export default function AdminLoading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Зареждане">
      <div className="h-9 w-64 animate-pulse bg-surface-2" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-28 animate-pulse bg-surface-2" />
        ))}
      </div>
      <div className="h-80 animate-pulse bg-surface-2" />
    </div>
  );
}
