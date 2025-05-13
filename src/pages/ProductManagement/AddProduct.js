import { useState } from "react";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useNavigate } from "react-router-dom";

/**
 * Product types available for selection
 * These categories help organize products for better browsing experience
 */
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

/**
 * Brands available for selection
 * Maintaining a consistent brand list ensures data integrity
 */
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

/**
 * AddProduct Component
 * Allows administrators to add new products to the inventory
 * Enhanced with additional features for comprehensive product information
 */
const AddProduct = () => {
  const [newProduct, setNewProduct] = useState({
    name: "",
    description: "",
    price: "",
    mrp: "",
    sellingPrice: "",
    brand: "",
    stock: "",
    type: "",
    image: "",
    image2: "",
    image3: "",
    showOnHome: false,
    tags: [],
    slug: "",
    origin: "",
    additionalInfo: "",
    warranty: { available: false, period: "", details: "" },
    guarantee: { available: false, period: "", details: "" },
    importDetails: { isImported: false, country: "", deliveryNote: "" },
  });
  
  const [tagInput, setTagInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState(null);
  const [slugAvailability, setSlugAvailability] = useState({ checked: false, available: false });
  const navigate = useNavigate();

  /**
   * Handle product submission to database
   * Includes validation and feedback on submission status
   */
  const handleAddProduct = async () => {
    // Validation checks
    if (!newProduct.name || !newProduct.price) {
      alert("Product name and price are required!");
      return;
    }

    if (!newProduct.slug) {
      alert("Product URL slug is required!");
      return;
    }

    if (!slugAvailability.checked || !slugAvailability.available) {
      alert("Please check if the URL slug is available and valid!");
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmissionStatus("submitting");

      // Format slug one more time to ensure it's URL-friendly
      const formattedSlug = newProduct.slug.toLowerCase().trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]/g, '');

      // Sync price fields and remove slug from the object (it will be the document ID)
      const { slug, ...productToSave } = {
        ...newProduct,
        slug: formattedSlug, // Keep a copy in the document for reference
        sellingPrice: Number(newProduct.sellingPrice || newProduct.price),
        mrp: Number(newProduct.mrp || newProduct.price),
        price: Number(newProduct.sellingPrice || newProduct.price),
        stock: Number(newProduct.stock),
        createdAt: new Date()
      };

      // Use setDoc with a specific document ID (the slug) instead of addDoc
      const productRef = doc(db, "products", formattedSlug);
      await setDoc(productRef, productToSave);
      
      setSubmissionStatus("success");
      
      // Reset status after a delay and navigate back
      setTimeout(() => {
        setIsSubmitting(false);
        setSubmissionStatus(null);
        navigate("/products");
      }, 2000);
    } catch (error) {
      console.error("Error adding product:", error);
      setSubmissionStatus("error");
      setIsSubmitting(false);
    }
  };

  /**
   * Handle image URL changes
   * @param {Event} e - Input change event
   * @param {String} key - Image field key (image, image2, image3)
   */
  const handleImageChange = (e, key) => {
    setNewProduct({ ...newProduct, [key]: e.target.value });
  };

  /**
   * Check if URL slug is available
   * Ensures unique product IDs
   */
  const checkSlugAvailability = async () => {
    if (!newProduct.slug) {
      setSlugAvailability({ checked: false, available: false });
      return;
    }
    
    try {
      // Format the slug to be URL-friendly (lowercase, replace spaces with hyphens)
      const formattedSlug = newProduct.slug.toLowerCase().trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]/g, '');
      
      // Update the product's slug with the formatted version
      setNewProduct({ ...newProduct, slug: formattedSlug });
      
      // Check if this slug already exists as a document ID
      const docRef = doc(db, "products", formattedSlug);
      const docSnap = await getDoc(docRef);
      
      setSlugAvailability({ 
        checked: true, 
        available: !docSnap.exists() 
      });
    } catch (error) {
      console.error("Error checking slug availability:", error);
      setSlugAvailability({ checked: true, available: false });
    }
  };

  /**
   * Add a new tag to the product
   */
  const addTag = () => {
    if (tagInput.trim() && !newProduct.tags.includes(tagInput.trim())) {
      setNewProduct({
        ...newProduct,
        tags: [...newProduct.tags, tagInput.trim()]
      });
      setTagInput("");
    }
  };

  /**
   * Remove a tag from the product
   */
  const removeTag = (tagToRemove) => {
    setNewProduct({
      ...newProduct,
      tags: newProduct.tags.filter(tag => tag !== tagToRemove)
    });
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6 text-center">Add New Product</h1>
      <div className="bg-white shadow-lg rounded-lg p-6 mb-6">
        {/* Basic Information Section */}
        <h2 className="text-xl font-semibold mb-4 border-b pb-2">Basic Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">Product Name *</label>
            <input
              className="border border-gray-300 p-2 mb-4 w-full rounded"
              placeholder="Product Name"
              value={newProduct.name}
              onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">Brand</label>
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
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">Product Type</label>
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
          </div>
          
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">Stock *</label>
            <input
              type="number"
              className="border border-gray-300 p-2 mb-4 w-full rounded"
              placeholder="Stock"
              value={newProduct.stock}
              onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
              required
            />
          </div>
        </div>

        {/* Product URL Section */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">Product URL (Required)</h2>
          <div className="flex items-end gap-2 mb-2">
            <div className="flex-grow">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Product URL Slug *
                <span className="ml-1 text-red-500">Required - Will be used as product ID</span>
              </label>
              <div className="flex items-center">
                <span className="bg-gray-100 p-2 border border-r-0 rounded-l">website.com/product/</span>
                <input
                  className={`border p-2 flex-grow rounded-r ${
                    slugAvailability.checked 
                      ? slugAvailability.available ? 'border-green-500' : 'border-red-500' 
                      : ''
                  }`}
                  placeholder="your-product-name"
                  value={newProduct.slug}
                  onChange={(e) => setNewProduct({ ...newProduct, slug: e.target.value })}
                  required
                />
              </div>
              <p className="text-sm text-gray-500 mt-1">
                URL slug must be unique and will be used as the product's identifier.
              </p>
            </div>
            <button
              className="bg-blue-500 text-white p-2 rounded ml-2"
              onClick={checkSlugAvailability}
            >
              Check Availability
            </button>
          </div>
          {slugAvailability.checked && (
            <p className={slugAvailability.available ? 'text-green-500' : 'text-red-500'}>
              {slugAvailability.available 
                ? 'URL is available!' 
                : 'URL is already taken or invalid. Please try another one.'}
            </p>
          )}
        </div>

        {/* Pricing Section */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">Pricing</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">MRP (₹)</label>
              <input
                type="number"
                className="border border-gray-300 p-2 mb-4 w-full rounded"
                placeholder="MRP Price"
                value={newProduct.mrp}
                onChange={(e) => setNewProduct({ ...newProduct, mrp: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">Selling Price (₹) *</label>
              <input
                type="number"
                className="border border-gray-300 p-2 mb-4 w-full rounded"
                placeholder="Selling Price"
                value={newProduct.sellingPrice}
                onChange={(e) => setNewProduct({ 
                  ...newProduct, 
                  sellingPrice: e.target.value,
                  price: e.target.value
                })}
                required
              />
              {Number(newProduct.mrp) > Number(newProduct.sellingPrice) && Number(newProduct.sellingPrice) > 0 && (
                <div className="text-green-600 text-sm">
                  {Math.round((Number(newProduct.mrp) - Number(newProduct.sellingPrice)) / Number(newProduct.mrp) * 100)}% off
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Tags Section */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">Product Tags</h2>
          <div className="flex flex-wrap gap-2 mb-4">
            {newProduct.tags.map((tag, index) => (
              <div key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full flex items-center">
                {tag}
                <button 
                  onClick={() => removeTag(tag)}
                  className="ml-1 text-blue-800 hover:text-red-500"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div className="flex">
            <input
              className="border p-2 flex-grow rounded-l"
              placeholder="Add a tag"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addTag()}
            />
            <button
              className="bg-blue-500 text-white p-2 rounded-r"
              onClick={addTag}
            >
              Add Tag
            </button>
          </div>
        </div>

        {/* Product Origin/Import Details */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">Origin & Import Details</h2>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">Country of Origin</label>
            <input
              className="border border-gray-300 p-2 mb-4 w-full rounded"
              placeholder="e.g., India, Japan, Germany"
              value={newProduct.origin}
              onChange={(e) => setNewProduct({ ...newProduct, origin: e.target.value })}
            />
          </div>
          
          <div className="flex items-center mb-4">
            <input
              type="checkbox"
              checked={newProduct.importDetails.isImported}
              onChange={(e) => setNewProduct({ 
                ...newProduct, 
                importDetails: { 
                  ...newProduct.importDetails, 
                  isImported: e.target.checked 
                } 
              })}
              className="mr-2"
            />
            <label className="text-gray-700">This is an imported product</label>
          </div>
          
          {newProduct.importDetails.isImported && (
            <>
              <div className="pl-6 mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">Imported From</label>
                <input
                  className="border border-gray-300 p-2 mb-4 w-full rounded"
                  placeholder="e.g., Japan"
                  value={newProduct.importDetails.country}
                  onChange={(e) => setNewProduct({ 
                    ...newProduct, 
                    importDetails: { 
                      ...newProduct.importDetails, 
                      country: e.target.value 
                    } 
                  })}
                />
              </div>
              <div className="pl-6">
                <label className="block text-gray-700 text-sm font-bold mb-2">Delivery Note</label>
                <textarea
                  className="border border-gray-300 p-2 mb-4 w-full rounded"
                  placeholder="e.g., May take 3-4 weeks for delivery"
                  value={newProduct.importDetails.deliveryNote}
                  onChange={(e) => setNewProduct({ 
                    ...newProduct, 
                    importDetails: { 
                      ...newProduct.importDetails, 
                      deliveryNote: e.target.value 
                    } 
                  })}
                  rows="2"
                />
              </div>
            </>
          )}
        </div>

        {/* Warranty & Guarantee Section */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">Warranty & Guarantee</h2>
          
          {/* Warranty Section */}
          <div className="mb-6">
            <div className="flex items-center mb-4">
              <input
                type="checkbox"
                checked={newProduct.warranty.available}
                onChange={(e) => setNewProduct({ 
                  ...newProduct, 
                  warranty: { 
                    ...newProduct.warranty, 
                    available: e.target.checked 
                  } 
                })}
                className="mr-2"
              />
              <label className="text-gray-700">Product has warranty</label>
            </div>
            
            {newProduct.warranty.available && (
              <div className="pl-6">
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">Warranty Period</label>
                  <input
                    className="border border-gray-300 p-2 mb-4 w-full rounded"
                    placeholder="e.g., 1 year, 6 months"
                    value={newProduct.warranty.period}
                    onChange={(e) => setNewProduct({ 
                      ...newProduct, 
                      warranty: { 
                        ...newProduct.warranty, 
                        period: e.target.value 
                      } 
                    })}
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2">Warranty Details</label>
                  <textarea
                    className="border border-gray-300 p-2 mb-4 w-full rounded"
                    placeholder="Describe what the warranty covers..."
                    value={newProduct.warranty.details}
                    onChange={(e) => setNewProduct({ 
                      ...newProduct, 
                      warranty: { 
                        ...newProduct.warranty, 
                        details: e.target.value 
                      } 
                    })}
                    rows="3"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Guarantee Section */}
          <div>
            <div className="flex items-center mb-4">
              <input
                type="checkbox"
                checked={newProduct.guarantee.available}
                onChange={(e) => setNewProduct({ 
                  ...newProduct, 
                  guarantee: { 
                    ...newProduct.guarantee, 
                    available: e.target.checked 
                  } 
                })}
                className="mr-2"
              />
              <label className="text-gray-700">Product has guarantee</label>
            </div>
            
            {newProduct.guarantee.available && (
              <div className="pl-6">
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">Guarantee Period</label>
                  <input
                    className="border border-gray-300 p-2 mb-4 w-full rounded"
                    placeholder="e.g., Lifetime, 3 years"
                    value={newProduct.guarantee.period}
                    onChange={(e) => setNewProduct({ 
                      ...newProduct, 
                      guarantee: { 
                        ...newProduct.guarantee, 
                        period: e.target.value 
                      } 
                    })}
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2">Guarantee Details</label>
                  <textarea
                    className="border border-gray-300 p-2 mb-4 w-full rounded"
                    placeholder="Describe what the guarantee covers..."
                    value={newProduct.guarantee.details}
                    onChange={(e) => setNewProduct({ 
                      ...newProduct, 
                      guarantee: { 
                        ...newProduct.guarantee, 
                        details: e.target.value 
                      } 
                    })}
                    rows="3"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Description & Additional Info */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">Description & Additional Info</h2>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">Product Description *</label>
            <textarea
              className="border border-gray-300 p-2 mb-4 w-full rounded"
              placeholder="Detailed description of the product..."
              value={newProduct.description}
              onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
              rows="4"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">Additional Information</label>
            <textarea
              className="border border-gray-300 p-2 mb-4 w-full rounded"
              placeholder="Any additional information like usage instructions, materials, etc."
              value={newProduct.additionalInfo}
              onChange={(e) => setNewProduct({ ...newProduct, additionalInfo: e.target.value })}
              rows="4"
            />
          </div>
        </div>

        {/* Product Images */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">Product Images</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['image', 'image2', 'image3'].map((imgKey, index) => (
              <div key={imgKey} className="relative mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  {index === 0 ? 'Primary Image URL *' : index === 1 ? 'Secondary Image URL' : 'Tertiary Image URL'}
                </label>
                <input
                  className="border border-gray-300 p-2 mb-2 w-full rounded"
                  placeholder={`${index === 0 ? 'Primary' : index === 1 ? 'Secondary' : 'Tertiary'} Image URL`}
                  value={newProduct[imgKey]}
                  onChange={(e) => handleImageChange(e, imgKey)}
                  required={index === 0}
                />
                {newProduct[imgKey] && (
                  <img 
                    src={newProduct[imgKey]} 
                    alt={`Preview of ${imgKey}`} 
                    className="w-full h-40 object-contain border rounded" 
                  />
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Visibility Settings */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">Visibility Settings</h2>
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
          className={`w-full py-3 rounded text-white font-bold transition-all duration-300 ${
            isSubmitting 
              ? 'bg-gray-400 cursor-not-allowed' 
              : submissionStatus === 'success' 
                ? 'bg-green-500'
                : submissionStatus === 'error'
                  ? 'bg-red-500'
                  : 'bg-blue-500 hover:bg-blue-600'
          }`}
          onClick={handleAddProduct}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Adding Product..." :
           submissionStatus === 'success' ? "Product Added!" :
           submissionStatus === 'error' ? "Error! Try Again" : "Add Product"}
        </button>
      </div>
    </div>
  );
};

export default AddProduct;
