// Tiny stack VM: a correct interpreter of make.fun's tiny stack ISA v1.
// One run answers every instance in MAKEFUN_INPUT_DIR, writing stdout.bin
// and exit.txt per instance into MAKEFUN_OUTPUT_DIR. Values wrap at 32 bits;
// the data stack holds 256 values, the call stack 64 returns, memory 256
// words; at most 1,000,000 steps and 65,536 output bytes. A trap ends the
// program at once with the trap's code, keeping the output written so far.
// Q packs each opcode (0..0x53) as one char: code-33 = imm*16+pops*4+pushes;
// a space marks an unknown opcode.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const Q = "!2b%'+,0        *******&***&*** ***             AEEA!           &)              %%\"%";
function run(p, g) {
  const D = new Int32Array(256);
  const C = new Int32Array(64);
  const M = new Int32Array(256);
  const U = new Uint8Array(65536);
  let s = 0;
  let c = 0;
  let n = 0;
  let e = 0;
  let q = 0;
  let z = 0;
  const T = (x) => ({ o: U.slice(0, n), c: x });
  for (;;) {
    if (z === 1000000) return T(10);
    if (q < 0 || q >= p.length) return T(9);
    const y = p[q];
    const v = Q.charCodeAt(y) - 33;
    if (!(v >= 0)) return T(5);
    const f = v >> 4;
    if (q + f >= p.length) return T(9);
    z++;
    const a = (v >> 2) & 3;
    const b = v & 3;
    if (s < a) return T(2);
    if (s - a + b > 256) return T(3);
    const x = q + 1 + f;
    q = x;
    switch (y) {
      case 0:
        return T(0);
      case 1:
        D[s++] = (p[x - 1] << 24) >> 24;
        break;
      case 2:
        D[s++] = p[x - 4] | (p[x - 3] << 8) | (p[x - 2] << 16) | (p[x - 1] << 24);
        break;
      case 3:
        s--;
        break;
      case 4:
        D[s] = D[s - 1];
        s++;
        break;
      case 5: {
        const t = D[s - 1];
        D[s - 1] = D[s - 2];
        D[s - 2] = t;
        break;
      }
      case 6:
        D[s] = D[s - 2];
        s++;
        break;
      case 7: {
        const t = D[s - 3];
        D[s - 3] = D[s - 2];
        D[s - 2] = D[s - 1];
        D[s - 1] = t;
        break;
      }
      case 23:
        D[s - 1] = -D[s - 1] | 0;
        break;
      case 27:
        D[s - 1] = ~D[s - 1];
        break;
      case 16:
      case 17:
      case 18:
      case 19:
      case 20:
      case 21:
      case 22:
      case 24:
      case 25:
      case 26:
      case 28:
      case 29:
      case 30:
      case 32:
      case 33:
      case 34: {
        const B = D[s - 1];
        const A = D[s - 2];
        let r;
        if (y === 16) r = (A + B) | 0;
        else if (y === 17) r = (A - B) | 0;
        else if (y === 18) r = Math.imul(A, B);
        else if (y === 19) {
          if (B === 0) return T(4);
          r = A === -2147483648 && B === -1 ? A : (A / B) | 0;
        } else if (y === 20) {
          if (B === 0) return T(4);
          r = B === -1 ? 0 : (A % B) | 0;
        } else if (y === 21) {
          if (B === 0) return T(4);
          r = Math.floor((A >>> 0) / (B >>> 0)) | 0;
        } else if (y === 22) {
          if (B === 0) return T(4);
          r = ((A >>> 0) % (B >>> 0)) | 0;
        } else if (y === 24) r = A & B;
        else if (y === 25) r = A | B;
        else if (y === 26) r = A ^ B;
        else if (y === 28) r = A << (B & 31);
        else if (y === 29) r = A >> (B & 31);
        else if (y === 30) r = (A >>> (B & 31)) | 0;
        else if (y === 32) r = A === B ? 1 : 0;
        else if (y === 33) r = A < B ? 1 : 0;
        else r = (A >>> 0) < (B >>> 0) ? 1 : 0;
        s -= 2;
        D[s++] = r;
        break;
      }
      case 48:
      case 49:
      case 50: {
        const l = ((p[x - 2] | (p[x - 1] << 8)) << 16) >> 16;
        let k = y === 48;
        if (y !== 48) {
          const w = D[--s];
          k = y === 49 ? w === 0 : w !== 0;
        }
        if (k) q = x + l;
        break;
      }
      case 51:
        if (c === 64) return T(7);
        C[c++] = x;
        q = p[x - 2] | (p[x - 1] << 8);
        break;
      case 52:
        if (c === 0) return T(8);
        q = C[--c];
        break;
      case 64: {
        const w = D[s - 1];
        if (w < 0 || w > 255) return T(6);
        D[s - 1] = M[w];
        break;
      }
      case 65: {
        const w = D[s - 1];
        const u = D[s - 2];
        if (w < 0 || w > 255) return T(6);
        s -= 2;
        M[w] = u;
        break;
      }
      case 80: {
        const d = String(D[s - 1]);
        if (n + d.length > 65536) return T(11);
        s--;
        for (let j = 0; j < d.length; j++) U[n++] = d.charCodeAt(j);
        break;
      }
      case 81:
        if (n + 1 > 65536) return T(11);
        U[n++] = D[--s] & 255;
        break;
      case 82:
        D[s++] = e < g.length ? g[e++] : -1;
        break;
      case 83:
        return T(D[--s] & 255);
    }
  }
}
const I = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const O = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
for (const d of readdirSync(I).sort()) {
  const r = run(readFileSync(join(I, d, 'program.bin')), readFileSync(join(I, d, 'input.bin')));
  mkdirSync(join(O, d), { recursive: true });
  writeFileSync(join(O, d, 'stdout.bin'), r.o);
  writeFileSync(join(O, d, 'exit.txt'), r.c + '\n');
}
