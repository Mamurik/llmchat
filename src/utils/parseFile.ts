// src/utils/parseFile.ts
// ------------------------------------------------------------
// Полный парсер: TXT | DOC|DOCX | XLS|XLSX | PDF
// ------------------------------------------------------------

import mammoth from 'mammoth';
import {
  getDocument,
  GlobalWorkerOptions,
  version as pdfjsVersion,
} from 'pdfjs-dist/legacy/build/pdf';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';
import * as XLSX from 'xlsx';

/* ------------------------------------------------------------
 * PDF.js – задаём воркер для legacy‑сборки
 * ---------------------------------------------------------- */
GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsVersion}/legacy/build/pdf.worker.min.js`;

/* ------------------------------------------------------------
 * Основная функция
 * ---------------------------------------------------------- */
export async function parseFile(file: File): Promise<string> {
  const ext = (file.name.split('.').pop() ?? '').toLowerCase();

  switch (ext) {
    /* ---------- TXT ---------- */
    case 'txt':
      return file.text();

    /* ---------- DOC / DOCX ---------- */
    case 'doc':
    case 'docx': {
      const { value } = await mammoth.extractRawText({
        arrayBuffer: await file.arrayBuffer(),
      });
      return value;
    }

    /* ---------- XLS / XLSX ---------- */
    case 'xls':
    case 'xlsx': {
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });

      return wb.SheetNames.map((name) => {
        const sheet = wb.Sheets[name];

        /* header:1 → массивы (с сохранением пустых ячеек) */
        const rows = XLSX.utils.sheet_to_json<
          (string | number | boolean | null)[]
        >(sheet, { header: 1 });

        return (
          `=== Лист: ${name} ===\n` +
          rows.map((row) => row.join('\t')).join('\n')
        );
      }).join('\n\n');
    }

    /* ---------- PDF ---------- */
    case 'pdf': {
      /* загружаем документ  */
      const pdf = await getDocument({
        data: await file.arrayBuffer(),
      }).promise;

      const pages: string[] = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const items = (await page.getTextContent()).items as TextItem[];

        const text = items
          .map((it) => it.str)
          .join(' ')
          .replace(/\s+/g, ' '); // склеиваем «рваные» переносы

        pages.push(`--- стр. ${i} ---\n${text}`);
      }

      return pages.join('\n\n');
    }

    /* ---------- UNKNOWN ---------- */
    default:
      throw new Error(`Неподдерживаемый тип файла: ${file.name}`);
  }
}
