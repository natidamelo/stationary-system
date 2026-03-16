async function test() {
  try {
    const loginRes = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@stationery.local',
        password: 'changeMe123!'
      })
    });
    
    if (!loginRes.ok) throw new Error('Login failed: ' + await loginRes.text());
    const loginData = await loginRes.json();
    const token = loginData.access_token;
    
    const stockRes = await fetch('http://localhost:3000/api/inventory/low-stock', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!stockRes.ok) throw new Error('Fetch failed: ' + await stockRes.text());
    const lowStock = await stockRes.json();
    
    console.log("Low Stock Length:", lowStock.length);
    if(lowStock.length > 0) {
      console.log("Sample 1:", JSON.stringify(lowStock[0], null, 2));
    }
  } catch (err) {
    console.error("Error:", err.message);
  }
}

test();
