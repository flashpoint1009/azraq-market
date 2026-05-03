import { FormEvent, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Save } from 'lucide-react';
import { Button, Card, EmptyState, ErrorState, Input, LoadingState, PageHeader, Select, Textarea } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { roleLabels } from '../lib/labels';
import { allPermissions, developerPermissions, isDeveloperProfile, managerPermissions, permissionLabels } from '../lib/permissions';
import { supabase } from '../lib/supabase';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';
import type { PermissionKey, Profile, Role } from '../types/database';

const staffRoles: Role[] = ['admin', 'warehouse', 'delivery'];
const emptyEditForm = { full_name: '', address: '', role: 'customer' as Role, app_permissions: [] as PermissionKey[] };
const emptyCreateForm = { full_name: '', phone: '', password: '', role: 'admin' as Role, app_permissions: [] as PermissionKey[] };

function togglePermission(list: PermissionKey[], permission: PermissionKey) {
  return list.includes(permission) ? list.filter((item) => item !== permission) : [...list, permission];
}

function isMissingColumn(error: unknown, column: string) {
  return Boolean(error && typeof error === 'object' && 'message' in error && String((error as { message?: unknown }).message).includes(`'${column}' column`));
}

export function AdminCustomersPage() {
  const { profile: currentProfile } = useAuth();
  const canManageDeveloper = isDeveloperProfile(currentProfile);
  const visiblePermissions = canManageDeveloper ? allPermissions : managerPermissions;
  const [editing, setEditing] = useState<Profile | null>(null);
  const [form, setForm] = useState(emptyEditForm);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [creating, setCreating] = useState(false);
  const { data, loading, error, reload } = useSupabaseQuery(async () => {
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    const rows = (data as Profile[]) || [];
    return canManageDeveloper ? rows : rows.filter((profile) => !isDeveloperProfile(profile));
  }, [canManageDeveloper]);

  const startEdit = (profile: Profile) => {
    setEditing(profile);
    setForm({
      full_name: profile.full_name || '',
      address: profile.address || '',
      role: profile.role,
      app_permissions: profile.app_permissions || [],
    });
  };

  const reset = () => {
    setEditing(null);
    setForm(emptyEditForm);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editing) {
      toast.error('اختار مستخدم من القائمة عشان تعدل بياناته');
      return;
    }

    const safePermissions = canManageDeveloper ? form.app_permissions : form.app_permissions.filter((permission) => !developerPermissions.includes(permission));
    const payload = {
      full_name: form.full_name,
      address: form.address,
      role: form.role,
      app_permissions: form.role === 'admin' ? safePermissions : [],
    };

    let result = await supabase.from('profiles').update(payload).eq('id', editing.id);
    if (result.error && isMissingColumn(result.error, 'app_permissions')) {
      const legacyPayload = {
        full_name: payload.full_name,
        address: payload.address,
        role: payload.role,
      };
      result = await supabase.from('profiles').update(legacyPayload).eq('id', editing.id);
    }

    if (result.error) {
      toast.error(result.error.message);
      return;
    }

    toast.success('بيانات المستخدم اتحدثت');
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
      role_input: createForm.role,
      permissions_input: createForm.role === 'admin' ? (canManageDeveloper ? createForm.app_permissions : createForm.app_permissions.filter((permission) => !developerPermissions.includes(permission))) : [],
    });
    setCreating(false);

    if (error) {
      console.error('ADMIN_CREATE_STAFF_USER_FAILED', error);
      toast.error(error.message.includes('function') ? 'شغّل ملف supabase/admin_permissions_migration.sql الأول' : error.message);
      return;
    }

    toast.success('المستخدم اتضاف بالصلاحيات المحددة');
    setCreateForm(emptyCreateForm);
    reload();
  };

  return (
    <div>
      <PageHeader title="المستخدمين والصلاحيات" subtitle="أضف مستخدمين وحدد لكل واحد الصفحات والعمليات المسموحة." />
      <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <div className="grid gap-4">
          <Card>
            <h2 className="mb-4 font-display text-2xl font-extrabold">مستخدم جديد</h2>
            <form onSubmit={createUser} className="space-y-3">
              <Input required value={createForm.full_name} onChange={(event) => setCreateForm({ ...createForm, full_name: event.target.value })} placeholder="اسم المستخدم" />
              <Input required dir="ltr" value={createForm.phone} onChange={(event) => setCreateForm({ ...createForm, phone: event.target.value })} placeholder="01000000000" />
              <Input required type="password" value={createForm.password} onChange={(event) => setCreateForm({ ...createForm, password: event.target.value })} placeholder="كلمة المرور" />
              <Select value={createForm.role} onChange={(event) => setCreateForm({ ...createForm, role: event.target.value as Role })}>
                {staffRoles.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}
              </Select>
              {createForm.role === 'admin' && (
                <div className="grid gap-2 rounded-2xl bg-slate-50 p-3">
                  {visiblePermissions.map((permission) => (
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
              <Button disabled={creating} className="w-full"><Plus size={17} /> {creating ? 'جاري الإضافة...' : 'ضيف المستخدم'}</Button>
            </form>
          </Card>

          <Card>
            <h2 className="mb-4 font-display text-2xl font-extrabold">{editing ? 'تعديل مستخدم' : 'اختار مستخدم'}</h2>
            <form onSubmit={submit} className="space-y-3">
              <Input required value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} placeholder="الاسم" />
              <Select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as Role })}>
                {Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </Select>
              <Textarea value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} placeholder="العنوان" rows={3} />
              {form.role === 'admin' && (
                <div className="grid gap-2 rounded-2xl bg-slate-50 p-3">
                  {visiblePermissions.map((permission) => (
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
          {!loading && !error && data?.length === 0 && <EmptyState title="مفيش مستخدمين" body="المستخدمين هيظهروا هنا بعد الإضافة." />}
          {data?.map((profile) => (
            <Card key={profile.id} className="grid gap-2 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <h3 className="font-display text-lg font-extrabold">{profile.full_name || 'من غير اسم'}</h3>
                <p className="text-sm text-slate-500" dir="ltr">{profile.phone}</p>
                <p className="text-xs text-slate-400">{profile.address || 'مفيش عنوان'}</p>
                {profile.role === 'admin' && (
                  <p className="mt-2 text-xs font-bold text-slate-500">
                    {profile.app_permissions?.length ? profile.app_permissions.map((permission) => permissionLabels[permission]).join(' - ') : 'كل الصلاحيات'}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-azraq-50 px-3 py-1 text-xs font-extrabold text-azraq-700">{roleLabels[profile.role]}</span>
                <button onClick={() => startEdit(profile)} className="rounded-2xl bg-white px-4 py-2 text-sm font-bold text-azraq-700 shadow-sm">تعديل</button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
