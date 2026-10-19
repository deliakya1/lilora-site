"""Convert reviewed editorial Markdown into the dependency-free page data file."""
import re,json,html,pathlib
ROOT=pathlib.Path(__file__).resolve().parents[1]
def inline(s):
 s=html.escape(s,quote=False)
 return re.sub(r'\[([^\]]+)\]\((https?://[^\s]+)\)',r'<a href="\2">\1</a>',s)
def blocks(s):
 out=[]
 for b in s.strip().split('\n\n'):
  if b.startswith('### '): out.append('<h3>'+inline(b[4:])+'</h3>')
  elif re.match(r'^\d+\. ',b):out.append('<ol>'+''.join('<li>'+inline(re.sub(r'^\d+\. ','',x))+'</li>' for x in b.splitlines())+'</ol>')
  elif b.startswith('- '):out.append('<ul>'+''.join('<li>'+inline(x[2:])+'</li>' for x in b.splitlines())+'</ul>')
  else:out.append('<p>'+inline(b.replace('\n',' '))+'</p>')
 return '\n'.join(out)
def parse(file,description):
 text=(ROOT/'editorial/drafts'/file).read_text()
 title,rest=text.split('\n',1)
 sections=re.split(r'^## ',rest,flags=re.M)
 return {'title':title.lstrip('# '),'description':description,'answerHtml':blocks(sections[0]),'answer':re.sub(r'\[([^\]]+)\]\([^)]+\)',r'\1',sections[0]).strip(),'sections':[{'title':x.split('\n',1)[0],'html':blocks(x.split('\n',1)[1])} for x in sections[1:]]}
manifest=json.loads((ROOT/'editorial/manifest.json').read_text())
articles=[]
for item in manifest:
 a={k:v for k,v in item.items() if k not in ('en','tr')}
 for lang in ('en','tr'):
  if lang in item:
   a[lang]={**parse(item[lang]['file'],item[lang]['description']),**{k:v for k,v in item[lang].items() if k not in ('file','description')}}
 articles.append(a)
(ROOT/'editorial/articles.json').write_text(json.dumps(articles,ensure_ascii=False,indent=2)+'\n')
