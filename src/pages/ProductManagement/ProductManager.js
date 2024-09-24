import { useEffect, useState } from "react";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "../../firebase";
import { Link } from "react-router-dom";

const ProductManager = () => {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchProducts = async () => {
      const productsCol = collection(db, "products");
      const productSnapshot = await getDocs(productsCol);
      const productList = productSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(productList);
    };
    fetchProducts();
  }, []);

  const handleDeleteProduct = async (id) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this product?");
    if (confirmDelete) {
      await deleteDoc(doc(db, "products", id));
      setProducts(products.filter(product => product.id !== id));
    }
  };

  
  const formatPrice = (price) => {
    return `₹${Number(price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Manage Products</h1>
      <Link to="/products/add" className="mb-4 inline-block px-4 py-2 bg-green-500 text-white rounded">Add New Product</Link>
      
      <input
        type="text"
        placeholder="Search by name..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="border p-2 mb-4 w-full"
      />
      
      <table className="min-w-full bg-white border border-gray-200 rounded-lg">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-4 py-2">Thumbnail</th>
            <th className="border px-4 py-2">Name</th>
            <th className="border px-4 py-2">Brand</th>
            <th className="border px-4 py-2">Price (₹)</th>
            <th className="border px-4 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredProducts.map(product => (
            <tr key={product.id} className="hover:bg-gray-50">
              <td className="border px-4 py-2">
                {product.image && <img src={product.image} alt={product.name} className="w-12 h-12 object-cover rounded" />}
              </td>
              <td className="border px-4 py-2">{product.name}</td>
              <td className="border px-4 py-2">{product.brand}</td>
              <td className="border px-4 py-2">{formatPrice(product.price)}</td>
              <td className="border px-4 py-2">
                <Link to={`/products/edit/${product.id}`} className="bg-blue-500 text-white p-1 rounded mr-2">Edit</Link>
                <button onClick={() => handleDeleteProduct(product.id)} className="bg-red-500 text-white p-1 rounded">Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ProductManager;
