import { Link, Outlet, useLocation } from "react-router-dom";
import { useState } from "react";
import { toast } from "react-toastify";

const AdminHome = () => {
  const [setIsLoggedIn] = useState(true); 
  const location = useLocation();

  const handleLogout = () => {
    
    setIsLoggedIn(false); 
    toast.success("Logged out successfully!");
    window.location.href = "/login"; 
  };

  
  const isManageRoute = 
    location.pathname === '/users' || 
    location.pathname === '/products' ||
    location.pathname.startsWith('/products/edit') ||
    location.pathname.startsWith('/products/add');

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 text-white flex flex-col justify-between p-4">
        <div>
          <h2 className="text-lg font-bold mb-4">Admin Panel</h2>
          <ul className="space-y-2">
            <li>
              <Link to="/users" className="block px-4 py-2 rounded hover:bg-gray-700">
                Manage Users
              </Link>
            </li>
            <li>
              <Link to="/products" className="block px-4 py-2 rounded hover:bg-gray-700">
                Manage Products
              </Link>
            </li>
          </ul>
        </div>
        <button
          onClick={handleLogout}
          className="mt-auto block w-full text-left px-4 py-2 rounded hover:bg-red-700 text-red"
        >
          Logout
        </button>
      </div>
      {/* Main Content Area */}
      <div className="flex-1 p-8 overflow-y-auto">
        {!isManageRoute && <h1 className="text-3xl font-bold mb-6">Welcome to the Admin Panel</h1>}
        {!isManageRoute && <img src="/banner.png" alt="Banner" className="w-full mb-6" />} {/* Display banner */}
        <Outlet /> {/* Render nested routes here */}
      </div>
    </div>
  );
};

export default AdminHome;
