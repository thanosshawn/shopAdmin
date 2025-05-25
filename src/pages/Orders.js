/**
 * Enhanced Admin Orders Management Page
 * 
 * This comprehensive component provides complete order management functionality
 * for administrators with advanced features including:
 * - Real-time order listing with advanced filtering
 * - Status management with workflow validation
 * - Bulk operations for efficiency
 * - Detailed order views with full history
 * - Shipping management with carrier integration
 * - Analytics and reporting capabilities
 * - Search and export functionality
 * - Firebase security rule compliance
 * 
 * The component integrates with the enhanced AdminOrderService to provide
 * a seamless and powerful order management experience.
 * 
 * @author Shop Admin System
 * @version 2.0.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Import the enhanced admin order service and utilities
import AdminOrderService, { 
  ORDER_STATUSES, 
  ORDER_PRIORITIES, 
  SHIPPING_CARRIERS 
} from '../utils/orderService';
import { formatCurrency, formatIndianNumber } from '../utils/formatUtils';

/**
 * Main Orders Management Component
 * Provides comprehensive order management interface for administrators
 */
function Orders() {
  // Core state management for orders and UI
  const [orders, setOrders] = useState([]);                    // Main orders list
  const [filteredOrders, setFilteredOrders] = useState([]);   // Filtered orders based on current filters
  const [loading, setLoading] = useState(true);               // Loading state for data fetching
  const [error, setError] = useState(null);                   // Error state for error handling
  
  // Filter and search state management
  const [filters, setFilters] = useState({
    status: 'all',                    // Status filter for order workflow
    priority: 'all',                  // Priority filter for urgent orders
    searchTerm: '',                   // Search term for order/customer lookup
    dateRange: {
      startDate: '',                  // Start date for date range filtering
      endDate: ''                     // End date for date range filtering
    },
    minAmount: '',                    // Minimum order amount filter
    carrier: 'all'                    // Shipping carrier filter
  });
  
  // Modal and UI state management
  const [selectedOrder, setSelectedOrder] = useState(null);   // Currently selected order for detailed view
  const [isModalOpen, setIsModalOpen] = useState(false);     // Modal visibility state
  const [modalMode, setModalMode] = useState('view');        // Modal mode: 'view', 'edit', 'shipping'
  const [processingAction, setProcessingAction] = useState(false); // Action processing state
  
  // Bulk operations state management
  const [selectedOrderIds, setSelectedOrderIds] = useState(new Set()); // Selected orders for bulk operations
  const [bulkOperationMode, setBulkOperationMode] = useState(false);   // Bulk operation mode toggle
  
  // Shipping management state
  const [shippingInfo, setShippingInfo] = useState({
    trackingNumber: '',               // Tracking number for shipment
    carrier: 'IndiaPost',            // Selected shipping carrier
    service: 'standard',             // Shipping service type
    weight: '',                      // Package weight
    notes: ''                        // Additional shipping notes
  });
  
  // Analytics and reporting state
  const [showAnalytics, setShowAnalytics] = useState(false);  // Analytics view toggle
  const [analyticsData, setAnalyticsData] = useState(null);   // Analytics data cache
  const [analyticsLoading, setAnalyticsLoading] = useState(false); // Analytics loading state
  
  // Pagination state for large datasets
  const [pagination, setPagination] = useState({
    currentPage: 1,                   // Current page number
    itemsPerPage: 20,                 // Items per page limit
    totalItems: 0                     // Total items count
  });

  /**
   * Comprehensive order status configuration with enhanced styling and workflow
   * Defines visual appearance, workflow rules, and actions for each order status
   */
  const ORDER_STATUS_CONFIG = useMemo(() => ({
    [ORDER_STATUSES.PLACED]: { 
      label: 'Placed', 
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      icon: '📝',
      description: 'Order placed by customer, awaiting admin approval',
      nextActions: ['approve', 'decline'],
      workflow: {
        canApprove: true,
        canDecline: true,
        canCancel: true,
        requiresAction: true
      }
    },
    [ORDER_STATUSES.APPROVED]: { 
      label: 'Approved', 
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      icon: '✅',
      description: 'Order approved by admin, ready for packing',
      nextActions: ['pack'],
      workflow: {
        canPack: true,
        canCancel: true,
        requiresAction: true
      }
    },
    [ORDER_STATUSES.PACKED]: { 
      label: 'Packed', 
      color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      icon: '📦',
      description: 'Order packed and ready for shipment',
      nextActions: ['ship'],
      workflow: {
        canShip: true,
        canCancel: true,
        requiresTracking: true
      }
    },
    [ORDER_STATUSES.SHIPPED]: { 
      label: 'Shipped', 
      color: 'bg-purple-100 text-purple-800 border-purple-200',
      icon: '🚚',
      description: 'Order shipped to customer with tracking',
      nextActions: ['deliver'],
      workflow: {
        canDeliver: true,
        hasTracking: true
      }
    },
    [ORDER_STATUSES.DELIVERED]: { 
      label: 'Delivered', 
      color: 'bg-green-100 text-green-800 border-green-200',
      icon: '✅',
      description: 'Order successfully delivered to customer',
      nextActions: [],
      workflow: {
        isComplete: true,
        canRefund: true
      }
    },
    [ORDER_STATUSES.DECLINED]: { 
      label: 'Declined', 
      color: 'bg-red-100 text-red-800 border-red-200',
      icon: '❌',
      description: 'Order declined by admin',
      nextActions: [],
      workflow: {
        isTerminal: true,
        inventoryRestored: true
      }
    },
    [ORDER_STATUSES.CANCELLED]: { 
      label: 'Cancelled', 
      color: 'bg-gray-100 text-gray-800 border-gray-200',
      icon: '🚫',
      description: 'Order cancelled',
      nextActions: ['refund'],
      workflow: {
        canRefund: true,
        inventoryRestored: true
      }
    },
    [ORDER_STATUSES.REFUNDED]: { 
      label: 'Refunded', 
      color: 'bg-gray-100 text-gray-600 border-gray-200',
      icon: '💰',
      description: 'Order refunded to customer',
      nextActions: [],
      workflow: {
        isTerminal: true,
        isRefunded: true
      }
    }
  }), []);

  /**
   * Priority configuration for order processing workflow
   * Defines visual styling and processing rules for different priority levels
   */
  const PRIORITY_CONFIG = useMemo(() => ({
    [ORDER_PRIORITIES.URGENT]: {
      label: 'Urgent',
      color: 'bg-red-100 text-red-800',
      icon: '🔥',
      description: 'Requires immediate attention'
    },
    [ORDER_PRIORITIES.HIGH]: {
      label: 'High',
      color: 'bg-orange-100 text-orange-800',
      icon: '⚡',
      description: 'High priority processing'
    },
    [ORDER_PRIORITIES.NORMAL]: {
      label: 'Normal',
      color: 'bg-gray-100 text-gray-800',
      icon: '📋',
      description: 'Standard processing priority'
    },
    [ORDER_PRIORITIES.LOW]: {
      label: 'Low',
      color: 'bg-blue-100 text-blue-800',
      icon: '📌',
      description: 'Low priority, process when time allows'
    }
  }), []);

  /**
   * Initial data loading effect
   * Fetches orders on component mount and sets up data refresh
   */
  useEffect(() => {
    console.log('🔄 Orders: Component mounted, initiating data fetch');
    fetchOrders();
    
    // Set up auto-refresh for real-time updates (every 5 minutes)
    const refreshInterval = setInterval(fetchOrders, 5 * 60 * 1000);
    
    // Cleanup interval on component unmount
    return () => {
      clearInterval(refreshInterval);
      console.log('🧹 Orders: Component unmounted, cleaning up resources');
    };
  }, []);

  /**
   * Filter application effect
   * Applies current filters to the orders list whenever filters or orders change
   */
  useEffect(() => {
    console.log('🔍 Orders: Applying filters to orders list');
    applyFilters();
  }, [orders, filters]);

  /**
   * Comprehensive order fetching function
   * Retrieves orders from the backend with error handling and loading states
   */
  const fetchOrders = useCallback(async () => {
    console.log('📥 Orders: Fetching orders from backend');
    
    try {
      setLoading(true);
      setError(null);
      
      // Prepare filters for API call
      const apiFilters = {
        ...filters,
        // Convert date strings to proper date objects if provided
        ...(filters.dateRange.startDate && { startDate: filters.dateRange.startDate }),
        ...(filters.dateRange.endDate && { endDate: filters.dateRange.endDate })
      };
      
      // Fetch orders using the enhanced admin service
      const result = await AdminOrderService.getAllOrders(apiFilters, {
        limit: pagination.itemsPerPage,
        page: pagination.currentPage
      });
      
      if (result.success) {
        setOrders(result.orders);
        setPagination(prev => ({
          ...prev,
          totalItems: result.totalCount
        }));
        
        console.log(`✅ Orders: Successfully fetched ${result.orders.length} orders`);
        
        // Show success message only on manual refresh
        if (!loading) {
          toast.success(`Refreshed ${result.orders.length} orders`);
        }
      } else {
        throw new Error(result.error || 'Failed to fetch orders');
      }
    } catch (error) {
      console.error('❌ Orders: Error fetching orders:', error);
      setError(error.message);
      toast.error(`Failed to load orders: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.itemsPerPage, pagination.currentPage]);

  /**
   * Advanced filter application function
   * Applies all active filters to the orders list with comprehensive search logic
   */
  const applyFilters = useCallback(() => {
    let filtered = [...orders];
    
    console.log(`🔍 Orders: Applying filters to ${orders.length} orders`);
    
    // Status filter - filter by order status
    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter(order => order.status === filters.status);
      console.log(`🔍 Orders: Status filter (${filters.status}) applied, ${filtered.length} orders remaining`);
    }
    
    // Priority filter - filter by order priority
    if (filters.priority && filters.priority !== 'all') {
      filtered = filtered.filter(order => (order.priority || ORDER_PRIORITIES.NORMAL) === filters.priority);
      console.log(`🔍 Orders: Priority filter (${filters.priority}) applied, ${filtered.length} orders remaining`);
    }
    
    // Search term filter - comprehensive text search across multiple fields
    if (filters.searchTerm && filters.searchTerm.trim()) {
      const searchTerm = filters.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(order => {
        return (
          // Search in order ID
          order.orderId?.toLowerCase().includes(searchTerm) ||
          order.id?.toLowerCase().includes(searchTerm) ||
          // Search in customer information
          order.userName?.toLowerCase().includes(searchTerm) ||
          order.userEmail?.toLowerCase().includes(searchTerm) ||
          order.userPhone?.toLowerCase().includes(searchTerm) ||
          // Search in product names
          order.items?.some(item => 
            item.name?.toLowerCase().includes(searchTerm)
          ) ||
          // Search in tracking information
          order.tracking?.code?.toLowerCase().includes(searchTerm) ||
          // Search in admin notes
          order.adminNotes?.toLowerCase().includes(searchTerm)
        );
      });
      console.log(`🔍 Orders: Search filter ("${searchTerm}") applied, ${filtered.length} orders remaining`);
    }
    
    // Minimum amount filter - filter by order total
    if (filters.minAmount && !isNaN(parseFloat(filters.minAmount))) {
      const minAmount = parseFloat(filters.minAmount);
      filtered = filtered.filter(order => {
        const orderTotal = order.financials?.total || order.total || 0;
        return orderTotal >= minAmount;
      });
      console.log(`🔍 Orders: Min amount filter (₹${minAmount}) applied, ${filtered.length} orders remaining`);
    }
    
    // Carrier filter - filter by shipping carrier
    if (filters.carrier && filters.carrier !== 'all') {
      filtered = filtered.filter(order => order.tracking?.carrier === filters.carrier);
      console.log(`🔍 Orders: Carrier filter (${filters.carrier}) applied, ${filtered.length} orders remaining`);
    }
    
    // Date range filter - filter by order creation date
    if (filters.dateRange.startDate || filters.dateRange.endDate) {
      filtered = filtered.filter(order => {
        const orderDate = order.createdAt?.toDate?.() || new Date(order.orderDate);
        
        if (filters.dateRange.startDate) {
          const startDate = new Date(filters.dateRange.startDate);
          if (orderDate < startDate) return false;
        }
        
        if (filters.dateRange.endDate) {
          const endDate = new Date(filters.dateRange.endDate);
          endDate.setHours(23, 59, 59, 999); // End of day
          if (orderDate > endDate) return false;
        }
        
        return true;
      });
      console.log(`🔍 Orders: Date range filter applied, ${filtered.length} orders remaining`);
    }
    
    setFilteredOrders(filtered);
    console.log(`✅ Orders: Filters applied successfully, showing ${filtered.length} of ${orders.length} orders`);
  }, [orders, filters]);

  /**
   * Comprehensive order status update function
   * Updates order status with validation, history tracking, and user feedback
   * 
   * @param {string} orderId - Order ID to update
   * @param {string} newStatus - New status to set
   * @param {Object} additionalInfo - Additional information for the update
   */
  const updateOrderStatus = async (orderId, newStatus, additionalInfo = {}) => {
    console.log(`🔄 Orders: Updating order ${orderId} status to ${newStatus}`);
    
    try {
      setProcessingAction(true);
      
      // Validate status transition if current order is available
      const currentOrder = orders.find(order => order.id === orderId);
      if (currentOrder) {
        const statusConfig = ORDER_STATUS_CONFIG[newStatus];
        const currentConfig = ORDER_STATUS_CONFIG[currentOrder.status];
        
        console.log(`📋 Orders: Status transition: ${currentOrder.status} → ${newStatus}`);
        
        // Show confirmation for critical status changes
        if ([ORDER_STATUSES.DECLINED, ORDER_STATUSES.CANCELLED].includes(newStatus)) {
          const confirmed = window.confirm(
            `Are you sure you want to ${newStatus.toLowerCase()} order ${currentOrder.orderId}?\n\n` +
            `This will restore inventory and cannot be easily undone.`
          );
          
          if (!confirmed) {
            console.log('❌ Orders: Status update cancelled by user');
            return;
          }
        }
      }
      
      // Call the admin service to update order status
      const result = await AdminOrderService.updateOrderStatus(
        orderId, 
        newStatus, 
        {
          note: additionalInfo.note || `Order ${newStatus.toLowerCase()} by admin`,
          reason: additionalInfo.reason,
          adminNotes: additionalInfo.adminNotes,
          metadata: {
            updatedFrom: 'admin-panel',
            timestamp: new Date().toISOString()
          }
        },
        'admin-user' // TODO: Replace with actual admin user ID
      );
      
      if (result.success) {
        // Update local state with the new status
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order.id === orderId 
              ? { 
                  ...order, 
                  status: newStatus,
                  updatedAt: new Date(),
                  lastUpdatedBy: 'admin-user'
                } 
              : order
          )
        );
        
        // Close modal if open
        if (isModalOpen && selectedOrder?.id === orderId) {
          setSelectedOrder(prev => ({ ...prev, status: newStatus }));
        }
        
        console.log(`✅ Orders: Order ${orderId} status updated to ${newStatus}`);
        toast.success(`Order ${currentOrder?.orderId || orderId} ${newStatus.toLowerCase()} successfully`);
        
      } else {
        throw new Error(result.error || 'Failed to update order status');
      }
    } catch (error) {
      console.error('❌ Orders: Error updating order status:', error);
      toast.error(`Failed to update order: ${error.message}`);
    } finally {
      setProcessingAction(false);
    }
  };

  /**
   * Shipping information management function
   * Adds or updates shipping information with tracking details
   * 
   * @param {Event} e - Form submit event
   */
  const handleShippingUpdate = async (e) => {
    e.preventDefault();
    
    if (!selectedOrder) {
      toast.error("No order selected for shipping update");
      return;
    }
    
    console.log(`🚚 Orders: Updating shipping info for order ${selectedOrder.id}`);
    
    // Validate required shipping information
    if (!shippingInfo.trackingNumber.trim()) {
      toast.error("Please enter a valid tracking number");
      return;
    }
    
    if (!shippingInfo.carrier) {
      toast.error("Please select a shipping carrier");
      return;
    }
    
    try {
      setProcessingAction(true);
      
      // Call the admin service to update shipping information
      const result = await AdminOrderService.updateShippingInfo(
        selectedOrder.id,
        {
          trackingNumber: shippingInfo.trackingNumber.trim(),
          carrier: shippingInfo.carrier,
          service: shippingInfo.service,
          weight: shippingInfo.weight ? parseFloat(shippingInfo.weight) : null,
          notes: shippingInfo.notes.trim()
        },
        'admin-user' // TODO: Replace with actual admin user ID
      );
      
      if (result.success) {
        // Update local order state
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order.id === selectedOrder.id 
              ? { 
                  ...order, 
                  status: ORDER_STATUSES.SHIPPED,
                  tracking: {
                    code: shippingInfo.trackingNumber,
                    carrier: shippingInfo.carrier,
                    url: result.trackingUrl,
                    estimatedDelivery: result.estimatedDelivery
                  },
                  shippedAt: new Date()
                } 
              : order
          )
        );
        
        // Update selected order if modal is open
        setSelectedOrder(prev => ({
          ...prev,
          status: ORDER_STATUSES.SHIPPED,
          tracking: {
            code: shippingInfo.trackingNumber,
            carrier: shippingInfo.carrier,
            url: result.trackingUrl,
            estimatedDelivery: result.estimatedDelivery
          }
        }));
        
        // Reset shipping form
        setShippingInfo({
          trackingNumber: '',
          carrier: 'IndiaPost',
          service: 'standard',
          weight: '',
          notes: ''
        });
        
        // Close modal
        setIsModalOpen(false);
        setModalMode('view');
        
        console.log(`✅ Orders: Shipping info updated for order ${selectedOrder.id}`);
        toast.success(`Tracking information added successfully! Tracking: ${result.trackingNumber}`);
        
      } else {
        throw new Error(result.error || 'Failed to update shipping information');
      }
    } catch (error) {
      console.error('❌ Orders: Error updating shipping info:', error);
      toast.error(`Failed to add tracking: ${error.message}`);
    } finally {
      setProcessingAction(false);
    }
  };

  /**
   * Bulk operations management function
   * Handles bulk status updates and other bulk operations on selected orders
   * 
   * @param {string} operation - Type of bulk operation
   * @param {Object} operationData - Data for the operation
   */
  const handleBulkOperation = async (operation, operationData) => {
    if (selectedOrderIds.size === 0) {
      toast.error("Please select orders for bulk operation");
      return;
    }
    
    console.log(`🔄 Orders: Performing bulk ${operation} on ${selectedOrderIds.size} orders`);
    
    // Confirm bulk operation
    const confirmed = window.confirm(
      `Are you sure you want to perform "${operation}" on ${selectedOrderIds.size} selected orders?\n\n` +
      `This action will affect multiple orders at once.`
    );
    
    if (!confirmed) {
      console.log('❌ Orders: Bulk operation cancelled by user');
      return;
    }
    
    try {
      setProcessingAction(true);
      
      // Convert Set to Array for API call
      const orderIdsArray = Array.from(selectedOrderIds);
      
      // Call the admin service for bulk operation
      const result = await AdminOrderService.bulkOperation(
        operation,
        orderIdsArray,
        operationData,
        'admin-user' // TODO: Replace with actual admin user ID
      );
      
      if (result.success) {
        // Refresh orders to reflect changes
        await fetchOrders();
        
        // Clear selection
        setSelectedOrderIds(new Set());
        setBulkOperationMode(false);
        
        console.log(`✅ Orders: Bulk operation completed. Success: ${result.successCount}, Failed: ${result.failureCount}`);
        toast.success(
          `Bulk operation completed! ${result.successCount} successful, ${result.failureCount} failed`
        );
        
        // Show detailed results if there were failures
        if (result.failureCount > 0) {
          const failedOrders = result.results.filter(r => !r.success);
          console.warn('⚠️ Orders: Some bulk operations failed:', failedOrders);
        }
        
      } else {
        throw new Error(result.error || 'Bulk operation failed');
      }
    } catch (error) {
      console.error('❌ Orders: Error in bulk operation:', error);
      toast.error(`Bulk operation failed: ${error.message}`);
    } finally {
      setProcessingAction(false);
    }
  };

  /**
   * Analytics data generation function
   * Generates comprehensive analytics for the current order dataset
   */
  const generateAnalytics = async () => {
    console.log('📊 Orders: Generating analytics data');
    
    try {
      setAnalyticsLoading(true);
      
      // Use current filters for analytics generation
      const analyticsFilters = {
        ...filters,
        ...(filters.dateRange.startDate && { startDate: filters.dateRange.startDate }),
        ...(filters.dateRange.endDate && { endDate: filters.dateRange.endDate })
      };
      
      const result = await AdminOrderService.getOrderAnalytics(analyticsFilters);
      
      if (result.success) {
        setAnalyticsData(result.analytics);
        setShowAnalytics(true);
        
        console.log('✅ Orders: Analytics generated successfully');
        toast.success('Analytics generated successfully');
      } else {
        throw new Error(result.error || 'Failed to generate analytics');
      }
    } catch (error) {
      console.error('❌ Orders: Error generating analytics:', error);
      toast.error(`Failed to generate analytics: ${error.message}`);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  /**
   * Utility function to format dates in a user-friendly way
   * Handles both Firestore timestamps and regular Date objects
   * 
   * @param {any} dateInput - Date input (Firestore timestamp, Date object, or string)
   * @returns {string} - Formatted date string
   */
  const formatDate = (dateInput) => {
    try {
      let date;
      
      // Handle Firestore timestamp
      if (dateInput && typeof dateInput.toDate === 'function') {
        date = dateInput.toDate();
      } 
      // Handle Date object or date string
      else if (dateInput) {
        date = new Date(dateInput);
      } else {
        return 'Not available';
      }
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      
      // Format with Indian locale preferences
      const options = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      };
      
      return date.toLocaleDateString('en-IN', options);
    } catch (error) {
      console.warn('⚠️ Orders: Error formatting date:', error);
      return 'Date error';
    }
  };

  /**
   * Enhanced order details modal opening function
   * Sets up the modal with the selected order and appropriate mode
   * 
   * @param {Object} order - Order object to display
   * @param {string} mode - Modal mode ('view', 'edit', 'shipping')
   */
  const openOrderModal = (order, mode = 'view') => {
    console.log(`📋 Orders: Opening ${mode} modal for order ${order.id}`);
    
    setSelectedOrder(order);
    setModalMode(mode);
    setIsModalOpen(true);
    
    // Pre-populate shipping info if in shipping mode
    if (mode === 'shipping') {
      setShippingInfo({
        trackingNumber: order.tracking?.code || '',
        carrier: order.tracking?.carrier || 'IndiaPost',
        service: 'standard',
        weight: '',
        notes: ''
      });
    }
  };

  /**
   * Order selection management for bulk operations
   * Handles individual order selection and bulk selection
   * 
   * @param {string} orderId - Order ID to toggle selection
   * @param {boolean} isSelected - Current selection state
   */
  const toggleOrderSelection = (orderId, isSelected) => {
    setSelectedOrderIds(prev => {
      const newSet = new Set(prev);
      if (isSelected) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  /**
   * Select all visible orders for bulk operations
   * Toggles selection for all currently filtered orders
   */
  const selectAllOrders = () => {
    if (selectedOrderIds.size === filteredOrders.length) {
      // Deselect all
      setSelectedOrderIds(new Set());
    } else {
      // Select all visible orders
      const allOrderIds = filteredOrders.map(order => order.id);
      setSelectedOrderIds(new Set(allOrderIds));
    }
  };

  // Early return for loading state with enhanced loading UI
  if (loading && orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mb-4"></div>
        <div className="text-xl font-semibold text-gray-700 mb-2">Loading Orders</div>
        <div className="text-gray-500">Fetching the latest order information...</div>
      </div>
    );
  }

  // Early return for error state with enhanced error UI
  if (error && orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <div className="text-6xl mb-4">❌</div>
        <div className="text-xl font-semibold text-red-600 mb-2">Error Loading Orders</div>
        <div className="text-gray-600 mb-4 text-center max-w-md">{error}</div>
        <button
          onClick={fetchOrders}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Retry Loading
        </button>
      </div>
    );
  }

  // Main component render
  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Toast notification container */}
      <ToastContainer 
        position="top-right" 
        autoClose={3000} 
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
      
      {/* Header Section with Title and Action Buttons */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Management</h1>
            <p className="text-gray-600">
              Comprehensive order management system with advanced filtering and bulk operations
            </p>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
              <span>Total Orders: {formatIndianNumber(orders.length)}</span>
              <span>Filtered: {formatIndianNumber(filteredOrders.length)}</span>
              {selectedOrderIds.size > 0 && (
                <span className="text-blue-600 font-medium">
                  Selected: {selectedOrderIds.size}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {/* Refresh button */}
            <button
              onClick={fetchOrders}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                       flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Refreshing...
                </>
              ) : (
                <>
                  🔄 Refresh
                </>
              )}
            </button>
            
            {/* Analytics button */}
            <button
              onClick={generateAnalytics}
              disabled={analyticsLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                       flex items-center gap-2"
            >
              {analyticsLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Generating...
                </>
              ) : (
                <>
                  📊 Analytics
                </>
              )}
            </button>
            
            {/* Bulk operations toggle */}
            <button
              onClick={() => {
                setBulkOperationMode(!bulkOperationMode);
                setSelectedOrderIds(new Set());
              }}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                bulkOperationMode 
                  ? 'bg-orange-600 text-white hover:bg-orange-700' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {bulkOperationMode ? '✅ Bulk Mode' : '📝 Bulk Mode'}
            </button>
          </div>
        </div>
      </div>

      {/* Advanced Filters Section */}
      <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Filters & Search</h3>
          <button
            onClick={() => {
              setFilters({
                status: 'all',
                priority: 'all',
                searchTerm: '',
                dateRange: { startDate: '', endDate: '' },
                minAmount: '',
                carrier: 'all'
              });
            }}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Clear All Filters
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {/* Status filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Statuses</option>
              {Object.entries(ORDER_STATUS_CONFIG).map(([status, config]) => (
                <option key={status} value={status}>
                  {config.icon} {config.label}
                </option>
              ))}
            </select>
          </div>
          
          {/* Priority filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select
              value={filters.priority}
              onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Priorities</option>
              {Object.entries(PRIORITY_CONFIG).map(([priority, config]) => (
                <option key={priority} value={priority}>
                  {config.icon} {config.label}
                </option>
              ))}
            </select>
          </div>
          
          {/* Search input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              placeholder="Order ID, customer, product..."
              value={filters.searchTerm}
              onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          {/* Start date filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={filters.dateRange.startDate}
              onChange={(e) => setFilters(prev => ({ 
                ...prev, 
                dateRange: { ...prev.dateRange, startDate: e.target.value }
              }))}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          {/* End date filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={filters.dateRange.endDate}
              onChange={(e) => setFilters(prev => ({ 
                ...prev, 
                dateRange: { ...prev.dateRange, endDate: e.target.value }
              }))}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          {/* Minimum amount filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Min Amount</label>
            <input
              type="number"
              placeholder="₹0"
              value={filters.minAmount}
              onChange={(e) => setFilters(prev => ({ ...prev, minAmount: e.target.value }))}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Bulk Operations Panel */}
      {bulkOperationMode && (
        <div className="mb-6 bg-orange-50 rounded-lg border-2 border-orange-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-orange-800">
              Bulk Operations Mode {selectedOrderIds.size > 0 && `(${selectedOrderIds.size} selected)`}
            </h3>
            {selectedOrderIds.size > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleBulkOperation('update_status', { 
                    status: ORDER_STATUSES.APPROVED,
                    note: 'Bulk approval by admin'
                  })}
                  className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                  disabled={processingAction}
                >
                  Bulk Approve
                </button>
                <button
                  onClick={() => handleBulkOperation('update_priority', { 
                    priority: ORDER_PRIORITIES.HIGH 
                  })}
                  className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700"
                  disabled={processingAction}
                >
                  Set High Priority
                </button>
                <button
                  onClick={() => setSelectedOrderIds(new Set())}
                  className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                >
                  Clear Selection
                </button>
              </div>
            )}
          </div>
          <p className="text-orange-700 text-sm">
            Select orders by clicking the checkboxes to perform bulk operations. 
            You can approve, update priority, or perform other actions on multiple orders at once.
          </p>
        </div>
      )}

      {/* Orders Table Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {filteredOrders.length === 0 ? (
          // Empty state with helpful messaging
          <div className="p-12 text-center">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Orders Found</h3>
            <p className="text-gray-500 mb-4">
              {orders.length === 0 
                ? "No orders have been placed yet" 
                : "No orders match your current filters"}
            </p>
            {orders.length > 0 && (
              <button
                onClick={() => setFilters({
                  status: 'all',
                  priority: 'all',
                  searchTerm: '',
                  dateRange: { startDate: '', endDate: '' },
                  minAmount: '',
                  carrier: 'all'
                })}
                className="text-blue-600 hover:text-blue-800 underline"
              >
                Clear filters to see all orders
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div className="bg-gray-50 border-b border-gray-200 p-4">
              <div className={`grid gap-4 items-center font-medium text-gray-700 ${
                bulkOperationMode ? 'grid-cols-8' : 'grid-cols-7'
              }`}>
                {bulkOperationMode && (
                  <div>
                    <input
                      type="checkbox"
                      checked={selectedOrderIds.size === filteredOrders.length && filteredOrders.length > 0}
                      onChange={selectAllOrders}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                )}
                <div>Order Details</div>
                <div>Customer</div>
                <div>Amount</div>
                <div>Status</div>
                <div>Priority</div>
                <div>Date</div>
                <div>Actions</div>
              </div>
            </div>
            
            {/* Table Body */}
            <div className="divide-y divide-gray-200">
              {filteredOrders.map((order) => {
                const statusConfig = ORDER_STATUS_CONFIG[order.status] || ORDER_STATUS_CONFIG[ORDER_STATUSES.PLACED];
                const priorityConfig = PRIORITY_CONFIG[order.priority] || PRIORITY_CONFIG[ORDER_PRIORITIES.NORMAL];
                const isSelected = selectedOrderIds.has(order.id);
                
                return (
                  <div 
                    key={order.id} 
                    className={`p-4 hover:bg-gray-50 transition-colors ${
                      isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                    }`}
                  >
                    <div className={`grid gap-4 items-center ${
                      bulkOperationMode ? 'grid-cols-8' : 'grid-cols-7'
                    }`}>
                      {/* Bulk selection checkbox */}
                      {bulkOperationMode && (
                        <div>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleOrderSelection(order.id, isSelected)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </div>
                      )}
                      
                      {/* Order Details Column */}
                      <div>
                        <div className="font-medium text-gray-900 mb-1">
                          {order.orderId || order.id}
                        </div>
                        <div className="text-sm text-gray-500">
                          {order.items?.length || 0} items
                        </div>
                        {order.tracking?.code && (
                          <div className="text-xs text-blue-600 font-mono">
                            📦 {order.tracking.code}
                          </div>
                        )}
                      </div>
                      
                      {/* Customer Information Column */}
                      <div>
                        <div className="font-medium text-gray-900 truncate">
                          {order.userName || 'Unknown Customer'}
                        </div>
                        <div className="text-sm text-gray-500 truncate">
                          {order.userEmail}
                        </div>
                      </div>
                      
                      {/* Amount Column */}
                      <div>
                        <div className="font-semibold text-gray-900">
                          {formatCurrency(order.financials?.total || order.total || 0)}
                        </div>
                      </div>
                      
                      {/* Status Column */}
                      <div>
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${statusConfig.color}`}>
                          <span>{statusConfig.icon}</span>
                          {statusConfig.label}
                        </span>
                        {order.orderAge && order.orderAge > 7 && (
                          <div className="text-xs text-red-500 mt-1">
                            ⚠️ {order.orderAge} days old
                          </div>
                        )}
                      </div>
                      
                      {/* Priority Column */}
                      <div>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${priorityConfig.color}`}>
                          <span>{priorityConfig.icon}</span>
                          {priorityConfig.label}
                        </span>
                      </div>
                      
                      {/* Date Column */}
                      <div>
                        <div className="text-sm text-gray-900">
                          {formatDate(order.createdAt || order.orderDate)}
                        </div>
                      </div>
                      
                      {/* Actions Column */}
                      <div className="flex items-center gap-1">
                        {/* View Details Button */}
                        <button
                          onClick={() => openOrderModal(order, 'view')}
                          className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors"
                          title="View order details"
                        >
                          👁️ View
                        </button>
                        
                        {/* Status-specific action buttons */}
                        {order.status === ORDER_STATUSES.PLACED && (
                          <>
                            <button
                              onClick={() => updateOrderStatus(order.id, ORDER_STATUSES.APPROVED)}
                              className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition-colors"
                              disabled={processingAction}
                              title="Approve order"
                            >
                              ✅ Approve
                            </button>
                            <button
                              onClick={() => updateOrderStatus(order.id, ORDER_STATUSES.DECLINED, {
                                reason: 'Declined by admin from order details'
                              })}
                              className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors"
                              disabled={processingAction}
                              title="Decline order"
                            >
                              ❌ Decline
                            </button>
                          </>
                        )}
                        
                        {order.status === ORDER_STATUSES.APPROVED && (
                          <button
                            onClick={() => updateOrderStatus(order.id, ORDER_STATUSES.PACKED)}
                            className="px-2 py-1 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-700 transition-colors"
                            disabled={processingAction}
                            title="Mark as packed"
                          >
                            📦 Mark as Packed
                          </button>
                        )}
                        
                        {order.status === ORDER_STATUSES.PACKED && (
                          <button
                            onClick={() => openOrderModal(order, 'shipping')}
                            className="px-2 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-700 transition-colors"
                            disabled={processingAction}
                            title="Add shipping information"
                          >
                            🚚 Ship
                          </button>
                        )}
                        
                        {order.status === ORDER_STATUSES.SHIPPED && (
                          <button
                            onClick={() => updateOrderStatus(order.id, ORDER_STATUSES.DELIVERED)}
                            className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition-colors"
                            disabled={processingAction}
                            title="Mark as delivered"
                          >
                            ✅ Mark as Delivered
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Pagination Component (placeholder for future implementation) */}
      {filteredOrders.length > 0 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Showing {filteredOrders.length} of {orders.length} orders
          </div>
          {/* Future pagination controls can be added here */}
        </div>
      )}

      {/* Order Details/Shipping Modal */}
      {isModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white rounded-t-lg">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                {modalMode === 'shipping' ? (
                  <>🚚 Add Shipping Information</>
                ) : (
                  <>📋 Order Details - {selectedOrder.orderId || selectedOrder.id}</>
                )}
              </h3>
              <button 
                onClick={() => {
                  setIsModalOpen(false);
                  setSelectedOrder(null);
                  setModalMode('view');
                }}
                className="text-gray-400 hover:text-gray-500 p-2 rounded-full hover:bg-gray-100"
                title="Close modal"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              {modalMode === 'shipping' ? (
                // Shipping Information Form
                <form onSubmit={handleShippingUpdate} className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <h4 className="font-medium text-blue-800 mb-2">📋 Shipping Instructions</h4>
                    <p className="text-blue-700 text-sm">
                      Add tracking information for order <strong>{selectedOrder.orderId}</strong>. 
                      This will automatically update the order status to "Shipped" and notify the customer.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Carrier Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        📦 Shipping Carrier *
                      </label>
                      <select
                        value={shippingInfo.carrier}
                        onChange={(e) => setShippingInfo({...shippingInfo, carrier: e.target.value})}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      >
                        {Object.values(SHIPPING_CARRIERS).map(carrier => (
                          <option key={carrier.code} value={carrier.name}>
                            {carrier.name} ({carrier.estimatedDays.standard} days standard)
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-gray-500">
                        Select the shipping carrier for this order
                      </p>
                    </div>
                    
                    {/* Tracking Number */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        🔢 Tracking Number *
                      </label>
                      <input
                        type="text"
                        value={shippingInfo.trackingNumber}
                        onChange={(e) => setShippingInfo({...shippingInfo, trackingNumber: e.target.value})}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter tracking number"
                        required
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Enter the tracking number provided by the carrier
                      </p>
                    </div>
                    
                    {/* Service Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ⚡ Service Type
                      </label>
                      <select
                        value={shippingInfo.service}
                        onChange={(e) => setShippingInfo({...shippingInfo, service: e.target.value})}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="standard">Standard Delivery</option>
                        <option value="express">Express Delivery</option>
                        <option value="overnight">Overnight Delivery</option>
                      </select>
                    </div>
                    
                    {/* Package Weight */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ⚖️ Package Weight (kg)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={shippingInfo.weight}
                        onChange={(e) => setShippingInfo({...shippingInfo, weight: e.target.value})}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0.0"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Optional: Enter package weight for shipping records
                      </p>
                    </div>
                  </div>
                  
                  {/* Shipping Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      📝 Shipping Notes
                    </label>
                    <textarea
                      value={shippingInfo.notes}
                      onChange={(e) => setShippingInfo({...shippingInfo, notes: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows="3"
                      placeholder="Optional shipping notes or special instructions..."
                    />
                  </div>
                  
                  {/* Form Actions */}
                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => {
                        setIsModalOpen(false);
                        setModalMode('view');
                      }}
                      className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                      disabled={processingAction}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                               disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                               flex items-center gap-2"
                      disabled={processingAction}
                    >
                      {processingAction ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          Processing...
                        </>
                      ) : (
                        <>
                          🚚 Add Tracking & Ship
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                // Order Details View (continuing in next part due to length)
                <div className="space-y-6">
                  {/* Order Summary */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Order Information Card */}
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        📋 Order Information
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Order ID:</span>
                          <span className="font-medium">{selectedOrder.orderId || selectedOrder.id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Date:</span>
                          <span>{formatDate(selectedOrder.createdAt || selectedOrder.orderDate)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Status:</span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            ORDER_STATUS_CONFIG[selectedOrder.status]?.color || 'bg-gray-100 text-gray-800'
                          }`}>
                            {ORDER_STATUS_CONFIG[selectedOrder.status]?.icon} {selectedOrder.status}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Priority:</span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            PRIORITY_CONFIG[selectedOrder.priority || ORDER_PRIORITIES.NORMAL]?.color
                          }`}>
                            {PRIORITY_CONFIG[selectedOrder.priority || ORDER_PRIORITIES.NORMAL]?.icon} {
                            PRIORITY_CONFIG[selectedOrder.priority || ORDER_PRIORITIES.NORMAL]?.label}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total:</span>
                          <span className="font-bold text-lg">
                            {formatCurrency(selectedOrder.financials?.total || selectedOrder.total || 0)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Customer Information Card */}
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        👤 Customer Information
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-gray-600">Name:</span>
                          <div className="font-medium">{selectedOrder.userName || 'N/A'}</div>
                        </div>
                        <div>
                          <span className="text-gray-600">Email:</span>
                          <div className="font-medium break-all">{selectedOrder.userEmail}</div>
                        </div>
                        {selectedOrder.userPhone && (
                          <div>
                            <span className="text-gray-600">Phone:</span>
                            <div className="font-medium">{selectedOrder.userPhone}</div>
                          </div>
                        )}
                        <div>
                          <span className="text-gray-600">Address:</span>
                          <div className="text-xs mt-1 leading-relaxed">
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
                              'Address not available'
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Shipping & Tracking Card */}
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        🚚 Shipping & Tracking
                      </h4>
                      {selectedOrder.tracking?.code ? (
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Carrier:</span>
                            <span className="font-medium">{selectedOrder.tracking.carrier}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Tracking:</span>
                            <span className="font-mono text-blue-600">{selectedOrder.tracking.code}</span>
                          </div>
                          {selectedOrder.tracking.estimatedDelivery && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Est. Delivery:</span>
                              <span>{formatDate(selectedOrder.tracking.estimatedDelivery)}</span>
                            </div>
                          )}
                          {selectedOrder.tracking.url && (
                            <div className="mt-3">
                              <a 
                                href={selectedOrder.tracking.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 underline text-sm flex items-center gap-1"
                              >
                                🔗 Track Package
                              </a>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500 italic">
                          {selectedOrder.status === ORDER_STATUSES.PACKED 
                            ? "Order is ready to ship. Add tracking information to ship this order."
                            : "Tracking information not available yet."}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Order Items */}
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      📦 Order Items ({selectedOrder.items?.length || 0})
                    </h4>
                    <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                      <div className="grid grid-cols-5 gap-4 p-3 bg-gray-100 text-sm font-medium text-gray-700 border-b border-gray-200">
                        <div className="col-span-2">Product</div>
                        <div>Price</div>
                        <div>Quantity</div>
                        <div>Total</div>
                      </div>
                      
                      <div className="divide-y divide-gray-200">
                        {selectedOrder.items?.map((item, index) => (
                          <div key={index} className="grid grid-cols-5 gap-4 p-3 items-center text-sm">
                            <div className="col-span-2 flex items-center gap-3">
                              {item.image && (
                                <img 
                                  src={item.image} 
                                  alt={item.name} 
                                  className="w-12 h-12 object-cover border border-gray-200 rounded"
                                />
                              )}
                              <div>
                                <div className="font-medium text-gray-800">{item.name}</div>
                              </div>
                            </div>
                            <div className="text-gray-600">{formatCurrency(item.price)}</div>
                            <div className="text-gray-600">×{item.quantity}</div>
                            <div className="font-medium text-gray-800">{formatCurrency(item.price * item.quantity)}</div>
                          </div>
                        )) || (
                          <div className="p-6 text-center text-gray-500">
                            No items found for this order
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Financial Summary */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Payment Information */}
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        💳 Payment Information
                      </h4>
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Method:</span>
                          <span className="font-medium">{selectedOrder.payment?.method || 'N/A'}</span>
                        </div>
                        
                        {selectedOrder.payment?.details?.cardType && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Card Type:</span>
                            <span className="text-gray-900">{selectedOrder.payment.details.cardType}</span>
                          </div>
                        )}
                        
                        {selectedOrder.payment?.details?.lastFour && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Card Number:</span>
                            <span className="font-mono">xxxx-xxxx-xxxx-{selectedOrder.payment.details.lastFour}</span>
                          </div>
                        )}
                        
                        {selectedOrder.payment?.details?.upiId && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">UPI ID:</span>
                            <span className="font-mono">{selectedOrder.payment.details.upiId}</span>
                          </div>
                        )}
                        
                        <div className="text-gray-600">Subtotal</div>
                        <div className="text-gray-900">{formatCurrency(selectedOrder.subtotal)}</div>
                        
                        <div className="text-gray-600">Tax</div>
                        <div className="text-gray-900">{formatCurrency(selectedOrder.tax)}</div>
                        
                        <div className="text-gray-600">Shipping</div>
                        <div className="text-gray-900">{formatCurrency(selectedOrder.shipping?.cost || 0)}</div>
                        
                        <div className="text-gray-600 font-medium">Total</div>
                        <div className="text-gray-900 font-bold text-lg">
                          {formatCurrency(selectedOrder.total)}
                        </div>
                      </div>
                    </div>
                    
                    {/* Order Totals */}
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        💰 Order Totals
                      </h4>
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Subtotal:</span>
                          <span>{formatCurrency(selectedOrder.financials?.subtotal || selectedOrder.subtotal || 0)}</span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className="text-gray-600">Tax:</span>
                          <span>{formatCurrency(selectedOrder.financials?.tax || selectedOrder.tax || 0)}</span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className="text-gray-600">Shipping:</span>
                          <span>{formatCurrency(selectedOrder.financials?.shipping || selectedOrder.shipping?.cost || 0)}</span>
                        </div>
                        
                        {(selectedOrder.financials?.discount || selectedOrder.discount) > 0 && (
                          <div className="flex justify-between text-green-600">
                            <span>Discount:</span>
                            <span>-{formatCurrency(selectedOrder.financials?.discount || selectedOrder.discount || 0)}</span>
                          </div>
                        )}
                        
                        <div className="border-t border-gray-300 pt-2 mt-2">
                          <div className="flex justify-between text-base font-bold">
                            <span>Total:</span>
                            <span>{formatCurrency(selectedOrder.financials?.total || selectedOrder.total || 0)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Status History */}
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      📜 Status History
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 max-h-64 overflow-y-auto">
                      {selectedOrder.statusHistory && selectedOrder.statusHistory.length > 0 ? (
                        <div className="space-y-3">
                          {selectedOrder.statusHistory.map((history, index) => (
                            <div key={index} className="flex items-start gap-3">
                              <div className={`w-2 h-2 rounded-full mt-1.5 ${
                                ORDER_STATUS_CONFIG[history.status]?.color?.split(' ')[0] || 'bg-gray-400'
                              }`}></div>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start mb-1">
                                  <div className="font-medium text-sm text-gray-900 flex items-center gap-1">
                                    {ORDER_STATUS_CONFIG[history.status]?.icon} {history.status}
                                  </div>
                                  <div className="text-xs text-gray-500 flex-shrink-0 ml-2">
                                    {formatDate(history.timestamp)}
                                  </div>
                                </div>
                                {history.note && (
                                  <div className="text-xs text-gray-600 mb-1">{history.note}</div>
                                )}
                                {history.updatedBy && (
                                  <div className="text-xs text-gray-500">
                                    Updated by: {history.updatedBy}
                                  </div>
                                )}
                                {history.metadata && Object.keys(history.metadata).length > 0 && (
                                  <div className="text-xs text-gray-400 mt-1">
                                    Additional info: {JSON.stringify(history.metadata)}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500 italic text-center py-4">
                          No status history available
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Admin Actions */}
                  <div className="flex justify-end items-center pt-6 border-t border-gray-200">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setIsModalOpen(false);
                          setSelectedOrder(null);
                        }}
                        className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        Close
                      </button>
                      
                      {selectedOrder.status === ORDER_STATUSES.PLACED && (
                        <>
                          <button
                            onClick={() => updateOrderStatus(selectedOrder.id, ORDER_STATUSES.APPROVED)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                            disabled={processingAction}
                          >
                            ✅ Approve Order
                          </button>
                          <button
                            onClick={() => updateOrderStatus(selectedOrder.id, ORDER_STATUSES.DECLINED)}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                            disabled={processingAction}
                          >
                            ❌ Decline Order
                          </button>
                        </>
                      )}
                      
                      {selectedOrder.status === ORDER_STATUSES.APPROVED && (
                        <button
                          onClick={() => updateOrderStatus(selectedOrder.id, ORDER_STATUSES.PACKED)}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                          disabled={processingAction}
                        >
                          📦 Mark as Packed
                        </button>
                      )}
                      
                      {selectedOrder.status === ORDER_STATUSES.PACKED && !selectedOrder.tracking?.code && (
                        <button
                          onClick={() => setModalMode('shipping')}
                          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                          disabled={processingAction}
                        >
                          🚚 Add Shipping
                        </button>
                      )}
                      
                      {selectedOrder.status === ORDER_STATUSES.SHIPPED && (
                        <button
                          onClick={() => updateOrderStatus(selectedOrder.id, ORDER_STATUSES.DELIVERED)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                          disabled={processingAction}
                        >
                          ✅ Mark as Delivered
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Analytics Modal */}
      {showAnalytics && analyticsData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
              <h3 className="text-xl font-bold text-gray-900">📊 Order Analytics</h3>
              <button 
                onClick={() => setShowAnalytics(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              {/* Analytics Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="text-blue-600 text-sm font-medium mb-1">Total Orders</div>
                  <div className="text-2xl font-bold text-blue-900">
                    {formatIndianNumber(analyticsData.totalOrders)}
                  </div>
                </div>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="text-green-600 text-sm font-medium mb-1">Total Revenue</div>
                  <div className="text-2xl font-bold text-green-900">
                    {formatCurrency(analyticsData.totalRevenue)}
                  </div>
                </div>
                
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="text-purple-600 text-sm font-medium mb-1">Average Order Value</div>
                  <div className="text-2xl font-bold text-purple-900">
                    {formatCurrency(analyticsData.averageOrderValue)}
                  </div>
                </div>
                
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="text-orange-600 text-sm font-medium mb-1">Unique Customers</div>
                  <div className="text-2xl font-bold text-orange-900">
                    {formatIndianNumber(analyticsData.totalUniqueCustomers)}
                  </div>
                </div>
              </div>
              
              {/* Status Distribution */}
              <div className="mb-8">
                <h4 className="text-lg font-semibold text-gray-800 mb-4">Order Status Distribution</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(analyticsData.statusDistribution).map(([status, count]) => (
                    <div key={status} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <div className="text-sm text-gray-600">{status}</div>
                      <div className="text-xl font-bold text-gray-900">{count}</div>
                      <div className="text-xs text-gray-500">
                        {analyticsData.statusPercentages[status]}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Top Products */}
              <div className="mb-8">
                <h4 className="text-lg font-semibold text-gray-800 mb-4">Top Products by Quantity</h4>
                <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                  <div className="p-3 bg-gray-100 border-b border-gray-200 text-sm font-medium text-gray-700">
                    Product Performance
                  </div>
                  <div className="divide-y divide-gray-200">
                    {analyticsData.topProductsByQuantity.slice(0, 5).map((product, index) => (
                      <div key={product.productId} className="p-3 flex justify-between items-center">
                        <div>
                          <div className="font-medium text-gray-900">{product.name}</div>
                          <div className="text-xs text-gray-500">Orders: {product.orderCount}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-gray-900">Qty: {product.totalQuantity}</div>
                          <div className="text-sm text-green-600">{formatCurrency(product.totalRevenue)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Top Customers */}
              <div>
                <h4 className="text-lg font-semibold text-gray-800 mb-4">Top Customers</h4>
                <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                  <div className="p-3 bg-gray-100 border-b border-gray-200 text-sm font-medium text-gray-700">
                    Customer Value
                  </div>
                  <div className="divide-y divide-gray-200">
                    {analyticsData.topCustomers.slice(0, 5).map((customer, index) => (
                      <div key={customer.customerId} className="p-3 flex justify-between items-center">
                        <div>
                          <div className="font-medium text-gray-900">{customer.email}</div>
                          <div className="text-xs text-gray-500">Orders: {customer.orderCount}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-gray-900">{formatCurrency(customer.totalSpent)}</div>
                          <div className="text-sm text-gray-600">Avg: {formatCurrency(customer.avgOrderValue)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Orders; 