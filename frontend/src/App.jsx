import { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'

function App() {
  const [products, setProducts] = useState([])
  const [cart, setCart] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('products')

  useEffect(() => {
    axios.get('http://localhost:8000/products')
      .then(res => {
        setProducts(res.data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const addToCart = async (product) => {
    await axios.post('http://localhost:8001/cart/abdou', {
      product_id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1
    })
    fetchCart()
  }

  const fetchCart = async () => {
    const res = await axios.get('http://localhost:8001/cart/abdou')
    setCart(res.data.items)
    setActiveTab('cart')
  }

  return (
    <div style={{ fontFamily: 'Arial', maxWidth: '900px', margin: '0 auto', padding: '20px' }}>

      {/* Header */}
      <div style={{ background: '#0078d4', color: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <h1 style={{ margin: 0 }}>☁️ CloudShop</h1>
        <p style={{ margin: 0, opacity: 0.8 }}>Azure Cloud-Native E-Commerce</p>
      </div>

      {/* Tabs */}
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={() => setActiveTab('products')}
          style={{ marginRight: '10px', padding: '10px 20px', background: activeTab === 'products' ? '#0078d4' : '#eee', color: activeTab === 'products' ? 'white' : 'black', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
        >
          🛍️ Products
        </button>
        <button
          onClick={fetchCart}
          style={{ padding: '10px 20px', background: activeTab === 'cart' ? '#0078d4' : '#eee', color: activeTab === 'cart' ? 'white' : 'black', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
        >
          🛒 Cart ({cart.length})
        </button>
      </div>

      {/* Products */}
      {activeTab === 'products' && (
        <div>
          <h2>Products</h2>
          {loading ? <p>Loading...</p> : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
              {products.map(p => (
                <div key={p.id} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '15px' }}>
                  <h3 style={{ color: '#0078d4' }}>{p.name}</h3>
                  <p style={{ fontSize: '24px', fontWeight: 'bold' }}>${p.price}</p>
                  <p style={{ color: '#666' }}>Stock: {p.stock}</p>
                  <button
                    onClick={() => addToCart(p)}
                    style={{ width: '100%', padding: '10px', background: '#0078d4', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                  >
                    Add to Cart
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Cart */}
      {activeTab === 'cart' && (
        <div>
          <h2>🛒 Your Cart</h2>
          {cart.length === 0 ? <p>Cart is empty</p> : (
            <div>
              {cart.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', border: '1px solid #ddd', borderRadius: '8px', marginBottom: '10px' }}>
                  <span>{item.name}</span>
                  <span>x{item.quantity}</span>
                  <span style={{ fontWeight: 'bold' }}>${item.price * item.quantity}</span>
                </div>
              ))}
              <div style={{ textAlign: 'right', fontSize: '20px', fontWeight: 'bold', marginTop: '10px' }}>
                Total: ${cart.reduce((sum, i) => sum + i.price * i.quantity, 0).toFixed(2)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Services Status */}
      <div style={{ marginTop: '40px', background: '#f5f5f5', padding: '15px', borderRadius: '8px' }}>
        <h3>🔧 Microservices</h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          {['Catalog :8000', 'Cart :8001', 'Orders :8002', 'Auth :8003'].map(s => (
            <span key={s} style={{ background: '#107c10', color: 'white', padding: '5px 10px', borderRadius: '20px', fontSize: '12px' }}>
              ✅ {s}
            </span>
          ))}
        </div>
      </div>

    </div>
  )
}

export default App