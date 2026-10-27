export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Lets the browser download a URL itself (streamed to disk), for files too large to fetch
// into the page first.
export function downloadUrl(url: string): void {
  const a = document.createElement("a");
  a.href = url;
  a.rel = "noopener";
  a.click();
}
