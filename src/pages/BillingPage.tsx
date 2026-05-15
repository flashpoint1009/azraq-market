/**
 * BillingPage — Admin subscription management page.
 * Shows current plan, usage, subscription history, and upgrade options.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Calendar, Check, CreditCard, Crown, Package, Receipt, TrendingUp, Users, Zap } from 'lucide-react';
import { Button, Card, ErrorState, LoadingState, PageHeader } from '../components/ui';
import { useTenant } from '../tenants';
import { PLAN_DEFINITIONS, type PlanId } from '../tenants/types';
import {
  cancelSubscription,
  createSubscription,
  fetchCurrentSubscription,
  fetchSubscriptionHistory,
  fetchUsageMetrics,
  type BillingCycle,
  type Subscription,
} from '../api/billing';

const statusLabels: Record<string, { label: string; color: string }> = {
  active: { label: 'نشط', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  trialing: { label: 'فترة تجريبية', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  cancelled: { label: 'ملغي', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  expired: { label: 'منتهي', color: 'bg-slate-100 text-slate-500 border-slate-200' },
  past_due: { label: 'متأخر', color: 'bg-amber-50 text-amber-700 border-amber-200' },
};

export function BillingPage() {
  const { tenant, plan, branding } = useTenant();
  const queryClient = useQueryClient();
  const [upgradeTarget, setUpgradeTarget] = useState<PlanId | null>(null);
  const [upgradeCycle, setUpgradeCycle] = useState<BillingCycle>('monthly');

  // Fetch current subscription
  const { data: subscription, isLoading: subLoading } = useQuery({
    queryKey: ['billing', 'current', tenant.id],
    queryFn: () => fetchCurrentSubscription(tenant.id),
  });

  // Fetch subscription history
  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['billing', 'history', tenant.id],
    queryFn: () => fetchSubscriptionHistory(tenant.id),
  });

  // Fetch usage
  const { data: usage } = useQuery({
    queryKey: ['billing', 'usage', tenant.id],
    queryFn: () => fetchUsageMetrics(tenant.id),
  });

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: (subId: string) => cancelSubscription(subId),
    onSuccess: () => {
      toast.success('تم إلغاء الاشتراك');
      queryClient.invalidateQueries({ queryKey: ['billing'] });
    },
    onError: () => toast.error('فشل إلغاء الاشتراك'),
  });

  // Upgrade mutation
  const upgradeMutation = useMutation({
    mutationFn: (params: { planId: PlanId; cycle: BillingCycle }) => {
      const def = PLAN_DEFINITIONS[params.planId];
      const amount = params.cycle === 'monthly' ? def.priceMonthly : def.priceYearly;
      return createSubscription({
        tenantId: tenant.id,
        planId: params.planId,
        billingCycle: params.cycle,
        amount,
        paymentMethod: 'manual',
      });
    },
    onSuccess: () => {
      toast.success('تم ترقية الخطة بنجاح');
      setUpgradeTarget(null);
      queryClient.invalidateQueries({ queryKey: ['billing'] });
    },
    onError: () => toast.error('فشل ترقية الخطة'),
  });

  const getUsageValue = (metric: string) => {
    const entry = usage?.find((u) => u.metric === metric);
    return entry?.value || 0;
  };

  const handleCancel = () => {
    if (!subscription) return;
    if (!confirm('هل أنت متأكد من إلغاء الاشتراك؟ ستحتفظ بالوصول حتى نهاية الفترة الحالية.')) return;
    cancelMutation.mutate(subscription.id);
  };

  const handleUpgrade = () => {
    if (!upgradeTarget) return;
    upgradeMutation.mutate({ planId: upgradeTarget, cycle: upgradeCycle });
  };

  return (
    <div className="space-y-4" dir="rtl">
      <PageHeader
        title="الاشتراك والفوترة"
        subtitle="إدارة خطتك، استهلاكك، وسجل المدفوعات."
        action={
          <Link
            to="/pricing"
            className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-extrabold text-azraq-700 shadow-sm transition hover:-translate-y-0.5"
          >
            <Crown size={16} /> قارن الخطط
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Current Plan Card */}
        <Card className="lg:col-span-2">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500">خطتك الحالية</p>
              <h2 className="mt-1 font-display text-2xl font-extrabold text-ink">{plan.name}</h2>
              {subscription && (
                <span className={`mt-2 inline-flex items-center rounded-full border px-3 py-1 text-xs font-extrabold ${statusLabels[subscription.status]?.color || 'bg-slate-100 text-slate-500'}`}>
                  {statusLabels[subscription.status]?.label || subscription.status}
                </span>
              )}
            </div>
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-azraq-50 text-azraq-700">
              <Crown size={28} />
            </div>
          </div>

          {subscription?.ends_at && (
            <div className="mt-4 flex items-center gap-2 rounded-2xl bg-slate-50 p-3">
              <Calendar size={16} className="text-slate-500" />
              <p className="text-sm text-slate-600">
                <span className="font-bold">ينتهي في:</span>{' '}
                {new Date(subscription.ends_at).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          )}

          {/* Quick limits overview */}
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { icon: Package, label: 'المنتجات', limit: plan.limits.maxProducts, usage: getUsageValue('products_count') },
              { icon: Receipt, label: 'الطلبات/شهر', limit: plan.limits.maxOrdersPerMonth, usage: getUsageValue('orders_this_month') },
              { icon: Users, label: 'المستخدمين', limit: plan.limits.maxStaff, usage: getUsageValue('staff_count') },
              { icon: Zap, label: 'الفروع', limit: plan.limits.maxBranches, usage: getUsageValue('branches_count') },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-3 text-center">
                <item.icon size={18} className="mx-auto text-azraq-600" />
                <p className="mt-1 text-lg font-extrabold text-ink">
                  {item.usage}/{item.limit === 'unlimited' ? '∞' : item.limit}
                </p>
                <p className="text-2xs font-bold text-slate-500">{item.label}</p>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="mt-5 flex flex-wrap gap-2">
            {plan.id !== 'enterprise' && (
              <Link
                to="/pricing"
                className="inline-flex items-center gap-2 rounded-2xl bg-azraq-700 px-5 py-3 text-sm font-extrabold text-white shadow-sm transition hover:-translate-y-0.5"
              >
                <TrendingUp size={16} /> ارقِ خطتك
              </Link>
            )}
            {subscription && subscription.status === 'active' && (
              <button
                onClick={handleCancel}
                disabled={cancelMutation.isPending}
                className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-white px-5 py-3 text-sm font-extrabold text-rose-600 transition hover:bg-rose-50"
              >
                {cancelMutation.isPending ? 'جاري الإلغاء...' : 'إلغاء الاشتراك'}
              </button>
            )}
          </div>
        </Card>

        {/* Quick Upgrade Card */}
        <Card>
          <h3 className="font-display text-sm font-extrabold text-ink">ترقية سريعة</h3>
          <p className="mt-1 text-xs text-slate-500">اختر الخطة الجديدة</p>

          <div className="mt-3 space-y-2">
            {(['starter', 'business', 'enterprise'] as PlanId[])
              .filter((p) => p !== plan.id)
              .map((planId) => {
                const def = PLAN_DEFINITIONS[planId];
                const selected = upgradeTarget === planId;
                return (
                  <button
                    key={planId}
                    onClick={() => setUpgradeTarget(selected ? null : planId)}
                    className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-right transition ${
                      selected ? 'border-azraq-400 bg-azraq-50 ring-2 ring-azraq-200' : 'border-slate-100 bg-slate-50/50 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl ${selected ? 'bg-azraq-700 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      {selected ? <Check size={14} /> : <Crown size={14} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-extrabold text-ink">{def.name}</p>
                      <p className="text-2xs text-slate-500">{def.priceMonthly} ج.م/شهر</p>
                    </div>
                  </button>
                );
              })}
          </div>

          {upgradeTarget && (
            <div className="mt-3 space-y-2">
              <div className="flex gap-2">
                <button
                  onClick={() => setUpgradeCycle('monthly')}
                  className={`flex-1 rounded-xl py-2 text-xs font-extrabold ${upgradeCycle === 'monthly' ? 'bg-azraq-700 text-white' : 'bg-slate-100 text-slate-500'}`}
                >
                  شهري
                </button>
                <button
                  onClick={() => setUpgradeCycle('yearly')}
                  className={`flex-1 rounded-xl py-2 text-xs font-extrabold ${upgradeCycle === 'yearly' ? 'bg-azraq-700 text-white' : 'bg-slate-100 text-slate-500'}`}
                >
                  سنوي (وفّر 17%)
                </button>
              </div>
              <Button
                onClick={handleUpgrade}
                disabled={upgradeMutation.isPending}
                className="w-full"
              >
                <CreditCard size={16} />
                {upgradeMutation.isPending ? 'جاري الترقية...' : 'تأكيد الترقية'}
              </Button>
            </div>
          )}
        </Card>
      </div>

      {/* Subscription History */}
      <Card>
        <h3 className="mb-3 font-display text-sm font-extrabold text-ink">سجل الاشتراكات</h3>
        {historyLoading && <LoadingState />}
        {!historyLoading && (!history || history.length === 0) && (
          <p className="text-center text-xs text-slate-500 py-6">لا يوجد سجل اشتراكات بعد</p>
        )}
        {history && history.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-right">
                  <th className="p-2 font-bold text-slate-500">الخطة</th>
                  <th className="p-2 font-bold text-slate-500">الحالة</th>
                  <th className="p-2 font-bold text-slate-500">المبلغ</th>
                  <th className="p-2 font-bold text-slate-500">الفترة</th>
                  <th className="p-2 font-bold text-slate-500">التاريخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {history.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/50">
                    <td className="p-2 font-bold text-ink">{PLAN_DEFINITIONS[sub.plan_id as PlanId]?.name || sub.plan_id}</td>
                    <td className="p-2">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-2xs font-extrabold ${statusLabels[sub.status]?.color || ''}`}>
                        {statusLabels[sub.status]?.label || sub.status}
                      </span>
                    </td>
                    <td className="p-2 font-bold text-azraq-700">{sub.amount} {sub.currency}</td>
                    <td className="p-2 text-slate-500">{sub.billing_cycle === 'yearly' ? 'سنوي' : 'شهري'}</td>
                    <td className="p-2 text-slate-500">{new Date(sub.created_at).toLocaleDateString('ar-EG')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
