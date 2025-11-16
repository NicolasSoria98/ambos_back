import { Link } from "react-router-dom";

export default function ProductCard({ id, name, price, image }) {
  const displayPrice = typeof price === "number" ? `$${price.toFixed(2)}` : price;
  const imgSrc = image || "https://via.placeholder.com/400x300?text=Producto";

  return (
    <Link
      to={`/producto/${id}`}
      className="bg-white rounded-lg shadow hover:shadow-lg transition p-4 flex flex-col items-center cursor-pointer"
    >
      <img
        src={imgSrc}
        alt={name}
        className="w-full h-40 object-cover rounded-md mb-4"
      />
      <h3 className="text-base font-semibold">{name}</h3>
      <p className="text-gray-600 mb-3">{displayPrice}</p>

      <div className="bg-black text-white px-6 py-2 rounded-full text-sm hover:bg-gray-800 transition">
        COMPRAR
      </div>
    </Link>
  );
}
