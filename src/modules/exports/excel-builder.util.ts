import ExcelJS from 'exceljs';
import { paiseToRupees } from '../../common/money/money.util';

export interface ExcelColumnDef<T> {
  header: string;
  key: string;
  width?: number;
  /** If true, value is paise and will be converted to rupees with a currency number format. */
  isMoney?: boolean;
  value: (row: T) => string | number | boolean | Date | undefined;
}

export async function buildWorkbook<T>(
  sheetName: string,
  columns: ExcelColumnDef<T>[],
  rows: T[],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);

  sheet.columns = columns.map((col) => ({
    header: col.header,
    key: col.key,
    width: col.width ?? 18,
  }));
  sheet.getRow(1).font = { bold: true };

  for (const row of rows) {
    const values: Record<string, unknown> = {};
    for (const col of columns) {
      const raw = col.value(row);
      values[col.key] =
        col.isMoney && typeof raw === 'number' ? paiseToRupees(raw) : raw;
    }
    sheet.addRow(values);
  }

  columns.forEach((col, index) => {
    if (col.isMoney) {
      sheet.getColumn(index + 1).numFmt = '#,##0.00';
    }
  });

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
