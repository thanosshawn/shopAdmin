import { useState } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useNavigate } from "react-router-dom";

const productTypes = [
  'Notebooks and Journals',
  'Pens and Pencils',
  'Paper and Notepads',
  'Planners and Calendars',
  'Office Supplies',
  'Art Supplies',
  'Desk Accessories',
  'Cards and Envelopes',
  'Writing Accessories',
  'Gift Wrap and Packaging',
];

const brands = [
  'Camel',
  'Faber-Castell',
  'Staedtler',
  'Doms',
  'Camlin',
  'Luxor',
  'Monami',
  'Schneider',
  'Pentel',
  'Pilot',
  'Kokuyo',
  'Nataraj',
  'OHPen',
  'Bic',
  'Zebra',
  'Stabilo',
];

const AddProduct = () => {
  const [newProduct, setNewProduct] = useState({
    name: "",
    description: "",
    price: "",
    brand: "",
    stock: "",
    type: "",
    image: "",
    image2: "",
    image3: "",
    showOnHome: false, // Added showOnHome boolean
  });
  const navigate = useNavigate();

  const handleAddProduct = async () => {
    await addDoc(collection(db, "products"), newProduct);
    navigate("/products");
  };

  const handleImageChange = (e, key) => {
    setNewProduct({ ...newProduct, [key]: e.target.value });
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6 text-center">Add New Product</h1>
      <div className="bg-white shadow-lg rounded-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            className="border border-gray-300 p-2 mb-4 w-full rounded"
            placeholder="Product Name"
            value={newProduct.name}
            onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
          />
          <input
            className="border border-gray-300 p-2 mb-4 w-full rounded"
            placeholder="Description"
            value={newProduct.description}
            onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
          />
          <input
            type="number"
            className="border border-gray-300 p-2 mb-4 w-full rounded"
            placeholder="Price (₹)"
            value={newProduct.price}
            onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
          />
          <select
            className="border border-gray-300 p-2 mb-4 w-full rounded"
            value={newProduct.brand}
            onChange={(e) => setNewProduct({ ...newProduct, brand: e.target.value })}
          >
            <option value="">Select Brand</option>
            {brands.map((brand) => (
              <option key={brand} value={brand}>{brand}</option>
            ))}
          </select>
          <input
            type="number"
            className="border border-gray-300 p-2 mb-4 w-full rounded"
            placeholder="Stock"
            value={newProduct.stock}
            onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
          />
          <select
            className="border border-gray-300 p-2 mb-4 w-full rounded"
            value={newProduct.type}
            onChange={(e) => setNewProduct({ ...newProduct, type: e.target.value })}
          >
            <option value="">Select Type</option>
            {productTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          {['image', 'image2', 'image3'].map((imgKey) => (
            <div key={imgKey} className="relative mb-4 w-full">
              <input
                className="border border-gray-300 p-2 mb-4 w-full rounded"
                placeholder={`${imgKey === 'image' ? 'Primary' : imgKey === 'image2' ? 'Secondary' : 'Tertiary'} Image URL`}
                value={newProduct[imgKey]}
                onChange={(e) => handleImageChange(e, imgKey)}
              />
              {newProduct[imgKey] && (
                <img src={newProduct[imgKey]} alt={`Preview of ${imgKey}`} className="absolute top-0 right-0 w-16 h-16 object-cover rounded border border-gray-200" />
              )}
            </div>
          ))}

          {/* Checkbox for showOnHome */}
          <div className="flex items-center mb-4">
            <input
              type="checkbox"
              checked={newProduct.showOnHome}
              onChange={(e) => setNewProduct({ ...newProduct, showOnHome: e.target.checked })}
              className="mr-2"
            />
            <label className="text-gray-700">Show on Home Page</label>
          </div>
        </div>
        <button
          className="bg-blue-500 text-white p-2 rounded shadow-lg hover:bg-blue-600 transition duration-200"
          onClick={handleAddProduct}
        >
          Add Product
        </button>
      </div>
    </div>
  );
};

export default AddProduct;
