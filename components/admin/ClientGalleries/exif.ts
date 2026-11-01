"use client";

/**
 * Date de prise de vue (EXIF DateTimeOriginal) d'un JPEG, lue dans les
 * 128 premiers Ko du fichier. Sert à regrouper automatiquement les photos
 * par pause entre deux prises de vue (une personne = une rafale).
 *
 * Renvoie un horodatage en ms, ou null si absent / format non JPEG.
 */
export async function exifDate(file: File): Promise<number | null> {
  if (!/\.jpe?g$/i.test(file.name) && file.type !== 'image/jpeg') return null;
  try {
    const v = new DataView(await file.slice(0, 131072).arrayBuffer());
    if (v.byteLength < 4 || v.getUint16(0) !== 0xffd8) return null;
    let off = 2;
    while (off + 4 < v.byteLength) {
      const marker = v.getUint16(off);
      if ((marker & 0xff00) !== 0xff00) break;
      const len = v.getUint16(off + 2);
      // APP1 « Exif\0\0 »
      if (marker === 0xffe1 && off + 10 < v.byteLength && v.getUint32(off + 4) === 0x45786966) {
        return parseTiff(v, off + 10);
      }
      off += 2 + len;
    }
  } catch {
    /* fichier illisible : pas de date */
  }
  return null;
}

function parseTiff(v: DataView, tiff: number): number | null {
  const le = v.getUint16(tiff) === 0x4949;
  const u16 = (o: number) => v.getUint16(o, le);
  const u32 = (o: number) => v.getUint32(o, le);
  const readAscii = (o: number, n: number) => {
    let s = '';
    for (let i = 0; i < n && o + i < v.byteLength; i++) {
      const c = v.getUint8(o + i);
      if (!c) break;
      s += String.fromCharCode(c);
    }
    return s;
  };
  const findTag = (ifd: number, tag: number): number | null => {
    if (ifd + 2 > v.byteLength) return null;
    const n = u16(ifd);
    for (let i = 0; i < n; i++) {
      const e = ifd + 2 + i * 12;
      if (e + 12 > v.byteLength) return null;
      if (u16(e) === tag) return e;
    }
    return null;
  };
  const toMs = (s: string) => {
    const m = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/.exec(s);
    return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]).getTime() : null;
  };

  const ifd0 = tiff + u32(tiff + 4);
  const exifPtr = findTag(ifd0, 0x8769);
  if (exifPtr) {
    const exifIfd = tiff + u32(exifPtr + 8);
    const dto = findTag(exifIfd, 0x9003);
    if (dto) {
      const ms = toMs(readAscii(tiff + u32(dto + 8), 20));
      if (ms) {
        // Fraction de seconde (rafales) si disponible
        const sub = findTag(exifIfd, 0x9291);
        const frac = sub ? Number('0.' + readAscii(sub + 8, 4).replace(/\D/g, '')) || 0 : 0;
        return ms + Math.round(frac * 1000);
      }
    }
  }
  const dt = findTag(ifd0, 0x0132);
  return dt ? toMs(readAscii(tiff + u32(dt + 8), 20)) : null;
}
