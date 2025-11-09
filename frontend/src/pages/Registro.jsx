import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Registro() {
  const navigate = useNavigate();
  const [modo, setModo] = useState("login");
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    password: "",
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      navigate("/perfil");
    }
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    const url =
      modo === "login"
        ? "http://127.0.0.1:8000/api/usuarios/login/"
        : "http://127.0.0.1:8000/api/usuarios/registro/";

    const body =
      modo === "login"
        ? { email: formData.email, password: formData.password }
        : {
            username: formData.email,
            first_name: formData.first_name,
            last_name: formData.last_name,
            email: formData.email,
            phone: formData.phone,
            password: formData.password,
          };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        let msg = "Error al procesar la solicitud";
        try {
          const err = await res.json();
          msg = err.error || err.detail || JSON.stringify(err);
        } catch (e) {}
        alert(msg);
        return;
      }

      const data = await res.json();

      if (modo === "login") {
        localStorage.setItem("token", data.access);
        window.location.href = "/perfil";
      } else {
        alert("Registro exitoso. Ahora podés iniciar sesión.");
        setModo("login");
      }
    } catch (error) {
      alert("Error de conexión con el servidor");
    }
  };

  return (
    <div className="h-full min-h-[calc(100vh-6rem)] md:min-h-[calc(100vh-8rem)] flex flex-col md:flex-row">
      <div className="md:w-1/2 flex flex-col justify-center items-center bg-[#2F4858] text-white text-center py-12">
        <div>
          <h1 className="text-2xl md:text-3xl">Bienvenido/a a</h1>
          <h1 className="text-4xl md:text-5xl font-semibold">Ambos Norte</h1>
        </div>
      </div>
      <div className="md:w-1/2 flex flex-col justify-center items-center bg-white px-12 md:px-36 py-10">
        <div className="w-full max-w-md">
          <h2 className="text-2xl md:text-3xl font-semibold mb-6 text-center">
            {modo === "login" ? "Iniciá sesión" : "Creá tu cuenta"}
          </h2>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            {modo === "register" && (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <input
                    type="text"
                    name="first_name"
                    placeholder="Nombre"
                    value={formData.first_name}
                    onChange={handleChange}
                    required
                    className="w-full bg-gray-100 rounded-full px-6 py-3 text-base"
                  />
                  <input
                    type="text"
                    name="last_name"
                    placeholder="Apellido"
                    value={formData.last_name}
                    onChange={handleChange}
                    required
                    className="w-full bg-gray-100 rounded-full px-6 py-3 text-base"
                  />
                </div>
                <input
                  type="tel"
                  name="phone"
                  placeholder="Número de teléfono"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  className="w-full bg-gray-100 rounded-full px-6 py-3 text-base mt-4"
                />
              </div>
            )}
            <input
              type="email"
              name="email"
              placeholder="Correo electrónico"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full bg-gray-100 rounded-full px-6 py-3 text-base"
            />
            <input
              type="password"
              name="password"
              placeholder="Contraseña"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full bg-gray-100 rounded-full px-6 py-3 text-base"
            />
            {modo === "register" && (
              <label className="flex items-center gap-2 text-sm text-gray-500 mt-2">
                <input type="checkbox" required className="accent-[#2F4858]" />
                <span>
                  Acepto los Términos y Condiciones.
                </span>
              </label>
            )}
            <button type="submit" className="w-full bg-[#353945] text-white py-3 rounded-full text-base font-semibold hover:scale-[1.02] transition-transform duration-200">
              {modo === "login" ? "Iniciar sesión" : "Registrarse"}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-gray-600">
            {modo === "login" ? (
              <>
                ¿No tenés cuenta?{" "}
                <span onClick={() => setModo("register")} className="text-[#2F4858] font-semibold cursor-pointer hover:underline">
                  Registrate
                </span>
              </>
            ) : (
              <>
                ¿Ya tenés cuenta?{" "}
                <span
                  onClick={() => setModo("login")}
                  className="text-[#2F4858] font-semibold cursor-pointer hover:underline"
                >
                  Iniciá sesión
                </span>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}