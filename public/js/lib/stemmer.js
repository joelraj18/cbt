// Porter stemmer (Martin Porter, 1980) — compact implementation of the original algorithm.
// Used by the search engine so "worrying", "worries" and "worried" match "worry".

const step2list = { ational: 'ate', tional: 'tion', enci: 'ence', anci: 'ance', izer: 'ize', bli: 'ble', alli: 'al', entli: 'ent', eli: 'e', ousli: 'ous', ization: 'ize', ation: 'ate', ator: 'ate', alism: 'al', iveness: 'ive', fulness: 'ful', ousness: 'ous', aliti: 'al', iviti: 'ive', biliti: 'ble', logi: 'log' };
const step3list = { icate: 'ic', ative: '', alize: 'al', iciti: 'ic', ical: 'ic', ful: '', ness: '' };
const c = '[^aeiou]', v = '[aeiouy]', C = c + '[^aeiouy]*', V = v + '[aeiou]*';
const mgr0 = new RegExp('^(' + C + ')?' + V + C);
const meq1 = new RegExp('^(' + C + ')?' + V + C + '(' + V + ')?$');
const mgr1 = new RegExp('^(' + C + ')?' + V + C + V + C);
const sV = new RegExp('^(' + C + ')?' + v);

export function stem(w) {
  if (w.length < 3) return w;
  let stemmed, suffix, re, re2, re3, re4;
  const firstch = w[0];
  if (firstch === 'y') w = 'Y' + w.slice(1);
  // Step 1a
  re = /^(.+?)(ss|i)es$/; re2 = /^(.+?)([^s])s$/;
  if (re.test(w)) w = w.replace(re, '$1$2'); else if (re2.test(w)) w = w.replace(re2, '$1$2');
  // Step 1b
  re = /^(.+?)eed$/; re2 = /^(.+?)(ed|ing)$/;
  if (re.test(w)) { const fp = re.exec(w); if (mgr0.test(fp[1])) w = w.replace(/.$/, ''); }
  else if (re2.test(w)) {
    const fp = re2.exec(w); stemmed = fp[1];
    if (sV.test(stemmed)) {
      w = stemmed;
      re2 = /(at|bl|iz)$/; re3 = /([^aeiouylsz])\1$/; re4 = new RegExp('^' + C + v + '[^aeiouwxy]$');
      if (re2.test(w)) w += 'e'; else if (re3.test(w)) w = w.replace(/.$/, ''); else if (re4.test(w)) w += 'e';
    }
  }
  // Step 1c
  re = /^(.+?)y$/;
  if (re.test(w)) { const fp = re.exec(w); stemmed = fp[1]; if (sV.test(stemmed)) w = stemmed + 'i'; }
  // Step 2
  re = /^(.+?)(ational|tional|enci|anci|izer|bli|alli|entli|eli|ousli|ization|ation|ator|alism|iveness|fulness|ousness|aliti|iviti|biliti|logi)$/;
  if (re.test(w)) { const fp = re.exec(w); stemmed = fp[1]; suffix = fp[2]; if (mgr0.test(stemmed)) w = stemmed + step2list[suffix]; }
  // Step 3
  re = /^(.+?)(icate|ative|alize|iciti|ical|ful|ness)$/;
  if (re.test(w)) { const fp = re.exec(w); stemmed = fp[1]; suffix = fp[2]; if (mgr0.test(stemmed)) w = stemmed + step3list[suffix]; }
  // Step 4
  re = /^(.+?)(al|ance|ence|er|ic|able|ible|ant|ement|ment|ent|ou|ism|ate|iti|ous|ive|ize)$/;
  re2 = /^(.+?)(s|t)(ion)$/;
  if (re.test(w)) { const fp = re.exec(w); stemmed = fp[1]; if (mgr1.test(stemmed)) w = stemmed; }
  else if (re2.test(w)) { const fp = re2.exec(w); stemmed = fp[1] + fp[2]; if (mgr1.test(stemmed)) w = stemmed; }
  // Step 5
  re = /^(.+?)e$/;
  if (re.test(w)) {
    const fp = re.exec(w); stemmed = fp[1]; re = mgr1; re2 = meq1; re3 = new RegExp('^' + C + v + '[^aeiouwxy]$');
    if (re.test(stemmed) || (re2.test(stemmed) && !re3.test(stemmed))) w = stemmed;
  }
  re = /ll$/;
  if (re.test(w) && mgr1.test(w)) w = w.replace(/.$/, '');
  if (firstch === 'y') w = 'y' + w.slice(1);
  return w;
}
