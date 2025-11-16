import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./routes/ProtectedRoute.jsx";

import Navbar from "./components/Navbar.jsx";
import Registro from "./pages/Registro.jsx";
import Footer from "./components/Footer.jsx";
import Landing from "./pages/Landing.jsx";
import Catalogo from "./pages/Catalogo.jsx";
import Producto from "./pages/Producto.jsx";
import Carrito from "./pages/Carrito.jsx";
import EnvioPago from "./pages/EnvioPago.jsx";
import CompraExitosa from "./pages/CompraExitosa.jsx";
import PagoFallido from "./pages/PagoFallido.jsx";        
import PagoPendiente from "./pages/PagoPendiente.jsx";   
import Contacto from "./pages/Contacto.jsx";
import Perfil from "./pages/Perfil.jsx";
import AdminLogin from "./pages/admin/AdminLogin.jsx";
import AdminDashboard from "./pages/admin/Admin.jsx";
import AdminVentas from "./pages/admin/AdminVentas.jsx";
import AdminInventario from "./pages/Admin/AdminInventario.jsx";
import AdminProductos from "./pages/admin/AdminProductos.jsx";
import AdminPedidos from "./pages/Admin/AdminPedidos.jsx";
import AdminUsuarios from "./pages/Admin/AdminUsuarios.jsx";

function Layout() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");
  if (isAdmin) {
    return (
      <Routes>
        {/* Login de admin - sin protección */}
        <Route path="/admin/login" element={<AdminLogin />} />
        
        {/* Rutas protegidas del panel admin */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute requireAdmin>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/ventas"
          element={
            <ProtectedRoute requireAdmin>
              <AdminVentas />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/inventario"
          element={
            <ProtectedRoute requireAdmin>
              <AdminInventario />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/productos"
          element={
          <ProtectedRoute requireAdmin>
            <AdminProductos />
          </ProtectedRoute>
          }
        />
        <Route path="/admin/pedidos" element={
          <ProtectedRoute requireAdmin>
            <AdminPedidos />
          </ProtectedRoute>
          } 
        />
        <Route path="/admin/usuarios" element={
          <ProtectedRoute requireAdmin>
            <AdminUsuarios />
          </ProtectedRoute>
          }
        />
      </Routes>
    );
  }

  return (
    <div className={`flex flex-col min-h-screen`}>
      <Navbar />
      <main className={`flex-grow`}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/registro" element={<Registro />} />
          <Route path="/catalogo" element={<Catalogo />} />
          <Route path="/producto/:id" element={<Producto />} />
          <Route path="/carrito" element={<Carrito />} />
          <Route path="/enviopago" element={<EnvioPago />} />
          <Route path="/compra-exitosa" element={<CompraExitosa />} />
          <Route path="/pago-fallido" element={<PagoFallido />} />  
          <Route path="/pago-pendiente" element={<PagoPendiente />} />   
          <Route path="/contacto" element={<Contacto />} />
          <Route
            path="/perfil"
            element={
              <ProtectedRoute>
                <Perfil />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
      <Footer/>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Layout />
      </Router>
    </AuthProvider>
  );
}