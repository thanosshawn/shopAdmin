import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate } from 'react-router-dom';

/**
 * Admin Orders Management Page
 * 
 * This component allows admins to:
 * - View all orders in the system
 * - Filter orders by status
 * - Approve or decline orders
 * - Add tracking information to shipped orders
 * - View order details
 */
function Orders() {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [trackingInfo, setTrackingInfo] = useState({ code: '', carrier: 'IndiaPost' });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [processingAction, setProcessingAction] = useState(false);
  const navigate = useNavigate();
  
  // Define order status options and colors
  const ORDER_STATUS = {
    PLACED: { label: 'Placed', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    APPROVED: { label: 'Approved', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    PACKED: { label: 'Packed', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
    SHIPPED: { label: 'Shipped', color: 'bg-purple-100 text-purple-800 border-purple-200' },
    DELIVERED: { label: 'Delivered', color: 'bg-green-100 text-green-800 border-green-200' },
    DECLINED: { label: 'Declined', color: 'bg-red-100 text-red-800 border-red-200' },
    CANCELLED: { label: 'Cancelled', color: 'bg-gray-100 text-gray-800 border-gray-200' }
  };

  /**
   * Fetch all orders from Firestore
   */
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const ordersQuery = query(collection(db, "orders"), orderBy("orderDate", "desc"));
        const ordersSnapshot = await getDocs(ordersQuery);
        
        const ordersData = ordersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setOrders(ordersData);
        setFilteredOrders(ordersData);
      } catch (error) {
        console.error("Error fetching orders:", error);
        toast.error("Error loading orders: " + error.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchOrders();
  }, []);
  
  /**
   * Filter orders based on selected status
   */
  useEffect(() => {
    if (statusFilter === 'all') {
      setFilteredOrders(orders);
    } else {
      setFilteredOrders(orders.filter(order => 
        order.status && order.status.toLowerCase() === statusFilter.toLowerCase()
      ));
    }
  }, [statusFilter, orders]);
  
  /**
   * Update order status in Firestore
   */
  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      setProcessingAction(true);
      
      // Get current order data
      const orderRef = doc(db, "orders", orderId);
      const orderSnap = await getDoc(orderRef);
      
      if (!orderSnap.exists()) {
        throw new Error("Order not found");
      }
      
      const orderData = orderSnap.data();
      
      // Create status history entry
      const statusUpdate = {
        status: newStatus,
        timestamp: new Date().toISOString(),
        note: `Order ${newStatus.toLowerCase()} by admin`
      };
      
      // Update order with new status and history
      await updateDoc(orderRef, {
        status: newStatus,
        statusHistory: [...(orderData.statusHistory || []), statusUpdate],
      });
      
      // Update local state
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? { 
                ...order, 
                status: newStatus,
                statusHistory: [...(order.statusHistory || []), statusUpdate]
              } 
            : order
        )
      );
      
      // Close modal if open
      if (isModalOpen) {
        setIsModalOpen(false);
      }
      
      toast.success(`Order ${orderId} ${newStatus.toLowerCase()} successfully`);
    } catch (error) {
      console.error(`Error updating order status:`, error);
      toast.error(`Failed to update order: ${error.message}`);
    } finally {
      setProcessingAction(false);
    }
  };
  
  /**
   * Add tracking information to an order
   */
  const addTracking = async (e) => {
    e.preventDefault();
    
    if (!selectedOrder || !trackingInfo.code) {
      toast.error("Please enter a valid tracking code");
      return;
    }
    
    try {
      setProcessingAction(true);
      
      // Update order with tracking info
      const orderRef = doc(db, "orders", selectedOrder.id);
      await updateDoc(orderRef, {
        status: 'Shipped',
        tracking: trackingInfo,
        statusHistory: [
          ...(selectedOrder.statusHistory || []),
          {
            status: 'Shipped',
            timestamp: new Date().toISOString(),
            note: `Shipped with tracking code: ${trackingInfo.code}`
          }
        ]
      });
      
      // Update local state
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === selectedOrder.id 
            ? { 
                ...order, 
                status: 'Shipped',
                tracking: trackingInfo,
                statusHistory: [
                  ...(order.statusHistory || []),
                  {
                    status: 'Shipped',
                    timestamp: new Date().toISOString(),
                    note: `Shipped with tracking code: ${trackingInfo.code}`
                  }
                ]
              } 
            : order
        )
      );
      
      setIsModalOpen(false);
      setSelectedOrder(null);
      setTrackingInfo({ code: '', carrier: 'IndiaPost' });
      
      toast.success(`Tracking information added to order ${selectedOrder.id}`);
    } catch (error) {
      console.error("Error adding tracking:", error);
      toast.error(`Failed to add tracking: ${error.message}`);
    } finally {
      setProcessingAction(false);
    }
  };

  /**
   * Format date to display in a user-friendly way
   */
  const formatDate = (dateString) => {
    const options = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString('en-IN', options);
  };

  /**
   * Format price as currency
   */
  const formatPrice = (price) => {
    return `₹${Number(price).toFixed(2)}`;
  };

  /**
   * Open order details modal
   */
  const openOrderDetails = (order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  return (
    <div className="p-6">
      <ToastContainer position="top-right" autoClose={3000} />
      
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Order Management</h1>
        <p className="text-gray-600">View and manage all customer orders</p>
      </div>
      
      {/* Status Filter */}
      <div className="mb-6 flex flex-wrap items-center gap-2 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <span className="text-gray-700 font-medium">Filter by status:</span>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors
              ${statusFilter === 'all' 
                ? 'bg-gray-800 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            All Orders
          </button>
          
          {Object.entries(ORDER_STATUS).map(([key, { label, color }]) => (
            <button
              key={key}
              onClick={() => setStatusFilter(label)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                ${statusFilter === label 
                  ? 'bg-gray-800 text-white' 
                  : `hover:bg-gray-200 ${color}`}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Order List */}
      {loading ? (
        <div className="flex justify-center my-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-500"></div>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center border border-gray-200">
          <svg 
            className="w-16 h-16 mx-auto text-gray-400 mb-4" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
          <h3 className="text-lg font-medium text-gray-700 mb-1">No orders found</h3>
          <p className="text-gray-500">
            {statusFilter === 'all' 
              ? "There are no orders in the system yet" 
              : `No orders with status "${statusFilter}" found`}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-6 gap-4 p-4 bg-gray-50 border-b border-gray-200 font-medium text-gray-700">
            <div className="col-span-2">Order Details</div>
            <div>Customer</div>
            <div>Amount</div>
            <div>Status</div>
            <div>Actions</div>
          </div>
          
          {/* Table Body */}
          <div className="divide-y divide-gray-200">
            {filteredOrders.map((order) => (
              <div key={order.id} className="grid grid-cols-6 gap-4 p-4 items-center hover:bg-gray-50 transition-colors">
                {/* Order Details */}
                <div className="col-span-2">
                  <div className="flex items-start gap-3">
                    <div className="font-medium text-gray-800 truncate">{order.orderId}</div>
                  </div>
                  <div className="text-sm text-gray-500 mt-1">{formatDate(order.orderDate)}</div>
                  <div className="text-sm text-gray-500 mt-1">{order.items?.length || 0} items</div>
                </div>
                
                {/* Customer */}
                <div>
                  <div className="font-medium text-gray-800">{order.userName || 'Unknown'}</div>
                  <div className="text-sm text-gray-500 truncate">{order.userEmail}</div>
                </div>
                
                {/* Amount */}
                <div className="font-medium text-gray-900">{formatPrice(order.total)}</div>
                
                {/* Status */}
                <div>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                    ORDER_STATUS[order.status?.toUpperCase()]?.color || 'bg-gray-100 text-gray-800'
                  }`}>
                    {order.status}
                  </span>
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openOrderDetails(order)}
                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                  >
                    Details
                  </button>
                  
                  {order.status === 'Placed' && (
                    <>
                      <button
                        onClick={() => updateOrderStatus(order.id, 'Approved')}
                        className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => updateOrderStatus(order.id, 'Declined')}
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition"
                      >
                        Decline
                      </button>
                    </>
                  )}
                  
                  {order.status === 'Approved' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'Packed')}
                      className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
                    >
                      Mark Packed
                    </button>
                  )}
                  
                  {order.status === 'Packed' && (
                    <button
                      onClick={() => {
                        setSelectedOrder(order);
                        setIsModalOpen(true);
                        setTrackingInfo({ code: '', carrier: 'IndiaPost' });
                      }}
                      className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 transition"
                    >
                      Add Tracking
                    </button>
                  )}
                  
                  {order.status === 'Shipped' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'Delivered')}
                      className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition"
                    >
                      Mark Delivered
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Order Details / Tracking Modal */}
      {isModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
              <h3 className="text-xl font-bold text-gray-900">
                {!selectedOrder.tracking?.code 
                  ? 'Add Tracking Information' 
                  : `Order Details - ${selectedOrder.orderId}`}
              </h3>
              <button 
                onClick={() => {
                  setIsModalOpen(false);
                  setSelectedOrder(null);
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              {/* Tracking Form (if order is packed and no tracking) */}
              {selectedOrder.status === 'Packed' && !selectedOrder.tracking?.code ? (
                <form onSubmit={addTracking}>
                  <div className="mb-6">
                    <p className="text-gray-700 mb-4">
                      Add tracking information for order {selectedOrder.orderId}.
                      This will automatically update the order status to "Shipped".
                    </p>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Carrier
                        </label>
                        <select
                          value={trackingInfo.carrier}
                          onChange={(e) => setTrackingInfo({...trackingInfo, carrier: e.target.value})}
                          className="w-full p-2 border border-gray-300 rounded-md"
                          disabled
                        >
                          <option value="IndiaPost">India Post</option>
                        </select>
                        <p className="mt-1 text-sm text-gray-500">
                          Currently, only India Post is supported.
                        </p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Tracking Number*
                        </label>
                        <input
                          type="text"
                          value={trackingInfo.code}
                          onChange={(e) => setTrackingInfo({...trackingInfo, code: e.target.value})}
                          className="w-full p-2 border border-gray-300 rounded-md"
                          placeholder="Enter tracking number"
                          required
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setIsModalOpen(false);
                        setSelectedOrder(null);
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                      disabled={processingAction}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                      disabled={processingAction}
                    >
                      {processingAction ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Processing...
                        </>
                      ) : (
                        'Add Tracking & Ship'
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                // Order Details
                <div className="space-y-6">
                  {/* Order Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">Order Information</h4>
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <div className="grid grid-cols-2 gap-y-2">
                          <div className="text-sm text-gray-500">Order ID</div>
                          <div className="text-sm font-medium text-gray-900">{selectedOrder.orderId}</div>
                          
                          <div className="text-sm text-gray-500">Date</div>
                          <div className="text-sm text-gray-900">{formatDate(selectedOrder.orderDate)}</div>
                          
                          <div className="text-sm text-gray-500">Status</div>
                          <div className="text-sm">
                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                              ORDER_STATUS[selectedOrder.status?.toUpperCase()]?.color || 'bg-gray-100 text-gray-800'
                            }`}>
                              {selectedOrder.status}
                            </span>
                          </div>
                          
                          <div className="text-sm text-gray-500">Total</div>
                          <div className="text-sm font-bold text-gray-900">{formatPrice(selectedOrder.total)}</div>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">Customer Information</h4>
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <div className="grid grid-cols-2 gap-y-2">
                          <div className="text-sm text-gray-500">Name</div>
                          <div className="text-sm font-medium text-gray-900">{selectedOrder.userName || 'N/A'}</div>
                          
                          <div className="text-sm text-gray-500">Email</div>
                          <div className="text-sm text-gray-900">{selectedOrder.userEmail}</div>
                          
                          <div className="text-sm text-gray-500">Address</div>
                          <div className="text-sm text-gray-900">
                            {selectedOrder.shipping?.address ? (
                              <>
                                {selectedOrder.shipping.address.houseNo && `${selectedOrder.shipping.address.houseNo}, `}
                                {selectedOrder.shipping.address.line1 && `${selectedOrder.shipping.address.line1}, `}
                                {selectedOrder.shipping.address.line2 && `${selectedOrder.shipping.address.line2}, `}
                                <br />
                                {selectedOrder.shipping.address.city && `${selectedOrder.shipping.address.city}, `}
                                {selectedOrder.shipping.address.state && `${selectedOrder.shipping.address.state}, `}
                                {selectedOrder.shipping.address.country && `${selectedOrder.shipping.address.country} `}
                                {selectedOrder.shipping.address.pin && `- ${selectedOrder.shipping.address.pin}`}
                              </>
                            ) : (
                              'N/A'
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Items */}
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Order Items</h4>
                    <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                      <div className="grid grid-cols-5 gap-4 p-3 bg-gray-100 text-sm font-medium text-gray-700 border-b border-gray-200">
                        <div className="col-span-2">Product</div>
                        <div>Price</div>
                        <div>Quantity</div>
                        <div>Total</div>
                      </div>
                      
                      <div className="divide-y divide-gray-200">
                        {selectedOrder.items.map((item, index) => (
                          <div key={index} className="grid grid-cols-5 gap-4 p-3 items-center text-sm">
                            <div className="col-span-2 flex items-center gap-3">
                              {item.image && (
                                <img src={item.image} alt={item.name} className="w-10 h-10 object-contain border border-gray-200 rounded" />
                              )}
                              <div className="font-medium text-gray-800">{item.name}</div>
                            </div>
                            <div className="text-gray-600">{formatPrice(item.price)}</div>
                            <div className="text-gray-600">{item.quantity}</div>
                            <div className="font-medium text-gray-800">{formatPrice(item.price * item.quantity)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* Payment & Shipping */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">Payment Information</h4>
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <div className="grid grid-cols-2 gap-y-2">
                          <div className="text-sm text-gray-500">Method</div>
                          <div className="text-sm font-medium text-gray-900">{selectedOrder.payment?.method || 'N/A'}</div>
                          
                          {selectedOrder.payment?.details?.cardType && (
                            <>
                              <div className="text-sm text-gray-500">Card Type</div>
                              <div className="text-sm text-gray-900">{selectedOrder.payment.details.cardType}</div>
                            </>
                          )}
                          
                          {selectedOrder.payment?.details?.lastFour && (
                            <>
                              <div className="text-sm text-gray-500">Card Number</div>
                              <div className="text-sm text-gray-900">xxxx-xxxx-xxxx-{selectedOrder.payment.details.lastFour}</div>
                            </>
                          )}
                          
                          {selectedOrder.payment?.details?.upiId && (
                            <>
                              <div className="text-sm text-gray-500">UPI ID</div>
                              <div className="text-sm text-gray-900">{selectedOrder.payment.details.upiId}</div>
                            </>
                          )}
                          
                          <div className="text-sm text-gray-500">Subtotal</div>
                          <div className="text-sm text-gray-900">{formatPrice(selectedOrder.subtotal)}</div>
                          
                          <div className="text-sm text-gray-500">Tax</div>
                          <div className="text-sm text-gray-900">{formatPrice(selectedOrder.tax)}</div>
                          
                          <div className="text-sm text-gray-500">Shipping</div>
                          <div className="text-sm text-gray-900">{formatPrice(selectedOrder.shipping?.cost || 0)}</div>
                          
                          <div className="text-sm text-gray-500 font-medium">Total</div>
                          <div className="text-sm font-bold text-gray-900">{formatPrice(selectedOrder.total)}</div>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">Shipping & Tracking</h4>
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        {selectedOrder.tracking?.code ? (
                          <div className="grid grid-cols-2 gap-y-2">
                            <div className="text-sm text-gray-500">Carrier</div>
                            <div className="text-sm font-medium text-gray-900">{selectedOrder.tracking.carrier}</div>
                            
                            <div className="text-sm text-gray-500">Tracking Number</div>
                            <div className="text-sm font-medium text-gray-900">{selectedOrder.tracking.code}</div>
                            
                            <div className="text-sm text-gray-500">Track Link</div>
                            <div className="text-sm text-blue-600">
                              <a 
                                href="https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="hover:underline"
                              >
                                Track on IndiaPost
                              </a>
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500 italic">
                            {selectedOrder.status === 'Packed' 
                              ? "Order is ready to ship. Add tracking information to ship this order."
                              : "Tracking information not available yet."}
                          </div>
                        )}
                      </div>
                      
                      {/* Status History */}
                      <h4 className="font-medium text-gray-700 mb-2 mt-6">Status History</h4>
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 max-h-48 overflow-y-auto">
                        {selectedOrder.statusHistory && selectedOrder.statusHistory.length > 0 ? (
                          <div className="space-y-3">
                            {selectedOrder.statusHistory.map((history, index) => (
                              <div key={index} className="flex items-start gap-3">
                                <div className={`w-2 h-2 rounded-full mt-1.5 ${
                                  ORDER_STATUS[history.status?.toUpperCase()]?.color?.split(' ')[0] || 'bg-gray-400'
                                }`}></div>
                                <div className="flex-1">
                                  <div className="flex justify-between items-start">
                                    <div className="font-medium text-sm text-gray-900">{history.status}</div>
                                    <div className="text-xs text-gray-500">{formatDate(history.timestamp)}</div>
                                  </div>
                                  {history.note && <div className="text-xs text-gray-600 mt-1">{history.note}</div>}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500 italic">No status history available</div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => {
                        setIsModalOpen(false);
                        setSelectedOrder(null);
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                    >
                      Close
                    </button>
                    
                    {selectedOrder.status === 'Placed' && (
                      <>
                        <button
                          onClick={() => updateOrderStatus(selectedOrder.id, 'Approved')}
                          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                          disabled={processingAction}
                        >
                          Approve Order
                        </button>
                        <button
                          onClick={() => updateOrderStatus(selectedOrder.id, 'Declined')}
                          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                          disabled={processingAction}
                        >
                          Decline Order
                        </button>
                      </>
                    )}
                    
                    {selectedOrder.status === 'Approved' && (
                      <button
                        onClick={() => updateOrderStatus(selectedOrder.id, 'Packed')}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                        disabled={processingAction}
                      >
                        Mark as Packed
                      </button>
                    )}
                    
                    {selectedOrder.status === 'Packed' && !selectedOrder.tracking?.code && (
                      <button
                        onClick={() => {
                          setIsModalOpen(false);
                          setTimeout(() => {
                            setSelectedOrder(selectedOrder);
                            setIsModalOpen(true);
                            setTrackingInfo({ code: '', carrier: 'IndiaPost' });
                          }, 100);
                        }}
                        className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                        disabled={processingAction}
                      >
                        Add Tracking
                      </button>
                    )}
                    
                    {selectedOrder.status === 'Shipped' && (
                      <button
                        onClick={() => updateOrderStatus(selectedOrder.id, 'Delivered')}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                        disabled={processingAction}
                      >
                        Mark as Delivered
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Orders; 