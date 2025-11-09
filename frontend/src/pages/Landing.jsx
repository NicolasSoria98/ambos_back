import Hero from "../assets/hero.png"

export default function Landing() {
  return (
    <main className="bg-[#F0F6F6]">
      <section className="relative h-[calc(100vh-3rem)] md:h-[calc(100vh-4rem)] flex flex-col md:flex-row items-center overflow-hidden">
        <div className="w-full md:w-1/2 text-center space-y-4 md:space-y-8 px-10 md:px-0 pt-10 flex flex-col items-center md:items-start">
          <div className="md:absolute md:top-[20%] md:left-[15%] max-w-50">
            <h1 className="text-4xl md:text-8xl font-bold md:leading-tight text-[#084B83]">
              <span className="bg-gradient-to-r from-pink-500 via-yellow-400 to-cyan-400 bg-[length:200%_200%] animate-gradient bg-clip-text text-transparent">
                Ambos
              </span>{" "}que te <br />acompañan.
            </h1>
            <p className="text-[#084B83] text-sm md:text-xl mt-4 z-10">
              Uniformes prácticos, con la calidad que necesitás para tu trabajo.
            </p>
            <button className="z-20 bg-[#42BFDD] text-[#084B83] px-4 md:px-8 py-2 md:py-4 rounded-full font-semibold text-sm md:text-base mt-6">
              VER CATÁLOGO
            </button>
          </div>
        </div>
        <div className="relative md:w-full md:absolute h-screen md:h-[calc(100vh-4rem)] md:left-[50%]">
          <img src={Hero} className="relative h-full z-10 md:mr-20 object-cover" />
        </div>
        <div className="absolute bottom-0 right-0 w-[100%] h-[30%] md:h-16 bg-[#FF66B3] z-0"></div>
      </section>
      <div className="bg-black text-white w-full h-12 flex items-center justify-center">
        <p className="text:md">Cuotas sin interés</p>
      </div>
      <section className="max-w-6xl mx-auto px-6 py-16 grid grid-cols-1 sm:grid-cols-2 gap-8">
        {["HOMBRES", "MUJERES"].map((category) => (
          <div key={category} className="bg-white shadow-sm rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md transition">
            <div className="bg-gray-200 h-40 flex items-center justify-center"></div>
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">
                Los favoritos de {category}
              </h2>
              <button className="bg-black text-white text-sm px-4 py-2 rounded-full font-semibold">
                VER TODO
              </button>
            </div>
          </div>
        ))}
      </section>
    </main>
  )
}