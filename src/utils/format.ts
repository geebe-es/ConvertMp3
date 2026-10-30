export const duration = (seconds = 0) => `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
export const bytes = (n?: number) => n == null ? '—' : n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`;
export const errorText = (error: unknown) => String(error).replace(/^Error: (Error invoking remote method '[^']+': )?(Error: )?/, '');
