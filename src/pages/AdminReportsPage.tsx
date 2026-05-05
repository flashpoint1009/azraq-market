import { useMemo, useState } from 'react';
import { BarChart3, RefreshCw } from 'lucide-react';
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

export function AdminReportsPage() {
  const [selectedId, setSelectedId] = useState('');
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
    const result = await rawSupabase.from(source).select(fields.join(',')).limit(100);
    if (result.error) throw result.error;
    return (result.data || []) as DataRow[];
  }, [source, fields.join('|')]);

  return (
    <div>
      <PageHeader title="التقارير" subtitle="شاشة مستقلة للتقارير الجاهزة أو التقارير اللي المطور بيضيفها حسب طلب العميل." />
      <Card className="p-3 sm:p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-azraq-50 text-azraq-700">
              <BarChart3 size={22} />
            </div>
            <div>
              <h2 className="font-display text-xl font-extrabold text-ink sm:text-2xl">مركز التقارير</h2>
              <p className="text-xs font-bold text-slate-400 sm:text-sm">اختار التقرير وشوف بياناته في جدول سريع.</p>
            </div>
          </div>
          <Button type="button" onClick={() => { reload(); reloadRows(); }} className="w-full sm:w-auto">
            <RefreshCw size={16} />
            تحديث
          </Button>
        </div>

        {loading && <LoadingState label="بنحمل التقارير..." />}
        {error && <ErrorState message="تعذر تحميل التقارير. تأكد من تشغيل migration وصلاحية reports." />}
        {!loading && !error && !reports?.length && (
          <EmptyState title="لا توجد تقارير متاحة" body="المطور يقدر يضيف تقارير جاهزة من لوحة المطور أو من migration." />
        )}
        {!!reports?.length && (
          <div className="grid gap-4">
            <Select value={selectedReport?.id || ''} onChange={(event) => setSelectedId(event.target.value)}>
              {reports.map((report) => <option key={report.id} value={report.id}>{report.title}</option>)}
            </Select>
            {selectedReport?.description && <p className="rounded-2xl bg-slate-50 p-3 text-sm font-bold text-slate-500">{selectedReport.description}</p>}
            {rowsLoading && <LoadingState label="بنحمل بيانات التقرير..." />}
            {rowsError && <ErrorState message={`تعذر تحميل بيانات التقرير من ${source}. راجع صلاحيات الجدول أو إعداد التقرير.`} />}
            {!rowsLoading && !rowsError && (
              <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="bg-slate-50 text-right text-xs font-extrabold text-slate-500">
                    <tr>{fields.map((field) => <th key={field} className="px-3 py-3">{field}</th>)}</tr>
                  </thead>
                  <tbody>
                    {rows?.map((row, index) => (
                      <tr key={index} className="border-t border-slate-100">
                        {fields.map((field) => <td key={field} className="max-w-[240px] px-3 py-3 text-slate-600">{valueText(row[field])}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!rows?.length && <p className="p-4 text-sm font-bold text-slate-400">لا توجد بيانات في هذا التقرير.</p>}
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
