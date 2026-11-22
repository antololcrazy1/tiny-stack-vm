// Tiny Stack VM: from-scratch implementation of make.fun's tiny stack ISA v1.
// For each MAKEFUN_INPUT_DIR/<id>/program.bin (+ input.bin) writes
// MAKEFUN_OUTPUT_DIR/<id>/stdout.bin and exit.txt. Run: node main.ts
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const I = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const O = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
function run(p, q) {
  const s = new Int32Array(256), c = new Int32Array(64), m = new Int32Array(256), o = [];
  let n = 0, k = 0, pc = 0, t = 0, ip = 0, e = -1, a, b, v;
  while (e < 0) {
    if (t >= 1000000) { e = 10; break; } // step limit
    if (pc < 0 || pc >= p.length) { e = 9; break; } // pc outside program
    const op = p[pc];
    // immediate cut off by end of program
    if (op === 1 ? pc + 1 >= p.length : op === 2 ? pc + 4 >= p.length : op >= 0x30 && op <= 0x33 ? pc + 2 >= p.length : false) { e = 9; break; }
    t++;
    switch (op) {
      case 0x00: e = 0; break; // HALT
      case 0x01: if (n >= 256) { e = 3; break; } v = p[pc + 1]; s[n++] = v > 127 ? v - 256 : v; pc += 2; break; // PUSH8 sign-extended
      case 0x02: if (n >= 256) { e = 3; break; } s[n++] = p[pc + 1] | (p[pc + 2] << 8) | (p[pc + 3] << 16) | (p[pc + 4] << 24); pc += 5; break; // PUSH32
      case 0x03: if (n < 1) { e = 2; break; } n--; pc++; break; // POP
      case 0x04: if (n < 1) { e = 2; break; } if (n >= 256) { e = 3; break; } s[n] = s[n - 1]; n++; pc++; break; // DUP
      case 0x05: if (n < 2) { e = 2; break; } v = s[n - 1]; s[n - 1] = s[n - 2]; s[n - 2] = v; pc++; break; // SWAP
      case 0x06: if (n < 2) { e = 2; break; } if (n >= 256) { e = 3; break; } s[n] = s[n - 2]; n++; pc++; break; // OVER
      case 0x07: if (n < 3) { e = 2; break; } v = s[n - 3]; s[n - 3] = s[n - 2]; s[n - 2] = s[n - 1]; s[n - 1] = v; pc++; break; // ROT
      case 0x10: if (n < 2) { e = 2; break; } b = s[--n]; a = s[--n]; s[n++] = (a + b) | 0; pc++; break; // ADD
      case 0x11: if (n < 2) { e = 2; break; } b = s[--n]; a = s[--n]; s[n++] = (a - b) | 0; pc++; break; // SUB
      case 0x12: if (n < 2) { e = 2; break; } b = s[--n]; a = s[--n]; s[n++] = Math.imul(a, b); pc++; break; // MUL low 32 bits
      case 0x13: if (n < 2) { e = 2; break; } b = s[--n]; a = s[--n]; if (b === 0) { e = 4; break; } s[n++] = (a / b) | 0; pc++; break; // DIV signed trunc
      case 0x14: if (n < 2) { e = 2; break; } b = s[--n]; a = s[--n]; if (b === 0) { e = 4; break; } s[n++] = (a % b) | 0; pc++; break; // MOD sign of a
      case 0x15: if (n < 2) { e = 2; break; } b = s[--n]; a = s[--n]; if (b === 0) { e = 4; break; } s[n++] = ((a >>> 0) / (b >>> 0)) | 0; pc++; break; // DIVU
      case 0x16: if (n < 2) { e = 2; break; } b = s[--n]; a = s[--n]; if (b === 0) { e = 4; break; } s[n++] = ((a >>> 0) % (b >>> 0)) | 0; pc++; break; // MODU
      case 0x17: if (n < 1) { e = 2; break; } s[n - 1] = (-s[n - 1]) | 0; pc++; break; // NEG
      case 0x18: if (n < 2) { e = 2; break; } b = s[--n]; a = s[--n]; s[n++] = a & b; pc++; break; // AND
      case 0x19: if (n < 2) { e = 2; break; } b = s[--n]; a = s[--n]; s[n++] = a | b; pc++; break; // OR
      case 0x1a: if (n < 2) { e = 2; break; } b = s[--n]; a = s[--n]; s[n++] = a ^ b; pc++; break; // XOR
      case 0x1b: if (n < 1) { e = 2; break; } s[n - 1] = ~s[n - 1]; pc++; break; // NOT
      case 0x1c: if (n < 2) { e = 2; break; } b = s[--n]; a = s[--n]; s[n++] = a << b; pc++; break; // SHL
      case 0x1d: if (n < 2) { e = 2; break; } b = s[--n]; a = s[--n]; s[n++] = a >> b; pc++; break; // SHR arithmetic
      case 0x1e: if (n < 2) { e = 2; break; } b = s[--n]; a = s[--n]; s[n++] = (a >>> b) | 0; pc++; break; // SHRU logical
      case 0x20: if (n < 2) { e = 2; break; } b = s[--n]; a = s[--n]; s[n++] = a === b ? 1 : 0; pc++; break; // EQ
      case 0x21: if (n < 2) { e = 2; break; } b = s[--n]; a = s[--n]; s[n++] = a < b ? 1 : 0; pc++; break; // LT signed
      case 0x22: if (n < 2) { e = 2; break; } b = s[--n]; a = s[--n]; s[n++] = (a >>> 0) < (b >>> 0) ? 1 : 0; pc++; break; // LTU
      case 0x30: v = p[pc + 1] | (p[pc + 2] << 8); pc = pc + 3 + (v >= 32768 ? v - 65536 : v); break; // JMP
      case 0x31: if (n < 1) { e = 2; break; } v = p[pc + 1] | (p[pc + 2] << 8); if (v >= 32768) v -= 65536; if (s[--n] === 0) pc = pc + 3 + v; else pc += 3; break; // JZ
      case 0x32: if (n < 1) { e = 2; break; } v = p[pc + 1] | (p[pc + 2] << 8); if (v >= 32768) v -= 65536; if (s[--n] !== 0) pc = pc + 3 + v; else pc += 3; break; // JNZ
      case 0x33: if (k >= 64) { e = 7; break; } c[k++] = pc + 3; pc = p[pc + 1] | (p[pc + 2] << 8); break; // CALL
      case 0x34: if (k < 1) { e = 8; break; } pc = c[--k]; break; // RET
      case 0x40: if (n < 1) { e = 2; break; } a = s[n - 1]; if (a < 0 || a > 255) { e = 6; break; } s[n - 1] = m[a]; pc++; break; // LOAD
      case 0x41: if (n < 2) { e = 2; break; } a = s[--n]; v = s[--n]; if (a < 0 || a > 255) { e = 6; break; } m[a] = v; pc++; break; // STORE (v addr --)
      case 0x50: if (n < 1) { e = 2; break; } v = s[--n]; a = String(v); if (o.length + a.length > 65536) { e = 11; break; } for (let i = 0; i < a.length; i++) o.push(a.charCodeAt(i)); pc++; break; // PRINT
      case 0x51: if (n < 1) { e = 2; break; } if (o.length + 1 > 65536) { e = 11; break; } o.push(s[--n] & 255); pc++; break; // PUTC
      case 0x52: if (n >= 256) { e = 3; break; } s[n++] = ip < q.length ? q[ip++] : -1; pc++; break; // IN, -1 when used up
      case 0x53: if (n < 1) { e = 2; break; } e = s[--n] & 255; break; // EXIT low byte
      default: e = 5; break; // unknown opcode
    }
  }
  return [Buffer.from(o), e];
}
for (const id of readdirSync(I).sort()) {
  const prog = readFileSync(join(I, id, 'program.bin'));
  const input = readFileSync(join(I, id, 'input.bin'));
  const [stdout, exit] = run(prog, input);
  mkdirSync(join(O, id), { recursive: true });
  writeFileSync(join(O, id, 'stdout.bin'), stdout);
  writeFileSync(join(O, id, 'exit.txt'), String(exit) + '\n');
}
