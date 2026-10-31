"""Create and byte-verify a complete standalone checkpoint outside the source tree."""
from pathlib import Path
import sys, zipfile, hashlib
root = Path(__file__).resolve().parents[1]
step = int(sys.argv[1])
destination = Path(sys.argv[2]).resolve()
if root == destination or root in destination.parents:
    raise SystemExit('Output directory must be outside the project')
destination.mkdir(parents=True, exist_ok=True)
output = destination / f'MEDIXA-Step-{step}.zip'
if output.exists():
    raise SystemExit('Checkpoint already exists; use a new step')
files = sorted(p for p in root.rglob('*') if p.is_file() and not any(x in {'.git', '__pycache__', 'node_modules'} for x in p.relative_to(root).parts))
with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
    for p in files:
        archive.write(p, p.relative_to(root).as_posix())
with zipfile.ZipFile(output) as archive:
    assert archive.testzip() is None
    assert len(archive.namelist()) == len(files)
    for p in files:
        assert archive.read(p.relative_to(root).as_posix()) == p.read_bytes(), p
print(f'PASS ZIP CRC and byte comparison: {output.name}, {len(files)} files, {output.stat().st_size} bytes')
print('SHA256:', hashlib.sha256(output.read_bytes()).hexdigest())
