"""Compile independent article/plant folders; no shared source manifest."""
import re, json, html, pathlib
ROOT=pathlib.Path(__file__).resolve().parents[1]
LANGUAGES=tuple(item['code'] for item in json.loads((ROOT/'config/languages.json').read_text())['languages'])
def inline(text):
 text=html.escape(text,quote=False)
 text=re.sub(r'\[([^\]]+)\]\((https?://[^\s]+|/[^\s]*)\)',r'<a href="\2">\1</a>',text)
 text=re.sub(r'\*\*([^*]+)\*\*',r'<strong>\1</strong>',text)
 return re.sub(r'(?<!\*)\*([^*]+)\*(?!\*)',r'<em>\1</em>',text)
def blocks(text):
 out=[]
 for b in re.split(r'\n\s*\n',text.strip()):
  if b.startswith('<'):out.append(b)
  elif b.startswith('### '):out.append('<h3>'+inline(b[4:])+'</h3>')
  elif re.match(r'^\d+\. ',b):out.append('<ol>'+''.join('<li>'+inline(re.sub(r'^\d+\. ','',x))+'</li>' for x in b.splitlines())+'</ol>')
  elif b.startswith('- '):out.append('<ul>'+''.join('<li>'+inline(x[2:])+'</li>' for x in b.splitlines())+'</ul>')
  else:out.append('<p>'+inline(b.replace('\n',' '))+'</p>')
 return '\n'.join(out)
def compile_collection(kind):
 result=[]
 for directory in sorted((ROOT/'content'/kind).iterdir()):
  if not directory.is_dir() or not (directory/'meta.json').exists():continue
  item=json.loads((directory/'meta.json').read_text());assert item['slug']==directory.name
  if kind=='articles':assert item.get('type') in ('guide','post','comparison'), f'{directory}: invalid article type'
  else:assert item.get('family') and item.get('botanicalName') and item.get('sources'), f'{directory}: incomplete plant metadata'
  for lang in LANGUAGES:
   file=directory/(lang+'.md')
   if not file.exists():item.pop(lang,None);continue
   assert item.get(lang,{}).get('description'), f'{directory}/{lang}: missing localized metadata'
   if kind=='plants':
    glance=item[lang].get('atAGlance',{});assert all(glance.get(k) for k in ('light','watering','humidity','temperature','petSafety','petSafetySource','careLevel')), f'{directory}/{lang}: incomplete care summary'
   title,rest=file.read_text().split('\n',1);assert title.startswith('# '), f'{file}: missing source title'
   sections=re.split(r'^## ',rest,flags=re.M)
   item[lang]={**item.get(lang,{}),'title':title.lstrip('# '),'answerHtml':blocks(sections[0]),'answer':re.sub(r'\[([^\]]+)\]\([^)]+\)',r'\1',sections[0]).strip(),'sections':[{'title':x.split('\n',1)[0],'html':blocks(x.split('\n',1)[1])} for x in sections[1:]]}
  result.append(item)
 return result
for kind in ('articles','plants'):
 (ROOT/'editorial'/(kind+'.json')).write_text(json.dumps(compile_collection(kind),ensure_ascii=False,indent=2)+'\n')
