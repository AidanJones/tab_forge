export function scoreFilename(title, extension) {
  const stem = String(title || 'my-score').replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').replace(/[. ]+$/g, '').trim().slice(0, 100) || 'my-score';
  return `${stem}.${extension}`;
}

export function download(data, filename, type) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
