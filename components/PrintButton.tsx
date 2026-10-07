'use client';

export default function PrintButton() {
  return (
    <button type="button" className="btn primary" onClick={() => window.print()}>
      下載 PDF
    </button>
  );
}
