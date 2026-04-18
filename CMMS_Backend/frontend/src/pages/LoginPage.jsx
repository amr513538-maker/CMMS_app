import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import PageCard from "../components/PageCard";
import { API_BASE } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { login, token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (token) navigate("/dashboard");
  }, [token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        // Detailed error message handling from API response
        throw new Error(data?.error || `خطأ في الخادم: رمز الخطأ ${res.status}`);
      }
      
      login(data.token, data.user);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.");
      setLoading(false);
    }
  };

  return (
    <PageCard title="تسجيل الدخول">
      <form className="form" onSubmit={handleSubmit}>
        <label>البريد الإلكتروني (Email)</label>
        <input 
          type="text" 
          required 
          value={email} 
          onChange={e => setEmail(e.target.value)} 
          placeholder="أدخل بريدك الإلكتروني"
        />
        
        <label>كلمة المرور (Password)</label>
        <input 
          type="password" 
          required 
          value={password} 
          onChange={e => setPassword(e.target.value)} 
          placeholder="أدخل كلمة المرور"
        />
        
        <button className="btn btn--primary" type="submit" disabled={loading}>
          {loading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
        </button>
      </form>
      
      {error && (
        <div className="error" style={{ display: "block", marginTop: "16px", padding: "16px", borderRadius: "10px", backgroundColor: "var(--danger-bg)", color: "var(--danger)", border: "1px solid rgba(239, 68, 68, 0.4)", fontWeight: "bold" }}>
          ⚠️ فشل تسجيل الدخول: {error}
        </div>
      )}
    </PageCard>
  );
}
