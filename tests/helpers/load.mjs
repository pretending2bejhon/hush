// Loads the module under test: the product's, or the one an environment variable names (the controls point a
// product test at a reference fixture, which must pass, or at a broken copy, which must fail).
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export function load(envName, productUrl) {
  const override = process.env[envName];
  return import(override ? pathToFileURL(path.resolve(override)).href : productUrl.href);
}
