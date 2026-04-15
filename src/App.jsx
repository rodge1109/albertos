import React, { useState, createContext, useContext, useEffect } from 'react';
import { ShoppingCart, Plus, Minus, Trash2, ChevronRight, ChevronLeft, Check, X, Search, Menu, MapPin, RefreshCw, Navigation, ClipboardList, Bike, Phone, User, ShoppingBag, CreditCard, Clock, Inbox, CheckCircle, XCircle, Calendar } from 'lucide-react';

// Cart Context
const CartContext = createContext();

const createBeep = ({ startHz, endHz, durationSec, volume, type = 'sine' }) => {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const ctx = new AudioCtx();

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = type;
  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.frequency.setValueAtTime(startHz, ctx.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(
    endHz,
    ctx.currentTime + durationSec * 0.66
  );

  gainNode.gain.setValueAtTime(volume, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationSec);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + durationSec);
};

// Play a short "pop" sound when item is added to cart
const playAddSound = () => {
  try {
    createBeep({ startHz: 880, endHz: 440, durationSec: 0.12, volume: 0.3 });
  } catch (e) {
    // Audio not supported, silently skip
  }
};

// Play a distinct "SMS-like" tone when a NEW pending order appears in Rider dashboard
// (two short beeps similar to SMS notification)
const playNewOrderSound = () => {
  try {
    createBeep({ startHz: 1318, endHz: 988, durationSec: 0.08, volume: 0.35, type: 'square' });
    window.setTimeout(() => {
      createBeep({ startHz: 1318, endHz: 988, durationSec: 0.08, volume: 0.35, type: 'square' });
    }, 110);
  } catch (e) {
    // Audio not supported, silently skip
  }
};

const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
};

// Google Sheets API URL - UPDATE THIS WITH YOUR WEB APP URL
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwnegMh8Gt4FvHu6TgUv4mivqOIydyPy5mn2MkNwpwVrIJYvpjrcOp7yOpi0P7NwqSrlg/exec';

// Fallback Menu Data (used if Google Sheets fetch fails)
const fallbackMenuData = [
  { id: 1, name: 'Margherita Pizza', category: 'Pizza', sizes: [{ name: 'Small', variants: [{ name: 'Mozzarella', price: 10.99 }, { name: 'Quickmelt', price: 9.99 }] }, { name: 'Medium', variants: [{ name: 'Mozzarella', price: 12.99 }, { name: 'Quickmelt', price: 11.99 }] }, { name: 'Large', variants: [{ name: 'Mozzarella', price: 15.99 }, { name: 'Quickmelt', price: 14.99 }] }], image: 'assets/images/food/pepperoni.png', description: 'Classic tomato sauce, mozzarella, fresh basil', popular: true },
  { id: 2, name: 'Pepperoni Pizza', category: 'Pizza', sizes: [{ name: 'Small', variants: [{ name: 'Mozzarella', price: 12.99 }, { name: 'Quickmelt', price: 11.99 }] }, { name: 'Medium', variants: [{ name: 'Mozzarella', price: 14.99 }, { name: 'Quickmelt', price: 13.99 }] }, { name: 'Large', variants: [{ name: 'Mozzarella', price: 17.99 }, { name: 'Quickmelt', price: 16.99 }] }], image: 'assets/images/food/burgerpizza.png', description: 'Loaded with pepperoni and mozzarella', popular: true },
  { id: 3, name: 'BBQ Chicken Pizza', category: 'Pizza', sizes: [{ name: 'Small', variants: [{ name: 'Mozzarella', price: 13.99 }, { name: 'Quickmelt', price: 12.99 }] }, { name: 'Medium', variants: [{ name: 'Mozzarella', price: 15.99 }, { name: 'Quickmelt', price: 14.99 }] }, { name: 'Large', variants: [{ name: 'Mozzarella', price: 18.99 }, { name: 'Quickmelt', price: 17.99 }] }], image: 'assets/images/food/pepperoni.png', description: 'BBQ sauce, grilled chicken, red onions', popular: false },
  { id: 4, name: 'Veggie Supreme', category: 'Pizza', sizes: [{ name: 'Small', variants: [{ name: 'Mozzarella', price: 11.99 }, { name: 'Quickmelt', price: 10.99 }] }, { name: 'Medium', variants: [{ name: 'Mozzarella', price: 13.99 }, { name: 'Quickmelt', price: 12.99 }] }, { name: 'Large', variants: [{ name: 'Mozzarella', price: 16.99 }, { name: 'Quickmelt', price: 15.99 }] }], image: 'assets/images/food/pepperoni.png', description: 'Mushrooms, peppers, olives, onions', popular: false },

  { id: 5, name: 'Classic Burger', category: 'Burgers', price: 9.99, image: 'assets/images/food/pepperoni.png', description: 'Beef patty, lettuce, tomato, cheese', popular: true },
  { id: 6, name: 'Bacon Cheeseburger', category: 'Burgers', price: 11.99, image: 'assets/images/food/pepperoni.png', description: 'Double beef, bacon, cheddar cheese', popular: true },
  { id: 7, name: 'Veggie Burger', category: 'Burgers', price: 10.99, image: 'assets/images/food/pepperoni.png', description: 'Plant-based patty, avocado, sprouts', popular: false },
  { id: 8, name: 'Chicken Burger', category: 'Burgers', price: 10.49, image: 'assets/images/food/pepperoni.png', description: 'Grilled chicken breast, mayo, lettuce', popular: false },

  { id: 9, name: 'Spaghetti Carbonara', category: 'Pasta', price: 13.99, image: 'assets/images/food/pepperoni.png', description: 'Creamy sauce, bacon, parmesan', popular: true },
  { id: 10, name: 'Penne Arrabiata', category: 'Pasta', price: 12.49, image: 'assets/images/food/pepperoni.png', description: 'Spicy tomato sauce, garlic, herbs', popular: false },
  { id: 11, name: 'Fettuccine Alfredo', category: 'Pasta', price: 13.49, image: 'assets/images/food/pepperoni.png', description: 'Rich cream sauce, parmesan cheese', popular: true },
  { id: 12, name: 'Lasagna', category: 'Pasta', price: 14.99, image: 'assets/images/food/pepperoni.png', description: 'Layered pasta, beef, ricotta, mozzarella', popular: false },

  { id: 13, name: 'Caesar Salad', category: 'Salads', price: 8.99, image: 'assets/images/food/pepperoni.png', description: 'Romaine, croutons, parmesan, caesar dressing', popular: true },
  { id: 14, name: 'Greek Salad', category: 'Salads', price: 9.49, image: 'assets/images/food/pepperoni.png', description: 'Feta, olives, cucumber, tomatoes', popular: false },
  { id: 15, name: 'Caprese Salad', category: 'Salads', price: 10.99, image: 'assets/images/food/pepperoni.png', description: 'Fresh mozzarella, tomatoes, basil', popular: false },

  { id: 16, name: 'Coca Cola', category: 'Drinks', price: 2.99, image: 'assets/images/food/pepperoni.png', description: 'Classic cola, 500ml', popular: true },
  { id: 17, name: 'Fresh Lemonade', category: 'Drinks', price: 3.49, image: 'assets/images/food/pepperoni.png', description: 'Freshly squeezed lemon juice', popular: true },
  { id: 18, name: 'Iced Tea', category: 'Drinks', price: 2.99, image: 'assets/images/food/pepperoni.png', description: 'Peach iced tea', popular: false },

  { id: 19, name: 'Chocolate Cake', category: 'Desserts', price: 6.99, image: 'assets/images/food/pepperoni.png', description: 'Rich chocolate layer cake', popular: true },
  { id: 20, name: 'Tiramisu', category: 'Desserts', price: 7.49, image: 'assets/images/food/pepperoni.png', description: 'Italian coffee-flavored dessert', popular: true },
];

const categories = ['All', 'New Flavors', 'Kiddies Favorites', 'House Specialties', 'Bestsellers', 'Drinks','Desserts','Breakfast Meals'];

// Splash Screen
function SplashScreen({ fading }) {
  return (
    <div className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-yellow-400 ${fading ? 'splash-fadeout' : ''}`}>
      <div className="splash-pizza text-8xl mb-6">🍕</div>
      <div className="splash-text text-center">
        <h1 className="text-3xl font-black text-black tracking-tight">Alberto's Pizza</h1>
        <p className="text-sm font-semibold text-yellow-800 mt-1 tracking-widest uppercase">Nulatula</p>
      </div>
      <div className="mt-8 flex gap-1.5">
        <span className="w-2 h-2 bg-black rounded-full animate-bounce" style={{animationDelay:'0ms'}}></span>
        <span className="w-2 h-2 bg-black rounded-full animate-bounce" style={{animationDelay:'150ms'}}></span>
        <span className="w-2 h-2 bg-black rounded-full animate-bounce" style={{animationDelay:'300ms'}}></span>
      </div>
    </div>
  );
}

// Main App Component
export default function RestaurantApp() {
  const [cartItems, setCartItems] = useState([]);
  const validPages = ['home', 'menu', 'cart', 'checkout', 'rider', 'confirmation'];
  const urlPage = new URLSearchParams(window.location.search).get('page');
  const [currentPage, setCurrentPage] = useState(validPages.includes(urlPage) ? urlPage : 'menu');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCart, setShowCart] = useState(false);
  const [showSizeModal, setShowSizeModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [pendingOrderNumber, setPendingOrderNumber] = useState(null);
  const [showSplash, setShowSplash] = useState(true);
  const [splashFading, setSplashFading] = useState(false);
  const [riderView, setRiderView] = useState(null); // null | 'status' | 'history'
  const [riderPendingCount, setRiderPendingCount] = useState(0);

  // Products state
  const [menuData, setMenuData] = useState(fallbackMenuData);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [productsError, setProductsError] = useState(null);

  // Check URL parameters for payment status (after GCash redirect)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const payment = urlParams.get('payment');
    const orderNumber = urlParams.get('order');

    if (payment && orderNumber) {
      setPaymentStatus(payment);
      setPendingOrderNumber(orderNumber);
      setCurrentPage(payment === 'success' ? 'confirmation' : 'payment-failed');
      // Clear cart if payment successful
      if (payment === 'success') {
        setCartItems([]);
        localStorage.removeItem('pendingOrder');
      }
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Fetch products from Google Sheets on mount
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setIsLoadingProducts(true);
        setProductsError(null);

        const response = await fetch(GOOGLE_SCRIPT_URL);
        const data = await response.json();

        if (data.success && data.products && data.products.length > 0) {
          setMenuData(data.products);
        } else {
          setMenuData(fallbackMenuData);
          setProductsError('Using offline menu data');
        }
      } catch (error) {
        console.error('Error fetching products:', error);
        setMenuData(fallbackMenuData);
        setProductsError('Using offline menu data');
      } finally {
        setIsLoadingProducts(false);
        setSplashFading(true);
        setTimeout(() => setShowSplash(false), 500);
      }
    };

    fetchProducts();
  }, []);

  // Initialize OneSignal Push Notifications
  useEffect(() => {
    if (typeof window !== 'undefined' && window.OneSignalDeferred) {
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push(async function(OneSignal) {
        await OneSignal.init({
          appId: "22fa0af9-4790-4b61-9f6d-573237f0585d", // Replace with your OneSignal App ID
          notifyButton: {
            enable: true,
            size: 'small',
            position: 'bottom-right',
            prenotify: true,
            showCredit: false,
            text: {
              'tip.state.unsubscribed': 'Get order updates',
              'tip.state.subscribed': 'You\'re subscribed!',
              'tip.state.blocked': 'Notifications blocked',
              'message.prenotify': 'Click to receive order updates',
              'message.action.subscribed': 'Thanks for subscribing!',
              'dialog.main.title': 'Manage Notifications',
              'dialog.main.button.subscribe': 'SUBSCRIBE',
              'dialog.main.button.unsubscribe': 'UNSUBSCRIBE',
            }
          },
          welcomeNotification: {
            title: "Welcome to Alberto's Pizza!",
            message: "You'll receive order updates here."
          }
        });
      });
    }
  }, []);

  // Clear cart function
  const clearCart = () => {
    setCartItems([]);
  };

  const addToCart = (item, selectedSize = null) => {
    console.log('addToCart called:', { item, selectedSize, hasSizes: !!item.sizes });

    // For items with sizes, we need size info
    if (item.sizes && !selectedSize) {
      console.log('Opening size modal for:', item.name);
      setSelectedProduct(item);
      setShowSizeModal(true);
      return;
    }

    // Create cart item with size info if applicable
    const cartItem = selectedSize
      ? { ...item, selectedSize: selectedSize.name, price: selectedSize.price, displayName: `${item.name} (${selectedSize.name})` }
      : item;

    // Find existing item by id AND size (if applicable)
    const existingItem = cartItems.find(i =>
      i.id === item.id && (!selectedSize || i.selectedSize === selectedSize.name)
    );

    playAddSound();

    if (existingItem) {
      setCartItems(cartItems.map(i =>
        (i.id === item.id && (!selectedSize || i.selectedSize === selectedSize.name))
          ? { ...i, quantity: i.quantity + 1 }
          : i
      ));
    } else {
      setCartItems([...cartItems, { ...cartItem, quantity: 1 }]);
    }

    // Close modal if it was open
    setShowSizeModal(false);
    setSelectedProduct(null);
  };

  const removeFromCart = (id, selectedSize = null) => {
    setCartItems(cartItems.filter(item =>
      !(item.id === id && (!selectedSize || item.selectedSize === selectedSize))
    ));
  };

  const updateQuantity = (id, newQuantity, selectedSize = null) => {
    if (newQuantity === 0) {
      removeFromCart(id, selectedSize);
    } else {
      setCartItems(cartItems.map(item =>
        (item.id === id && (!selectedSize || item.selectedSize === selectedSize))
          ? { ...item, quantity: newQuantity }
          : item
      ));
    }
  };

  const getTotalItems = () => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
  };

  const getTotalPrice = () => {
    return cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const contextValue = {
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    getTotalItems,
    getTotalPrice
  };

  return (
    <CartContext.Provider value={contextValue}>
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.8s ease-out forwards;
        }
        @keyframes fadeInFast {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeInFast {
          animation: fadeInFast 0.2s ease-out forwards;
        }
        /* Hide scrollbar for category filter */
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        /* Boston Celtics Green Color Override */
        .bg-green-600 {
          background-color: #007A33 !important;
        }
        .bg-green-500 {
          background-color: #008C3C !important;
        }
        .bg-green-700 {
          background-color: #006129 !important;
        }
        .bg-green-400 {
          background-color: #00A34A !important;
        }
        .bg-green-100 {
          background-color: #E6F4EC !important;
        }
        .text-green-600 {
          color: #007A33 !important;
        }
        .text-green-400 {
          color: #00A34A !important;
        }
        .text-green-100 {
          color: #E6F4EC !important;
        }
        .text-green-700 {
          color: #006129 !important;
        }
        .border-green-600 {
          border-color: #007A33 !important;
        }
        .border-green-300 {
          border-color: #66C299 !important;
        }
        .border-green-400 {
          border-color: #00A34A !important;
        }
        .border-green-500 {
          border-color: #008C3C !important;
        }
        .hover\\:bg-green-700:hover {
          background-color: #006129 !important;
        }
        .hover\\:bg-green-500:hover {
          background-color: #008C3C !important;
        }
        .hover\\:text-green-600:hover {
          color: #007A33 !important;
        }
        .hover\\:bg-green-100:hover {
          background-color: #E6F4EC !important;
        }
        .from-green-900 {
          --tw-gradient-from: #004D20 !important;
        }
        .to-green-900 {
          --tw-gradient-to: #004D20 !important;
        }
        .via-green-900 {
          --tw-gradient-via: #004D20 !important;
        }
        .from-green-400 {
          --tw-gradient-from: #00A34A !important;
        }
        .to-green-500 {
          --tw-gradient-to: #008C3C !important;
        }
        @keyframes slideInLeft {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
        .animate-slideInLeft {
          animation: slideInLeft 0.3s ease-out forwards;
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slideInRight {
          animation: slideInRight 0.3s ease-out forwards;
        }
        @keyframes slideOutRight {
          from { transform: translateX(0); }
          to { transform: translateX(100%); }
        }
        .animate-slideOutRight {
          animation: slideOutRight 0.25s ease-in forwards;
        }
      `}</style>
      {showSplash && <SplashScreen fading={splashFading} />}
      <div className="min-h-screen bg-black pb-16 md:pb-0 pt-[95px] md:pt-20 font-sans">
        <Header
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          setShowCart={setShowCart}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          riderPendingCount={riderPendingCount}
          setRiderView={setRiderView}
        />
        {currentPage === 'home' && (
          <HomePage
            setCurrentPage={setCurrentPage}
            menuData={menuData}
            isLoading={isLoadingProducts}
          />
        )}
        {currentPage === 'menu' && (
          <MenuPage
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            searchQuery={searchQuery}
            menuData={menuData}
            isLoading={isLoadingProducts}
          />
        )}
        {currentPage === 'cart' && <CartPage setCurrentPage={setCurrentPage} />}
        {currentPage === 'checkout' && <CheckoutPage setCurrentPage={setCurrentPage} clearCart={clearCart} />}
        {currentPage === 'confirmation' && <ConfirmationPage setCurrentPage={setCurrentPage} orderNumber={pendingOrderNumber} paymentStatus={paymentStatus} />}
        {currentPage === 'payment-failed' && <PaymentFailedPage setCurrentPage={setCurrentPage} orderNumber={pendingOrderNumber} />}
        {currentPage === 'rider' && <RiderPage setCurrentPage={setCurrentPage} riderView={riderView} setRiderView={setRiderView} setRiderPendingCount={setRiderPendingCount} />}
        <CartDrawer isOpen={showCart} setShowCart={setShowCart} setCurrentPage={setCurrentPage} />
        {showSizeModal && selectedProduct && (
          <SizeModal
            product={selectedProduct}
            onClose={() => {
              console.log('Closing size modal');
              setShowSizeModal(false);
              setSelectedProduct(null);
            }}
            onSelectSize={(size) => {
              console.log('Size selected:', size);
              addToCart(selectedProduct, size);
            }}
          />
        )}

        {/* Mobile Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden z-50 pb-safe">
          <div className="flex justify-around items-center py-2">
            <button
              onClick={() => { setCurrentPage('rider'); setRiderView(null); }}
              className={`flex flex-col items-center px-4 py-1 relative ${currentPage === 'rider' && riderView === null ? 'text-green-600' : 'text-gray-500'}`}
            >
              <Navigation className="w-6 h-6" />
              {riderPendingCount > 0 && (
                <span className="absolute -top-1 right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {riderPendingCount > 9 ? '9+' : riderPendingCount}
                </span>
              )}
              <span className="text-xs font-medium">Rider</span>
            </button>
            {currentPage === 'rider' ? (
              <button
                onClick={() => setRiderView(v => v === 'history' ? null : 'history')}
                className={`flex flex-col items-center px-4 py-1 ${riderView === 'history' ? 'text-green-600' : 'text-gray-500'}`}
              >
                <Calendar className="w-6 h-6" />
                <span className="text-xs font-medium">History</span>
              </button>
            ) : (
              <button
                onClick={() => setCurrentPage('menu')}
                className={`flex flex-col items-center px-4 py-1 ${currentPage === 'menu' ? 'text-green-600' : 'text-gray-500'}`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5h6v6H4z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5h6v6h-6z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 13h6v6H4z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 13h6v6h-6z" />
                </svg>
                <span className="text-xs font-medium">Menu</span>
              </button>
            )}
            {currentPage === 'rider' ? (
              <button
                onClick={() => setRiderView(v => v === 'status' ? null : 'status')}
                className={`flex flex-col items-center px-4 py-1 ${riderView === 'status' ? 'text-green-600' : 'text-gray-500'}`}
              >
                <ClipboardList className="w-6 h-6" />
                <span className="text-xs font-medium">Status</span>
              </button>
            ) : (
              <button
                onClick={() => setShowCart(prev => !prev)}
                className={`flex flex-col items-center px-4 py-1 relative ${showCart ? 'text-green-600' : 'text-gray-500'}`}
              >
                <ShoppingCart className="w-6 h-6" />
                {getTotalItems() > 0 && (
                  <span className="absolute -top-1 right-2 bg-green-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                    {getTotalItems()}
                  </span>
                )}
                <span className="text-xs font-medium">Cart</span>
              </button>
            )}
          </div>
        </nav>
      </div>
    </CartContext.Provider>
  );
}

// Size Selection Modal
function SizeModal({ product, onClose, onSelectSize }) {
  const [selectedOption, setSelectedOption] = useState(null);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-end justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-t-2xl shadow-2xl w-full max-w-lg animate-slideUp flex flex-col"
        style={{ maxHeight: 'calc(100dvh - 48px)' }}>

        {/* Fixed header */}
        <div className="px-6 pt-6 pb-3 relative flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-all"
          >
            <X className="w-6 h-6" />
          </button>
          <h2 className="text-2xl font-black text-green-600 mb-1">Select Option</h2>
          <p className="text-gray-800 font-bold">{product.name}</p>
          {product.description && (
            <p className="text-gray-400 text-xs mt-0.5">{product.description}</p>
          )}
        </div>

        {/* Scrollable options */}
        <div className="overflow-y-auto flex-1 px-6 py-2">
          <div className="space-y-5 pb-2">
            {product.sizes.map((size) => (
              <div key={size.name}>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">{size.name}</p>
                <div className="space-y-2">
                  {size.variants ? (
                    size.variants.map((variant) => {
                      const optionName = `${size.name} - ${variant.name}`;
                      const isSelected = selectedOption?.name === optionName;
                      return (
                        <label
                          key={variant.name}
                          className={`flex items-center justify-between w-full px-4 py-3 rounded-lg cursor-pointer transition-all ${
                            isSelected ? 'bg-green-50' : 'bg-gray-50 hover:bg-gray-100'
                          }`}
                        >
                          <span className={`font-normal text-sm ${isSelected ? 'text-green-700' : 'text-gray-700'}`}>
                            {variant.name}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className={`text-sm font-normal ${isSelected ? 'text-green-600' : 'text-gray-500'}`}>
                              Php {variant.price.toFixed(2)}
                            </span>
                            <input
                              type="radio"
                              name="size-option"
                              value={optionName}
                              checked={isSelected}
                              onChange={() => setSelectedOption({ name: optionName, price: variant.price })}
                              className="accent-green-600 w-4 h-4"
                            />
                          </div>
                        </label>
                      );
                    })
                  ) : (
                    <label
                      className={`flex items-center justify-between w-full px-4 py-3 rounded-lg cursor-pointer transition-all ${
                        selectedOption?.name === size.name ? 'bg-green-50' : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <span className={`font-normal text-sm ${selectedOption?.name === size.name ? 'text-green-700' : 'text-gray-700'}`}>
                        {size.name}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className={`text-sm font-normal ${selectedOption?.name === size.name ? 'text-green-600' : 'text-gray-500'}`}>
                          Php {size.price.toFixed(2)}
                        </span>
                        <input
                          type="radio"
                          name="size-option"
                          value={size.name}
                          checked={selectedOption?.name === size.name}
                          onChange={() => setSelectedOption({ name: size.name, price: size.price })}
                          className="accent-green-600 w-4 h-4"
                        />
                      </div>
                    </label>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Fixed footer */}
        <div className="px-6 pt-3 pb-6 border-t border-gray-100 flex-shrink-0">
          {selectedOption && (
            <p className="text-sm text-center text-gray-500 mb-3">
              Selected: <span className="font-bold text-green-600">{selectedOption.name} — Php {selectedOption.price.toFixed(2)}</span>
            </p>
          )}
          <button
            onClick={() => selectedOption && onSelectSize(selectedOption)}
            disabled={!selectedOption}
            className={`w-full py-3 rounded-full font-bold text-sm flex items-center justify-center gap-2 transition-all ${
              selectedOption
                ? 'bg-black text-white hover:bg-gray-800'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Plus className="w-4 h-4" />
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}

// Header Component
function Header({ currentPage, setCurrentPage, setShowCart, searchQuery, setSearchQuery, riderPendingCount, setRiderView }) {
  const { getTotalItems } = useCart();
  const [showRiderMenu, setShowRiderMenu] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 transition-all duration-300">
      <div className="bg-yellow-400 text-black text-center text-xs md:text-sm font-bold py-2 px-4 tracking-wide">
       Alberto's Pizza - Nulatula
      </div>
      <div className="bg-yellow-500">
        <div className="w-full px-8 py-4 md:py-1">
          <div className="flex items-center justify-between gap-4">
            <div className="hidden md:flex flex-1 max-w-2xl items-center gap-3">
              <button
                type="button"
                className="p-2 text-black hover:text-gray-700"
                aria-label="Open menu"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div className="relative w-full mt-[-10px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search for products..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (e.target.value && currentPage !== 'menu') setCurrentPage('menu');
                  }}
                  className="w-full h-[30px] pl-10 pr-4 rounded-full border border-yellow-600 focus:border-yellow-700 focus:outline-none font-normal text-black bg-gray-700 placeholder-gray-400 text-sm"
                />
              </div>
            </div>

            <div className="hidden md:flex items-center text-black font-black text-lg ml-2 whitespace-nowrap">
              ALBERTO'S PIZZA
            </div>

            <nav className="hidden md:flex items-center space-x-4">
              <button
                onClick={() => setCurrentPage('home')}
                className={`font-black transition-all px-4 py-2 rounded-lg text-sm tracking-wider ${currentPage === 'home' ? 'bg-yellow-600 text-white' : 'text-black hover:bg-yellow-600 hover:text-white'}`}
              >
                HOME
              </button>
              <button
                onClick={() => setCurrentPage('menu')}
                className={`font-black transition-all px-4 py-2 rounded-lg text-sm tracking-wider ${currentPage === 'menu' ? 'bg-yellow-600 text-white' : 'text-black hover:bg-yellow-600 hover:text-white'}`}
              >
                MENU
              </button>
            </nav>

            <div className="hidden md:flex items-center gap-3">
              {/* Rider Menu with Dropdown */}
              <div 
                className="relative group"
                onMouseEnter={() => setShowRiderMenu(true)}
                onMouseLeave={() => setShowRiderMenu(false)}
              >
                <button
                  onClick={() => {
                    setCurrentPage('rider');
                    setRiderView(null);
                  }}
                  className={`relative px-5 py-2 rounded-full transition-all font-semibold text-sm flex items-center gap-2 ${
                    currentPage === 'rider' ? 'bg-black text-white shadow-lg' : 'bg-white text-black hover:bg-gray-100 border border-yellow-600'
                  }`}
                >
                  <Bike className="w-5 h-5" />
                  RIDER
                  {riderPendingCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-600 animate-pulse text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-black border-2 border-yellow-500">
                      {riderPendingCount > 9 ? '9+' : riderPendingCount}
                    </span>
                  )}
                </button>

                {/* Submenu */}
                {showRiderMenu && (
                  <div className="absolute top-full right-0 mt-1 w-48 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-[60] animate-fadeInFast">
                    <button
                      onClick={() => {
                        setCurrentPage('rider');
                        setRiderView(null);
                        setShowRiderMenu(false);
                      }}
                      className="w-full text-left px-4 py-3 text-sm font-bold text-gray-700 hover:bg-yellow-50 hover:text-green-700 flex items-center justify-between group/item"
                    >
                      <span className="flex items-center gap-2">
                        <Inbox className="w-4 h-4 text-gray-400 group-hover/item:text-green-600" />
                        PENDING ORDERS
                      </span>
                      {riderPendingCount > 0 && (
                        <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{riderPendingCount}</span>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setCurrentPage('rider');
                        setRiderView('status');
                        setShowRiderMenu(false);
                      }}
                      className="w-full text-left px-4 py-3 text-sm font-bold text-gray-700 hover:bg-yellow-50 hover:text-green-700 border-t border-gray-50 flex items-center gap-2 group/item"
                    >
                      <ClipboardList className="w-4 h-4 text-gray-400 group-hover/item:text-green-600" />
                      TODAY'S STATUS
                    </button>
                    <button
                      onClick={() => {
                        setCurrentPage('rider');
                        setRiderView('history');
                        setShowRiderMenu(false);
                      }}
                      className="w-full text-left px-4 py-3 text-sm font-bold text-gray-700 hover:bg-yellow-50 hover:text-green-700 border-t border-gray-50 flex items-center gap-2 group/item"
                    >
                      <Calendar className="w-4 h-4 text-gray-400 group-hover/item:text-green-600" />
                      DELIVERY HISTORY
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowCart(prev => !prev)}
                className="relative bg-black text-white px-5 py-2 rounded-full hover:bg-gray-800 transition-all font-semibold text-sm flex items-center gap-2"
              >
                <ShoppingCart className="w-5 h-5" />
                CART
                {getTotalItems() > 0 && (
                  <span className="absolute -top-2 -right-2 bg-green-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                    {getTotalItems()}
                  </span>
                )}
              </button>
            </div>

          </div>

          <div className="md:hidden relative flex items-center justify-center">
            <button
              type="button"
              className="absolute left-[10px] p-2 text-black flex items-center justify-center"
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="relative w-[300px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search for product..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (e.target.value && currentPage !== 'menu') setCurrentPage('menu');
                }}
                className="w-full h-[30px] pl-10 pr-4 rounded-full focus:outline-none font-normal text-white bg-black placeholder-gray-400 text-[14px]"
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

// Home Page
function HomePage({ setCurrentPage, menuData, isLoading }) {
  const popularItems = menuData.filter(item => item.popular).slice(0, 6);
  const heroSlide = {
    title: "TASTE THE SUCCESS",
    subtitle: "DELIVERED FAST!",
    description: "Order your favorite meals and get them delivered hot and fresh",
    bgImage: "assets/images/hero/hero1.jpg"
  };

  return (
    <div>
      {/* Hero Section */}
      <section className="overflow-hidden">
        <img
          src={heroSlide.bgImage}
          alt="Hero"
          className="w-full h-[260px] md:h-[360px] object-cover block"
        />
      </section>

      {/* Popular Items */}
      <section className="bg-gray-50 py-12 sm:py-16">
        <div className="w-full px-0 md:px-2">
        <h2
          className="text-xl sm:text-2xl lg:text-3xl font-medium text-black tracking-tight mb-8 sm:mb-12 text-center"
          style={{ marginTop: "-30px" }}
        >
          Featured Products
        </h2>
        {isLoading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
            <p className="text-xl text-green-600 font-bold">Loading popular items...</p>
          </div>
        ) : (
          <>
            <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide bg-gray-100 p-3 pl-8 sm:pl-10 -mt-5">
              {popularItems.map(item => (
                <div
                  key={item.id}
                  className="min-w-[216px] sm:min-w-[234px] snap-start scroll-ml-4 sm:scroll-ml-6"
                >
                  <PopularItemCard item={item} />
                </div>
              ))}
            </div>
            <div className="text-center mt-8 sm:mt-12">
              <button
                onClick={() => setCurrentPage('menu')}
                className="bg-black text-white px-8 py-3 rounded-full font-semibold hover:bg-gray-800 transition-all shadow-lg text-sm tracking-wider"
              >
                SHOP BY CATEGORY
              </button>
            </div>
          </>
        )}
        </div>
      </section>

      {/* Features & Contact Info */}
      <section className="bg-gray-50 py-2">
        <div className="w-full px-8">
          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center mb-16">
            <div className="bg-blue-600 rounded-xl shadow-lg hover:shadow-xl transition-all overflow-hidden">
              <img src="assets/images/features/feature1.jpg" alt="Fast delivery" className="w-full h-[75%] object-cover block" />
              <div className="p-5 space-y-1">
                <h3 className="text-xl font-semibold text-white leading-[5px]">FAST DELIVERY</h3>
                <p className="text-blue-100 font-medium leading-snug">Get your food delivered in 30 minutes or less</p>
              </div>
            </div>
            <div className="bg-blue-600 rounded-xl shadow-lg hover:shadow-xl transition-all overflow-hidden">
              <img src="assets/images/features/feature2.jpg" alt="Fresh food" className="w-full h-[75%] object-cover block" />
              <div className="p-5 space-y-1">
                <h3 className="text-xl font-semibold text-white leading-[5px]">FRESH FOOD</h3>
                <p className="text-blue-100 font-medium leading-snug">Made fresh daily with quality ingredients</p>
              </div>
            </div>
            <div className="bg-blue-600 rounded-xl shadow-lg hover:shadow-xl transition-all overflow-hidden">
              <img src="assets/images/features/feature3.jpg" alt="Best quality" className="w-full h-[75%] object-cover block" />
              <div className="p-5 space-y-1">
                <h3 className="text-xl font-semibold text-white leading-[5px]">BEST QUALITY</h3>
                <p className="text-blue-100 font-medium leading-snug">Rated 4.9/5 by our satisfied customers</p>
              </div>
            </div>
          </div>

          {/* Contact & Info Section */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-left border-t-2 border-green-300 pt-6">
            {/* About */}
            <div>
              <h4 className="text-xl font-black text-black mb-4">ABOUT US</h4>
              <p className="text-gray-700 text-sm leading-relaxed">
                Alberto’s Pizza is your go-to destination for fresh, delicious pizza and more. We serve hand-crafted pizzas, burgers, pasta, and desserts made with quality ingredients. Order online and enjoy fast delivery straight to your door.
              </p>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-xl font-black text-black mb-4">CONTACT</h4>
              <div className="space-y-3 text-gray-700 text-sm">
                <div className="flex items-start space-x-2">
                  <span>📍</span>
                  <span>San Vicente,Bogo,Cebu,Philippines</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>📞</span>
                  <span>+63 927 623 0491</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>📧</span>
                  <span>rodge.tonacao@gmail.com</span>
                </div>
              </div>
            </div>

            {/* Hours */}
            <div>
              <h4 className="text-xl font-black text-black mb-4">HOURS</h4>
              <div className="space-y-2 text-gray-700 text-sm">
                <div className="flex justify-between">
                  <span>Monday - Friday:</span>
                  <span>9AM - 11PM</span>
                </div>
                <div className="flex justify-between">
                  <span>Saturday:</span>
                  <span>10AM - 12AM</span>
                </div>
                <div className="flex justify-between">
                  <span>Sunday:</span>
                  <span>10AM - 10PM</span>
                </div>
              </div>
            </div>

            {/* Social Links */}
            <div>
              <h4 className="text-xl font-black text-black mb-4">FOLLOW US</h4>
              <div className="flex space-x-4 mb-4">
                <a href="#" className="w-10 h-10 bg-black hover:bg-gray-800 rounded-full flex items-center justify-center text-white text-sm font-bold tracking-wide transition-all">
                  IG
                </a>
                <a href="#" className="w-10 h-10 bg-black hover:bg-gray-800 rounded-full flex items-center justify-center text-white text-sm font-bold tracking-wide transition-all">
                  FB
                </a>
                <a href="#" className="w-10 h-10 bg-black hover:bg-gray-800 rounded-full flex items-center justify-center text-white text-sm font-bold tracking-wide transition-all">
                  X
                </a>
              </div>
              <div className="text-gray-700 text-sm">
                <p className="mb-2">Subscribe to our newsletter:</p>
                <div className="flex space-x-2">
                  <input 
                    type="email" 
                    placeholder="Your email" 
                    className="flex-1 px-3 py-2 rounded-lg text-gray-800 text-xs font-bold"
                  />
                  <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-black text-xs transition-all">
                    GO
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Bottom */}
          <div className="border-t-2 border-green-300 mt-12 pt-8 text-center">
            <p className="text-gray-600 text-sm">
              © 2026 Developed by Rodge Tonacao. All rights reserved. |
              <a href="#" className="hover:text-green-600 transition-all ml-1">Privacy Policy</a> |
              <a href="#" className="hover:text-green-600 transition-all ml-1">Terms of Service</a>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

// Popular Item Card
function PopularItemCard({ item }) {
  const { addToCart } = useCart();

  return (
    <div className="bg-gray-50 border border-gray-200 shadow-lg hover:shadow-2xl transition-all overflow-hidden group w-full min-h-[16rem] flex flex-col">
      <div className="bg-gray-50 p-3 text-center flex-1 flex flex-col justify-center">
        {item.image && item.image.startsWith('assets/') ? (
          <img src={item.image} alt={item.name} className="object-contain mx-auto rounded-lg h-36 w-36 group-hover:scale-110 transition-transform bg-gray-50" />
        ) : (
          <div className="text-9xl group-hover:scale-110 transition-transform">{item.image}</div>
        )}
      </div>
      <div className="p-5 flex flex-col gap-3">
        <div className="mb-1 space-y-0.5">
          <span className="inline-flex bg-black text-white px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap">POPULAR</span>
          <h3 className="text-base sm:text-lg md:text-xl font-semibold text-black">{item.name}</h3>
        </div>
        <p className="text-gray-800 text-sm sm:text-base mb-3 -mt-2.5 line-clamp-2 font-normal">{item.description}</p>
        <div className="flex flex-col items-center gap-3 w-full px-2">
          {item.sizes ? (
            <span className="text-sm sm:text-base md:text-lg font-semibold text-black whitespace-nowrap text-center">
              From Php {Math.min(...item.sizes.flatMap(s => s.variants ? s.variants.map(v => v.price) : [s.price])).toFixed(2)}
            </span>
          ) : (
            <span className="text-sm sm:text-base md:text-lg font-semibold text-black whitespace-nowrap text-center">Php {item.price.toFixed(2)}</span>
          )}
          <button
            onClick={() => addToCart(item)}
            className="w-full max-w-[220px] bg-black text-white px-5 py-3 rounded-full hover:bg-gray-800 transition-all flex items-center justify-center gap-2 font-medium text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add to Cart</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// Menu Page
function MenuPage({ selectedCategory, setSelectedCategory, searchQuery, menuData, isLoading }) {
  const filteredItems = menuData.filter(item => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Category Filter - Right below header */}
      <div className="bg-white shadow-md sticky top-[95px] md:top-[90px] z-40">
        <div className="w-full px-8">
          <div className="flex overflow-x-auto space-x-1 py-3 scrollbar-hide">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full font-semibold whitespace-nowrap transition-all text-xs tracking-wide ${
                  selectedCategory === category
                    ? 'bg-black text-white shadow'
                    : 'bg-gray-100 text-black hover:bg-gray-200'
                }`}
              >
                {category.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Menu Content */}
      <div className="w-full px-8 py-6 sm:py-8">
        <h1 className="text-2xl sm:text-3xl font-semibold text-green-600 mb-6 sm:mb-8 text-center">SELECT PRODUCT</h1>

        {isLoading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
            <p className="text-xl text-green-600 font-bold">Loading menu...</p>
          </div>
        ) : (
          <>
            {/* Menu Grid - Optimized for horizontal cards */}
            <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 lg:gap-5">
              {filteredItems.map(item => (
                <MenuItem key={item.id} item={item} />
              ))}
            </div>

            {filteredItems.length === 0 && (
              <div className="text-center py-16">
                <p className="text-2xl text-gray-400">No items found</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Menu Item Card
function MenuItem({ item }) {
  const { addToCart } = useCart();

  return (
      <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all overflow-hidden group w-full flex flex-row h-auto min-h-[273px] sm:min-h-[293px]">
        {/* Left side - Product Image */}
        <div className="bg-gray-50 p-3 sm:p-4 flex items-center justify-center w-48 sm:w-54 md:w-60 flex-shrink-0 relative">
          {item.image && item.image.startsWith('assets/') ? (
            <img src={item.image} alt={item.name} className="object-contain w-full h-48 sm:h-54 md:h-60 rounded-lg group-hover:scale-110 transition-transform duration-300" />
          ) : (
            <div className="text-7xl sm:text-8xl md:text-9xl group-hover:scale-110 transition-transform duration-300">{item.image}</div>
          )}
          {item.popular && (
            <span className="absolute top-1 right-1 bg-green-600 text-white px-2 py-1 rounded-full text-xs font-black">
            HOT
          </span>
        )}
      </div>

      {/* Right side - Product Details */}
      <div className="p-3 sm:p-4 md:p-5 flex flex-col justify-between flex-1 min-w-0">
        <div className="mb-2">
          <h3 className="text-base sm:text-lg md:text-xl font-bold text-black mb-1 break-words">{item.name}</h3>
          <p className="text-gray-600 text-sm sm:text-base line-clamp-6 font-normal">{item.description}</p>
        </div>
        <div className="flex flex-col gap-2">
          {item.sizes ? (
            <span className="text-sm sm:text-base md:text-lg font-semibold text-black break-words">
              From Php {Math.min(...item.sizes.flatMap(s => s.variants ? s.variants.map(v => v.price) : [s.price])).toFixed(2)}
            </span>
          ) : (
            <span className="text-sm sm:text-base md:text-lg font-semibold text-black break-words">Php {item.price.toFixed(2)}</span>
          )}
          <button
            onClick={() => addToCart(item)}
            className="bg-black text-white px-5 sm:px-6 py-3 rounded-full hover:bg-gray-800 transition-all flex items-center justify-center space-x-2 text-sm font-semibold hover:scale-105 w-full whitespace-nowrap"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>ADD</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// Cart Drawer
function CartDrawer({ isOpen, setShowCart, setCurrentPage }) {
  const { cartItems } = useCart();
  const [rendered, setRendered] = useState(isOpen);
  const [closing, setClosing] = useState(false);
  const hasPushedState = React.useRef(false);

  // Handle open/close render lifecycle
  useEffect(() => {
    if (isOpen) {
      setRendered(true);
      setClosing(false);
      if (!hasPushedState.current) {
        window.history.pushState({ cartDrawer: true }, '');
        hasPushedState.current = true;
      }
    } else if (rendered) {
      setClosing(true);
      const timer = setTimeout(() => setRendered(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, rendered]);

  // Back button closes drawer with animation
  useEffect(() => {
    const handlePop = () => setShowCart(false);
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, [setShowCart]);

  if (!rendered) return null;

  return (
    <div
      className="fixed left-0 right-0 bottom-[100px] top-[90px] md:top-0 md:bottom-0 bg-transparent z-50 flex justify-end"
      onClick={() => setShowCart(false)}
    >
      <div
        className={`bg-gray-100 w-[70vw] max-w-[960px] min-w-[260px] h-full md:h-[calc(100%-20px)] md:mb-5 overflow-y-auto shadow-2xl rounded-l-2xl ${
          closing ? 'animate-slideOutRight' : 'animate-slideInRight'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Your Cart</h2>
            <button
              onClick={() => setShowCart(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {cartItems.length === 0 ? (
            <div className="text-center py-16">
              <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Your cart is empty</p>
            </div>
          ) : (
            <>
              <div className="space-y-4 mb-6">
                {cartItems.map((item, index) => (
                  <CartItemCard
                    key={`${item.id}-${item.selectedSize || 'default'}-${index}`}
                    item={item}
                  />
                ))}
              </div>
              <div className="w-full flex justify-center">
                <button
                  onClick={() => {
                    setShowCart(false);
                    setCurrentPage('cart');
                  }}
                  className="w-full max-w-[200px] bg-green-600 text-white py-3 rounded-full font-semibold text-sm hover:bg-green-700 transition-all"
                >
                  View Full Cart
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Cart Page
function CartPage({ setCurrentPage }) {
  const { cartItems, getTotalPrice } = useCart();
  const deliveryFee = 0;
  const tax = 0;
  const total = getTotalPrice() + deliveryFee + tax;

  if (cartItems.length === 0) {
    return (
      <div className="bg-gray-50 min-h-screen py-8">
        <div className="w-full px-8 text-center">
          <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-medium text-gray-800 mb-2">Your cart is empty</h2>
          <p className="text-sm text-gray-500 mb-6">Add some items to get started</p>
          <button
            onClick={() => setCurrentPage('menu')}
            className="bg-green-600 text-white px-6 py-2.5 rounded-md text-sm font-medium hover:bg-green-700 transition-all"
          >
            Browse Menu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen pt-0 pb-8">
      <div className="w-full px-4 md:px-6">
        <h1 className="text-2xl font-medium text-gray-800 mb-4 text-center mt-2.5">Your Cart</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            {cartItems.map((item, index) => (
              <CartItemCard key={`${item.id}-${item.selectedSize || 'default'}-${index}`} item={item} detailed />
            ))}
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-5 sticky top-[110px]">
              <h3 className="text-base font-medium text-gray-800 mb-4">Order Summary</h3>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span>Php {getTotalPrice().toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Delivery Fee</span>
                  <span>Php {deliveryFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Tax (Inclusive)</span>
                  <span>Php {tax.toFixed(2)}</span>
                </div>
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <div className="flex justify-between text-base font-medium">
                    <span>Total</span>
                    <span className="text-green-600">Php {total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setCurrentPage('checkout')}
                className="w-full bg-green-600 text-white py-2.5 rounded-md text-sm font-medium hover:bg-green-700 transition-all"
              >
                Proceed to Checkout
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Cart Item Card
function CartItemCard({ item, detailed = false }) {
  const { updateQuantity, removeFromCart } = useCart();

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 flex items-center gap-3">
      <div className="bg-gray-50 rounded-md flex items-center justify-center w-14 h-14 flex-shrink-0">
        {item.image && item.image.startsWith('assets/') ? (
          <img src={item.image} alt={item.name} className="object-contain w-full h-full rounded" />
        ) : (
          <div className="text-3xl">{item.image}</div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-gray-800 text-sm truncate">{item.name}</h3>
        {item.selectedSize && <p className="text-gray-400 text-xs truncate">Size: {item.selectedSize}</p>}
        <div className="flex items-center justify-between mt-1">
          <p className="text-green-600 font-medium text-sm whitespace-nowrap">Php {item.price.toFixed(2)}</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => updateQuantity(item.id, item.quantity - 1, item.selectedSize)}
              className="bg-gray-100 hover:bg-gray-200 rounded-md p-1.5 transition-all"
            >
              <Minus className="w-3 h-3 text-gray-600" />
            </button>
            <span className="font-medium text-sm w-6 text-center">{item.quantity}</span>
            <button
              onClick={() => updateQuantity(item.id, item.quantity + 1, item.selectedSize)}
              className="bg-green-600 hover:bg-green-700 text-white rounded-md p-1.5 transition-all"
            >
              <Plus className="w-3 h-3" />
            </button>
            {detailed && (
              <button
                onClick={() => removeFromCart(item.id, item.selectedSize)}
                className="text-gray-400 hover:text-red-500 p-1 transition-all ml-1"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Checkout Page
function CheckoutPage({ setCurrentPage, clearCart }) {
  const { getTotalPrice, cartItems } = useCart();
  const [formData, setFormData] = useState({
    orderType: 'delivery',
    name: '',
    email: '',
    phone: '',
    address: '',
    landmark: '',
    city: '',
    area: '',
    paymentMethod: 'cash',
    paymentReference: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locationStatus, setLocationStatus] = useState('idle'); // 'idle', 'loading', 'success', 'error'
  const [userCoords, setUserCoords] = useState(null);
  const [notificationStatus, setNotificationStatus] = useState('checking'); // 'checking', 'subscribed', 'not-subscribed', 'denied'
  const [areas, setAreas] = useState([]);
  const [areasLoading, setAreasLoading] = useState(true);
  const [areasError, setAreasError] = useState(null);
  const [selectedAreaData, setSelectedAreaData] = useState(null);

  // Check notification subscription status on mount
  useEffect(() => {
    const checkNotificationStatus = async () => {
      try {
        if (window.OneSignalDeferred) {
          window.OneSignalDeferred.push(async function(OneSignal) {
            const permission = await OneSignal.Notifications.permission;
            const playerId = await OneSignal.User.PushSubscription.id;

            if (permission === false) {
              setNotificationStatus('denied');
            } else if (playerId) {
              setNotificationStatus('subscribed');
            } else {
              setNotificationStatus('not-subscribed');
            }
          });
        } else {
          setNotificationStatus('not-subscribed');
        }
      } catch (err) {
        console.log('Error checking notification status:', err);
        setNotificationStatus('not-subscribed');
      }
    };

    checkNotificationStatus();
  }, []);

  // Fetch areas from Google Sheets
  useEffect(() => {
    const fetchAreas = async () => {
      try {
        setAreasLoading(true);
        const response = await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          body: JSON.stringify({ action: 'getAreas' })
        });
        const result = await response.json();
        if (result.success && result.areas) {
          setAreas(result.areas);
        } else {
          setAreasError('Failed to load areas');
        }
      } catch (error) {
        console.error('Error fetching areas:', error);
        setAreasError('Error loading delivery areas');
      } finally {
        setAreasLoading(false);
      }
    };

    fetchAreas();
  }, []);

  // Update selected area data when area selection changes
  useEffect(() => {
    if (formData.area) {
      const selected = areas.find(a => a.name === formData.area);
      setSelectedAreaData(selected || null);
    } else {
      setSelectedAreaData(null);
    }
  }, [formData.area, areas]);

  // Convert military time (0-23) to 12-hour format with AM/PM
  const convertMilitaryToAmPm = (militaryTime) => {
    const hour = typeof militaryTime === 'string' ? parseInt(militaryTime) : militaryTime;
    if (isNaN(hour)) return militaryTime;
    
    if (hour === 0) return '12am';
    if (hour < 12) return `${hour}am`;
    if (hour === 12) return '12pm';
    return `${hour - 12}pm`;
  };

  // Check if area is currently open
  const isAreaOpen = () => {
    if (!selectedAreaData) return null;
    
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTime = currentHour * 100 + currentMinutes; // Convert to HHMM format
    
    // Parse operating hours (expecting format like "09:00" or "9")
    const parseTime = (timeStr) => {
      if (typeof timeStr === 'number') {
        return timeStr * 100; // If it's just a number like 9, convert to 0900
      }
      const parts = String(timeStr).split(':');
      const hours = parseInt(parts[0]);
      const minutes = parseInt(parts[1]) || 0;
      return hours * 100 + minutes;
    };
    
    const openTime = parseTime(selectedAreaData.operating_from);
    const closeTime = parseTime(selectedAreaData.closing_hour);
    
    return currentTime >= openTime && currentTime < closeTime;
  };

  // Calculate how much more is needed to meet minimum order
  const getRemainingForMinimum = () => {
    if (!selectedAreaData) return 0;
    const cartTotal = getTotalPrice();
    const minOrder = parseFloat(selectedAreaData.minimum_order);
    const remaining = minOrder - cartTotal;
    return remaining > 0 ? remaining : 0;
  };

  // Function to request notification permission
  const requestNotificationPermission = async () => {
    try {
      if (window.OneSignalDeferred) {
        window.OneSignalDeferred.push(async function(OneSignal) {
          await OneSignal.Notifications.requestPermission();
          // Check status after requesting
          const playerId = await OneSignal.User.PushSubscription.id;
          if (playerId) {
            setNotificationStatus('subscribed');
          } else {
            const permission = await OneSignal.Notifications.permission;
            if (permission === false) {
              setNotificationStatus('denied');
            }
          }
        });
      }
    } catch (err) {
      console.log('Error requesting notification permission:', err);
    }
  };

  const handleShareLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setLocationStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserCoords(coords);
        setLocationStatus('success');
      },
      () => {
        setLocationStatus('error');
      },
      { enableHighAccuracy: true }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check if delivery area is currently open
    if (formData.orderType === 'delivery' && selectedAreaData && !isAreaOpen()) {
      const openTime = convertMilitaryToAmPm(selectedAreaData.operating_from);
      const closeTime = convertMilitaryToAmPm(selectedAreaData.closing_hour);
      alert(`${formData.area} is currently closed. Operating hours: ${openTime} - ${closeTime}`);
      return;
    }

    // Check minimum order amount for delivery
    if (formData.orderType === 'delivery' && selectedAreaData) {
      var cartTotal = getTotalPrice();
      var minOrder = parseFloat(selectedAreaData.minimum_order);
      if (cartTotal < minOrder) {
        alert(`Minimum order for ${formData.area} is Php ${minOrder.toFixed(2)}. Your current total is Php ${cartTotal.toFixed(2)}`);
        return;
      }
    }

    if ((formData.paymentMethod === 'bank' || formData.paymentMethod === 'gcash') && !formData.paymentReference.trim()) {
      alert(`Please enter your ${formData.paymentMethod === 'gcash' ? 'GCash' : 'Bank'} reference number.`);
      return;
    }

    setIsSubmitting(true);

    try {
      const tax = 0;

      // Format cart items as a string
      const itemsList = cartItems.map(item =>
        `${item.name}${item.selectedSize ? ` (${item.selectedSize})` : ''} (x${item.quantity}) - Php ${(item.price * item.quantity).toFixed(2)}`
      ).join(', ');

      // Format payment method display
      let paymentMethodDisplay = formData.paymentMethod;
      if (formData.paymentMethod === 'cash') {
        paymentMethodDisplay = formData.orderType === 'pickup' ? 'Cash on Pickup' : 'Cash on Delivery';
      } else if (formData.paymentMethod === 'gcash') {
        paymentMethodDisplay = `GCash (Ref: ${formData.paymentReference})`;
      } else if (formData.paymentMethod === 'bank') {
        paymentMethodDisplay = `Bank Transfer (Ref: ${formData.paymentReference})`;
      }

      // Get OneSignal Player ID for customer notifications
      let playerId = null;
      try {
        if (window.OneSignalDeferred) {
          await new Promise((resolve) => {
            window.OneSignalDeferred.push(async function(OneSignal) {
              playerId = await OneSignal.User.PushSubscription.id;
              resolve();
            });
          });
        }
      } catch (err) {
        console.log('Could not get OneSignal player ID:', err);
      }

      // Calculate delivery fee based on selected area
      let deliveryFee = 0;
      if (formData.orderType === 'delivery' && selectedAreaData) {
        deliveryFee = parseFloat(selectedAreaData.delivery_fee);
      }

      // Send data to Google Sheets
      const postBody = {
          orderType: formData.orderType === 'pickup' ? 'Pickup' : 'Delivery',
          fullName: formData.name,
          email: formData.email,
          phone: formData.phone,
          address: formData.orderType === 'pickup' ? 'N/A (Pickup)' : formData.address,
          landmark: formData.orderType === 'pickup' ? '' : (formData.landmark || ''),
          city: formData.orderType === 'pickup' ? '' : formData.city,
          area: formData.orderType === 'pickup' ? '' : formData.area,
          coordinates: userCoords ? `${userCoords.lat.toFixed(6)}, ${userCoords.lng.toFixed(6)}` : '',
          mapsLink: userCoords ? `https://www.google.com/maps?q=${userCoords.lat},${userCoords.lng}` : '',
          barangay: formData.zipCode,
          paymentMethod: paymentMethodDisplay,
          paymentReference: formData.paymentReference || 'N/A',
          playerId: playerId || '',
          items: itemsList,
          subtotal: getTotalPrice().toFixed(2),
          deliveryFee: deliveryFee.toFixed(2),
          tax: tax.toFixed(2),
          total: (getTotalPrice() + deliveryFee + tax).toFixed(2)
      };
      console.log('ORDER PAYLOAD:', postBody);

      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify(postBody)
      });

      const result = await response.json();

      if (result.success) {
        if (clearCart) clearCart();
        setCurrentPage('confirmation');
      } else {
        alert('Error: ' + (result.error || 'Failed to process order'));
      }
    } catch (error) {
      console.error('Error processing order:', error);
      alert('There was an error processing your order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate delivery fee based on order type and selected area
  let deliveryFee = 0;
  if (formData.orderType === 'delivery' && selectedAreaData) {
    deliveryFee = parseFloat(selectedAreaData.delivery_fee);
  }
  const tax = 0;
  const total = getTotalPrice() + deliveryFee + tax;

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="w-full px-8">
        <h1 className="text-2xl font-medium text-gray-800 mb-8 text-center">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6 space-y-6">

            {/* Order Type */}
            <div>
              <h3 className="text-base font-medium text-gray-700 mb-3">Order Type</h3>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({...formData, orderType: 'delivery'})}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                    formData.orderType === 'delivery'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <span>🛵</span> Delivery
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({...formData, orderType: 'pickup'})}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                    formData.orderType === 'pickup'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <span>🏪</span> Pickup
                </button>
              </div>
              {formData.orderType === 'pickup' && (
                <p className="text-xs text-gray-500 mt-2">Pick up your order at Alberto's Pizza, Nulatula.</p>
              )}
            </div>

            <div>
              <h3 className="text-base font-medium text-gray-700 mb-4">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Full Name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 rounded-md border border-gray-300 focus:border-green-500 focus:outline-none text-sm"
                />
                <input
                  type="email"
                  placeholder="Email (optional)"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-3 py-2 rounded-md border border-gray-300 focus:border-green-500 focus:outline-none text-sm"
                />
                <input
                  type="tel"
                  placeholder="Phone Number"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-3 py-2 rounded-md border border-gray-300 focus:border-green-500 focus:outline-none text-sm"
                />
              </div>
              {formData.orderType === 'delivery' && (
                <>
                  <input
                    type="text"
                    placeholder="Street Address"
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    className="w-full px-3 py-2 rounded-md border border-gray-300 focus:border-green-500 focus:outline-none text-sm mt-3"
                  />
                  <input
                    type="text"
                    placeholder="Landmark (e.g. near church, beside school)"
                    value={formData.landmark}
                    onChange={(e) => setFormData({...formData, landmark: e.target.value})}
                    className="w-full px-3 py-2 rounded-md border border-gray-300 focus:border-green-500 focus:outline-none text-sm mt-3"
                  />
                  <input
                    type="text"
                    placeholder="City"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                    className="w-full px-3 py-2 rounded-md border border-gray-300 focus:border-green-500 focus:outline-none text-sm mt-3"
                  />

                  {/* Area Dropdown */}
                  <div className="mt-3">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Delivery Area *</label>
                    {areasLoading ? (
                      <div className="w-full px-3 py-2 rounded-md border border-gray-300 bg-gray-50 text-gray-500 text-sm flex items-center gap-2">
                        <span className="animate-spin">⏳</span> Loading areas...
                      </div>
                    ) : areasError ? (
                      <div className="w-full px-3 py-2 rounded-md border border-red-300 bg-red-50 text-red-600 text-sm">
                        {areasError}
                      </div>
                    ) : (
                      <select
                        required
                        value={formData.area}
                        onChange={(e) => setFormData({...formData, area: e.target.value})}
                        className="w-full px-3 py-2 rounded-md border border-gray-300 focus:border-green-500 focus:outline-none text-sm appearance-none bg-white bg-no-repeat bg-right pr-8"
                        style={{backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%2712%27 viewBox=%270 0 12 12%27%3E%3Cpath fill=%27%23333%27 d=%27M10.293 3.293L6 7.586 1.707 3.293A1 1 0 00.293 4.707l5 5a1 1 0 001.414 0l5-5a1 1 0 10-1.414-1.414z%27/%3E%3C/svg%3E")', backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em 1.5em'}}
                      >
                        <option value="">Select a delivery area...</option>
                        {areas.map((area) => (
                          <option key={area.name} value={area.name}>
                            {area.name} - Delivery Fee: Php {parseFloat(area.delivery_fee).toFixed(2)}
                          </option>
                        ))}
                      </select>
                    )}
                    {selectedAreaData && (
                      <div className="mt-2 space-y-2">
                        {/* Area Info Card */}
                        <div className={`border rounded-md p-3 text-xs space-y-2 ${
                          isAreaOpen() ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                        }`}>
                          {/* Operating Status */}
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-700">Operating Status:</span>
                            <span className={`font-semibold ${isAreaOpen() ? 'text-green-600' : 'text-red-600'}`}>
                              {isAreaOpen() ? '✅ OPEN' : '❌ CLOSED'}
                            </span>
                          </div>
                          
                          {/* Operating Hours */}
                          <p className="text-gray-700">
                            <strong>Hours:</strong> {convertMilitaryToAmPm(selectedAreaData.operating_from)} - {convertMilitaryToAmPm(selectedAreaData.closing_hour)}
                          </p>
                          
                          {/* Minimum Order */}
                          <p className="text-gray-700">
                            <strong>Minimum Order:</strong> Php {parseFloat(selectedAreaData.minimum_order).toFixed(2)}
                          </p>
                        </div>

                        {/* Minimum Order Warning/Progress */}
                        {getRemainingForMinimum() > 0 && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-xs">
                            <p className="text-yellow-800 mb-2">
                              ⚠️ <strong>Add Php {getRemainingForMinimum().toFixed(2)} more</strong> to reach minimum order
                            </p>
                            <div className="w-full bg-yellow-200 rounded-full h-2">
                              <div
                                className="bg-yellow-500 h-2 rounded-full transition-all"
                                style={{width: `${Math.min((getTotalPrice() / parseFloat(selectedAreaData.minimum_order)) * 100, 100)}%`}}
                              ></div>
                            </div>
                            <p className="text-yellow-700 mt-2">
                              Current: Php {getTotalPrice().toFixed(2)} / Php {parseFloat(selectedAreaData.minimum_order).toFixed(2)}
                            </p>
                          </div>
                        )}

                        {/* Minimum Order Met */}
                        {getRemainingForMinimum() === 0 && (
                          <div className="bg-green-50 border border-green-200 rounded-md p-3 text-xs text-green-700">
                            ✅ Minimum order requirement met!
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Pin Location */}
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={handleShareLocation}
                      disabled={locationStatus === 'loading'}
                      className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-md border text-sm font-medium transition-all ${
                        locationStatus === 'success'
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : locationStatus === 'error'
                          ? 'border-red-400 bg-red-50 text-red-600'
                          : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {locationStatus === 'loading' && <span className="animate-spin text-base">⏳</span>}
                      {locationStatus === 'success' && <span>📍</span>}
                      {locationStatus === 'error' && <span>⚠️</span>}
                      {locationStatus === 'idle' && <span>📍</span>}
                      {locationStatus === 'loading' ? 'Getting location...' :
                       locationStatus === 'success' ? 'Location pinned — tap to update' :
                       locationStatus === 'error' ? 'Could not get location. Try again.' :
                       'Pin My Location'}
                    </button>

                    {locationStatus === 'success' && userCoords && (
                      <div className="mt-2 rounded-md overflow-hidden border border-green-200">
                        <iframe
                          title="Delivery location"
                          width="100%"
                          height="200"
                          style={{ border: 0 }}
                          src={`https://www.openstreetmap.org/export/embed.html?bbox=${userCoords.lng-0.004},${userCoords.lat-0.004},${userCoords.lng+0.004},${userCoords.lat+0.004}&layer=mapnik&marker=${userCoords.lat},${userCoords.lng}`}
                          allowFullScreen
                        />
                        <div className="bg-green-50 px-3 py-2 flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            {userCoords.lat.toFixed(5)}, {userCoords.lng.toFixed(5)}
                          </span>
                          <a
                            href={`https://www.google.com/maps?q=${userCoords.lat},${userCoords.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-green-600 font-medium hover:underline"
                          >
                            Open in Maps ↗
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Notification Subscription Prompt */}
            {notificationStatus === 'checking' && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600"></div>
                  <span className="text-sm text-gray-600">Checking notification status...</span>
                </div>
              </div>
            )}

            {notificationStatus !== 'subscribed' && notificationStatus !== 'checking' && notificationStatus !== 'denied' && (
              <div className={`rounded-lg p-4 border-2 ${
                notificationStatus === 'denied'
                  ? 'bg-red-50 border-red-200'
                  : 'bg-yellow-50 border-yellow-300'
              }`}>
                <div className="flex items-start gap-3">
                  <div className="text-2xl flex-shrink-0">
                    {notificationStatus === 'denied' ? '🔕' : '🔔'}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-800 text-sm mb-1">
                      {notificationStatus === 'denied'
                        ? 'Notifications Blocked'
                        : 'Get Order Updates'}
                    </h4>
                    <p className="text-xs text-gray-600 mb-3">
                      {notificationStatus === 'denied'
                        ? 'You\'ve blocked notifications. Enable them in your browser settings to receive real-time order updates.'
                        : 'Enable push notifications to receive real-time updates when your order is being prepared, out for delivery, and delivered!'}
                    </p>
                    {notificationStatus === 'not-subscribed' && (
                      <button
                        type="button"
                        onClick={requestNotificationPermission}
                        className="bg-green-600 text-white px-4 py-2 rounded-md text-xs font-medium hover:bg-green-700 transition-all flex items-center gap-2"
                      >
                        <span>🔔</span>
                        <span>Enable Notifications</span>
                      </button>
                    )}
                    {notificationStatus === 'denied' && (
                      <p className="text-xs text-red-600 font-medium">
                        To enable: Click the lock icon in your browser's address bar → Allow notifications
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {notificationStatus === 'subscribed' && (
              <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">✅</div>
                  <div>
                    <h4 className="font-medium text-green-700 text-sm">Notifications Enabled</h4>
                    <p className="text-xs text-green-600">You'll receive updates when your order status changes!</p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <h3 className="text-base font-medium text-gray-700 mb-4">Payment Method</h3>
              <div className="space-y-2">
                <label className={`flex items-center space-x-3 p-3 border rounded-md cursor-pointer transition-all ${
                  formData.paymentMethod === 'cash' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:bg-gray-50'
                }`}>
                  <input
                    type="radio"
                    name="payment"
                    value="cash"
                    checked={formData.paymentMethod === 'cash'}
                    onChange={(e) => setFormData({...formData, paymentMethod: e.target.value, paymentReference: ''})}
                    className="w-4 h-4 text-green-600"
                  />
                  <span className="text-sm text-gray-700">{formData.orderType === 'pickup' ? 'Cash on Pickup' : 'Cash on Delivery'}</span>
                </label>

                <label className={`flex items-center space-x-3 p-3 border rounded-md cursor-pointer transition-all ${
                  formData.paymentMethod === 'gcash' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:bg-gray-50'
                }`}>
                  <input
                    type="radio"
                    name="payment"
                    value="gcash"
                    checked={formData.paymentMethod === 'gcash'}
                    onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})}
                    className="w-4 h-4 text-green-600"
                  />
                  <span className="text-sm text-gray-700">GCash</span>
                </label>

                <label className={`flex items-center space-x-3 p-3 border rounded-md cursor-pointer transition-all ${
                  formData.paymentMethod === 'bank' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:bg-gray-50'
                }`}>
                  <input
                    type="radio"
                    name="payment"
                    value="bank"
                    checked={formData.paymentMethod === 'bank'}
                    onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})}
                    className="w-4 h-4 text-green-600"
                  />
                  <span className="text-sm text-gray-700">Bank Transfer</span>
                </label>
              </div>

              {/* Payment Instructions */}
              {formData.paymentMethod === 'cash' && (
                <div className="mt-4 bg-gray-50 border border-gray-200 rounded-md p-4">
                  <h4 className="font-medium text-gray-700 text-sm mb-2">Cash on Delivery Instructions</h4>
                  <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
                    <li>Prepare exact amount if possible</li>
                    <li>Payment will be collected upon delivery</li>
                    <li>Please have your order number ready</li>
                  </ul>
                </div>
              )}

              {formData.paymentMethod === 'gcash' && (
                <div className="mt-4 bg-green-50 border border-green-200 rounded-md p-4">
                  <h4 className="font-medium text-gray-700 text-sm mb-3">GCash Payment Instructions</h4>
                  <div className="space-y-3">
                    <div className="bg-white rounded-md p-3 border border-green-100">
                      <p className="text-xs text-gray-500 mb-1">Amount to pay:</p>
                      <p className="text-lg font-semibold text-green-600">Php {getTotalPrice().toFixed(2)}</p>
                    </div>
                    <div className="bg-white rounded-md p-3 border border-green-100 text-sm text-gray-700 space-y-1">
                      <p className="text-xs text-gray-500 mb-1">Send payment to:</p>
                      <p className="font-semibold text-gray-800">Alberto's Pizza Nulatula</p>
                    </div>
                    <div className="bg-white rounded-md p-3 border border-green-100 flex flex-col items-center">
                      <p className="text-xs text-gray-500 mb-2">Scan QR code to pay:</p>
                      <img
                        src="/assets/images/gcash-qr.png"
                        alt="GCash QR Code - Alberto's Pizza"
                        className="w-48 h-48 object-contain"
                      />
                    </div>
                    <ol className="text-xs text-gray-600 list-decimal list-inside space-y-1 bg-white rounded-md p-3 border border-green-100">
                      <li>Open your GCash app and send the exact amount above.</li>
                      <li>Copy the 13-digit reference number from your GCash receipt.</li>
                      <li>Paste it in the field below, then click Place Order.</li>
                    </ol>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">GCash Reference Number *</label>
                      <input
                        type="text"
                        placeholder="e.g. 1234567890123"
                        value={formData.paymentReference}
                        onChange={(e) => setFormData({...formData, paymentReference: e.target.value})}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {formData.paymentMethod === 'bank' && (
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-md p-4">
                  <h4 className="font-medium text-gray-700 text-sm mb-3">Bank Transfer Instructions</h4>
                  <div className="space-y-3">
                    <div className="bg-white rounded-md p-3 border border-blue-100">
                      <p className="text-xs text-gray-500 mb-2">Transfer to:</p>
                      <p className="text-xs text-gray-600">Bank: BDO</p>
                      <p className="text-xs text-gray-600">Account Name: Alberto's Pizza</p>
                      <p className="text-base font-medium text-gray-800">Account #: 1234-5678-9012</p>
                    </div>
                    <div className="bg-white rounded-md p-3 border border-blue-100">
                      <p className="text-xs text-gray-500 mb-1">Amount to transfer:</p>
                      <p className="text-lg font-medium text-blue-600">Php {(getTotalPrice() + 4.99 + getTotalPrice() * 0.08).toFixed(2)}</p>
                    </div>
                    <div className="text-xs text-gray-600 space-y-1">
                      <p className="font-medium">After transfer:</p>
                      <ol className="list-decimal list-inside space-y-1 ml-2">
                        <li>Keep your bank receipt/confirmation</li>
                        <li>Enter the reference number below</li>
                        <li>Send photo of receipt to our contact number</li>
                      </ol>
                    </div>
                    <input
                      type="text"
                      placeholder="Enter Bank Reference Number"
                      value={formData.paymentReference}
                      onChange={(e) => setFormData({...formData, paymentReference: e.target.value})}
                      className="w-full px-3 py-2 rounded-md border border-gray-300 focus:border-blue-500 focus:outline-none text-sm"
                    />
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3 rounded-md font-medium transition-all text-sm ${
                isSubmitting
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {isSubmitting ? 'Processing...' : `Place Order - Php ${total.toFixed(2)}`}
            </button>
          </form>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm p-5 sticky top-[160px] md:top-[120px]">
            <h3 className="text-base font-medium text-gray-800 mb-4">Order Summary</h3>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span>Php {getTotalPrice().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Delivery Fee</span>
                <span>Php {deliveryFee.toFixed(2)}</span>
              </div>
              <div className="border-t border-gray-200 pt-2 mt-2">
                <div className="flex justify-between text-base font-medium">
                  <span>Total</span>
                  <span className="text-green-600">Php {total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}

// Confirmation Page
function ConfirmationPage({ setCurrentPage, orderNumber, paymentStatus }) {
  // Generate order number if not provided (for non-GCash orders)
  const displayOrderNumber = orderNumber || `ORD-${Date.now()}`;

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="w-full px-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          <h1 className="text-xl font-medium text-gray-800 mb-1">
            {paymentStatus === 'success' ? 'Payment Successful!' : 'Order Confirmed'}
          </h1>
          <p className="text-sm text-gray-500">
            {paymentStatus === 'success' ? 'Your GCash payment has been received' : 'Thank you for your order'}
          </p>
        </div>

        {/* Order Number */}
        <div className="bg-green-600 rounded-lg p-4 mb-6 text-center">
          <div className="text-xs text-green-200 mb-1">Order Number</div>
          <div className="text-xl font-medium text-white">{displayOrderNumber}</div>
        </div>

        {/* Order Status */}
        <div className="bg-white rounded-lg p-5 mb-6 shadow-sm">
          <h3 className="text-base font-medium text-gray-800 mb-4">Order Status</h3>

          <div className="space-y-0">
            {/* Order Confirmed */}
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="w-0.5 h-8 bg-green-500"></div>
              </div>
              <div className="pb-3">
                <div className="text-sm font-medium text-gray-800">Order Received</div>
                <div className="text-xs text-gray-500">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}, {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</div>
              </div>
            </div>

            {/* Preparing */}
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 rounded-full border-2 border-green-500 flex items-center justify-center flex-shrink-0">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                </div>
                <div className="w-0.5 h-8 bg-gray-200"></div>
              </div>
              <div className="pb-3">
                <div className="text-sm font-medium text-gray-800">Preparing your order</div>
                <div className="text-xs text-gray-500">Estimated: 15-20 mins</div>
              </div>
            </div>

            {/* Out for Delivery */}
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex-shrink-0"></div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Out for delivery</div>
                <div className="text-xs text-gray-400">Estimated arrival: 25-30 mins</div>
              </div>
            </div>
          </div>
        </div>

        {/* SMS Notice */}
        <div className="text-center mb-6">
          <p className="text-xs text-gray-500">You will receive delivery updates</p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => setCurrentPage('home')}
            className="flex-1 bg-green-600 text-white py-2.5 rounded-md text-sm font-medium hover:bg-green-700 transition-all"
          >
            Back to Home
          </button>
          <button
            onClick={() => setCurrentPage('menu')}
            className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-md text-sm font-medium hover:bg-gray-200 transition-all"
          >
            Order Again
          </button>
        </div>
      </div>
    </div>
  );
}

// Payment Failed Page
function PaymentFailedPage({ setCurrentPage, orderNumber }) {
  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="w-full px-8 max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
          <h1 className="text-xl font-medium text-gray-800 mb-1">Payment Failed</h1>
          <p className="text-sm text-gray-500">Your GCash payment was not completed</p>
        </div>

        {/* Order Number */}
        {orderNumber && (
          <div className="bg-gray-200 rounded-lg p-4 mb-6 text-center">
            <div className="text-xs text-gray-500 mb-1">Order Number</div>
            <div className="text-xl font-medium text-gray-700">{orderNumber}</div>
          </div>
        )}

        {/* Message */}
        <div className="bg-white rounded-lg p-5 mb-6 shadow-sm">
          <h3 className="text-base font-medium text-gray-800 mb-3">What happened?</h3>
          <p className="text-sm text-gray-600 mb-4">
            Your payment was cancelled or failed to process. Your order has been saved but is awaiting payment.
          </p>
          <h3 className="text-base font-medium text-gray-800 mb-3">What can you do?</h3>
          <ul className="text-sm text-gray-600 space-y-2">
            <li>• Try placing your order again with GCash</li>
            <li>• Choose a different payment method (Cash on Delivery)</li>
            <li>• Contact us if you need assistance</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => setCurrentPage('checkout')}
            className="w-full bg-green-600 text-white py-2.5 rounded-md text-sm font-medium hover:bg-green-700 transition-all"
          >
            Try Again
          </button>
          <button
            onClick={() => setCurrentPage('home')}
            className="w-full bg-gray-100 text-gray-700 py-2.5 rounded-md text-sm font-medium hover:bg-gray-200 transition-all"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}

// POS Receipt Generator specific for 58mm POS Printers
const printPOSReceipt = (order) => {
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  document.body.appendChild(iframe);
  
  // Basic parsing for items
  let itemsHTML = '';
  if (order.items) {
    const itemsArray = order.items.split(',');
    itemsHTML = itemsArray.map(item => {
      // Small bottom padding to separate multi-line items
      return `<tr><td colspan="2" style="padding-bottom: 4px;">${item.trim()}</td></tr>`;
    }).join('');
  }

  const receiptHTML = `
    <html>
      <head>
        <title>Receipt - ${order.orderNumber || ''}</title>
        <style>
          @page { margin: 0; }
          body { 
            font-family: 'Courier New', Courier, monospace; 
            width: 55mm; /* Reduced slightly from 58mm to provide a hardware safe-zone margin */
            padding: 5px 10px 5px 2px; /* Extra padding on the right to push text away from edge */
            margin: 0; 
            font-size: 12px; 
            color: #000;
            box-sizing: border-box;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .divider { border-top: 1px dashed #000; margin: 5px 0; }
          table { width: 100%; border-collapse: collapse; }
          td.right { text-align: right; padding-right: 2px; }
          .mb-1 { margin-bottom: 4px; }
        </style>
      </head>
      <body>
        <div class="center bold mb-1" style="font-size: 14px;">
          ALBERTO'S PIZZA<br/>
          Nulatula
        </div>
        <div class="divider"></div>
        <div><span class="bold">Order #:</span> ${order.orderNumber || '-'}</div>
        <div><span class="bold">Date:</span> ${order.timestamp || '-'}</div>
        <div><span class="bold">Type:</span> ${order.orderType || 'Delivery'}</div>
        <div class="divider"></div>
        <div class="bold mb-1">Customer Info:</div>
        <div>${order.fullName || '-'}</div>
        <div>${order.phone || '-'}</div>
        <div>${order.address || '-'}</div>
        ${order.landmark ? `<div>${order.landmark}</div>` : ''}
        ${order.city ? `<div>${order.city}</div>` : ''}
        <div class="divider"></div>
        <div class="bold mb-1">Order Items:</div>
        <table>
          ${itemsHTML}
        </table>
        <div class="divider"></div>
        <table>
          <tr>
            <td class="bold" style="font-size: 13px;">Total:</td>
            <td class="right bold" style="font-size: 13px;">P${order.total || '0.00'}</td>
          </tr>
        </table>
        <div class="divider"></div>
        <div><span class="bold">Payment:</span> ${order.paymentMethod || '-'}</div>
        <div class="divider"></div>
        <div class="center" style="margin-top: 10px; font-size: 10px;">
          Thank you for choosing<br/>Alberto's Pizza!
        </div>
      </body>
    </html>
  `;
  
  iframe.contentWindow.document.open();
  iframe.contentWindow.document.write(receiptHTML);
  iframe.contentWindow.document.close();
  
  // Wait a brief moment for styles to parse
  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  }, 250);
};

// ── Rider Page ──────────────────────────────────────────────────────────────
const RIDER_PIN = '1109';

function RiderPage({ setCurrentPage, riderView, setRiderView, setRiderPendingCount }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeOrder, setActiveOrder] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [historyDate, setHistoryDate] = useState(() => new Date());
  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const lastPendingCountRef = React.useRef(0);
  const hasFetchedOnceRef = React.useRef(false);
  const pollIntervalRef = React.useRef(null);
  const knownOrderKeysRef = React.useRef(new Set());
  const [debugSound, setDebugSound] = useState(false);

  // Browser autoplay policy: only play sound after the rider has interacted at least once
  const [soundEnabled, setSoundEnabled] = useState(false);
  const enableSound = async () => {
    setSoundEnabled(true);
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      await ctx.resume();

      // Play a near-silent blip to "unlock" audio on some browsers
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        gain.gain.value = 0.0001;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 440;
        osc.start();
        osc.stop(ctx.currentTime + 0.02);
      } catch (_) {
        // ignore
      }

      ctx.close?.();
    } catch (_) {
      // ignore
    }
  };

  const handlePinSubmit = () => {
    if (pin === RIDER_PIN) {
      // User gesture: safe moment to enable audio for alerts (browser autoplay policy)
      enableSound();
      setIsAuthenticated(true);
      fetchOrders();
    } else {
      alert('Wrong PIN. Try again.');
      setPin('');
    }
  };

  const fetchOrders = async ({ silent = false } = {}) => {
    if (!silent) setIsLoading(true);
    try {
      const res = await fetch(`${GOOGLE_SCRIPT_URL}?action=getOrders`);
      const data = await res.json();
      if (data.success) {
        const fetched = data.orders || [];
        setOrders(fetched);

        const pending = fetched.filter(
          (o) =>
            !o.status ||
            o.status === '' ||
            o.status === 'Pending' ||
            o.status === 'New' ||
            o.status === 'pending' ||
            o.status === 'new'
        ).length;

        // NEW ORDER detection (more reliable than pending count):
        // Beep if we see an orderId/orderNumber we haven't seen before (after first fetch).
        const currentKeys = new Set(
          fetched
            .map((o) => o.orderId || o.orderNumber || o.timestamp)
            .filter(Boolean)
            .map(String)
        );

        let hasNewOrder = false;
        if (hasFetchedOnceRef.current) {
          for (const k of currentKeys) {
            if (!knownOrderKeysRef.current.has(k)) {
              hasNewOrder = true;
              break;
            }
          }
        }

        if (debugSound) {
          console.log('[RIDER] soundEnabled=', soundEnabled);
          console.log('[RIDER] pending=', pending, 'lastPending=', lastPendingCountRef.current);
          console.log('[RIDER] hasFetchedOnce=', hasFetchedOnceRef.current, 'hasNewOrder=', hasNewOrder);
          console.log('[RIDER] knownKeys=', knownOrderKeysRef.current.size, 'currentKeys=', currentKeys.size);
        }

        // Only beep after first successful fetch, and only when new order appears
        if (soundEnabled && hasFetchedOnceRef.current && hasNewOrder) {
          playNewOrderSound();
        }

        knownOrderKeysRef.current = currentKeys;

        lastPendingCountRef.current = pending;
        hasFetchedOnceRef.current = true;

        setRiderPendingCount(pending);
      }
    } catch (e) {
      console.error('Failed to fetch orders:', e);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  // Auto-refresh rider orders every 10 seconds while authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    // quick silent sync to update badge without spinner
    fetchOrders({ silent: true });

    pollIntervalRef.current = window.setInterval(() => {
      fetchOrders({ silent: true });
    }, 10000);

    return () => {
      if (pollIntervalRef.current) {
        window.clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const updateStatus = async (orderId, status) => {
    setUpdatingId(orderId);
    try {
      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'updateStatus', orderId, status }),
      });
      return true;
    } catch (e) {
      alert('Failed to update order status.');
      return false;
    } finally {
      setUpdatingId(null);
    }
  };

  const handleAccept = async (order) => {
    const ok = await updateStatus(order.orderId, 'Accepted');
    if (ok) {
      setOrders(prev => {
        const updated = prev.map(o => o.orderId === order.orderId ? { ...o, status: 'Accepted' } : o);
        const pending = updated.filter(o =>
          !o.status || o.status === '' || o.status === 'Pending' || o.status === 'New' ||
          o.status === 'pending' || o.status === 'new'
        ).length;
        setRiderPendingCount(pending);
        return updated;
      });
      setActiveOrder({ ...order, status: 'Accepted' });
      
      // Automatically print the receipt POS ticket
      printPOSReceipt(order);
    }
  };

  const handleDelivered = async () => {
    const ok = await updateStatus(activeOrder.orderId, 'Delivered');
    if (ok) {
      setOrders(prev => prev.filter(o => o.orderId !== activeOrder.orderId));
      setActiveOrder(null);
    }
  };

  const handleOnTheWay = async () => {
    const ok = await updateStatus(activeOrder.orderId, 'On the Way');
    if (ok) {
      setActiveOrder(prev => ({ ...prev, status: 'On the Way' }));
      setOrders(prev => prev.map(o => o.orderId === activeOrder.orderId ? { ...o, status: 'On the Way' } : o));
    }
  };

  const handleDeliveredFromStatus = async (order) => {
    const ok = await updateStatus(order.orderId, 'Delivered');
    if (ok) {
      setOrders(prev => prev.map(o => o.orderId === order.orderId ? { ...o, status: 'Delivered' } : o));
    }
  };

  const handleCancelled = async (order) => {
    const ok = await updateStatus(order.orderId, 'Cancelled');
    if (ok) {
      setOrders(prev => prev.map(o => o.orderId === order.orderId ? { ...o, status: 'Cancelled' } : o));
    }
  };

  // ── PIN screen ──────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 pb-24">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
          <div className="text-center mb-6">
            <Bike className="w-14 h-14 text-gray-400" />
            <h2 className="text-xl font-black text-gray-800 mt-3">Rider Access</h2>
            <p className="text-sm text-gray-500 mt-1">Enter your PIN to view orders</p>
          </div>
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            placeholder="••••"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handlePinSubmit()}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-center text-2xl tracking-widest focus:outline-none focus:border-green-500 mb-4"
          />
          <button
            onClick={handlePinSubmit}
            className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold text-sm"
          >
            Enter
          </button>
        </div>
      </div>
    );
  }

  // ── Active navigation view ───────────────────────────────────────────────
  if (activeOrder) {
    const rawCoords = activeOrder.coordinates || '';
    const parts = rawCoords.split(',').map(s => parseFloat(s.trim()));
    const lat = parts[0] || null;
    const lng = parts[1] || null;
    const hasLocation = lat && lng && !isNaN(lat) && !isNaN(lng);

    return (
      <div className="flex flex-col" style={{ minHeight: '100dvh' }}>
        {/* Header */}
        <div className="bg-white px-4 py-3 shadow-sm flex items-center gap-3 flex-shrink-0">
          <button onClick={() => setActiveOrder(null)} className="text-gray-500 p-1">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-semibold uppercase tracking-wide ${activeOrder.status === 'On the Way' ? 'text-purple-600' : 'text-green-600'}`}>
              {activeOrder.status === 'On the Way' ? 'On the Way' : 'Accepted'}
            </p>
            <h2 className="font-black text-gray-800 truncate">#{activeOrder.orderNumber} — {activeOrder.fullName}</h2>
          </div>
        </div>

        {/* Order summary strip */}
        <div className="bg-gray-50 border-b border-gray-100 px-4 py-2 flex-shrink-0 space-y-1">
          <div className="flex items-start gap-1.5 text-xs text-gray-500">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span className="truncate">{activeOrder.address}{activeOrder.landmark ? `, ${activeOrder.landmark}` : ''}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{activeOrder.phone}</span>
            <span className="flex items-center gap-1"><CreditCard className="w-3.5 h-3.5" />{activeOrder.paymentMethod}</span>
          </div>
          <div className="flex items-start gap-1.5 text-xs text-gray-500">
            <ShoppingBag className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span className="truncate">{activeOrder.items}</span>
          </div>
        </div>

        {/* Map */}
        {hasLocation ? (
          <iframe
            title="Customer location"
            width="100%"
            style={{ flex: 1, minHeight: '300px', border: 0 }}
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng-0.004},${lat-0.004},${lng+0.004},${lat+0.004}&layer=mapnik&marker=${lat},${lng}`}
            allowFullScreen
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-2 bg-gray-50">
            <MapPin className="w-10 h-10 text-gray-300" />
            <p className="text-sm">No location shared by customer</p>
            <p className="text-xs text-gray-400">{activeOrder.address}</p>
          </div>
        )}

        {/* Action bar */}
        <div className="bg-white border-t border-gray-100 px-4 pt-3 pb-6 flex-shrink-0 space-y-2">
          {hasLocation && (
            <a
              href={`https://www.google.com/maps/dir/current+location/${lat},${lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl font-semibold text-sm"
            >
              <Navigation className="w-4 h-4" /> Navigate with Google Maps
            </a>
          )}
          {activeOrder.status !== 'On the Way' && (
            <button
              onClick={handleOnTheWay}
              disabled={updatingId === activeOrder.orderId}
              className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-60"
            >
              <Bike className="w-4 h-4" />
              {updatingId === activeOrder.orderId ? 'Updating...' : 'On the Way'}
            </button>
          )}
          <button
            onClick={handleDelivered}
            disabled={updatingId === activeOrder.orderId}
            className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-60"
          >
            <CheckCircle className="w-4 h-4" />
            {updatingId === activeOrder.orderId ? 'Updating...' : 'Mark as Delivered'}
          </button>
        </div>
      </div>
    );
  }

  // ── Status panel (today's active orders) ─────────────────────────────────
  if (riderView === 'status' && isAuthenticated) {
    const todayStr = new Date().toDateString();
    const todaysActiveOrders = orders.filter(o => {
      const ts = o.timestamp ? new Date(o.timestamp).toDateString() : todayStr;
      const isToday = ts === todayStr;
      const isActive = o.status !== 'Delivered' && o.status !== 'Cancelled';
      return isToday && isActive;
    });

    const statusColors = {
      Accepted: 'bg-blue-100 text-blue-700',
      'On the Way': 'bg-purple-100 text-purple-700',
    };

    return (
      <div className="bg-gray-50 min-h-screen pb-24">
        <div className="bg-white px-4 py-3 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => setRiderView(null)} className="text-gray-500 p-1">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-black text-gray-800">Today's Orders</h1>
          </div>
          <button onClick={fetchOrders} disabled={isLoading} className="flex items-center gap-1 text-green-600 text-sm font-medium">
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {!isLoading && (
          <div className="px-4 pt-4">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
              {todaysActiveOrders.length} active order{todaysActiveOrders.length !== 1 ? 's' : ''} today
            </p>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-24">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600" />
          </div>
        )}

        {!isLoading && todaysActiveOrders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400 gap-3">
            <CheckCircle className="w-12 h-12 text-gray-300" />
            <p className="text-sm font-medium">All orders done for today!</p>
          </div>
        )}

        {!isLoading && todaysActiveOrders.length > 0 && (
          <div className="p-4 space-y-4">
            {todaysActiveOrders.map((order, i) => (
              <div key={order.orderId || i} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {/* Card header */}
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="font-black text-gray-800">#{order.orderNumber}</p>
                    <p className="text-sm text-gray-600">{order.fullName}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusColors[order.status] || 'bg-yellow-100 text-yellow-700'}`}>
                      {order.status || 'Pending'}
                    </span>
                    <p className="text-green-600 font-black text-sm">Php {order.total}</p>
                  </div>
                </div>

                {/* Card body */}
                <div className="px-4 py-3 space-y-1.5">
                  <div className="flex items-start gap-2 text-sm text-gray-500">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <span>{order.address}{order.landmark ? `, ${order.landmark}` : ''}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span>{order.phone}</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-gray-400 pt-1 border-t border-gray-50">
                    <ShoppingBag className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span>{order.items}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <CreditCard className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{order.paymentMethod}</span>
                    <Clock className="w-3.5 h-3.5 flex-shrink-0 ml-2" />
                    <span>{order.timestamp}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="px-4 pb-4 flex gap-2">
                  <button
                    onClick={() => handleDeliveredFromStatus(order)}
                    disabled={updatingId === order.orderId}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 text-white py-2.5 rounded-xl font-semibold text-sm disabled:opacity-60"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {updatingId === order.orderId ? '...' : 'Delivered'}
                  </button>
                  <button
                    onClick={() => handleCancelled(order)}
                    disabled={updatingId === order.orderId}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-red-500 text-white py-2.5 rounded-xl font-semibold text-sm disabled:opacity-60"
                  >
                    <XCircle className="w-4 h-4" />
                    {updatingId === order.orderId ? '...' : 'Cancelled'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── History panel ────────────────────────────────────────────────────────
  if (riderView === 'history' && isAuthenticated) {
    const y = calMonth.getFullYear();
    const m = calMonth.getMonth();
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const dayLabels = ['Su','Mo','Tu','We','Th','Fr','Sa'];
    const firstDayOfWeek = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);

    const daysWithOrders = new Set(
      orders.map(o => {
        if (!o.timestamp) return null;
        const d = new Date(o.timestamp);
        return d.getFullYear() === y && d.getMonth() === m ? d.getDate() : null;
      }).filter(Boolean)
    );

    const historyOrders = orders.filter(o =>
      o.timestamp && new Date(o.timestamp).toDateString() === historyDate.toDateString()
    );
    const delivered = historyOrders.filter(o => o.status === 'Delivered');
    const cancelled = historyOrders.filter(o => o.status === 'Cancelled');
    const earnings = delivered.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);

    const todayStr = new Date().toDateString();
    const isSelected = (d) => d && new Date(y, m, d).toDateString() === historyDate.toDateString();
    const isTodayCell = (d) => d && new Date(y, m, d).toDateString() === todayStr;

    const statusStyle = (status) => {
      if (status === 'Delivered') return 'bg-green-100 text-green-700';
      if (status === 'Cancelled') return 'bg-red-100 text-red-600';
      if (status === 'On the Way') return 'bg-purple-100 text-purple-700';
      if (status === 'Accepted') return 'bg-blue-100 text-blue-700';
      return 'bg-yellow-100 text-yellow-700';
    };

    const selectedLabel = historyDate.toDateString() === todayStr
      ? 'Today'
      : historyDate.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' });

    return (
      <div className="bg-gray-50 min-h-screen pb-24">
        {/* Header */}
        <div className="bg-white px-4 py-3 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => setRiderView(null)} className="text-gray-500 p-1">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-black text-gray-800">Delivery History</h1>
          </div>
          <button onClick={fetchOrders} disabled={isLoading} className="flex items-center gap-1 text-green-600 text-sm font-medium">
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Calendar */}
        <div className="bg-white mx-4 mt-4 rounded-2xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setCalMonth(new Date(y, m - 1, 1))} className="p-1 text-gray-400 hover:text-gray-700">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="font-bold text-gray-800">{monthNames[m]} {y}</span>
            <button onClick={() => setCalMonth(new Date(y, m + 1, 1))} className="p-1 text-gray-400 hover:text-gray-700">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-7 mb-1">
            {dayLabels.map(l => (
              <div key={l} className="text-center text-xs text-gray-400 font-medium py-1">{l}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-1">
            {cells.map((d, i) => (
              <div key={i} className="flex flex-col items-center">
                {d ? (
                  <button
                    onClick={() => setHistoryDate(new Date(y, m, d))}
                    className={`w-8 h-8 rounded-full text-sm font-medium flex items-center justify-center
                      ${isSelected(d) ? 'bg-green-600 text-white' :
                        isTodayCell(d) ? 'border border-green-500 text-green-600' :
                        'text-gray-700 hover:bg-gray-100'}`}
                  >
                    {d}
                  </button>
                ) : <div className="w-8 h-8" />}
                {d && daysWithOrders.has(d) && !isSelected(d) && (
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 -mt-0.5" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Stats strip */}
        <div className="mx-4 mt-3 grid grid-cols-3 gap-2">
          <div className="bg-white rounded-xl p-3 shadow-sm text-center">
            <p className="text-2xl font-black text-green-600">{delivered.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Delivered</p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm text-center">
            <p className="text-2xl font-black text-red-500">{cancelled.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Cancelled</p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm text-center">
            <p className="text-2xl font-black text-gray-800">₱{earnings.toFixed(0)}</p>
            <p className="text-xs text-gray-500 mt-0.5">Earnings</p>
          </div>
        </div>

        {/* Date label + order count */}
        <div className="px-4 pt-4 pb-1">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
            {selectedLabel} · {historyOrders.length} order{historyOrders.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Order list */}
        {historyOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
            <Calendar className="w-10 h-10 text-gray-300" />
            <p className="text-sm">No orders on this date</p>
          </div>
        ) : (
          <div className="px-4 pb-4 space-y-3 mt-2">
            {historyOrders.map((order, i) => (
              <div key={order.orderId || i} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 flex items-center justify-between border-b border-gray-50">
                  <div>
                    <p className="font-black text-gray-800 text-sm">#{order.orderNumber}</p>
                    <p className="text-xs text-gray-500">{order.fullName}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusStyle(order.status)}`}>
                      {order.status || 'Pending'}
                    </span>
                    <p className="text-sm font-black text-gray-700">Php {order.total}</p>
                  </div>
                </div>
                <div className="px-4 py-3 space-y-1.5">
                  <div className="flex items-start gap-2 text-xs text-gray-400">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span>{order.address}{order.landmark ? `, ${order.landmark}` : ''}</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-gray-400">
                    <ShoppingBag className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span>{order.items}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{order.timestamp}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Orders list ──────────────────────────────────────────────────────────
  const pendingOrders = orders.filter(o =>
    !o.status || o.status === '' || o.status === 'Pending' || o.status === 'New' || o.status === 'pending' || o.status === 'new'
  );

  return (
    <div className="bg-gray-50 min-h-screen pb-24">
      {/* Header */}
      <div className="bg-white px-4 py-3 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentPage('home')} className="text-gray-500 p-1">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-black text-gray-800">Rider Dashboard</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              enableSound();
              playNewOrderSound(); // test beep
            }}
            className="text-xs font-bold text-gray-500 hover:text-gray-700"
          >
            Enable Sound
          </button>
          <button
            onClick={() => {
              // User gesture: safe moment to enable audio for alerts (browser autoplay policy)
              enableSound();
              fetchOrders();
            }}
            disabled={isLoading}
            className="flex items-center gap-1 text-green-600 text-sm font-medium"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Count badge */}
      {!isLoading && (
        <div className="px-4 pt-4">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
            {pendingOrders.length} pending order{pendingOrders.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-24">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600" />
        </div>
      )}

      {/* Empty */}
      {!isLoading && pendingOrders.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400 gap-3">
          <Inbox className="w-12 h-12 text-gray-300" />
          <p className="text-sm">No pending orders right now</p>
        </div>
      )}

      {/* Order cards */}
      {!isLoading && pendingOrders.length > 0 && (
        <div className="p-4 space-y-4">
          {pendingOrders.map((order, i) => (
            <div key={order.orderId || i} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {/* Card header */}
              <div className="bg-yellow-50 border-b border-yellow-100 px-4 py-3 flex items-center justify-between">
                <div>
                  <span className="text-xs bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full font-semibold">New Order</span>
                  <p className="font-black text-gray-800 mt-1">#{order.orderNumber}</p>
                </div>
                <p className="text-green-600 font-black text-xl">Php {order.total}</p>
              </div>

              {/* Card body */}
              <div className="px-4 py-3 space-y-1.5">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <span className="font-medium">{order.fullName}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <span>{order.phone}</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-gray-500">
                  <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <span>{order.address}{order.landmark ? `, ${order.landmark}` : ''}{order.city ? `, ${order.city}` : ''}</span>
                </div>
                {order.coordinates && (
                  <a
                    href={`https://www.google.com/maps?q=${order.coordinates}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-gray-400 text-xs pl-0.5"
                  >
                    <MapPin className="w-3 h-3" /> View pinned location
                  </a>
                )}
                <div className="flex items-start gap-2 text-xs text-gray-400 pt-1 border-t border-gray-50">
                  <ShoppingBag className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>{order.items}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <CreditCard className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{order.paymentMethod}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{order.timestamp}</span>
                </div>
              </div>

              {/* Accept button */}
              <div className="px-4 pb-4">
                <button
                  onClick={() => handleAccept(order)}
                  disabled={updatingId === order.orderId}
                  className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-60"
                >
                  <CheckCircle className="w-4 h-4" />
                  {updatingId === order.orderId ? 'Accepting...' : 'Accept Order'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
