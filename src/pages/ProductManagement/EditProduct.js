import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useNavigate, useParams } from "react-router-dom";

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

const EditProduct = () => {
  const [product, setProduct] = useState(null);
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProduct = async () => {
      const productRef = doc(db, "products", id);
      const productDoc = await getDoc(productRef);
      if (productDoc.exists()) {
        setProduct(productDoc.data());
      }
    };
    fetchProduct();
  }, [id]);

  const handleUpdateProduct = async () => {
    const productRef = doc(db, "products", id);
    await updateDoc(productRef, product);
    navigate("/products");
  };

  if (!product) return <div>Loading...</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Edit Product</h1>
      <div className="bg-white shadow-md rounded p-6 mb-6">
        <input
          className="border p-2 mb-4 w-full"
          placeholder="Name"
          value={product.name}
          onChange={(e) => setProduct({ ...product, name: e.target.value })}
        />
        <input
          className="border p-2 mb-4 w-full"
          placeholder="Description"
          value={product.description}
          onChange={(e) => setProduct({ ...product, description: e.target.value })}
        />
        <input
          type="number"
          className="border p-2 mb-4 w-full"
          placeholder="Price (₹)"
          value={product.price}
          onChange={(e) => setProduct({ ...product, price: Number(e.target.value) })}
        />
        <input
          type="number"
          className="border p-2 mb-4 w-full"
          placeholder="Stock"
          value={product.stock}
          onChange={(e) => setProduct({ ...product, stock: Number(e.target.value) })}
        />
        <select
          className="border p-2 mb-4 w-full"
          value={product.brand}
          onChange={(e) => setProduct({ ...product, brand: e.target.value })}
        >
          <option value="">Select Brand</option>
          {brands.map((brand) => (
            <option key={brand} value={brand}>{brand}</option>
          ))}
        </select>
        <select
          className="border p-2 mb-4 w-full"
          value={product.type}
          onChange={(e) => setProduct({ ...product, type: e.target.value })}
        >
          <option value="">Select Type</option>
          {productTypes.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
        <input
          className="border p-2 mb-4 w-full"
          placeholder="Image URL"
          value={product.image}
          onChange={(e) => setProduct({ ...product, image: e.target.value })}
        />
        <input
          className="border p-2 mb-4 w-full"
          placeholder="Secondary Image URL"
          value={product.image2}
          onChange={(e) => setProduct({ ...product, image2: e.target.value })}
        />
        <input
          className="border p-2 mb-4 w-full"
          placeholder="Tertiary Image URL"
          value={product.image3}
          onChange={(e) => setProduct({ ...product, image3: e.target.value })}
        />
        
        {/* Checkbox for showOnHome */}
        <div className="flex items-center mb-4">
          <input
            type="checkbox"
            checked={product.showOnHome}
            onChange={(e) => setProduct({ ...product, showOnHome: e.target.checked })}
            className="mr-2"
          />
          <label className="text-gray-700">Show on Home Page</label>
        </div>

        <button
          className="bg-blue-500 text-white p-2 rounded"
          onClick={handleUpdateProduct}
        >
          Update Product
        </button>
      </div>
    </div>
  );
};

export default EditProduct;
