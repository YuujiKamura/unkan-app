// Pages(SPA)版はサーバーを持たないため、共有データをどこかに保存してIDを発行する
// ことができない。代わりにgzip圧縮してURLフラグメント(#以降、サーバーに送信されず
// GitHub PagesのCDNキャッシュにも影響しない)に直接埋め込むことで、サーバーレスに
// 共有URLを成立させる。

export async function compressToBase64Url(jsonString: string): Promise<string> {
  const stream = new Blob([jsonString]).stream().pipeThrough(new CompressionStream('gzip'));
  const buf = await new Response(stream).arrayBuffer();
  const bytes = new Uint8Array(buf);

  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function decompressFromBase64Url(base64url: string): Promise<string> {
  const padded = base64url + '='.repeat((4 - (base64url.length % 4)) % 4);
  const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  const buf = await new Response(stream).arrayBuffer();
  return new TextDecoder().decode(buf);
}
