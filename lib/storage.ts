import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabase';

const BUCKET = 'audit-evidence';

export function evidencePath(
  institutionId: string,
  auditId: string,
  answerId: string
): string {
  const uuid =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `institutions/${institutionId}/audits/${auditId}/${answerId}/${uuid}.jpg`;
}

export async function pickAndUploadEvidence(
  institutionId: string,
  auditId: string,
  answerId: string
): Promise<{ path: string; error: string | null }> {
  try {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      return {
        path: '',
        error: 'Kamera izni reddedildi. Ayarlardan kamera erişimini açın.',
      };
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return { path: '', error: null };
    }

    const asset = result.assets[0];
    if (!asset.uri) {
      return { path: '', error: 'Fotoğraf alınamadı.' };
    }

    const path = evidencePath(institutionId, auditId, answerId);

    const fileResp = await fetch(asset.uri);
    const blob = await fileResp.blob();

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, blob, { contentType: 'image/jpeg', upsert: false });

    if (uploadError) {
      return { path: '', error: uploadError.message };
    }

    return { path, error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Fotoğraf yüklenemedi.';
    return { path: '', error: msg };
  }
}

export async function getSignedEvidenceUrl(path: string): Promise<{ url: string | null; error: string | null }> {
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 60 * 60);
    if (error) {
      return { url: null, error: error.message };
    }
    return { url: data.signedUrl, error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Kanıt görseli alınamadı.';
    return { url: null, error: msg };
  }
}

export async function deleteEvidence(path: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    if (error) {
      return { error: error.message };
    }
    return { error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Kanıt silinemedi.';
    return { error: msg };
  }
}
