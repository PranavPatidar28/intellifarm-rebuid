import { resolve } from 'node:path';

export function resolveFromWorkspace(relativeOrAbsolute: string) {
  if (/^[A-Za-z]:\\|^\//.test(relativeOrAbsolute)) {
    return relativeOrAbsolute;
  }

  return resolve(process.cwd(), relativeOrAbsolute);
}
