import re, zipfile, shutil
from pathlib import Path

FENCE = re.compile(r"```(?:\w+)?\s*path=[\"']?([^\"'\n]+)[\"']?\s*\n(.*?)```", re.DOTALL)

def parse_patches(md):
    return [(path.strip(), content) for path, content in FENCE.findall(md)]

def write_workspace(ws, patches):
    for path, content in patches:
        f = ws / path
        f.parent.mkdir(parents=True, exist_ok=True)
        f.write_text(content, encoding="utf-8")
        print(f"[tools] Đã ghi file: {path}")

def copy_static(files_dir, ws, path):
    src = files_dir / path
    if not src.exists():
        print(f"[tools] CẢNH BÁO: Không tìm thấy file template: {path}")
        return False
    dst = ws / path
    dst.parent.mkdir(parents=True, exist_ok=True)
    if src.is_dir(): shutil.copytree(src, dst, dirs_exist_ok=True)
    else: shutil.copy2(src, dst)
    return True

def zip_workspace(ws, out):
    out.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        for f in ws.rglob("*"):
            if f.is_file(): z.write(f, f.relative_to(ws))