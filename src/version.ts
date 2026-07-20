/**
 * SP-DevControl v2.1.1
 * Local governance layer for AI-assisted development
 *
 * Copyright (c) 2026 Pedro Rojas — SolucionesPro (Ecuador)
 * MIT License — see LICENSE file for details
 */

import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const pkg = require('../package.json') as { version: string }
export const VERSION = pkg.version
