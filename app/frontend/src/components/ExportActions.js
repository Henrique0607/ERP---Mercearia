import React, { useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { Button } from './ui/button';

const normalize = (value) => {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toLocaleString('pt-BR');
  return String(value);
};

const escapeCsv = (value) => {
  const text = normalize(value).replace(/"/g, '""');
  return `"${text}"`;
};

export default function ExportActions({ title, filename, columns, rows, summaryItems = [], printExtraContent = null }) {
  const [printActive, setPrintActive] = useState(false);
  const safeRows = Array.isArray(rows) ? rows : [];

  const getValue = (row, column) => {
    if (typeof column.accessor === 'function') {
      return column.accessor(row);
    }
    return row?.[column.accessor];
  };

  const exportCsv = () => {
    const header = columns.map((column) => escapeCsv(column.header)).join(';');
    const body = safeRows.map((row) => (
      columns.map((column) => escapeCsv(getValue(row, column))).join(';')
    ));
    const csv = ['\ufeff' + header, ...body].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename || title || 'relatorio'}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => {
    setPrintActive(true);
    window.setTimeout(() => {
      window.print();
      setPrintActive(false);
    }, 100);
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" onClick={exportPdf}>
          <Printer className="w-4 h-4 mr-2" />
          PDF
        </Button>
        <Button type="button" variant="outline" onClick={exportCsv}>
          <Download className="w-4 h-4 mr-2" />
          CSV
        </Button>
      </div>

      <div className={`print-only print-document ${printActive ? 'print-active' : ''} bg-white text-stone-900 p-8`}>
        <div className="flex items-start justify-between border-b-2 border-emerald-700 pb-5 mb-5">
          <div>
            <h1 className="text-2xl font-heading font-semibold text-stone-900">{title}</h1>
            <p className="text-sm text-stone-500">Micro-ERP Academico - Sabor & Cia</p>
          </div>
          <div className="text-right text-sm">
            <p className="text-xs uppercase tracking-widest text-stone-500">Emitido em</p>
            <p className="font-semibold">{new Date().toLocaleString('pt-BR')}</p>
          </div>
        </div>

        {summaryItems.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-5">
            {summaryItems.map((item) => (
              <div key={item.label} className="rounded-md border border-stone-200 p-3">
                <p className="text-xs uppercase tracking-wider text-stone-500">{item.label}</p>
                <p className={`text-lg font-heading font-semibold ${ item.color === 'red'? 'print-red': 'text-stone-900' }`}> {normalize(item.value)} </p>
              </div>
            ))}
          </div>
        )}

        {printExtraContent}

        <table className="w-full text-sm border border-stone-200">
          <thead>
            <tr className="bg-stone-100 border-b border-stone-200">
              {columns.map((column) => (
                <th key={column.header} className="text-left py-2 px-3">{column.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {safeRows.map((row, rowIndex) => (
              <tr key={row.id || rowIndex} className="border-b border-stone-100">
                {columns.map((column) => (
                  <td key={column.header} className="py-2 px-3">{normalize(getValue(row, column))}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {safeRows.length === 0 && (
          <p className="text-center text-stone-500 py-6">Nenhum registro encontrado.</p>
        )}
      </div>
    </>
  );
}
