import React, { useEffect, useMemo, useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Table, Button, Form, Alert, Card, ListGroup, Spinner } from 'react-bootstrap';
import axios from 'axios';

const API_BASE = 'http://localhost:8000';

interface Product {
  id: number;
  name: string;
  stock: number;
  price: number;
  sales_count?: number;
}

interface Recommendation {
  product_id: number;
  name: string;
  similarity: number;
  stock: number;
}

interface RestockRec {
  product_id: number;
  name: string;
  recommended_qty: number;
  priority: string;
}

function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [restockRecs, setRestockRecs] = useState<RestockRec[]>([]);
  const [selectedProdId, setSelectedProdId] = useState<number>(0);
  const [newProduct, setNewProduct] = useState({ name: '', stock: 0, price: 0 });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [recError, setRecError] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
    fetchRestockRecs();
  }, []);

  const fetchProducts = async () => {
    try {
      setError(null);
      setLoading(true);
      const res = await axios.get(`${API_BASE}/products/`);
      setProducts(res.data);
    } catch (e) {
      setError('Failed to load products from the server.');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecommendations = async (prodId: number) => {
    try {
      setRecError(null);
      setRecommendations([]);
      const res = await axios.get(`${API_BASE}/recommendations/${prodId}`);
      if (!res.data || res.data.length === 0) {
        setRecError('No recommendation data is available yet for this product.');
      }
      setRecommendations(res.data);
    } catch (e: any) {
      setRecommendations([]);
      if (axios.isAxiosError(e) && e.response?.status === 404) {
        setRecError('No recommendation data is available yet for this product.');
      } else {
        setRecError('Failed to load recommendations. Please try again later.');
      }
    }
  };

  const fetchRestockRecs = async () => {
    try {
      setError(null);
      const res = await axios.get(`${API_BASE}/restock-recs/`);
      setRestockRecs(res.data);
    } catch (e) {
      setError('Failed to load restock recommendations.');
    }
  };

  const addProduct = async () => {
    try {
      setError(null);
      await axios.post(`${API_BASE}/products/`, newProduct);
      setNewProduct({ name: '', stock: 0, price: 0 });
      fetchProducts();
    } catch (e) {
      setError('Failed to add product. Please check the input and try again.');
    }
  };

  const fastMovingProducts = useMemo(
    () =>
      [...products]
        .sort((a, b) => (b.sales_count || 0) - (a.sales_count || 0))
        .slice(0, 5),
    [products]
  );

  const slowMovingProducts = useMemo(
    () =>
      [...products]
        .sort((a, b) => (a.sales_count || 0) - (b.sales_count || 0))
        .slice(0, 5),
    [products]
  );

  return (
    <div className="d-flex">
      {/* Sidebar navigation for admin dashboard */}
      <nav className="bg-light border-end p-3" style={{ width: '220px', minHeight: '100vh' }}>
        <h5 className="mb-4">LB Hardware</h5>
        <ListGroup variant="flush">
          <ListGroup.Item active>Dashboard</ListGroup.Item>
          <ListGroup.Item>Inventory</ListGroup.Item>
          <ListGroup.Item>Sales History</ListGroup.Item>
          <ListGroup.Item>Invoicing</ListGroup.Item>
          <ListGroup.Item>Chatbot</ListGroup.Item>
        </ListGroup>
      </nav>

      {/* Main dashboard content */}
      <main className="flex-grow-1 p-4">
        <div className="container-fluid">
          <h1 className="mb-3">IIMS Admin Dashboard</h1>
          <p className="text-muted mb-4">
            Intelligent inventory, restock insights, and product recommendations for LB Hardware.
          </p>

          {loading && (
            <div className="mb-3 d-flex align-items-center">
              <Spinner animation="border" size="sm" className="me-2" />
              <span>Loading data...</span>
            </div>
          )}

          {error && (
            <Alert variant="danger" className="mb-3">
              {error}
            </Alert>
          )}

          <Card className="mb-4">
            <Card.Header>Add Product</Card.Header>
            <Card.Body>
              <Form className="row g-3">
                <Form.Group className="col-md-4">
                  <Form.Label>Name</Form.Label>
                  <Form.Control
                    value={newProduct.name}
                    onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                    placeholder="e.g. 2 inch wood screw"
                  />
                </Form.Group>
                <Form.Group className="col-md-4">
                  <Form.Label>Stock</Form.Label>
                  <Form.Control
                    type="number"
                    value={newProduct.stock}
                    onChange={e =>
                      setNewProduct({ ...newProduct, stock: parseInt(e.target.value || '0', 10) })
                    }
                  />
                </Form.Group>
                <Form.Group className="col-md-4">
                  <Form.Label>Price</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    value={newProduct.price}
                    onChange={e =>
                      setNewProduct({
                        ...newProduct,
                        price: parseFloat(e.target.value || '0'),
                      })
                    }
                  />
                </Form.Group>
                <div className="col-12 d-flex justify-content-end">
                  <Button onClick={addProduct}>Add Product</Button>
                </div>
              </Form>
            </Card.Body>
          </Card>

          <div className="row">
            <div className="col-lg-7 mb-4">
              <Card>
                <Card.Header>Inventory & Product Recommendations</Card.Header>
                <Card.Body>
                  <Table striped bordered hover size="sm" responsive>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Stock</th>
                        <th>Price</th>
                        <th>Sales</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map(p => (
                        <tr key={p.id}>
                          <td>{p.id}</td>
                          <td>{p.name}</td>
                          <td>{p.stock}</td>
                          <td>Rs. {p.price}</td>
                          <td>{p.sales_count || 0}</td>
                          <td>
                            <Button
                              size="sm"
                              variant="outline-primary"
                              onClick={() => {
                                setSelectedProdId(p.id);
                                fetchRecommendations(p.id);
                              }}
                            >
                              View Recs
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>

              {recError && (
                <Alert variant="warning" className="mt-3">
                  {recError}
                </Alert>
              )}

              {recommendations.length > 0 && (
                <Alert variant="info" className="mt-3">
                  <h5 className="mb-2">
                    Frequently Recommended Together – Product #{selectedProdId}
                  </h5>
                  <ul className="mb-0">
                    {recommendations.map(rec => (
                      <li key={rec.product_id}>
                        {rec.name} (Similarity: {rec.similarity.toFixed(2)}, Stock: {rec.stock})
                      </li>
                    ))}
                  </ul>
                </Alert>
              )}
            </div>

            <div className="col-lg-5 mb-4">
              <Card className="mb-3">
                <Card.Header>Recommender Overview</Card.Header>
                <Card.Body>
                  <div className="row">
                    <div className="col-6">
                      <h6>Fast-Moving</h6>
                      <ListGroup variant="flush" style={{ maxHeight: 200, overflowY: 'auto' }}>
                        {fastMovingProducts.map(p => (
                          <ListGroup.Item key={p.id}>
                            <div className="fw-semibold">{p.name}</div>
                            <small className="text-muted">
                              Sales: {p.sales_count || 0} | Stock: {p.stock}
                            </small>
                          </ListGroup.Item>
                        ))}
                        {fastMovingProducts.length === 0 && (
                          <ListGroup.Item>
                            <small className="text-muted">No sales data available yet.</small>
                          </ListGroup.Item>
                        )}
                      </ListGroup>
                    </div>
                    <div className="col-6">
                      <h6>Slow-Moving</h6>
                      <ListGroup variant="flush" style={{ maxHeight: 200, overflowY: 'auto' }}>
                        {slowMovingProducts.map(p => (
                          <ListGroup.Item key={p.id}>
                            <div className="fw-semibold">{p.name}</div>
                            <small className="text-muted">
                              Sales: {p.sales_count || 0} | Stock: {p.stock}
                            </small>
                          </ListGroup.Item>
                        ))}
                        {slowMovingProducts.length === 0 && (
                          <ListGroup.Item>
                            <small className="text-muted">No sales data available yet.</small>
                          </ListGroup.Item>
                        )}
                      </ListGroup>
                    </div>
                  </div>
                </Card.Body>
              </Card>

              <Card>
                <Card.Header>Restock Recommendations</Card.Header>
                <Card.Body>
                  <Table striped bordered hover size="sm" responsive>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Recommended Qty</th>
                        <th>Priority</th>
                      </tr>
                    </thead>
                    <tbody>
                      {restockRecs.map(r => (
                        <tr key={r.product_id}>
                          <td>{r.name}</td>
                          <td>{r.recommended_qty}</td>
                          <td>{r.priority}</td>
                        </tr>
                      ))}
                      {restockRecs.length === 0 && (
                        <tr>
                          <td colSpan={3}>
                            <small className="text-muted">
                              No low-stock items detected based on the current threshold.
                            </small>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                  <Button onClick={fetchRestockRecs} className="mt-2" variant="outline-secondary">
                    Refresh Recommendations
                  </Button>
                </Card.Body>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
