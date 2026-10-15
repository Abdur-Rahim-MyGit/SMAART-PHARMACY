const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'frontend', 'src');

const replacements = [
    { regex: /text-slate-900/g, replacement: 'text-[var(--text-primary)]' },
    { regex: /text-slate-800/g, replacement: 'text-[var(--text-primary)]' },
    { regex: /text-slate-600/g, replacement: 'text-[var(--text-secondary)]' },
    { regex: /text-slate-500/g, replacement: 'text-[var(--text-secondary)]' },
    { regex: /text-slate-400/g, replacement: 'text-[var(--text-muted)]' },
    { regex: /text-zinc-400/g, replacement: 'text-[var(--text-muted)]' },
    { regex: /bg-white/g, replacement: 'bg-[var(--card-bg)]' },
    { regex: /border-slate-200/g, replacement: 'border-[var(--card-border)]' },
    { regex: /border-slate-100/g, replacement: 'border-[var(--card-border)]' },
    { regex: /bg-slate-50/g, replacement: 'bg-[var(--bg-secondary)]' },
    { regex: /bg-slate-100/g, replacement: 'bg-[var(--bg-secondary)]' },
    { regex: /border-white\/\[0\.0[235]\]/g, replacement: 'border-[var(--card-border)]' },
    { regex: /bg-\[var\(--canvas-surface\)\]\/50/g, replacement: 'bg-[var(--card-bg)]' },
    { regex: /bg-\[var\(--canvas-surface\)\]\/40/g, replacement: 'bg-[var(--card-bg)]' }
];

function processDirectory(directory) {
    const files = fs.readdirSync(directory);
    for (const file of files) {
        const fullPath = path.join(directory, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            processDirectory(fullPath);
        } else if (stat.isFile() && (fullPath.endsWith('.jsx') || fullPath.endsWith('.js'))) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let originalContent = content;
            
            for (const { regex, replacement } of replacements) {
                content = content.replace(regex, replacement);
            }
            
            if (content !== originalContent) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Updated: ${fullPath}`);
            }
        }
    }
}

processDirectory(srcDir);
console.log("Theme text and background replacements complete.");
