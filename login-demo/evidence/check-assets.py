"""Portable local asset integrity check; no network or source-account metadata needed."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit
import hashlib,json,re,struct,sys,xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[1]
failures=[]
manifest=json.loads((ROOT/'assets/required-assets.json').read_text())
for item in manifest['assets']:
 path=ROOT/item['path']
 if not path.is_file(): failures.append('Missing: '+item['path']);continue
 data=path.read_bytes()
 if len(data)!=item['size_bytes'] or hashlib.sha256(data).hexdigest()!=item['sha256']:failures.append('Asset changed: '+item['path'])
 if path.suffix=='.png':
  if data[:8]!=b'\x89PNG\r\n\x1a\n' or list(struct.unpack('>II',data[16:24]))!=item['dimensions']:failures.append('Invalid PNG: '+item['path'])
 elif path.suffix=='.svg':
  svg=ET.fromstring(data)
  if svg.tag.rsplit('}',1)[-1]!='svg' or [float(svg.attrib['width']),float(svg.attrib['height'])]!=item['dimensions']:failures.append('Invalid SVG: '+item['path'])
 elif path.suffix=='.woff2' and data[:4]!=b'wOF2':failures.append('Invalid font: '+item['path'])
references=set()
class Links(HTMLParser):
 def handle_starttag(self,tag,attrs):
  for key,value in attrs:
   if value and key in ('src','href'):references.add(value)
Links().feed((ROOT/'index.html').read_text())
references.update(re.findall(r"\bsrc:\s*['\"]([^'\"]+)['\"]",(ROOT/'scene-config.js').read_text()))
references.update(re.findall(r"url\(\s*['\"]?([^'\")]+)",(ROOT/'styles.css').read_text()))
for value in references:
 parsed=urlsplit(value);path=(ROOT/parsed.path).resolve()
 if parsed.scheme or parsed.netloc or not path.is_relative_to(ROOT):failures.append('Nonlocal reference: '+value)
 elif not path.is_file():failures.append('Missing reference: '+value)
print(json.dumps({'passed':not failures,'assets_checked':len(manifest['assets']),'references_checked':len(references),'failures':failures,'scope':'File integrity and local references only. Browser evidence is stored separately.'},ensure_ascii=False,indent=2))
sys.exit(bool(failures))
