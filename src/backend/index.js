// Выбор хранилища: если заданы VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY — общий бюджет в Supabase,
// иначе локальный демо-режим в браузере.
import { createLocalBackend } from './local.js';
import { createSupabaseBackend } from './supabase.js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const backend = url && key ? createSupabaseBackend(url, key) : createLocalBackend();
