import { h, api, initSession, brl, clear, track, toast, setCsrf } from './common.js';

const grid = document.getElementById('grid');
const drawer = document.getElementById('drawer');
const scrim = document.getElementById('scrim');
let products = [], config = { delivery: [] }, user = null;
const st = {}; // estado por produto: {v: índice da cor, gb, named}
let cart = [];
try { cart = JSON.parse(localStorage.getItem('cart') || '[]').filter((i) => i && i.variant_id && i.qty > 0).slice(0, 10); } catch { cart = []; }
const save = () => { try { localStorage.setItem('cart', JSON.stringify(cart)); } catch { /* sem storage */ } document.getElementById('cnt').textContent = cart.reduce((a, i) => a + i.qty, 0); };

const sendEvent = (type, product_id) => api('/api/event', { method: 'POST', body: { type, product_id } }).catch(() => {});

function card(p) {
  const s = st[p.id] ||= { v: 0, gb: p.storages[0].gb, named: false };
  const v = p.variants[s.v], add = p.storages.find((x) => x.gb === s.gb).add;
  const pn = p.price_new + add, pu = p.price_used + add;
  const img = () => h('img', { src: v.image, alt: `${p.name} ${v.color}`, width: 1000, height: 1000, loading: 'lazy' });
  return h('article', { class: 'card', 'data-id': p.id },
    h('div', { class: 'box', role: 'button', tabindex: '0', 'aria-label': `Ver detalhes do ${p.name} ${v.color}`, onclick: () => openProduct(p), onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openProduct(p); } } },
      h('div', { class: 'half' }, h('span', { class: 'chip-l u' }, 'Seminovo'), img()),
      h('div', { class: 'half' }, h('span', { class: 'chip-l n' }, 'Novo'), img()),
      h('span', { class: 'badge-m' }, p.name.replace('iPhone ', ''))),
    h('div', { class: 'swatches', role: 'group', 'aria-label': 'Cores' },
      p.variants.map((x, i) => h('button', { class: 'sw' + (i === s.v ? ' on' : ''), type: 'button', style: { '--c': x.hex }, 'aria-label': x.color, 'aria-pressed': i === s.v,
        onclick: () => { s.v = i; s.named = true; sendEvent('click', p.id); redraw(p.id); } })),
      s.named ? h('span', { class: 'cname' }, v.color) : null),
    h('div', null, h('h3', null, h('button', { class: 'linkbtn', type: 'button', onclick: () => openProduct(p) }, p.name)), h('p', { class: 'tl' }, p.tagline)),
    h('div', { class: 'chips', role: 'group', 'aria-label': 'Memória' },
      p.storages.map((x) => h('button', { class: 'chip' + (x.gb === s.gb ? ' on' : ''), type: 'button', onclick: () => { s.gb = x.gb; redraw(p.id); } }, x.gb === 1024 ? '1 TB' : x.gb + ' GB'))),
    h('div', { class: 'prices' },
      h('div', { class: 'pbox u' }, h('span', null, 'Seminovo'), h('strong', null, brl(pu)), h('em', null, `Economize ${brl(pn - pu)}`),
        h('button', { class: 'btn', type: 'button', disabled: !v.used_ok, onclick: () => addToCart(p, v, s.gb, 'used', pu) }, v.used_ok ? 'Comprar seminovo' : 'Esgotado')),
      h('div', { class: 'pbox' }, h('span', null, 'Novo'), h('strong', null, brl(pn)), h('em', null, ''),
        h('button', { class: 'btn', type: 'button', disabled: !v.new_ok, onclick: () => addToCart(p, v, s.gb, 'new', pn) }, v.new_ok ? 'Comprar novo' : 'Esgotado'))));
}
function redraw(id) {
  const p = products.find((x) => x.id === id), old = grid.querySelector(`[data-id="${id}"]`);
  old.replaceWith(card(p));
}

// ---------- janela de detalhes do produto ----------
let modal = null;
function closeProduct() { if (modal) { modal.remove(); modal = null; } scrim.classList.remove('on'); scrim.onclick = () => openDrawer(false); document.body.classList.remove('lock'); }
function openProduct(p) {
  sendEvent('click', p.id); closeProduct(); openDrawer(false);
  const s = st[p.id];
  const body = h('div', { class: 'pm-body' });
  const draw = () => {
    clear(body);
    const v = p.variants[s.v], add = p.storages.find((x) => x.gb === s.gb).add, cond = s.cond || 'new';
    const price = (cond === 'new' ? p.price_new : p.price_used) + add, ok = cond === 'new' ? v.new_ok : v.used_ok;
    body.append(
      h('div', { class: 'pm-gal' },
        h('div', { class: 'pm-img' }, h('img', { src: v.gallery[Math.min(s.g || 0, v.gallery.length - 1)], alt: `${p.name} ${v.color}, ângulo ${(s.g || 0) + 1}`, width: 1000, height: 1000 })),
        v.gallery.length > 1 ? h('div', { class: 'thumbs', role: 'group', 'aria-label': 'Ângulos' }, v.gallery.map((u, i) => h('button', { class: 'th' + (i === (s.g || 0) ? ' on' : ''), type: 'button', 'aria-label': `Ângulo ${i + 1}`, onclick: () => { s.g = i; draw(); } }, h('img', { src: u, alt: '', loading: 'lazy' })))) : null),
      h('div', { class: 'pm-info' },
        h('p', { class: 'eyebrow' }, `Lançamento ${p.year}`), h('h2', null, p.name), h('p', { class: 'tl' }, p.tagline),
        h('div', { class: 'pm-sec' }, h('b', null, 'Cor: ', h('span', { class: 'cname2' }, v.color)),
          h('div', { class: 'swatches' }, p.variants.map((x, i) => h('button', { class: 'sw' + (i === s.v ? ' on' : ''), type: 'button', style: { '--c': x.hex }, 'aria-label': x.color, onclick: () => { s.v = i; s.g = 0; s.named = true; draw(); redraw(p.id); } })))),
        h('div', { class: 'pm-sec' }, h('b', null, 'Memória'), h('div', { class: 'chips' }, p.storages.map((x) => h('button', { class: 'chip' + (x.gb === s.gb ? ' on' : ''), type: 'button', onclick: () => { s.gb = x.gb; draw(); redraw(p.id); } }, x.gb === 1024 ? '1 TB' : x.gb + ' GB')))),
        h('div', { class: 'pm-sec' }, h('b', null, 'Condição'), h('div', { class: 'chips' },
          h('button', { class: 'chip' + (cond === 'new' ? ' on' : ''), type: 'button', onclick: () => { s.cond = 'new'; draw(); } }, `Novo · ${brl(p.price_new + add)}`),
          h('button', { class: 'chip' + (cond === 'used' ? ' on' : ''), type: 'button', onclick: () => { s.cond = 'used'; draw(); } }, `Seminovo · ${brl(p.price_used + add)}`)),
          h('p', { class: 'tl' }, cond === 'new' ? 'Aparelho novo, lacrado, com garantia do fabricante.' : 'Aparelho testado, com sinais leves de uso. As fotos são ilustrativas.')),
        h('div', { class: 'pm-buy' }, h('strong', null, brl(price)), h('span', { class: 'tl' }, 'Pix ou cartão de crédito'),
          h('button', { class: 'btn', type: 'button', disabled: !ok, onclick: () => { addToCart(p, v, s.gb, cond, price); closeProduct(); openDrawer(true); } }, ok ? 'Adicionar à sacola' : 'Esgotado')),
        p.specs?.length ? h('div', { class: 'pm-sec' }, h('b', null, 'Especificações'), h('dl', { class: 'specs' }, p.specs.map(([k, val]) => [h('dt', null, k), h('dd', null, val)]))) : null,
        h('p', { class: 'tl' }, 'Confira as especificações oficiais no site do fabricante.')));
  };
  modal = h('div', { class: 'pm', role: 'dialog', 'aria-modal': 'true', 'aria-label': p.name },
    h('button', { class: 'x pm-x', type: 'button', 'aria-label': 'Fechar', onclick: closeProduct }, '×'), body);
  document.body.append(modal); document.body.classList.add('lock'); scrim.classList.add('on'); scrim.onclick = closeProduct;
  draw(); modal.querySelector('.pm-x').focus();
}
function addToCart(p, v, gb, cond, unit) {
  const ex = cart.find((i) => i.variant_id === v.id && i.cond === cond && i.storage === gb);
  if (ex) ex.qty = Math.min(5, ex.qty + 1);
  else cart.push({ variant_id: v.id, name: p.name, color: v.color, cond, storage: gb, qty: 1, unit, image: v.image });
  save(); sendEvent('add_cart', p.id); toast(`${p.name} · ${cond === 'new' ? 'Novo' : 'Seminovo'} adicionado`); renderCart();
}

// ---------- sacola e checkout ----------
function openDrawer(on) { drawer.classList.toggle('on', on); scrim.classList.toggle('on', on); drawer.setAttribute('aria-hidden', String(!on)); }
document.getElementById('cartBtn').onclick = () => { renderCart(); openDrawer(true); };
scrim.onclick = () => openDrawer(false);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { openDrawer(false); closeProduct(); } });

function renderCart() {
  clear(drawer);
  const total = cart.reduce((a, i) => a + i.unit * i.qty, 0);
  drawer.append(h('h4', null, 'Sua sacola', h('button', { class: 'x', type: 'button', 'aria-label': 'Fechar', onclick: () => openDrawer(false) }, '×')));
  if (!cart.length) { drawer.append(h('p', { class: 'tl' }, 'Sua sacola está vazia.')); return; }
  cart.forEach((i, k) => drawer.append(h('div', { class: 'it' },
    h('img', { src: i.image, alt: '' }),
    h('div', null, h('b', null, i.name), h('small', null, `${i.cond === 'new' ? 'Novo' : 'Seminovo'} · ${i.color} · ${i.storage === 1024 ? '1 TB' : i.storage + ' GB'}`),
      h('div', { class: 'qty' }, h('button', { type: 'button', 'aria-label': 'Menos', onclick: () => { i.qty--; if (i.qty < 1) cart.splice(k, 1); save(); renderCart(); } }, '−'), h('span', null, i.qty),
        h('button', { type: 'button', 'aria-label': 'Mais', onclick: () => { i.qty = Math.min(5, i.qty + 1); save(); renderCart(); } }, '+'))),
    h('b', null, brl(i.unit * i.qty)))));
  drawer.append(h('div', { class: 'tot' }, h('span', null, 'Subtotal'), h('span', null, brl(total))),
    h('button', { class: 'btn', type: 'button', onclick: checkout }, 'Finalizar compra'),
    h('p', { class: 'pay-note' }, 'Pagamento com Pix ou cartão de crédito. Os valores são conferidos no servidor.'));
}

async function checkout() {
  toast('Vitrine de demonstração: as compras ainda não estão ativas.'); return;
  clear(drawer);
  drawer.append(h('h4', null, 'Finalizar compra', h('button', { class: 'x', type: 'button', 'aria-label': 'Fechar', onclick: () => openDrawer(false) }, '×')));
  if (!user.verified) { drawer.append(h('div', { class: 'msg err' }, 'Confirme seu e-mail para comprar. Enviamos um link para a sua caixa de entrada.'), h('a', { class: 'btn ghost', href: '/conta' }, 'Ir para minha conta')); return; }
  let addrs = []; try { addrs = await api('/api/me/addresses'); } catch { /* */ }
  const err = h('div', { class: 'msg err', hidden: true });
  if (!addrs.length) { drawer.append(h('p', null, 'Cadastre um endereço de entrega para continuar.'), h('a', { class: 'btn', href: '/conta?tab=enderecos&next=checkout' }, 'Cadastrar endereço')); return; }
  const selA = h('select', { id: 'selA' }, addrs.map((a) => h('option', { value: a.id }, `${a.label}: ${a.street}, ${a.number} — ${a.city}/${a.state}`)));
  const dm = config.delivery;
  const selD = dm.length ? h('select', { id: 'selD' }, dm.map((d) => h('option', { value: d.id }, `${d.name} (${d.price ? brl(d.price) : 'grátis'}${d.eta ? ' · ' + d.eta : ''})`))) : null;
  const selM = h('select', { id: 'selM' }, h('option', { value: 'pix' }, 'Pix'), h('option', { value: 'card' }, 'Cartão de crédito'));
  const total = cart.reduce((a, i) => a + i.unit * i.qty, 0);
  const go = h('button', { class: 'btn', type: 'button' }, 'Ir para o pagamento');
  go.onclick = async () => {
    go.disabled = true; err.hidden = true;
    try {
      const r = await api('/api/checkout', { method: 'POST', body: { items: cart.map(({ variant_id, cond, storage, qty }) => ({ variant_id, cond, storage, qty })), address_id: Number(selA.value), delivery_id: selD ? Number(selD.value) : undefined, method: selM.value } });
      cart = []; save();
      if (r.pay_url && /^https:\/\//.test(r.pay_url)) { location.href = r.pay_url; return; }
      clear(drawer); drawer.append(h('h4', null, 'Pedido registrado', h('button', { class: 'x', type: 'button', onclick: () => openDrawer(false) }, '×')),
        h('div', { class: 'msg' }, r.note || 'Pedido registrado.'), h('a', { class: 'btn', href: '/conta' }, 'Ver meus pedidos'));
    } catch (e) { err.textContent = e.message; err.hidden = false; go.disabled = false; }
  };
  drawer.append(h('div', { class: 'form' },
    h('label', null, 'Endereço de entrega', selA), selD ? h('label', null, 'Forma de entrega', selD) : h('p', { class: 'pay-note' }, 'Entrega: a combinar após a confirmação do pedido.'),
    h('label', null, 'Pagamento', selM), err), h('div', { class: 'tot' }, h('span', null, 'Total dos produtos'), h('span', null, brl(total))), go,
    h('button', { class: 'btn ghost', type: 'button', onclick: renderCart }, 'Voltar à sacola'));
}

// logo do Pix: se a imagem externa falhar, mostra texto
document.querySelector('#pixLogo img')?.addEventListener('error', (e) => { e.target.replaceWith(h('span', null, 'Pix')); });

(async () => {
  save();
  try { user = await initSession(); } catch { /* offline */ }
  if (user) document.getElementById('accountLink').textContent = user.name.split(' ')[0];
  track();
  products = (await (await fetch('products.json')).json()).products; config = { delivery: [] };
  products.forEach((p) => grid.append(card(p)));
  if (new URLSearchParams(location.search).get('checkout') === '1' && cart.length) { renderCart(); openDrawer(true); checkout(); }
})();
