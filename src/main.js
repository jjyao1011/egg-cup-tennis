import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';
var E = import.meta.env;
var app = initializeApp({ apiKey: E.VITE_FIREBASE_API_KEY, authDomain: E.VITE_FIREBASE_AUTH_DOMAIN, projectId: E.VITE_FIREBASE_PROJECT_ID, appId: E.VITE_FIREBASE_APP_ID });
var auth = getAuth(app), db = getFirestore(app);
var ADMINS = ['jj1011@gmail.com', 'admin@eggcup.app']; // 裁判帳號（實際權限由 firestore.rules 決定）
var showLogin = false;

var GR = [{ k: 'red', t: '男子 Red', c: '#d64545' }, { k: 'brown', t: '男子 Brown', c: '#9a6a3a' }, { k: 'pink', t: '女子 Pink', c: '#e0629b' }, { k: 'aqua', t: '女子 Aqua', c: '#17a6b5' }];
var ORDER = ['BE', 'CD', 'AE', 'BC', 'AD', 'EC', 'DB', 'AC', 'DE', 'AB'], L = 'ABCDE';
var D = { names: {}, m: {} }, gi = 0, mi = 0, edit = false;
function fill() { D.names = D.names || {}; D.m = D.m || {}; GR.forEach(function (g) { if (!D.names[g.k]) D.names[g.k] = L.split('').map(function (x) { return g.t.split(' ')[1] + ' ' + x }) }) }
var tm; function save() { if (!edit) return; clearTimeout(tm); tm = setTimeout(function () { setDoc(REF, JSON.parse(JSON.stringify(D))).catch(function (e) { alert('儲存失敗：' + e.message) }) }, 400) }
function $(h) { document.getElementById('app').innerHTML = h }
function each(q, f) { Array.prototype.forEach.call(document.querySelectorAll(q), f) }
function nm(g, ch) { return D.names[g.k][L.indexOf(ch)] }
function key() { return GR[gi].k + '-' + mi }
/* 規則：先 4 局且領先 2 局（4:0 4:1 4:2）；3:3 需 5:3；4:4 打搶七，勝者 5:4 */
function tbWin(ta, tb) {
    if (ta === null || tb === null) return -1; var w = Math.max(ta, tb), l = Math.min(ta, tb);
    if (w >= 7 && w - l >= 2 && (w == 7 ? l <= 5 : w - l == 2)) return ta > tb ? 0 : 1; return -2
}
function ev(m) {
    if (!m) return { s: 0 }; var a = m.a, b = m.b, ta = m.ta === '' || m.ta == null ? null : +m.ta, tb = m.tb === '' || m.tb == null ? null : +m.tb, t = tbWin(ta, tb);
    if (a + b == 0 && ta === null && tb === null) return { s: 0 };
    if (a == 4 && b == 4) { if (t >= 0) return { s: 2, w: t, fa: 4 + (t == 0), fb: 4 + (t == 1), tb: [ta, tb] }; if (t == -2) return { s: 1, err: '搶七比分不符規則（先 7 分且領先 2 分）' }; return { s: 1, a: a, b: b, note: '4:4 搶七中' } }
    if ((a == 5 && b == 4) || (a == 4 && b == 5)) { var w = a > b ? 0 : 1; if (t == w) return { s: 2, w: w, fa: a, fb: b, tb: [ta, tb] }; return { s: 1, err: '5:4 請輸入正確搶七比分，且勝方需與局數一致' } }
    if ((a == 4 && b <= 2) || (b == 4 && a <= 2) || (a == 5 && b == 3) || (b == 5 && a == 3)) return { s: 2, w: a > b ? 0 : 1, fa: a, fb: b };
    if (a <= 4 && b <= 4) return { s: 1, a: a, b: b };
    return { s: 1, err: '此比分不符規則（4:2 或 5:3 已結束）' }
}
function txt(e) { return e.fa + '-' + e.fb + (e.tb ? ' (' + e.tb[0] + '-' + e.tb[1] + ')' : '') }
function stand(g) {
    var r = L.split('').map(function (x, i) { return { i: i, w: 0, l: 0, gf: 0, ga: 0, pl: 0 } });
    ORDER.forEach(function (o, k) {
        var e = ev(D.m[g.k + '-' + k]); if (e.s != 2) return; var a = L.indexOf(o[0]), b = L.indexOf(o[1]), w = e.w == 0 ? a : b, l = e.w == 0 ? b : a;
        r[w].w++; r[l].l++; r[a].pl++; r[b].pl++; r[a].gf += e.fa; r[a].ga += e.fb; r[b].gf += e.fb; r[b].ga += e.fa
    });
    r.sort(function (x, y) { return y.w - x.w || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf || x.i - y.i }); return r
}
function loginCard() {
    if (!showLogin || edit) return '';
    var b = 'width:100%;padding:12px;border-radius:12px;border:1px solid var(--line);background:var(--card);color:var(--ink);font-size:15px';
    return '<div class="card"><h2>裁判登入</h2><button id="gl" style="' + b + '">使用 Google 登入</button><p class="sub" style="margin:14px 0 8px">或使用 Email 與密碼</p>' +
        '<input type="email" id="em" placeholder="Email" autocomplete="username" style="margin-bottom:8px"><input type="password" id="pw" placeholder="密碼" autocomplete="current-password" style="margin-bottom:10px">' +
        '<button id="ep" style="' + b + ';background:var(--acc);color:var(--accink);font-weight:700;border:0">登入</button></div>'
}
function xtab(g) {
    var R = {}; L.split('').forEach(function (a) { R[a] = {} });
    ORDER.forEach(function (o, k) {
        var e = ev(D.m[g.k + '-' + k]); if (e.s != 2) return;
        [0, 1].forEach(function (p) { R[o[p]][o[1 - p]] = { sc: p ? e.fb + ':' + e.fa : e.fa + ':' + e.fb, tb: e.tb ? (p ? e.tb[1] + '-' + e.tb[0] : e.tb[0] + '-' + e.tb[1]) : '', w: e.w == p } })
    });
    var st = stand(g), rank = {}; st.forEach(function (r, k) { rank[r.i] = k + 1 });
    var h = '<div class="xt"><table><tr><th class="l">選手</th>' + L.split('').map(function (c, i) { return '<th>' + D.names[g.k][i] + '</th>' }).join('') + '<th>勝–敗</th><th>名次</th></tr>';
    L.split('').forEach(function (a, i) {
        var s = st.filter(function (r) { return r.i == i })[0], d = s.gf - s.ga;
        h += '<tr><td class="l">' + D.names[g.k][i] + '</td>';
        L.split('').forEach(function (b) {
            if (a == b) { h += '<td class="x">✕</td>'; return } var c = R[a][b];
            h += c ? '<td class="' + (c.w ? 'w' : '') + '">' + c.sc + (c.tb ? '<small>(' + c.tb + ')</small>' : '') + '<small>' + (c.w ? '勝' : '敗') + '</small></td>' : '<td style="color:var(--mute)">·</td>'
        });
        h += '<td>' + s.w + '勝' + s.l + '敗<small>局差 ' + (d > 0 ? '+' : '') + d + '</small></td><td class="rk">' + (s.pl ? rank[i] : '-') + '</td></tr>'
    });
    return h + '</table></div>'
}
function bind() {
    document.getElementById('md').onclick = function () { if (edit) signOut(auth); else { showLogin = !showLogin; home() } };
    var gl = document.getElementById('gl'); if (gl) {
        gl.onclick = function () { signInWithPopup(auth, new GoogleAuthProvider()).catch(function (e) { alert('登入失敗：' + e.message) }) };
        document.getElementById('ep').onclick = function () { signInWithEmailAndPassword(auth, document.getElementById('em').value.trim(), document.getElementById('pw').value).catch(function () { alert('登入失敗，請確認 Email 與密碼') }) }
    }
    each('.tabs button', function (b) { b.onclick = function () { gi = +b.dataset.t; home() } });
}
function home() {
    var g = GR[gi] || GR[0], h = '<button class="mode" id="md">' + (edit ? '裁判 ✎ 登出' : '🔒 Google 登入') + '</button><h1>🎾 第二屆蛋黃盃網球邀請賽</h1><p class="sub">主辦人：EGG</p>' + loginCard() + '<div class="tabs">';
    GR.forEach(function (x, i) { h += '<button data-t="' + i + '" style="--g:' + x.c + '" class="' + (i == gi ? 'on' : '') + '"><i></i>' + x.t + '</button>' });
    h += '<button data-t="4" style="--g:#b8860b;grid-column:span 2" class="' + (gi == 4 ? 'on' : '') + '"><i></i>🏆 決賽</button></div>';
    if (gi == 4) { h += fin(); $(h); bind(); if (edit) each('.fx[data-f]', function (b) { b.onclick = function () { var q = b.dataset.f.split('-'); openF(+q[0], +q[1]) } }); return }
    h += '<div class="card" style="--g:' + g.c + '"><h2>' + g.t + ' 戰績表</h2><p class="sub">橫列選手的局數在前，例如 4:2 代表橫列選手贏 4 局。</p>' + xtab(g) + '</div>';
    if (edit) h += '<div class="card" style="--g:' + g.c + '"><h2>選手姓名</h2><div class="names">' + D.names[g.k].map(function (n, i) { return '<span>' + L[i] + '</span><input type="text" data-n="' + i + '" value="' + n + '">' }).join('') + '</div></div>';
    h += '<div class="card" style="--g:' + g.c + '"><h2>賽程' + (edit ? '（點選場次輸入比分）' : '') + '</h2>';
    ORDER.forEach(function (o, i) {
        var e = ev(D.m[g.k + '-' + i]), a = nm(g, o[0]), b = nm(g, o[1]);
        h += '<div class="fx" style="cursor:' + (edit ? 'pointer' : 'default') + '" data-m="' + i + '"><div class="no">' + (i + 1) + '</div><div class="vs">' + (e.s == 2 && e.w == 0 ? '<b>' + a + '</b>' : a) + ' <span style="color:var(--mute)">vs</span> ' + (e.s == 2 && e.w == 1 ? '<b>' + b + '</b>' : b) + '</div><span class="tag ' + (e.s == 2 ? 'done' : e.s == 1 ? 'live' : '') + '">' + (e.s == 2 ? txt(e) : e.s == 1 ? (e.err ? '待修正' : (D.m[g.k + '-' + i].a + '-' + D.m[g.k + '-' + i].b)) : '待賽') + '</span></div>'
    });
    h += '</div>';
    if (edit) h += '<div class="row"><button class="danger" id="rs">清除全部比分</button></div>';
    $(h);
    bind();
    if (edit) {
        each('.fx', function (b) { b.onclick = function () { openG(+b.dataset.m) } });
        each('input[data-n]', function (b) { b.oninput = function () { D.names[g.k][+b.dataset.n] = b.value || '?'; save() }; b.onchange = home });
        document.getElementById('rs').onclick = function () { if (confirm('確定清除所有比分？選手姓名會保留。')) { D.m = {}; save(); home() } }
    }
}
var cm = null;
function openG(i) { mi = i; var g = GR[gi], o = ORDER[i]; cm = { k: g.k + '-' + i, n: [nm(g, o[0]), nm(g, o[1])], badge: g.t + ' · 第 ' + (i + 1) + ' 場', c: g.c, back: home, next: i < 9 ? function () { openG(i + 1) } : null }; match() }
function openF(gen, t) { var d = finData(gen); if (!d.ok) return; var m = finM(d, t); cm = { k: m.k, n: m.n, badge: m.tl, c: '#b8860b', hi: m.hi, lo: m.lo, back: function () { gi = 4; home() }, next: null }; match() }
function cnt(g) { return ORDER.filter(function (o, k) { return ev(D.m[g.k + '-' + k]).s == 2 }).length }
function tied(x, y) { return !!(x && y && x.w == y.w && (x.gf - x.ga) == (y.gf - y.ga) && x.gf == y.gf) }
/* 決賽：gen 0=男子(Red/Brown) 1=女子(Pink/Aqua)；冠軍賽=兩組第1名；亞軍賽=兩組第2名；季軍=其餘6人(各組第3~5名)排名第1 */
function finData(gen) {
    var A = GR[gen * 2], B = GR[gen * 2 + 1], sa = stand(A), sb = stand(B), na = cnt(A), nb = cnt(B), six = [];
    [[A, sa], [B, sb]].forEach(function (p) { p[1].slice(2).forEach(function (r) { six.push({ g: p[0], r: r, name: D.names[p[0].k][r.i] }) }) });
    six.sort(function (x, y) { return y.r.w - x.r.w || (y.r.gf - y.r.ga) - (x.r.gf - x.r.ga) || y.r.gf - x.r.gf });
    return { gen: gen, A: A, B: B, sa: sa, sb: sb, na: na, nb: nb, ok: na == 10 && nb == 10, six: six }
}
function finM(d, t) {
    var r = t - 1, A = d.A, B = d.B, pa = d.ok ? d.sa[r] : null, pb = d.ok ? d.sb[r] : null, nA = A.t.split(' ')[1], nB = B.t.split(' ')[1];
    var w = d.ok && (tied(d.sa[r], d.sa[r + 1]) || (r && tied(d.sa[r], d.sa[r - 1])) || tied(d.sb[r], d.sb[r + 1]) || (r && tied(d.sb[r], d.sb[r - 1])));
    return { k: 'fin-' + d.gen + '-' + t, n: [pa ? D.names[A.k][pa.i] : nA + ' 第' + t + '名', pb ? D.names[B.k][pb.i] : nB + ' 第' + t + '名'], tl: (d.gen ? '女子' : '男子') + ' · ' + (t == 1 ? '冠軍賽' : '亞軍賽'), hi: t == 1 ? '冠軍' : '亞軍', lo: t == 1 ? '差點冠軍' : '差點亞軍', warn: !!w }
}
function fin() {
    var h = '';
    [0, 1].forEach(function (gen) {
        var d = finData(gen), nA = d.A.t.split(' ')[1], nB = d.B.t.split(' ')[1];
        h += '<div class="card" style="--g:#b8860b"><h2>🏆 ' + (gen ? '女子組' : '男子組') + '決賽</h2>';
        if (!d.ok) h += '<p class="sub">預賽全部結束後才會產生對戰（' + nA + ' ' + d.na + '/10、' + nB + ' ' + d.nb + '/10）。冠軍賽為兩組第 1 名對戰，亞軍賽為兩組第 2 名對戰。</p>';
        [1, 2].forEach(function (t) {
            var m = finM(d, t), e = ev(D.m[m.k]), w = e.s == 2 ? e.w : -1;
            h += '<div class="fx" data-f="' + gen + '-' + t + '" style="cursor:' + (edit && d.ok ? 'pointer' : 'default') + '"><div class="no">' + (t == 1 ? '冠' : '亞') + '</div><div class="vs"><small style="color:var(--mute)">' + m.tl + '</small><br>' + (w == 0 ? '<b>' + m.n[0] + '</b>' : m.n[0]) + ' <span style="color:var(--mute)">vs</span> ' + (w == 1 ? '<b>' + m.n[1] + '</b>' : m.n[1]) + '</div><span class="tag ' + (e.s == 2 ? 'done' : e.s == 1 ? 'live' : '') + '">' + (e.s == 2 ? txt(e) : e.s == 1 ? (e.err ? '待修正' : D.m[m.k].a + '-' + D.m[m.k].b) : '待賽') + '</span></div>';
            if (w >= 0) h += '<p class="medal">' + (t == 1 ? '🥇' : '🥈') + ' ' + m.hi + '：<b>' + m.n[w] + '</b>　' + m.lo + '：' + m.n[1 - w] + '</p>';
            if (m.warn) h += '<p class="sub">⚠ 預賽成績同分，名次請主辦人確認。</p>'
        });
        h += '<h2 style="margin-top:14px">季軍（其餘 6 人排名）</h2>';
        if (!d.ok) h += '<p class="sub">待預賽結束</p>';
        else h += '<p class="medal">🥉 季軍：<b>' + d.six[0].name + '</b></p>' + (tied(d.six[0].r, d.six[1].r) ? '<p class="sub">⚠ 第 1 名同分，請主辦人確認。</p>' : '') +
            '<table><tr><th>#</th><th class="l">選手</th><th>組別</th><th>勝–敗</th><th>局差</th></tr>' +
            d.six.map(function (p, i) { var df = p.r.gf - p.r.ga; return '<tr><td class="rk">' + (i + 1) + '</td><td class="l">' + p.name + '</td><td>' + p.g.t.split(' ')[1] + '</td><td>' + p.r.w + '–' + p.r.l + '</td><td>' + (df > 0 ? '+' : '') + df + '</td></tr>' }).join('') + '</table>';
        h += '</div>'
    });
    return h
}
function match() {
    var k = cm.k, m = D.m[k] || { a: 0, b: 0, ta: '', tb: '' }, e = ev(D.m[k]), n = cm.n, v = [m.a, m.b], t = [m.ta, m.tb];
    var showTb = (v[0] == 4 && v[1] == 4) || (v[0] + v[1] == 9 && (v[0] == 5 || v[1] == 5));
    var h = '<div style="--g:' + cm.c + '"><span class="badge g">' + cm.badge + '</span><div class="card"><table class="en"><tr><th class="l">選手</th><th>局數</th>' + (showTb ? '<th>搶七分</th>' : '') + '</tr>';
    for (var p = 0; p < 2; p++)h += '<tr><td class="nm">' + n[p] + '</td><td><div class="st"><button data-p="' + p + '" data-d="-1">−</button><b>' + v[p] + '</b><button data-p="' + p + '" data-d="1">+</button></div></td>' + (showTb ? '<td><input type="number" inputmode="numeric" min="0" data-tb="' + p + '" value="' + t[p] + '"></td>' : '') + '</tr>';
    h += '</table></div><div class="card res ' + (e.err ? 'err' : '') + '">';
    if (e.err) h += e.err;
    else if (e.s == 2) h += '🏆 <b>' + n[e.w] + ' 獲勝</b><p class="sub">最終比分 ' + txt(e) + '</p>' + (cm.hi ? '<p class="sub">' + cm.hi + '：' + n[e.w] + '　' + cm.lo + '：' + n[1 - e.w] + '</p>' : '');
    else if (e.note) h += '<b>' + e.note + '</b><p class="sub">請在上方填入搶七分數</p>';
    else h += '<span class="sub">輸入雙方局數，比賽結束時會自動判定勝負</span>';
    h += '</div><p class="sub">規則：先拿 4 局且領先 2 局獲勝（4:0、4:1、4:2）；3:3 需贏到 5:3；4:4 打搶七（先 7 分且領先 2 分），勝者 5:4。</p>' +
        '<div class="row"><button id="bk">← 返回</button><button id="cl" class="danger">清除此場</button>' + (e.s == 2 && cm.next ? '<button id="nx">下一場 →</button>' : '') + '</div></div>';
    $(h);
    function get() { return D.m[k] || (D.m[k] = { a: 0, b: 0, ta: '', tb: '' }) }
    each('.st button', function (b) { b.onclick = function () { var x = get(), f = +b.dataset.p ? 'b' : 'a'; x[f] = Math.max(0, Math.min(5, x[f] + +b.dataset.d)); save(); match() } });
    each('input[data-tb]', function (b) { b.onchange = function () { var x = get(); x[+b.dataset.tb ? 'tb' : 'ta'] = b.value; save(); match() } });
    document.getElementById('bk').onclick = cm.back;
    document.getElementById('cl').onclick = function () { delete D.m[k]; save(); match() };
    var nx = document.getElementById('nx'); if (nx) nx.onclick = cm.next
}
var REF = doc(db, 'tournament', 'main'), ready = false;
fill(); home();
onSnapshot(REF, function (s) {
    if (s.metadata.hasPendingWrites) return;
    if (!(edit && ready)) { if (s.exists()) D = s.data(); fill(); if (!showLogin) home() }
    ready = true
}, function (e) { console.error(e) });
onAuthStateChanged(auth, function (u) {
    if (u && ADMINS.indexOf(u.email) < 0) { alert('此帳號沒有裁判權限'); signOut(auth); return }
    edit = !!u; showLogin = false; home()
});
