import pdf from 'pdf-parse/lib/pdf-parse.js';

export async function extractPdfText(file) {
  if (!file.buffer.subarray(0, 5).equals(Buffer.from('%PDF-'))) {
    const error = new Error('The selected file is not a valid PDF.');
    error.status = 400;
    throw error;
  }
  try {
    const result = await pdf(file.buffer);
    const text = result.text.replace(/\u0000/g, '').trim();
    if (text.length < 30) {
      const error = new Error('This PDF has too little selectable text. Please paste the job description instead.');
      error.status = 400;
      throw error;
    }
    return text.slice(0, 20000);
  } catch (error) {
    if (error.status) throw error;
    const invalid = new Error('Could not read this PDF. Please paste the job description instead.');
    invalid.status = 400;
    throw invalid;
  }
}
