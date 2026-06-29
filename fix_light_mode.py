import re

file_path = r"c:\Users\Princess Sabilah\.gemini\antigravity-ide\scratch\pharmacy-intelligence-platform\frontend\src\components\Layout.jsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace hardcoded overlay background
content = content.replace(
    "style={{ background: 'rgba(10, 15, 29, 0.7)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}",
    "style={{ background: 'var(--bg-header)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}"
)

# Replace hardcoded modal background
content = content.replace(
    "style={{ background: 'rgba(20, 25, 41, 0.96)' }}",
    "style={{ background: 'var(--card-bg)' }}"
)

# Replace hardcoded inactive tab text color
content = content.replace(
    "color: guideTab === tab.key ? tab.color : 'rgba(255,255,255,0.6)'",
    "color: guideTab === tab.key ? tab.color : 'var(--text-secondary)'"
)

# Replace hardcoded dark colors
content = content.replace("'#0a0d14'", "'var(--bg-primary)'")
content = content.replace("bg-[#0a0f1d]", "bg-[var(--bg-primary)]")
content = content.replace("hover:text-[#0a0d14]", "hover:text-[var(--bg-primary)]")
content = content.replace("text-[#0a0d14]", "text-[var(--bg-primary)]")
content = content.replace("bg-[#0a0d14]", "bg-[var(--bg-primary)]")

# Replace hardcoded white background alphas
content = content.replace("bg-[var(--card-bg)]/[0.01]", "bg-[var(--card-bg)]")
content = content.replace("bg-[var(--card-bg)]/[0.03]", "bg-[var(--btn-secondary-hover)]")

# Replace border colors
content = re.sub(r'border-white/\[0\.0[0-9]\]', 'border-[var(--card-border)]', content)
content = re.sub(r'border-white/20', 'border-[var(--card-border)]', content)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Done replacing styles!")
