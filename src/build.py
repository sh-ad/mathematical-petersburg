"""Статические сайты участников и ведущего: python3 src/build.py."""
from pathlib import Path
import html
import json
import shutil
import zipfile
import subprocess
import argparse
from presenter import CARDS, render as presenter_page
from content import SLIDES, EXTRA_SOURCES

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs'
SOURCES=json.loads((ROOT/'src/references.json').read_text())
E=html.escape
PORTRAITS=[('euler','Леонард Эйлер','1707–1783'),('chebyshev','Пафнутий Чебышёв','1821–1894'),('markov','Андрей Марков','1856–1922'),('lyapunov','Александр Ляпунов','1857–1918'),('kovalevskaya','Софья Ковалевская','1850–1891')]

def photo(key,name,cls=''):
 return f'<img class="portrait {cls}" src="../assets/{key}.webp" alt="{name}" width="240" height="300">'

def svg(body,title,view='0 0 880 380',cls='diagram'):
 return f'<svg class="{cls}" viewBox="{view}" role="img" aria-label="{E(title,quote=True)}" xmlns="http://www.w3.org/2000/svg">{body}</svg>'

def reveal(key,text,label='Показать ответ'):
 return f'<button class="reveal-button" type="button" data-reveal="answer-{key}" aria-controls="answer-{key}" aria-expanded="false">{label}</button><div class="answer" id="answer-{key}" hidden>{text}</div>'

def visual(s):
 kind=s['kind']
 if kind=='cover':
  return '<div class="portrait-line">'+''.join(f'<figure>{photo(key,name)}<figcaption>{name}<span>{years}</span></figcaption></figure>' for key,name,years in PORTRAITS)+'</div><p class="large-question">Кто помог человеку сделать больше?</p>'
 if kind=='route':
  cards=[('01','Кунсткамера + Академия','Университетская наб., 3 и 5','Среда → наставник → Эйлер'),('02','Двенадцать коллегий','Университетская наб., 7–9','Чебышёв → ученики · Ковалевская'),('03','Дом академиков','Наб. Лейтенанта Шмидта, 1','Разные поколения → продолжение идей')]
  return '<div class="route-cards">'+''.join(f'<article><span class="big-number">{n}</span><h2>{name}</h2><p>{address}</p><strong>{idea}</strong></article>' for n,name,address,idea in cards)+'</div><p class="model-note">Схема порядка, не карта. Дом Эйлера и 6-я линия, 17 — необязательное продолжение.</p>'
 if kind=='dates':
  return '<div class="date-cards"><article><strong>1724</strong><p>Учреждение Академии</p></article><article><strong>1727</strong><p>Приезд Эйлера</p></article><article><strong>1783–1789</strong><p>Нынешнее здание</p></article></div><p class="challenge">«В этом здании молодой Эйлер работал в 1727 году»</p>'+reveal(s['id'],'Неверно. Строительство нынешнего здания началось в 1783 году — в год смерти Эйлера.')+'<p class="model-note">Деятельность Академии начинается в 1725-м. Кунсткамера основана в 1714-м.</p>'
 if kind=='mentor':
  return '<div class="split"><div>'+photo('euler','Леонард Эйлер')+'</div><div><div class="steps"><div><span>01</span><h2>Попробовать самому</h2></div><div><span>02</span><h2>Найти затруднение</h2></div><div><span>03</span><h2>Обсудить с наставником</h2></div></div><blockquote>«…читать более трудные математические книги самостоятельно…»</blockquote><p class="model-note">Эйлер о совете Иоганна Бернулли. Наш перевод фрагмента английской передачи в MacTutor.</p></div></div>'
 if kind=='voice':
  drawing=svg('<rect x="105" y="100" width="140" height="140" rx="2"/><circle cx="420" cy="170" r="70"/><path d="M585 240 L665 95 L745 240 Z"/>','Три фигуры: квадрат слева, круг посередине и треугольник справа',cls='diagram drawing')
  return '<div class="process"><div><span>Голос</span><p>Сформулировать мысль</p></div><b aria-hidden="true">→</b><div><span>Запись</span><p>Сохранить и уточнить</p></div><b aria-hidden="true">→</b><div><span>Книга</span><p>Передать читателю</p></div></div><p class="large-question">Какой вопрос поможет восстановить рисунок?</p>'+reveal('drawing',drawing,'Открыть рисунок для описывающего')+'<p class="model-note">Учебный рисунок. В рассказе Фусса портной, записывавший алгебру, и сам Фусс — разные люди.</p>'
 if kind=='bridges':
  edges=[('palace','M160 280 Q450 155 740 280',450,210),('blagoveshchensky','M160 280 Q450 420 740 280',450,366),('birzhevoy','M160 280 Q190 70 450 85',235,115),('tuchkov','M160 280 Q350 280 450 85',350,245),('troitsky','M450 85 Q720 70 740 280',655,120)]
  labels={'palace':'Дворцовый','blagoveshchensky':'Благовещенский','birzhevoy':'Биржевой','tuchkov':'Тучков','troitsky':'Троицкий'}
  paths=''.join(f'<g class="edge" data-edge="{key}" role="button" tabindex="0" aria-label="Перейти: {labels[key]}"><path class="edge-hit" d="{path}"/><path class="edge-line" d="{path}"/><text x="{x}" y="{y}" text-anchor="middle">{labels[key]}</text></g>' for key,path,x,y in edges)
  nodes=''.join(f'<g class="node" data-node="{key}"><circle cx="{x}" cy="{y}" r="35"/><text class="node-letter" x="{x}" y="{y+9}" text-anchor="middle">{key}</text><text class="node-label" x="{x}" y="{y+64}" text-anchor="middle">{name}</text></g>' for key,x,y,name in [('В',160,280,'Васильевский'),('П',450,85,'Петроградская'),('Ц',740,280,'Центр')])
  return '<div class="controls"><label>Начало <select id="walk-start"><option value="В">Васильевский остров</option><option value="П">Петроградская сторона</option><option value="Ц">Центр</option></select></label><button id="walk-reset" type="button">Начать заново</button><button id="walk-undo" type="button">Шаг назад</button></div>'+svg(paths+nodes,'Учебная сеть: две связи В–Ц, две В–П и одна П–Ц',cls='diagram network')+'<div class="bridge-buttons">'+''.join(f'<button type="button" data-cross="{key}">{name}</button>' for key,name in labels.items())+'</div><p class="walk-status" id="walk-status" role="status"></p>'+reveal('parity','Вход и выход в промежуточной точке образуют пару. Степени: В — 4, П — 3, Ц — 3. Начало и конец обхода должны быть в П и Ц.','Показать идею')+'<p class="model-note">Пять выбранных мостов; перемещения внутри зон не учитываем. Схема не является навигационной картой.</p>'
 if kind=='mechanism':
  return '<div class="split mechanism-layout"><div><img id="mechanism-image" src="../assets/chebyshev-still.png" alt="Схема приближённого прямила Чебышёва" width="480" height="320"><button type="button" id="mechanism-toggle" aria-pressed="false">Включить движение</button></div><div class="mechanism-prompt"><span class="huge-word">Почти</span><h2>Найдите рабочий участок</h2><ul><li>Допустимое отклонение</li><li>Длина рабочего хода</li><li>Условия применения</li></ul><p class="application">Сегодня: приводы, механизмы, проектирование движений.</p></div></div><p class="model-note">Современная схема, Van helsing, 2007 · CC BY 2.5. Близость к прямой — на части траектории.</p>'
 if kind=='lecture':
  return '<div class="split lecture-layout"><figure><img class="historic" src="../assets/university-historic.webp" alt="Императорский Санкт-Петербургский университет, исторический вид начала XX века" width="700" height="470"><figcaption>Университет, начало XX века. Исторический вид другого времени, не изображение лекции 1879 года.</figcaption></figure><div class="steps"><div><span>1879–1880</span><h2>Лекция Чебышёва</h2></div><div><span>Запись</span><h2>Конспект Ляпунова</h2></div><div><span>1936</span><h2>Издание при участии Крылова</h2></div></div></div><blockquote>«…со всеми тонкостями попутных замечаний…»</blockquote><p class="model-note">Оценка Алексея Николаевича Крылова, фрагмент в карточке переиздания URSS. Рукопись не сверялась.</p>'
 if kind=='branches':
  return '<div class="teacher">'+photo('chebyshev','Пафнутий Чебышёв')+'<div><h2>Чебышёв</h2><p>Вопросы · методы · научная среда</p></div></div><div class="branches"><article>'+photo('markov','Андрей Марков')+'<div><span>Ученик</span><h2>Марков</h2><p>Зависимые случайные события</p></div></article><article>'+photo('lyapunov','Александр Ляпунов')+'<div><span>Ученик</span><h2>Ляпунов</h2><p>Устойчивость движения</p></div></article></div><p class="large-question">Что сохраняется, когда задачи становятся разными?</p>'
 if kind=='forecast':
  return '''<div class="forecast-layout"><div><div class="range-group"><label for="p">После свободного шага → свободно: <output id="p-value">80%</output></label><input id="p" type="range" min="0" max="100" step="5" value="80"><label for="q">После задержки → свободно: <output id="q-value">30%</output></label><input id="q" type="range" min="0" max="100" step="5" value="30"></div><div class="prob-tree"><span>Сейчас свободно</span><div><article>С → С<strong id="branch-free">64%</strong></article><b>+</b><article>З → С<strong id="branch-delay">6%</strong></article></div></div><button type="button" id="forecast-reset">Вернуть 80% и 30%</button></div><div><div class="result"><span>Свободно через два шага</span><strong id="free-result">70%</strong><div class="prob-track"><div id="free-bar"></div></div></div><div class="routes-result"><article><h2>А: 8 или 13 мин</h2><p>Среднее <strong id="mean-a">9,5 мин</strong></p><p>Риск опоздания <strong id="late-a">30%</strong></p></article><article><h2>Б: всегда 11 мин</h2><p>Среднее <strong>11 мин</strong></p><p>Риск опоздания <strong>0%</strong></p></article></div></div></div><p class="challenge">До встречи 12 минут. Какой путь выбрать?</p><p class="model-note">Учебные вероятности и полные времена пути. Описываем модель, а не устройство конкретного навигатора.</p>'''
 if kind=='onegin':
  return '<div class="onegin-layout"><div><blockquote id="onegin-text">Мой дядя самых честных правил,<br>Когда не в шутку занемог,<br>Он уважать себя заставил<br>И лучше выдумать не мог.</blockquote><p class="model-note">А. С. Пушкин, «Евгений Онегин», начало романа; современная орфография. Наш короткий учебный отрывок.</p><button type="button" id="text-toggle" aria-pressed="false">Выделить гласные и согласные</button></div><div id="text-results" class="text-results" hidden><h2>Что идёт следующим?</h2><p>Гласная после гласной <strong id="after-vowel"></strong></p><p>Гласная после согласной <strong id="after-consonant"></strong></p><p class="model-note" id="text-count"></p><p class="legend">Гласные подчёркнуты; согласные без подчёркивания. Ь и Ъ исключены из расчёта, как отдельные знаки.</p></div></div><p class="application">Современная связь: условная вероятность и роль контекста в предсказании текста.</p>'
 if kind=='stability':
  figures=[]
  for key,title,path,base_y,after_y in [('stable','В чаше','M20 60 Q120 180 220 60',108,100),('unstable','На вершине','M20 120 Q120 0 220 120',48,56),('neutral','На плоскости','M20 110 L220 110',98,98)]:
   figures.append('<article><h2>'+title+'</h2>'+svg(f'<path class="surface" d="{path}"/><circle class="stability-ball" id="ball-{key}" data-base-y="{base_y}" data-after-y="{after_y}" cx="120" cy="{base_y}" r="12"/><g class="reaction" hidden>'+({'stable':'<path d="M161 80 L135 90 M142 83 L135 90 L145 91"/><text x="120" y="153" text-anchor="middle">К положению равновесия</text>','unstable':'<path d="M168 74 L196 91 M186 90 L196 91 L190 83"/><text x="120" y="153" text-anchor="middle">Дальше от вершины</text>','neutral':'<text x="120" y="153" text-anchor="middle">Новое положение покоя</text>'}[key])+'</g>',title,view='0 0 240 175')+'</article>')
  return '<div class="stability-grid">'+''.join(figures)+'</div><button type="button" id="stability-toggle" aria-pressed="false">Немного сместить шарики</button><p class="large-question">Остаться рядом и вернуться — одно и то же?</p><p class="model-note">Школьная схема видов равновесия: меняем положение без начальной скорости. Это не симуляция всей теории устойчивости движения.</p>'
 if kind=='understanding':
  return '<div class="split understanding-layout"><div>'+photo('kovalevskaya','Софья Ковалевская')+'<p class="model-note">Детский эпизод — Полибино. Частные занятия — Страннолюбский; позднее научное наставничество — Вейерштрасс.</p></div><div><div id="derivative-plot"></div><label for="time">Момент времени t = <output id="time-value">2</output> с</label><input id="time" type="range" min="0.5" max="5.5" value="2" step="0.5"><p class="formula">s = t² <span>→</span> v = 2t = <strong id="speed-value">4</strong></p></div></div><p class="model-note">Современная учебная схема: путь в условных единицах, время в секундах. Производная — школьный вход, не изобретение Ковалевской.</p>'
 if kind=='rotation':
  top=svg('<path class="top-axis" d="M305 305 L435 45"/><ellipse class="top-body" cx="370" cy="170" rx="118" ry="40" transform="rotate(27 370 170)"/><path class="top-body" d="M267 116 Q310 240 305 305 Q400 235 473 224"/><circle class="pivot" cx="305" cy="305" r="9"/><line class="annotation-line" x1="300" y1="315" x2="205" y2="340"/><text x="55" y="350">Неподвижная точка</text><text x="500" y="70">Начальный наклон</text><line class="annotation-line" x1="440" y1="60" x2="490" y2="60"/><path class="spin-arrow" d="M320 105 C300 40 475 35 480 115"/><text x="520" y="170">Скорость вращения</text><text x="520" y="215">Распределение массы</text>','Схематический волчок: точка опоры, ось, скорость вращения и распределение массы')
  return '<div class="rotation-layout"><div>'+top+'</div><div class="data-card"><p class="eyebrow">Учебное время до падения</p><h2>А: 8, 10, 9 с</h2><h2>Б: 20, 22, 21 с</h2><p>Скорость не измерена.</p>'+reveal('top','Средние: 9 и 21 секунда. Разница: 12 секунд. По этим данным неизвестно, во сколько раз изменилась скорость вращения.','Что можно заключить?')+'</div></div><p class="model-note">Числа учебные. Схематический волчок — вход в задачу о вращении, а не модель специального случая Ковалевской.</p>'
 if kind=='house':
  return '<div class="house-grid"><article><span>Остроградский</span><p>Математика и механика</p></article><article><span>Чебышёв</span><p>Вероятности, приближения, механизмы</p></article><article><span>Марков</span><p>Зависимые случайные величины</p></article><article><span>Ляпунов</span><p>Устойчивость движения</p></article></div><div class="date-meaning"><div><h2>Годы жизни</h2><p>Биография человека</p></div><span>≠</span><div><h2>Годы проживания</h2><p>Связь с конкретным домом</p></div></div><p class="model-note">С домом связаны разные поколения. Совместные встречи всех названных людей не подтверждены.</p>'
 if kind=='final':
  return '<div class="final-grid">'+''.join(f'<article><span>{i:02}</span><h2>{title}</h2><p>{desc}</p></article>' for i,(title,desc) in enumerate([('Условия','Место, время, книги и приборы'),('Наставник','Собеседник для трудного вопроса'),('Своя попытка','Работа до готового ответа'),('Точная передача','Речь, запись, проверка понимания'),('Свой вопрос','Право идти дальше учителя')],1))+'</div><p class="large-question">Объясните одну идею человеку, которого здесь не было.</p>'
 raise ValueError(kind)

def page(title,body,script='',cls=''):
 return f'''<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="Математический Петербург: иллюстрации и научные истории"><title>{title}</title><link rel="stylesheet" href="../style.css"></head><body class="{cls}">{body}{script}</body></html>'''

def refs(keys):
 return ' · '.join(f'<a href="../sources/index.html#{key}" target="_blank" rel="noopener">{key}</a>' for key in keys)

def main(pdf=False):
 for path in ['participants','presenter','reference','sources','downloads']:(OUT/path).mkdir(parents=True,exist_ok=True)
 shutil.copytree(ROOT/'assets',OUT/'assets',dirs_exist_ok=True)
 screens=[]
 for i,s in enumerate(SLIDES,1):
  screens.append(f'''<section class="screen" id="{s['id']}" data-screen="{i}" aria-labelledby="title-{s['id']}" {'hidden' if i>1 else ''}><header class="screen-heading"><p class="eyebrow">{s['subtitle']}</p><h1 id="title-{s['id']}">{s['title']}</h1></header><div class="visual">{visual(s)}</div><footer class="screen-footer"><p>{E(s['ask'])}</p><span>Основания: {refs(s['sources'])}</span></footer></section>''')
 menu=''.join(f'<li><a href="#{s["id"]}" data-jump="{i-1}"><span>{i:02}</span>{s["title"]}</a></li>' for i,s in enumerate(SLIDES,1))
 body=f'''<a class="skip" href="#screens">К материалам</a><header class="show-top"><a href="#school" class="brand">Математический Петербург</a><span>Участникам</span><div><button type="button" id="open-menu">Все экраны</button><button type="button" id="fullscreen">На весь экран</button></div></header><main id="screens">{''.join(screens)}</main><nav class="show-nav" aria-label="Навигация показа"><button type="button" id="prev">← Назад</button><span id="counter" role="status" aria-live="polite">01 / 16</span><button type="button" id="next">Дальше →</button></nav><dialog id="screen-menu"><div class="dialog-head"><h2>Иллюстрации</h2><button type="button" id="close-menu">Закрыть</button></div><ol>{menu}</ol><a href="https://sh-ad.github.io/mathematical-petersburg/downloads/offline.zip" download>Скачать для показа без интернета ↓</a></dialog><noscript><p class="no-js">Для переключения экранов включите JavaScript. <a href="../presenter/index.html">Текстовый материал</a></p></noscript>'''
 # В интерфейсе участников отсутствует переход к опорному плану.
 body=body.replace('<a href="../presenter/index.html">Текстовый материал</a>','<a href="../reference/index.html">Подробный справочник</a>')
 (OUT/'participants/index.html').write_text(page('Математический Петербург · участникам',body,'<script src="../model.js"></script><script src="../show.js"></script>','show-page'))
 (OUT/'presenter/index.html').write_text(presenter_page())
 reference=(ROOT/'src/reference.html').read_text().replace('href="Математический Петербург.html"','href="../presenter/index.html"').replace('Основная страница ↗','План ведущего ↗')
 (OUT/'reference/index.html').write_text(reference)
 all_sources=[(x['id'],x['title'],x['type']+' '+x['use'],x['url']) for x in SOURCES]+EXTRA_SOURCES
 source_cards=''.join(f'<article id="{key}"><span class="eyebrow">{key}</span><h2>{E(title)}</h2><p>{E(desc)}</p><a href="{E(url,quote=True)}" target="_blank" rel="noopener noreferrer">Открыть источник ↗</a></article>' for key,title,desc,url in all_sources)
 credits=(ROOT/'materials/image-sources.md').read_text()
 source_body=f'<header class="site-top"><a class="brand" href="../participants/index.html">Математический Петербург</a><span>Источники</span></header><main class="source-main"><h1>Основания рассказа</h1><p class="lead">Историческое свидетельство, математическая модель и современная аналогия имеют разные основания.</p>{source_cards}<section id="images"><h2>Изображения и лицензии</h2><pre>{E(credits)}</pre><p>Исходный GIF не изменён. Для выключенного состояния показан его первый кадр; подпись и источник сохранены. Все остальные схемы — современные учебные рисунки, не архивные изображения.</p></section><section><h2>Как читать материал</h2><p>Страница не подтверждает текущий доступ к зданиям, число досок или время переходов. Школьные темы сопоставлены с федеральными программами 2025 года; порядок изучения может отличаться. Подробные оговорки и исходные тексты доступны в <a href="../reference/index.html">справочнике</a>.</p></section></main>'
 (OUT/'sources/index.html').write_text(page('Источники · Математический Петербург',source_body))
 (OUT/'index.html').write_text('<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=participants/"><title>Математический Петербург</title><a href="participants/">Открыть иллюстрации для участников</a></html>')
 (OUT/'.nojekyll').write_text('')
 if pdf:
  subprocess.run(['node',str(ROOT/'scripts/print-presenter.js')],check=True)
 # Архив содержит относительные ссылки и обычные скрипты: открывается без сервера.
 zip_path=OUT/'downloads/offline.zip'
 with zipfile.ZipFile(zip_path,'w',zipfile.ZIP_DEFLATED) as archive:
  for file in sorted(OUT.rglob('*')):
   if file.is_file() and file!=zip_path and file.suffix not in ('.zip',):archive.write(file,file.relative_to(OUT))
 print(f'Собраны два сайта: {len(SLIDES)} экранов участников и {len(CARDS)} карточек ведущего; офлайн-архив {zip_path.stat().st_size//1024} КБ')

if __name__=='__main__':
 parser=argparse.ArgumentParser()
 parser.add_argument('--pdf',action='store_true',help='Пересоздать PDF карточек через локальный Chrome')
 main(parser.parse_args().pdf)
