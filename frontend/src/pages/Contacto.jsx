export default function Contacto() {
  return (
    <section className="h-full md:min-h-[calc(100vh-8rem)] bg-[#F0F6F6] px-6 md:px-20 py-16 flex flex-col md:flex-row items-center justify-center gap-12">
      <div className="w-full md:w-1/2 space-y-6">
        <div>
          <h1 className="text-3xl font-semibold text-[#2F4858] mb-2">CONTACTANOS</h1>
        </div>
        <form className="space-y-4">
          <input type="text" placeholder="Asunto" className="w-full border border-gray-300 rounded-md px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F4858]" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" placeholder="Tu nombre" className="border border-gray-300 rounded-md px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F4858]" />
            <input type="email" placeholder="E-mail" className="border border-gray-300 rounded-md px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F4858]" />
          </div>
          <textarea rows="8" placeholder="Descripción" className="w-full border border-gray-300 rounded-md px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2F4858]"></textarea>
          <button type="submit" className="bg-black text-white px-8 py-3 rounded-full text-sm hover:bg-gray-800 transition">
            ENVIAR CONSULTA
          </button>
        </form>
      </div>
      <div className="w-full md:w-1/2 flex justify-center">
        <div className="w-full max-w-md rounded-lg overflow-hidden shadow-md">
          Mapa
        </div>
      </div>
    </section>
  );
}