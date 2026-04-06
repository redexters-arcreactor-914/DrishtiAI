import React, { useEffect, useState } from "react";

export default function CasesList() {
  const [cases, setCases] = useState([]);

  useEffect(() => {
    fetch("http://127.0.0.1:5000/api/cases")
      .then(res => res.json())
      .then(data => {
        console.log(data);
        setCases(data.cases);
      })
      .catch(err => console.error(err));
  }, []);

  return (
    <div>
      <h2>All Cases</h2>

      {cases.map((c, index) => (
        <div key={index}>
          <p><b>Name:</b> {c.name}</p>
          <p><b>Status:</b> {c.status}</p>
          <hr />
        </div>
      ))}
    </div>
  );
}