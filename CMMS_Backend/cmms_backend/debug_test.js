const test = async () => {
    try {
        console.log('Testing login with admin...');
        const loginRes = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin', password: 'admin' })
        });
        
        console.log('Login status:', loginRes.status);
        const loginData = await loginRes.json();
        if (!loginRes.ok) {
            console.error('Login failed:', loginData);
            return;
        }
        
        const token = loginData.token;
        console.log('Admin Role:', loginData.user.role);

        console.log('Creating Test User (role: user)...');
        const req1 = await fetch('http://localhost:5000/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({
                full_name: 'Test User One',
                email: 'verify' + Date.now() + '@gmail.com',
                password: 'password123',
                role: 'user'
            })
        });
        
        console.log('User create status:', req1.status);
        const u1 = await req1.json();
        if (!req1.ok) {
            console.error('User create failed:', u1);
        } else {
            console.log('User created:', u1.full_name, 'Role:', u1.role);
        }

        console.log('Creating Test IT Support (role: IT Support)...');
        const req2 = await fetch('http://localhost:5000/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({
                full_name: 'Test Tech One',
                email: 'vtech' + Date.now() + '@gmail.com',
                password: 'password123',
                role: 'IT Support'
            })
        });
        
        console.log('IT Support create status:', req2.status);
        const u2 = await req2.json();
        if (!req2.ok) {
            console.error('IT Support create failed:', u2);
        } else {
            console.log('IT Support created:', u2.full_name, 'Role:', u2.role);
        }

        console.log('Fetching IT Support technicians list...');
        const listRes = await fetch('http://localhost:5000/api/users/it-support', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const list = await listRes.json();
        console.log('IT Support list length:', list.length);
        const found = list.some(u => u.full_name === 'Test Tech One');
        console.log('Test Tech One found in IT Support list:', found);

    } catch (err) {
        console.error('Test error:', err);
    }
};

test();
