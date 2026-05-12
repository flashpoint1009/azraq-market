/**
 * Audit logging utility for the developer panel.
 * Records every important action in the system.
 */
import { supabase } from './supabase';

export async function logAudit(
  actorId: string | null,
  action: string,
  entityType: string,
  entityId?: string | null,
  changes?: Record<string, { old?: unknown; new?: unknown }> | null,
  metadata?: Record<string, unknown> | null
) {
  try {
    await supabase.rpc('log_audit', {
      p_actor_id: actorId,
      p_action: action,
      p_entity_type: entityType,
      p_entity_id: entityId || null,
      p_changes: changes ? JSON.stringify(changes) : null,
      p_metadata: metadata ? JSON.stringify(metadata) : null,
    });
  } catch (error) {
    // Audit logging should never break the app
    console.error('AUDIT_LOG_FAILED', error);
  }
}

/**
 * Apply typography settings to the document as CSS variables.
 */
export function applyTypography(settings: Array<{ css_variable: string | null; value: string }>) {
  const root = document.documentElement;
  for (const setting of settings) {
    if (setting.css_variable) {
      root.style.setProperty(setting.css_variable, setting.value);
    }
  }
}

/**
 * Apply custom CSS to the document.
 */
export function applyCustomCSS(css: string, isActive: boolean) {
  const STYLE_ID = 'azraq-custom-css';
  const existing = document.getElementById(STYLE_ID);

  if (!isActive || !css.trim()) {
    existing?.remove();
    return;
  }

  if (existing) {
    existing.textContent = css;
  } else {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  }
}

/**
 * Export all app configuration as a JSON snapshot.
 */
export async function exportAppSnapshot() {
  const [settings, labels, typography, plans, features, customCss] = await Promise.all([
    supabase.from('app_settings').select('*'),
    supabase.from('app_labels').select('*'),
    supabase.from('app_typography').select('*'),
    supabase.from('plan_config').select('*'),
    supabase.from('app_settings').select('*').like('key', 'feature_%'),
    supabase.from('app_custom_css').select('*').eq('id', 'global').single(),
  ]);

  return {
    version: '1.0',
    exported_at: new Date().toISOString(),
    settings: settings.data || [],
    labels: labels.data || [],
    typography: typography.data || [],
    plans: plans.data || [],
    features: features.data || [],
    custom_css: customCss.data || null,
  };
}

/**
 * Import a previously exported snapshot.
 */
export async function importAppSnapshot(snapshot: Record<string, unknown>) {
  const data = snapshot as {
    settings?: Array<{ key: string; value: unknown; description?: string }>;
    labels?: Array<{ key: string; value: string; default_value: string; category?: string; description?: string }>;
    typography?: Array<{ key: string; value: string; category?: string; label?: string; css_variable?: string }>;
    plans?: Array<Record<string, unknown>>;
    custom_css?: { css_content?: string; is_active?: boolean } | null;
  };

  const errors: string[] = [];

  // Import settings
  if (data.settings?.length) {
    const { error } = await supabase.from('app_settings').upsert(
      data.settings.map((s) => ({ key: s.key, value: s.value, description: s.description || null, updated_at: new Date().toISOString() })),
      { onConflict: 'key' }
    );
    if (error) errors.push(`Settings: ${error.message}`);
  }

  // Import labels
  if (data.labels?.length) {
    const { error } = await supabase.from('app_labels').upsert(
      data.labels.map((l) => ({ key: l.key, value: l.value, default_value: l.default_value, category: l.category || 'general', description: l.description || null, updated_at: new Date().toISOString() })),
      { onConflict: 'key' }
    );
    if (error) errors.push(`Labels: ${error.message}`);
  }

  // Import typography
  if (data.typography?.length) {
    const { error } = await supabase.from('app_typography').upsert(
      data.typography.map((t) => ({ key: t.key, value: t.value, category: t.category || 'font', label: t.label || t.key, css_variable: t.css_variable || null, updated_at: new Date().toISOString() })),
      { onConflict: 'key' }
    );
    if (error) errors.push(`Typography: ${error.message}`);
  }

  // Import plans
  if (data.plans?.length) {
    const { error } = await supabase.from('plan_config').upsert(data.plans as never[], { onConflict: 'id' });
    if (error) errors.push(`Plans: ${error.message}`);
  }

  // Import custom CSS
  if (data.custom_css) {
    const { error } = await supabase.from('app_custom_css').upsert({
      id: 'global',
      css_content: data.custom_css.css_content || '',
      is_active: data.custom_css.is_active || false,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
    if (error) errors.push(`CSS: ${error.message}`);
  }

  return { success: errors.length === 0, errors };
}
