import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function CompraExitosa() {
  const [orden, setOrden] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const raw = localStorage.getItem("last_order");
      const o = raw ? JSON.parse(raw) : null;
      setOrden(o);
    } catch {
      setOrden(null);
    }
  }, []);

  const verOrden = () => {
    navigate("/perfil?tab=pedidos");
  };

  const idTexto = orden?.id ? `#${orden.id}` : "-";

  return (
    <section className="h-full md:min-h-[calc(100vh-8rem)] bg-[#F0F6F6] px-6 md:px-20 py-20 flex flex-col items-center text-center">
      <div className="bg-white shadow rounded-lg p-10 max-w-xl">
        <img src="https://cdn-icons-png.flaticon.com/512/2910/2910791.png" alt="Compra exitosa" className="w-32 mx-auto mb-6"/>
        <h1 className="text-2xl font-semibold mb-2 text-[#2F4858]">¡Gracias por tu compra!</h1>
        <p className="text-gray-600 mb-6">
          Número de orden <span className="font-semibold text-black">{idTexto}</span>
        </p>
        <div className="flex justify-center gap-4">
          <button onClick={verOrden} className="bg-black text-white px-6 py-2 rounded-full hover:bg-gray-800 transition">
            Ver orden
          </button>
          <a href="/" className="border border-gray-400 text-gray-700 px-6 py-2 rounded-full hover:bg-gray-100 transition">
            Continuar comprando
          </a>
        </div>
      </div>
    </section>
  );
}

