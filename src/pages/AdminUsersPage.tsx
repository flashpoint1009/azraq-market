import { FormEvent, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Save } from 'lucide-react';
import { Button, Card, EmptyState, ErrorState, Input, LoadingState, PageHeader, Select, Textarea } from '../components/ui';
import { roleLabels } from '../lib/labels';
import { allPermissions, hasPermission, permissionLabels } from '../lib/permissions';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import type { PermissionKey, Profile, Role } from '../types/database';

type StaffAccountType = 'manager' | 'developer' | 'warehouse' | 'delivery';

const accountTypeLabels: Record<StaffAccountType, string> = {
  manager: 'مدير',
  developer: 'مطور',
  warehouse: 'مخزن',
  delivery: 'توصيل',
};
const accountTypes = Object.keys(accountTypeLabels) as StaffAccountType[];
const managerPermissions = allPermissions.filter((permission) => !['developer', 'settings', 'data'].includes(permission));
const developerPermissions: PermissionKey[] = ['developer', 'settings', 'data'];
const emptyEditForm = { full_name: '', address: '', account_type: 'manager' as StaffAccountType, app_permissions: managerPermissions };
const emptyCreateForm = { full_name: '', phone: '', password: '', account_type: 'manager' as StaffAccountType, app_permissions: managerPermissions };

function roleForAccountType(accountType: StaffAccountType): Role {
  if (accountType === 'warehouse') return 'warehouse';
  if (accountType === 'delivery') return 'delivery';
  return 'admin';
}

function permissionsForAccountType(accountType: StaffAccountType, current: PermissionKey[] = []) {
  if (accountType === 'manager') return current.length ? current.filter((permission) => managerPermissions.includes(permission)) : managerPermissions;
  if (accountType === 'developer') return developerPermissions;
  return [];
}

function accountTypeForProfile(profile: Profile): StaffAccountType {
  if (profile.role === 'warehouse') return 'warehouse';
  if (profile.role === 'delivery') return 'delivery';
  if (profile.app_permissions?.includes('developer')) return 'developer';
  return 'manager';
}

function togglePermission(list: PermissionKey[], permission: PermissionKey) {
  return list.includes(permission) ? list.filter((item) => item !== permission) : [...list, permission];
}

function isMissingColumn(error: unknown, column: string) {
  return Boolean(error && typeof error === 'object' && 'message' in error && String((error as { message?: unknown }).message).includes(`'${column}' column`));
}

export function AdminUsersPage() {
  const { profile: currentProfile } = useAuth();
  const [editing, setEditing] = useState<Profile | null>(null);
  const [form, setForm] = useState(emptyEditForm);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [creating, setCreating] = useState(false);
  const { data, loading, error, reload } = useSupabaseQuery(async () => {
    const { data, error } = await supabase.from('profiles').select('*').neq('role', 'customer').order('created_at', { ascending: false });
    if (error) throw error;
    return data as Profile[];
  }, []);
  const canManageDevelopers = hasPermission(currentProfile, 'developer');
  const availableAccountTypes = canManageDevelopers ? accountTypes : accountTypes.filter((accountType) => accountType !== 'developer');
  const visibleProfiles = useMemo(
    () => (data || []).filter((profile) => canManageDevelopers || accountTypeForProfile(profile) !== 'developer'),
    [canManageDevelopers, data],
  );

  const startEdit = (profile: Profile) => {
    const accountType = accountTypeForProfile(profile);
    if (accountType === 'developer' && !canManageDevelopers) {
      toast.error('تعديل المطور متاح للمطور فقط');
      return;
    }
    setEditing(profile);
    setForm({
      full_name: profile.full_name || '',
      address: profile.address || '',
      account_type: accountType,
      app_permissions: permissionsForAccountType(accountType, profile.app_permissions || []),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const reset = () => {
    setEditing(null);
    setForm(emptyEditForm);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editing) {
      toast.error('اختر مستخدم من القائمة للتعديل');
      return;
    }

    const role = roleForAccountType(form.account_type);
    const payload = {
      full_name: form.full_name,
      address: form.address,
      role,
      app_permissions: permissionsForAccountType(form.account_type, form.app_permissions),
    };

    let result = await supabase.from('profiles').update(payload).eq('id', editing.id);
    if (result.error && isMissingColumn(result.error, 'app_permissions')) {
      const legacyPayload = { full_name: payload.full_name, address: payload.address, role: payload.role };
      result = await supabase.from('profiles').update(legacyPayload).eq('id', editing.id);
    }

    if (result.error) {
      toast.error(result.error.message);
      return;
    }

    toast.success('تم تحديث بيانات المستخدم');
    reset();
    reload();
  };

  const createUser = async (event: FormEvent) => {
    event.preventDefault();
    if (!createForm.full_name.trim() || !createForm.phone.trim() || createForm.password.length < 6) {
      toast.error('اكتب الاسم ورقم الهاتف وكلمة مرور 6 أحرف على الأقل');
      return;
    }

    setCreating(true);
    const { error } = await supabase.rpc('admin_create_staff_user', {
      phone_input: createForm.phone,
      password_input: createForm.password,
      full_name_input: createForm.full_name,
      role_input: roleForAccountType(createForm.account_type),
      permissions_input: permissionsForAccountType(createForm.account_type, createForm.app_permissions),
    });
    setCreating(false);

    if (error) {
      console.error('ADMIN_CREATE_STAFF_USER_FAILED', error);
      toast.error(error.message.includes('function') ? 'شغل ملف supabase/admin_permissions_migration.sql الأول' : error.message);
      return;
    }

    toast.success('تم إضافة المستخدم بالصلاحيات المحددة');
    setCreateForm(emptyCreateForm);
    reload();
  };

  return (
    <div>
      <PageHeader title="المستخدمين والصلاحيات" subtitle="أضف مستخدمي الإدارة والمخزن والتوصيل وحدد صلاحيات كل مستخدم." />
      <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <div className="grid gap-4">
          <Card>
            <h2 className="mb-4 font-display text-2xl font-extrabold">مستخدم جديد</h2>
            <form onSubmit={createUser} className="space-y-3">
              <Input required value={createForm.full_name} onChange={(event) => setCreateForm({ ...createForm, full_name: event.target.value })} placeholder="اسم المستخدم" />
              <Input required dir="ltr" value={createForm.phone} onChange={(event) => setCreateForm({ ...createForm, phone: event.target.value })} placeholder="01000000000" />
              <Input required type="password" value={createForm.password} onChange={(event) => setCreateForm({ ...createForm, password: event.target.value })} placeholder="كلمة المرور" />
              <Select value={createForm.account_type} onChange={(event) => {
                const accountType = event.target.value as StaffAccountType;
                setCreateForm({ ...createForm, account_type: accountType, app_permissions: permissionsForAccountType(accountType) });
              }}>
                {availableAccountTypes.map((accountType) => <option key={accountType} value={accountType}>{accountTypeLabels[accountType]}</option>)}
              </Select>
              {createForm.account_type === 'manager' && (
                <div className="grid gap-2 rounded-2xl bg-slate-50 p-3">
                  {managerPermissions.map((permission) => (
                    <label key={permission} className="flex items-center gap-2 text-sm font-bold text-slate-600">
                      <input
                        type="checkbox"
                        checked={createForm.app_permissions.includes(permission)}
                        onChange={() => setCreateForm({ ...createForm, app_permissions: togglePermission(createForm.app_permissions, permission) })}
                      />
                      {permissionLabels[permission]}
                    </label>
                  ))}
                </div>
              )}
              {createForm.account_type === 'developer' && <p className="rounded-2xl bg-indigo-50 p-3 text-sm font-bold text-indigo-700">المطور فقط يملك لوحة المطور وإعدادات الهوية وبيانات المشروع الخام.</p>}
              <Button disabled={creating} className="w-full"><Plus size={17} /> {creating ? 'جاري الإضافة...' : 'ضيف المستخدم'}</Button>
            </form>
          </Card>

          <Card>
            <h2 className="mb-4 font-display text-2xl font-extrabold">{editing ? 'تعديل مستخدم' : 'اختر مستخدم'}</h2>
            <form onSubmit={submit} className="space-y-3">
              <Input required value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} placeholder="الاسم" />
              <Select value={form.account_type} onChange={(event) => {
                const accountType = event.target.value as StaffAccountType;
                setForm({ ...form, account_type: accountType, app_permissions: permissionsForAccountType(accountType, form.app_permissions) });
              }}>
                {availableAccountTypes.map((accountType) => <option key={accountType} value={accountType}>{accountTypeLabels[accountType]}</option>)}
              </Select>
              <Textarea value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} placeholder="العنوان" rows={3} />
              {form.account_type === 'manager' && (
                <div className="grid gap-2 rounded-2xl bg-slate-50 p-3">
                  {managerPermissions.map((permission) => (
                    <label key={permission} className="flex items-center gap-2 text-sm font-bold text-slate-600">
                      <input
                        type="checkbox"
                        checked={form.app_permissions.includes(permission)}
                        onChange={() => setForm({ ...form, app_permissions: togglePermission(form.app_permissions, permission) })}
                      />
                      {permissionLabels[permission]}
                    </label>
                  ))}
                </div>
              )}
              {form.account_type === 'developer' && <p className="rounded-2xl bg-indigo-50 p-3 text-sm font-bold text-indigo-700">هذا المستخدم مطور: يقدر يعدل التطبيق والهوية والإعدادات والبيانات الخام فقط.</p>}
              <Button disabled={!editing} className="w-full"><Save size={17} /> حفظ التعديل</Button>
              {editing && (
                <button type="button" onClick={reset} className="w-full rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-600">
                  إلغاء
                </button>
              )}
            </form>
          </Card>
        </div>

        <div className="grid content-start gap-3">
          {loading && <LoadingState />}
          {error && <ErrorState message={error} />}
          {!loading && !error && visibleProfiles.length === 0 && <EmptyState title="لا يوجد مستخدمين" body="المستخدمون سيظهرون هنا بعد الإضافة." />}
          {visibleProfiles.map((profile) => (
            <Card key={profile.id} className="grid gap-2 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <h3 className="font-display text-lg font-extrabold">{profile.full_name || 'بدون اسم'}</h3>
                <p className="text-sm text-slate-500" dir="ltr">{profile.phone}</p>
                <p className="text-xs text-slate-400">{profile.address || 'لا يوجد عنوان'}</p>
                {profile.role === 'admin' && (
                  <p className="mt-2 text-xs font-bold text-slate-500">
                    {profile.app_permissions?.length ? profile.app_permissions.map((permission) => permissionLabels[permission]).join(' - ') : 'كل الصلاحيات'}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-azraq-50 px-3 py-1 text-xs font-extrabold text-azraq-700">{profile.role === 'admin' ? accountTypeLabels[accountTypeForProfile(profile)] : roleLabels[profile.role]}</span>
                <button type="button" onClick={() => startEdit(profile)} className="rounded-2xl bg-white px-4 py-2 text-sm font-bold text-azraq-700 shadow-sm">تعديل</button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
