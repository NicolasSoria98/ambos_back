import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Registro() {
  const navigate = useNavigate();
  const { loginCliente, register, isAuthenticated, user, isAdmin } = useAuth(); 
  const [modo, setModo] = useState("login");
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    telefono: "",
    username: "",
    password: "",
    password_confirm: "",
  });

  useEffect(() => {
    if (isAuthenticated && user && !isAdmin) { 
      navigate("/perfil");
    }
  }, [isAuthenticated, user, isAdmin, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === "telefono") {
      const numericValue = value.replace(/\D/g, '').slice(0, 10);
      setFormData((prev) => ({ ...prev, [name]: numericValue }));
      return;
    }
    
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    if (name === "email") {
      const username = value.split('@')[0];
      setFormData((prev) => ({ ...prev, username }));
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (modo === "login") {
        const result = await loginCliente(formData.email, formData.password);
        
        if (result.success) {
          navigate("/perfil");
        } else {
          alert(result.message || "Credenciales incorrectas");
        }
      } else {
        if (formData.password !== formData.password_confirm) {
          alert("Las contraseñas no coinciden");
          setLoading(false);
          return;
        }

        if (formData.telefono.length !== 10) {
          alert("El teléfono debe tener exactamente 8 dígitos");
          setLoading(false);
          return;
        }

        const result = await register({
          username: formData.username || formData.email.split('@')[0],
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          telefono: formData.telefono,
          password: formData.password,
          password_confirm: formData.password_confirm,
        });

        if (result.success) {
          navigate("/perfil");
        } else {
          alert(result.message || "Error al registrarse");
        }
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error de conexión con el servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col md:flex-row z-0">
      <div className="md:w-1/2 flex flex-col justify-center items-center bg-[#084B83] text-white text-center py-12 mt-16">
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
                  name="telefono"
                  placeholder="Número de teléfono"
                  value={formData.telefono}
                  onChange={handleChange}
                  required
                  pattern="[0-9]{10}"
                  title="Debe ingresar exactamente 10 dígitos numéricos"
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
              minLength={8}
              className="w-full bg-gray-100 rounded-full px-6 py-3 text-base"
            />
            {modo === "register" && (
              <input
                type="password"
                name="password_confirm"
                placeholder="Confirmar contraseña"
                value={formData.password_confirm}
                onChange={handleChange}
                required
                minLength={8}
                className="w-full bg-gray-100 rounded-full px-6 py-3 text-base"
              />
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#353945] text-white py-3 rounded-full text-base font-semibold hover:scale-[1.02] transition-transform duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span>Procesando...</span>
              ) : modo === "login" ? (
                "Iniciar sesión"
              ) : (
                "Registrarse"
              )}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-gray-600">
            {modo === "login" ? (
              <>
                ¿No tenés cuenta?{" "}
                <span
                  onClick={() => setModo("register")}
                  className="text-[#2F4858] font-semibold cursor-pointer hover:underline"
                >
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