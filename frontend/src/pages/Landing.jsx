import { Link } from 'react-router-dom';
import Hero from "../assets/hero.png";
import Mujer from "../assets/mujer.jpg";
import Hombre from "../assets/hombre.jpg";

export default function Landing() {
  return (
    <main className="bg-[#F0F6F6]">
      <section className="relative h-screen flex flex-col md:flex-row items-center overflow-hidden">
        <div className="w-full text-center md:text-left px-10 md:px-0 pt-24 flex flex-col items-center md:items-start">
          <div className="md:absolute md:bottom-[30%] md:left-[20%] space-y-4 md:space-y-8">
            <h1 className="text-4xl md:text-7xl font-bold md:leading-tight text-[#084B83]">
              <span className="bg-gradient-to-r from-pink-500 via-yellow-400 to-cyan-400 bg-[length:200%_200%] animate-gradient bg-clip-text text-transparent">
                Ambos
              </span>{" "}que te <br />acompañan.
            </h1>
            <p className="text-[#084B83] text-sm md:text-xl z-10">
              Uniformes prácticos, con la calidad <br />que necesitás para tu trabajo.
            </p>

            <Link to="/catalogo" className="z-20 bg-[#42BFDD] text-[#084B83] px-4 md:px-8 py-2 md:py-4 rounded-full font-semibold text-sm md:text-base inline-block text-center">
              VER CATÁLOGO
            </Link>
          </div>
        </div>
        <div className="hidden relative md:inline-block z-20 mr-20">
          <div className="w-40 h-40 bg-[#084B83] rounded-full flex items-center justify-center shadow-2xl transform -rotate-12 hover:rotate-0 hover:scale-110 transition-all duration-300 ease-out">
            <p className="font-bold text-xl text-white text-center uppercase leading-tight tracking-wide z-10 px-6 drop-shadow-lg">
              ¡Hacemos<br />Envíos!
            </p>
          </div>
        </div>
        <div className="relative md:absolute h-screen md:ml-[45%]">
          <img src={Hero} className="h-full md:mt-10 relative z-10 object-cover md:pt-4" />
        </div>
        <div className="absolute bottom-0 left-0 w-full h-56 md:h-24 bg-[#FF66B3] overflow-hidden z-0">
          <div className="hidden relative md:flex w-full h-full">
            <div className="flex items-center h-full md:animate-marquee whitespace-nowrap">
              <span className="mx-8 text-xs md:text-sm font-semibold tracking-[0.3em] text-[#084B83]">
                INSTAGRAM @AMBOSOH_NORDESTE
              </span>
              <span className="mx-8 text-xs md:text-sm font-semibold tracking-[0.3em] text-[#084B83]">
                INSTAGRAM @AMBOSOH_NORDESTE
              </span>
              <span className="mx-8 text-xs md:text-sm font-semibold tracking-[0.3em] text-[#084B83]">
                INSTAGRAM @AMBOSOH_NORDESTE
              </span>
              <span className="mx-8 text-xs md:text-sm font-semibold tracking-[0.3em] text-[#084B83]">
                INSTAGRAM @AMBOSOH_NORDESTE
              </span>
            </div>
            <div className="flex items-center h-full animate-marquee whitespace-nowrap">
              <span className="mx-8 text-xs md:text-sm font-semibold tracking-[0.3em] text-[#084B83]">
                INSTAGRAM @AMBOSOH_NORDESTE
              </span>
              <span className="mx-8 text-xs md:text-sm font-semibold tracking-[0.3em] text-[#084B83]">
                INSTAGRAM @AMBOSOH_NORDESTE
              </span>
              <span className="mx-8 text-xs md:text-sm font-semibold tracking-[0.3em] text-[#084B83]">
                INSTAGRAM @AMBOSOH_NORDESTE
              </span>
              <span className="mx-8 text-xs md:text-sm font-semibold tracking-[0.3em] text-[#084B83]">
                INSTAGRAM @AMBOSOH_NORDESTE
              </span>
            </div>
          </div>
        </div>
      </section>
      <div className="bg-[#084B83] text-white w-full md:h-12 h-24 flex items-center justify-center">
        <p className="text-center">Resistencia y Corrientes · Lunes a Viernes 9:00-13:00 y 17:00-21:00, Sábados 9:00-13:00 y 16:00-20:00</p>
      </div>
      <section className="max-w-6xl mx-auto px-6 pt-16 grid grid-cols-1 sm:grid-cols-2 gap-8">
        <div className="bg-white/90 backdrop-blur-sm border border-gray-200/70 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:border-[#084B83]/20 transition transform hover:-translate-y-1">
          <div className="relative h-40 md:h-80 overflow-hidden">
            <img src={Hombre}/>
          </div>
          <div className="p-6 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-[#084B83]">
                Para hombres
              </h2>
            </div>
            <Link
              to="/catalogo"
              className="inline-flex items-center gap-2 whitespace-nowrap bg-[#000000] text-[white] text-xs px-4 py-2 rounded-full font-semibold transition group-hover:translate-x-0.5"
            >
              VER TODO
            </Link>
          </div>
        </div>
        <div className="bg-white/90 backdrop-blur-sm border border-gray-200/70 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:border-[#084B83]/20 transition transform hover:-translate-y-1">
          <div className="relative h-40 md:h-80 overflow-hidden">
            <img src={Mujer} />
          </div>
          <div className="p-6 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-[#084B83]">
                Para mujeres
              </h2>
            </div>
            <Link
              to="/catalogo"
              className="inline-flex items-center gap-2 whitespace-nowrap bg-[#000000] text-[white] text-xs px-4 py-2 rounded-full font-semibold transition group-hover:translate-x-0.5"
            >
              VER TODO
            </Link>
          </div>
        </div>
      </section>
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-sm font-semibold tracking-wider text-[#084B83] mb-2">
            SUMATE A NOSOTROS
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-[#084B83] mb-4">
            Nuestro Canal
          </h2>
          <p className="text-[#084B83] mb-8 max-w-md mx-auto">
            Un espacio para enterarte antes que nadie de nuestras novedades, promos exclusivas y lanzamientos.
          </p>
          <a
            href="https://l.instagram.com/?u=https%3A%2F%2Fchat.whatsapp.com%2FFCX2Pm5lgkO6MBVmItgUws%3Fmode%3Dr_t%26fbclid%3DPAZXh0bgNhZW0CMTEAc3J0YwZhcHBfaWQMMjU2MjgxMDQwNTU4CGNhbGxzaXRlAjE1AAGn7t7aQxuJgmV7tPU-3u1qgQ4ED6xyXaeXyfR6m1RizWybSFN_N8tqjdKbEw4_aem__PIlia4bNP2jImwZC_C1MA&e=AT2HykbWOTHalO0zFFEvgJQoPGRN8xt2HYXNWgS_dDWye3g4jNgsz9iurdN0nYTF8bPh9qy5exFUev2kVwX9wlBZb0BJY3nNdCprJ8PUrg"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#25D366] text-white px-8 py-4 rounded-full font-semibold hover:bg-[#20BD5A] transition"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
            </svg>
            Unirme
          </a>
        </div>
      </section>
    </main>
  )
}