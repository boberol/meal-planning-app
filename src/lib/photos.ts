/**
 * Recipe photos: pick one from the phone, shrink it, and upload it.
 *
 * Photos are stored in Supabase Storage at
 *   recipe-photos/<household id>/<random id>.jpg
 * Phone photos can be 5–10 MB, so we resize them to 1200 px wide first. That
 * keeps uploads fast on mobile data and the free storage plan roomy.
 */
import { decode } from 'base64-arraybuffer';
import { randomUUID } from 'expo-crypto';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { friendlyError } from './errors';
import { supabase } from './supabase';

const BUCKET = 'recipe-photos';

/** Opens the photo library. Returns the chosen photo's local address, or null if cancelled. */
export async function pickPhoto(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [4, 3],
    quality: 1,
  });
  if (result.canceled || !result.assets?.length) return null;
  return result.assets[0].uri;
}

/** Shrinks and uploads a photo, and returns its public web address. */
export async function uploadPhoto(householdId: string, localUri: string): Promise<string> {
  const context = ImageManipulator.manipulate(localUri);
  context.resize({ width: 1200 });
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
  if (!saved.base64) throw new Error('Could not read the photo. Try another one.');

  const path = `${householdId}/${randomUUID()}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, decode(saved.base64), { contentType: 'image/jpeg' });
  if (error) throw new Error(friendlyError(error));
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Deletes a photo we uploaded earlier. Failing quietly is fine: it only leaves an unused file. */
export async function deletePhoto(publicUrl: string | null | undefined): Promise<void> {
  const marker = `/${BUCKET}/`;
  const at = publicUrl?.indexOf(marker) ?? -1;
  if (!publicUrl || at < 0) return;
  const path = decodeURIComponent(publicUrl.slice(at + marker.length).split('?')[0]);
  await supabase.storage.from(BUCKET).remove([path]).catch(() => undefined);
}
