import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageCard from "../components/PageCard";

export default function TrackInputPage() {
  const [code, setCode] = useState("");
  const navigate = useNavigate();

  const handleTrack = () => {
    if (code.trim()) {
      navigate(`/track/${code.trim()}`);
    }
  };

  return (
    <PageCard title="متابعة الطلب 📦">
      <p className="muted">أدخل كود تتبع الطلب الخاص بك (المكون من 15 رقماً) لمعرفة حالته ومتابعة التفاصيل.</p>
      <div style={{ display: "flex", gap: "10px", marginTop: "20px", flexWrap: "wrap" }}>
        <input 
          type="text" 
          placeholder="أدخل كود الطلب هنا (مثال: 123456789012345)" 
          className="form input" 
          style={{ flex: 1, minWidth: "250px" }} 
          value={code} 
          onChange={e => setCode(e.target.value)} 
          onKeyDown={e => e.key === "Enter" && handleTrack()}
        />
        <button className="btn btn--primary" onClick={handleTrack}>متابعة (Track)</button>
      </div>
    </PageCard>
  );
}
