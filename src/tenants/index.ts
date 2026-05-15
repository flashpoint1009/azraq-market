/**
 * Tenant Module — barrel export
 */
export * from './types';
export * from './tenantLoader';
export { TenantProvider, useTenant } from './TenantProvider';
export { useFeatureGate, useLimitGate } from './useFeatureGate';
