import re, os

src = r'mpl-analytic/database/mpl_analytic (3).sql'
dst = r'mpl-analytic/database/mpl_analytic_infinityfree.sql'

with open(src, 'rb') as f:
    raw = f.read()

# Hapus ALGORITHM=... DEFINER=`root`@`localhost` SQL SECURITY DEFINER dari CREATE VIEW
# Menyisakan hanya: CREATE VIEW
pattern = re.compile(
    rb'CREATE\s+ALGORITHM=\w+\s+DEFINER=`[^`]+`@`[^`]+`\s+SQL\s+SECURITY\s+\w+\s+VIEW',
    re.IGNORECASE
)

before_count = len(pattern.findall(raw))
cleaned = pattern.sub(b'CREATE VIEW', raw)

after_definer = len(re.findall(rb'DEFINER', cleaned, re.IGNORECASE))
view_count = len(re.findall(rb'CREATE VIEW', cleaned, re.IGNORECASE))

with open(dst, 'wb') as f:
    f.write(cleaned)

print(f"Patterns replaced : {before_count}")
print(f"DEFINER remaining : {after_definer}")
print(f"CREATE VIEW count : {view_count}")
print(f"Output file       : {dst}")
print(f"File size         : {os.path.getsize(dst):,} bytes")

# Tunjukkan 2 sampel hasil
matches = list(re.finditer(rb'CREATE VIEW', cleaned))
for m in matches[:2]:
    print("Sample:", cleaned[m.start():m.start()+100])
