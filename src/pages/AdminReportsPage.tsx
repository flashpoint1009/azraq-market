import { useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { BarChart3, Download, Printer, RefreshCw } from 'lucide-react';
import { Button, Card, EmptyState, ErrorState, LoadingState, PageHeader, Select } from '../components/ui';
import { supabase } from '../lib/supabase';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import type { DeveloperReport } from '../types/database';

type DataRow = Record<string, unknown>;

const rawSupabase = supabase as unknown as {
  from: (table: string) => {
    select: (columns?: string) => {
      limit: (count: number) => Promise<{ data: unknown; error: { message: string } | null }>;
    };
  };
};

function valueText(value: unknown) {
  if (value == null) return '-';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function readReportFields(report?: DeveloperReport | null) {
  const fields = report?.config?.fields;
  return Array.isArray(fields) ? fields.filter((field): field is string => typeof field === 'string') : [];
}

function readReportSource(report?: DeveloperReport | null) {
  const source = report?.config?.source;
  return typeof source === 'string' && source ? source : '';
}

function PrintStyle() {
  return (
    <style>{`
      @media print {
        body > * { display: none !important; }
        #print-area { display: block !important; }
        #print-area { position: fixed; top: 0; left: 0; width: 100%; background: white; z-index: 9999; padding: 24px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th, td { border: 1px solid #e2e8f0; padding: 6px 10px; text-align: right; }
        th { background: #f8fafc; font-weight: 800; }
        h1, h2 { margin-bottom: 12px; }
        .no-print { display: none !important; }
      }
    `}</style>
  );
}

export function AdminReportsPage() {
  const [selectedId, setSelectedId] = useState('');
  const printRef = useRef<HTMLDivElement>(null);

  const { data: reports, loading, error, reload } = useSupabaseQuery(async () => {
    const result = await supabase.from('developer_reports').select('*').eq('is_active', true).order('title');
    if (result.error) throw result.error;
    return (result.data || []) as DeveloperReport[];
  }, []);

  const selectedReport = useMemo(() => {
    const list = reports || [];
    return list.find((report) => report.id === selectedId) || list[0] || null;
  }, [reports, selectedId]);

  const source = readReportSource(selectedReport);
  const fields = readReportFields(selectedReport);

  const { data: rows, loading: rowsLoading, error: rowsError, reload: reloadRows } = useSupabaseQuery(async () => {
    if (!source || !fields.length) return [] as DataRow[];
    const result = await rawSupabase.from(source).select(fields.join(',')).limit(200);
    if (result.error) throw result.error;
    return (result.data || []) as DataRow[];
  }, [source, fields.join('|')]);

  const exportExcel = () => {
    if (!rows?.length || !fields.length) { return; }
    const exportData = rows.map((row) => {
      const obj: Record<string, unknown> = {};
      fields.forEach((field) => { obj[field] = row[field] ?? ''; });
      return obj;
    });
    const ws = XLSX.utils.json_to_sheet(exportData);
    ws['!cols'] = fields.map((field) => ({ wch: Math.max(field.length * 2, 15) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, (selectedReport?.title || 'تقرير').slice(0, 31));
    XLSX.writeFile(wb, `${selectedReport?.title || 'report'}-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const printReport = () => {
    window.print();
  };

  return (
    <div>
      <PrintStyle />
      <PageHeader title="التقارير" subtitle="شاشة التقارير الجاهزة اللي المطور أضافها — تصدير Excel وطباعة مباشرة للمدير." />
      <Card className="p-4 sm:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-azraq-50 text-azraq-700">
              <BarChart3 size={22} />
            </div>
            <div>
              <h2 className="font-display text-xl font-extrabold text-ink sm:text-2xl">مركز التقارير</h2>
              <p className="text-xs font-bold text-slate-400 sm:text-sm">اختار التقرير — اطبعه أو صدّره Excel.</p>
            </div>
          </div>
          <div className="no-print flex flex-wrap gap-2">
            <Button type="button" onClick={() => { reload(); reloadRows(); }} className="gap-2 py-2.5">
              <RefreshCw size={15} /> تحديث
            </Button>
            {!!rows?.length && (
              <>
                <button
                  type="button"
                  onClick={exportExcel}
                  className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700"
                >
                  <Download size={15} /> Excel
                </button>
                <button
                  type="button"
                  onClick={printReport}
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800"
                >
                  <Printer size={15} /> طباعة
                </button>
              </>
            )}
          </div>
        </div>

        {loading && <LoadingState label="بنحمل التقارير..." />}
        {error && <ErrorState message="تعذر تحميل التقارير. تأكد من تشغيل migration وصلاحية reports." />}
        {!loading && !error && !reports?.length && (
          <EmptyState title="لا توجد تقارير متاحة" body="المطور يقدر يضيف تقارير جاهزة من لوحة المطور." />
        )}

        {!!reports?.length && (
          <div className="grid gap-4">
            <Select value={selectedReport?.id || ''} onChange={(event) => setSelectedId(event.target.value)} className="no-print">
              {reports.map((report) => <option key={report.id} value={report.id}>{report.title}</option>)}
            </Select>

            {selectedReport?.description && (
              <p className="no-print rounded-2xl bg-slate-50 p-3 text-sm font-bold text-slate-500">{selectedReport.description}</p>
            )}

            {rowsLoading && <LoadingState label="بنحمل البيانات..." />}
            {rowsError && <ErrorState message={`تعذر تحميل البيانات من ${source}.`} />}

            {!rowsLoading && !rowsError && (
              <div id="print-area" ref={printRef}>
                <div className="mb-4 hidden print:block">
                  <h1 className="text-2xl font-bold">{selectedReport?.title}</h1>
                  <p className="text-sm text-slate-500">{selectedReport?.description}</p>
                  <p className="text-xs text-slate-400 mt-1">تاريخ التصدير: {new Date().toLocaleDateString('ar-EG')}</p>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead className="bg-slate-50 text-right text-xs font-extrabold text-slate-500">
                      <tr>
                        <th className="px-3 py-3 text-slate-400">#</th>
                        {fields.map((field) => <th key={field} className="px-3 py-3">{field}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {rows?.map((row, index) => (
                        <tr key={index} className="border-t border-slate-100 hover:bg-slate-50">
                          <td className="px-3 py-3 text-xs text-slate-400">{index + 1}</td>
                          {fields.map((field) => (
                            <td key={field} className="max-w-[240px] truncate px-3 py-3 text-slate-600">
                              {valueText(row[field])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                    {!!rows?.length && (
                      <tfoot className="bg-slate-50">
                        <tr>
                          <td colSpan={fields.length + 1} className="px-3 py-2 text-xs font-bold text-slate-400">
                            إجمالي: {rows.length} سطر
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                  {!rows?.length && <p className="p-5 text-center text-sm font-bold text-slate-400">لا توجد بيانات في هذا التقرير.</p>}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
