import test from 'node:test';
import assert from 'node:assert/strict';
import { extractPdfText } from '../src/services/pdf.js';

function simplePdf(message) {
  const stream = `BT /F1 12 Tf 50 750 Td (${message}) Tj ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let body = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => { offsets.push(Buffer.byteLength(body)); body += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const start = Buffer.byteLength(body);
  body += `xref\n0 ${offsets.length}\n0000000000 65535 f \n`;
  body += offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
  body += `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`;
  return Buffer.from(body);
}

test('PDF upload extracts selectable job description text', async () => {
  const text = await extractPdfText({ buffer: simplePdf('Build React and Node.js services with MongoDB and SQL for customers.') });
  assert.match(text, /React and Node.js services/);
});

test('PDF upload rejects a non-PDF file', async () => {
  await assert.rejects(() => extractPdfText({ buffer: Buffer.from('not a PDF') }), /not a valid PDF/);
});
