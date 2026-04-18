import React from "react";

export default function PageCard({ title, children }) {
  return (
    <section className="card">
      <div className="card__header">
        <h1 className="card__title" dangerouslySetInnerHTML={{ __html: title }} />
      </div>
      <div className="card__body">
        {children}
      </div>
    </section>
  );
}
