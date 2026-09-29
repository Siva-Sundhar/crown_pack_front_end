import { useState } from "react";

function CurrencyInput({ value, onChange, label }) {
  // value: raw number (for DB)
  const formatValue = (num) => {
    if (num == null || num === '') return '';
    const n = Number(num);
    if (!Number.isFinite(n)) return '';

    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
      .format(n)
      .replace(/^(\D+)(\d)/, '$1 $2'); // ensure space after symbol
  };

  return (
    <div>
      {label && <label>{label}</label>}
      <input
        type="text"
        value={value != null ? formatValue(value) : ''}
        onChange={(e) => {
          // Strip everything except digits, dot, minus
          const cleaned = e.target.value.replace(/[^\d.-]/g, '');
          const num = Number(cleaned);
          onChange(Number.isFinite(num) ? num : 0);
        }}
        placeholder="0.00"
      />
    </div>
  );
}

const  MyForm = () => {
  const [amount, setAmount] = useState(0); // always raw number

  const handleSubmit = (e) => {
    e.preventDefault();
    // amount is already clean: e.g. 1000, 1234.56
    console.log();
    
  };

  return (
    <form onSubmit={handleSubmit}>
      <CurrencyInput
        label="Amount"
        value={amount}
        onChange={(raw) => setAmount(raw)}
      />
      <button type="submit">Save</button>
    </form>
  );
}

export default MyForm