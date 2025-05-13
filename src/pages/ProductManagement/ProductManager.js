import { useEffect, useState, useCallback } from "react";
import { collection, getDocs, deleteDoc, doc, query, limit, orderBy, startAfter } from "firebase/firestore";
import { db } from "../../firebase";
import { Link } from "react-router-dom";

/**
 * ProductManager Component
 * Manages the display and management of products with pagination
 * Implements API rate limiting by loading products in chunks
 */
const ProductManager = () => {
  // State variables
  const [products, setProducts] = useState([]); // Store loaded products
  const [searchTerm, setSearchTerm] = useState(""); // Search filter text
  const [isLoading, setIsLoading] = useState(false); // Loading state
  const [lastVisible, setLastVisible] = useState(null); // Last document for pagination
  const [isMoreDataAvailable, setIsMoreDataAvailable] = useState(true); // Check if more data is available
  const [productsPerPage] = useState(5); // Number of products to load per page
  const [isDeleting, setIsDeleting] = useState(false); // Delete operation state

  /**
   * Fetch the initial set of products
   * Uses a Firestore query with ordering and pagination
   */
  const fetchInitialProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      // Create query with limit and ordering
      const productsRef = collection(db, "products");
      const q = query(productsRef, orderBy("name"), limit(productsPerPage));
      const snapshot = await getDocs(q);
      
      // Handle empty result
      if (snapshot.empty) {
        setProducts([]);
        setIsMoreDataAvailable(false);
        setIsLoading(false);
        return;
      }
      
      // Process results
      const productList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(productList);
      
      // Set the last document for pagination
      const lastVisibleDoc = snapshot.docs[snapshot.docs.length - 1];
      setLastVisible(lastVisibleDoc);
      setIsMoreDataAvailable(snapshot.docs.length === productsPerPage);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setIsLoading(false);
    }
  }, [productsPerPage]);

  /**
   * Initial fetch of products when component mounts
   */
  useEffect(() => {
    fetchInitialProducts();
  }, [fetchInitialProducts]);
  
  /**
   * Load more products - fetches the next set of products
   */
  const fetchMoreProducts = async () => {
    if (!lastVisible || !isMoreDataAvailable) return;
    
    setIsLoading(true);
    try {
      const productsRef = collection(db, "products");
      const q = query(
        productsRef, 
        orderBy("name"),
        startAfter(lastVisible),
        limit(productsPerPage)
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        setIsMoreDataAvailable(false);
        setIsLoading(false);
        return;
      }
      
      const moreProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(prevProducts => [...prevProducts, ...moreProducts]);
      
      const lastVisibleDoc = snapshot.docs[snapshot.docs.length - 1];
      setLastVisible(lastVisibleDoc);
      setIsMoreDataAvailable(snapshot.docs.length === productsPerPage);
    } catch (error) {
      console.error("Error fetching more products:", error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle product deletion
   * @param {string} id - Product ID to delete
   */
  const handleDeleteProduct = async (id) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this product?");
    if (confirmDelete) {
      setIsDeleting(true);
      try {
        await deleteDoc(doc(db, "products", id));
        
        // Update the products list after deletion
        setProducts(products.filter(product => product.id !== id));
        
        // If we deleted all products on the current page, try to load more
        if (products.length <= 1) {
          fetchInitialProducts();
        }
      } catch (error) {
        console.error("Error deleting product:", error);
        alert("Failed to delete product. Please try again.");
      } finally {
        setIsDeleting(false);
      }
    }
  };
  
  /**
   * Format price to Indian currency format
   * @param {number} price - The price to format
   * @returns {string} - Formatted price string
   */
  const formatPrice = (price) => {
    return `₹${Number(price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  /**
   * Filter products based on search term
   */
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  /**
   * Reset search and fetch initial products
   */
  const handleClearSearch = () => {
    setSearchTerm("");
    fetchInitialProducts();
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Manage Products</h1>
      
      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Link to="/products/add" className="inline-block px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition duration-200">
          Add New Product
        </Link>
        {searchTerm && (
          <button 
            onClick={handleClearSearch}
            className="inline-block px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition duration-200"
          >
            Clear Search
          </button>
        )}
      </div>
      
      {/* Search bar */}
      <div className="mb-4 relative">
        <input
          type="text"
          placeholder="Search by product name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border p-2 w-full rounded pl-10"
        />
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-5 w-5 absolute top-3 left-3 text-gray-400" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      
      {/* Products Table */}
      {isLoading && products.length === 0 ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
        </div>
      ) : filteredProducts.length > 0 ? (
        <>
          <table className="min-w-full bg-white border border-gray-200 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-4 py-2">Thumbnail</th>
                <th className="border px-4 py-2">Name</th>
                <th className="border px-4 py-2">Brand</th>
                <th className="border px-4 py-2 hidden md:table-cell">Type</th>
                <th className="border px-4 py-2">Price (₹)</th>
                <th className="border px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(product => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="border px-4 py-2">
                    {product.image && (
                      <img 
                        src={product.image} 
                        alt={product.name} 
                        className="w-12 h-12 object-cover rounded" 
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "https://via.placeholder.com/150?text=No+Image";
                        }}
                      />
                    )}
                  </td>
                  <td className="border px-4 py-2">{product.name}</td>
                  <td className="border px-4 py-2">{product.brand || "—"}</td>
                  <td className="border px-4 py-2 hidden md:table-cell">{product.type || "—"}</td>
                  <td className="border px-4 py-2">
                    {product.sellingPrice ? (
                      <div>
                        <div className="font-semibold">{formatPrice(product.sellingPrice)}</div>
                        {product.mrp && product.mrp > product.sellingPrice && (
                          <div className="text-sm text-gray-500 line-through">{formatPrice(product.mrp)}</div>
                        )}
                      </div>
                    ) : (
                      formatPrice(product.price)
                    )}
                  </td>
                  <td className="border px-4 py-2">
                    <div className="flex gap-1">
                      <Link 
                        to={`/products/edit/${product.id}`} 
                        className="bg-blue-500 text-white p-1 rounded hover:bg-blue-600 transition duration-200 text-sm whitespace-nowrap"
                      >
                        Edit
                      </Link>
                      <button 
                        onClick={() => handleDeleteProduct(product.id)} 
                        className="bg-red-500 text-white p-1 rounded hover:bg-red-600 transition duration-200 text-sm whitespace-nowrap"
                        disabled={isDeleting}
                      >
                        {isDeleting ? "..." : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {/* Load More Button */}
          {!searchTerm && isMoreDataAvailable && (
            <div className="flex justify-center mt-4">
              <button 
                onClick={fetchMoreProducts}
                disabled={isLoading}
                className={`px-6 py-2 rounded ${isLoading ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'} text-white transition duration-200`}
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                    Loading...
                  </div>
                ) : (
                  'Load More Products'
                )}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="bg-gray-100 p-8 rounded-lg text-center text-gray-500">
          <p className="text-lg mb-4">No products found</p>
          {searchTerm && (
            <p>Try clearing your search or adding a new product.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductManager;
