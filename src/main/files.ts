/**
 * Saving files the renderer produces. The user picks where in a native save
 * dialog, so the renderer can't write anywhere it wasn't told to.
 */
import path from 'path';
import { writeFile } from 'fs/promises';
import { app, BrowserWindow, dialog } from 'electron';
import type { SaveDialogOptions } from 'electron';

// Asks where to save `content`, starting in Downloads with `fileName`.
// Returns the chosen path, or null when the dialog was cancelled.
export const saveCsvFile = async (fileName: string, content: string) => {
  const options: SaveDialogOptions = {
    defaultPath: path.join(app.getPath('downloads'), path.basename(fileName)),
    filters: [{ name: 'CSV', extensions: ['csv'] }]
  };
  const window = BrowserWindow.getFocusedWindow();
  const { canceled, filePath } = window
    ? await dialog.showSaveDialog(window, options)
    : await dialog.showSaveDialog(options);
  if (canceled || !filePath) return null;
  // Exports can hold decrypted secrets, so a new file is readable by the owner
  // only. An overwritten file keeps its permissions.
  await writeFile(filePath, content, { encoding: 'utf8', mode: 0o600 });
  return filePath;
};
