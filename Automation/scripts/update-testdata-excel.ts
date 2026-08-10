import ExcelJS from 'exceljs';
import * as path from 'path';

async function updateTestData() {
  const filePath = path.resolve(__dirname, '../tests/New_Testcase.xlsx');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);

  // Remove existing "Test data" sheet and recreate with all environments
  const existing = wb.getWorksheet('Test data');
  if (existing) {
    wb.removeWorksheet(existing.id);
  }

  const ws = wb.addWorksheet('Test data');

  // Column widths
  ws.getColumn(1).width = 18;
  ws.getColumn(2).width = 42;
  ws.getColumn(3).width = 20;

  const headerFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: 'FFFFFFFF' } };
  const headerFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
  const envHeaderFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF70AD47' } };

  // --- Staging ---
  const r1 = ws.addRow(['Staging Environment', 'Staging Environment', 'Staging Environment']);
  r1.font = headerFont as ExcelJS.Font;
  r1.fill = envHeaderFill;

  const r2 = ws.addRow(['', '', '']);
  ws.getCell('A2').value = { text: 'https://stg.quantarra.com/', hyperlink: 'https://stg.quantarra.com/' };
  ws.getCell('B2').value = { text: 'https://stg.quantarra.com/', hyperlink: 'https://stg.quantarra.com/' };
  ws.getCell('C2').value = { text: 'https://stg.quantarra.com/', hyperlink: 'https://stg.quantarra.com/' };

  ws.addRow(['Role', 'User name', 'Password']).font = { bold: true };
  const stgRow1 = ws.addRow(['Super user', '', 'Quantarra2026!']);
  ws.getCell(`B${stgRow1.number}`).value = { text: 'keerthi@quantarra.io', hyperlink: 'mailto:keerthi@quantarra.io' };
  const stgRow2 = ws.addRow(['Administrator', '', 'Quantarra2026!']);
  ws.getCell(`B${stgRow2.number}`).value = { text: 'keerthikumar.kothandapani@gmail.com', hyperlink: 'mailto:keerthikumar.kothandapani@gmail.com' };
  const stgRow3 = ws.addRow(['Contributor', '', 'Quantarra2026!']);
  ws.getCell(`B${stgRow3.number}`).value = { text: 'prasanna.d@keystoneeng.in', hyperlink: 'mailto:prasanna.d@keystoneeng.in' };
  const stgRow4 = ws.addRow(['Viewer', '', 'Quantarra2026!']);
  ws.getCell(`B${stgRow4.number}`).value = { text: 'matric.viewer@keystoneeng.in', hyperlink: 'mailto:matric.viewer@keystoneeng.in' };

  // Blank separator
  ws.addRow([]);

  // --- POC ---
  const pocHeader = ws.addRow(['POC Environment', 'POC Environment', 'POC Environment']);
  pocHeader.font = headerFont as ExcelJS.Font;
  pocHeader.fill = envHeaderFill;

  const pocUrlRow = ws.addRow(['', '', '']);
  ws.getCell(`A${pocUrlRow.number}`).value = { text: 'https://poc.quantarra.com/', hyperlink: 'https://poc.quantarra.com/' };
  ws.getCell(`B${pocUrlRow.number}`).value = { text: 'MC: https://mc.poc.quantarra.com/', hyperlink: 'https://mc.poc.quantarra.com/' };
  ws.getCell(`C${pocUrlRow.number}`).value = { text: 'Audit: https://audit-stg.quantarra.com/', hyperlink: 'https://audit-stg.quantarra.com/' };

  ws.addRow(['Role', 'User name', 'Password']).font = { bold: true };
  const pocRow1 = ws.addRow(['Admin', '', 'Quantarra2026!']);
  ws.getCell(`B${pocRow1.number}`).value = { text: 'kirthi.218@gmail.com', hyperlink: 'mailto:kirthi.218@gmail.com' };
  const pocRow2 = ws.addRow(['Contributor', '', 'Quantarra2026!']);
  ws.getCell(`B${pocRow2.number}`).value = { text: 'keerthikumar.kothandapani@gmail.com', hyperlink: 'mailto:keerthikumar.kothandapani@gmail.com' };

  // Blank separator
  ws.addRow([]);

  // --- Prod ---
  const prodHeader = ws.addRow(['Prod Environment', 'Prod Environment', 'Prod Environment']);
  prodHeader.font = headerFont as ExcelJS.Font;
  prodHeader.fill = envHeaderFill;

  const prodUrlRow = ws.addRow(['', '', '']);
  ws.getCell(`A${prodUrlRow.number}`).value = { text: 'https://app.quantarra.com/', hyperlink: 'https://app.quantarra.com/' };
  ws.getCell(`B${prodUrlRow.number}`).value = { text: 'MC: https://mc.quantarra.com/', hyperlink: 'https://mc.quantarra.com/' };
  ws.getCell(`C${prodUrlRow.number}`).value = { text: 'Audit: Not ready', hyperlink: '' };

  ws.addRow(['Role', 'User name', 'Password']).font = { bold: true };
  const prodRow1 = ws.addRow(['Admin / Super User', '', 'Quantarra2026!']);
  ws.getCell(`B${prodRow1.number}`).value = { text: 'keerthi@quantarra.io', hyperlink: 'mailto:keerthi@quantarra.io' };
  const prodRow2 = ws.addRow(['Contributor', '', 'Quantarra2026!']);
  ws.getCell(`B${prodRow2.number}`).value = { text: 'sales1@keystoneeng.in', hyperlink: 'mailto:sales1@keystoneeng.in' };

  await wb.xlsx.writeFile(filePath);
  console.log(`✅ "Test data" sheet updated with Staging + POC + Prod credentials`);
}

updateTestData().catch(console.error);
