export default function Footer({ fixed = false }) {
  const year = new Date().getFullYear();

  return (
    <footer className={`${fixed ? "fixed bottom-0 left-0" : "relative"} w-full bg-[#000000] text-[#F0F6F6]`}>
      <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between text-sm">
        <div className="flex flex-col gap-1">
          <p className="text-xl font-semibold tracking-wide">Ambos Norte</p>
          <p className="text-xs md:text-sm opacity-80">
            Comprá online y recibí tu pedido en tu domicilio.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-start md:justify-center gap-2 md:gap-3 text-xs md:text-sm">
          <div className="flex gap-3 flex-wrap">
            <a
              href="https://www.instagram.com/ambosoh_nordeste"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 hover:opacity-80 transition"
            >
              <span>Instagram</span>
            </a>
            <a
              href="https://l.instagram.com/?u=https%3A%2F%2Fchat.whatsapp.com%2FFCX2Pm5lgkO6MBVmItgUws%3Fmode%3Dr_t%26fbclid%3DPAZXh0bgNhZW0CMTEAc3J0YwZhcHBfaWQMMjU2MjgxMDQwNTU4CGNhbGxzaXRlAjE1AAGnZfCJmS8eveIOLgnkv7CAHCgVQB09N2ZPoVs4XTi2E8_fQciO8g1zkSGWJmE_aem_GD1lKnsQW0jHyIDhXU7vXA&e=AT07AE5EhfL7jSpIK0eBQTbnm0vVGgYp7BTefl6A8qr-5jp16LrmjN4icEmLNnLcErTYoHj7wOqpdBjTt7x8C0d6mwn9HKqDQC2K1L-Syw"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 hover:opacity-80 transition"
            >
              <span>WhatsApp</span>
            </a>
          </div>
        </div>
        <div className="flex flex-col gap-2 md:items-end text-xs md:text-sm">
          <p className="opacity-70">
            Ambos Norte © {year}. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}