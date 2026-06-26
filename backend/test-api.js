async function checkServerHistory() {
  try {
    const res = await fetch('http://localhost:5000/api/benchmarks/history');
    if (!res.ok) {
      throw new Error(`HTTP error! Status: ${res.status}`);
    }
    const data = await res.json();
    console.log("History array length:", data.length);
    if (data.length > 0) {
      console.log("First item:", data[0]);
      console.log("Last item:", data[data.length - 1]);
    }
    process.exit(0);
  } catch (err) {
    console.error("Fetch failed:", err.message);
    process.exit(1);
  }
}

checkServerHistory();
