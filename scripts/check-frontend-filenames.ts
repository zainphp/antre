import { readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const roots = ['resources/js', 'resources/css'];
const ignoredDirectories = new Set(['actions', 'routes', 'wayfinder']);
const kebabCase = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const failures: string[] = [];

function checkDirectory(directory: string, skipNaming = false): void {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) {
            const ignored = ignoredDirectories.has(entry.name);
            if (!skipNaming && !ignored && !kebabCase.test(entry.name)) {
                failures.push(`${relative('.', path)}/`);
            }
            checkDirectory(path, skipNaming || ignored);
            continue;
        }

        const stem = entry.name.split('.')[0];
        if (!skipNaming && !kebabCase.test(stem)) {
            failures.push(relative('.', path));
        }
    }
}

for (const root of roots) {
    checkDirectory(root);
}

if (failures.length > 0) {
    console.error('Frontend paths must use kebab-case:');
    for (const path of failures) console.error(`- ${path}`);
    process.exitCode = 1;
}
