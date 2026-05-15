/**
 * Customers/Profiles API — all Supabase queries for user profiles.
 */
import { supabase } from '../lib/supabase';
import type { Profile, Role, PermissionKey } from '../types/database';

export async function fetchCustomers(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'customer')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as Profile[];
}

export async function fetchAllProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as Profile[];
}

export async function fetchStaffMembers(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .neq('role', 'customer')
    .order('full_name');
  if (error) throw error;
  return (data || []) as Profile[];
}

export async function fetchProfileById(id: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as Profile;
}

export async function updateProfile(id: string, updates: Partial<Profile>): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as Profile;
}

export type CreateStaffInput = {
  phone: string;
  password: string;
  fullName: string;
  role: Role;
  permissions: PermissionKey[];
};

export async function createStaffUser(input: CreateStaffInput): Promise<Profile> {
  const { data, error } = await supabase.rpc('admin_create_staff_user', {
    phone_input: input.phone,
    password_input: input.password,
    full_name_input: input.fullName,
    role_input: input.role,
    permissions_input: input.permissions,
  });
  if (error) throw error;
  return data as Profile;
}

export type CreateCustomerInput = {
  phone: string;
  password: string;
  fullName: string;
  address: string | null;
};

export async function createCustomerUser(input: CreateCustomerInput): Promise<Profile> {
  const { data, error } = await supabase.rpc('admin_create_customer_user', {
    phone_input: input.phone,
    password_input: input.password,
    full_name_input: input.fullName,
    address_input: input.address,
  });
  if (error) throw error;
  return data as Profile;
}
