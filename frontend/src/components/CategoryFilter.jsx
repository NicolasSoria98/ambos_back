export default function CategoryFilter() {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">PRODUCTOS</h2>
      <div className="space-y-4 text-sm">
        <div>
          <h3 className="font-medium mb-2">ORDENAR POR</h3>
          <div className="space-y-1">
            <label className="flex items-center gap-2">
              <input type="radio" name="orden" /> Menor precio
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="orden" /> Mayor precio
            </label>
          </div>
        </div>
        <div>
          <h3 className="font-medium mb-2">TALLA</h3>
          <div className="flex flex-wrap gap-2">
            {["XS", "S", "M", "L", "XL", "XXL"].map((talla) => (
              <button
                key={talla}
                className="border px-2 py-1 rounded hover:bg-[#2F4858] hover:text-white transition"
              >
                {talla}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}