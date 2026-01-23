import * as d3 from 'd3';

export const getLabelWrapConfig = (nodeType) => {
  if (nodeType === 'trunk') return { maxWidth: 220, maxLines: 20, lineHeight: 1.15 };
  if (nodeType === 'root') return { maxWidth: 140, maxLines: 20, lineHeight: 1.15 };
  if (nodeType === 'branch') return { maxWidth: 150, maxLines: 20, lineHeight: 1.15 };
  return { maxWidth: 130, maxLines: 20, lineHeight: 1.15 }; // fruit
};

export const wrapSvgText = (textSel, { maxWidth, maxLines, lineHeight }) => {
  textSel.each(function () {
    const text = d3.select(this);
    const raw = text.text() || '';
    const words = raw.split(/\s+/).filter(Boolean);

    const fontSize = parseFloat(text.attr('font-size')) || 12;
    const lineHeightPx = Math.max(1, fontSize * (lineHeight || 1.15));

    const fits = (tspan, value) => {
      tspan.text(value);
      return tspan.node()?.getComputedTextLength?.() <= maxWidth;
    };

    const splitLongWord = (probeTspan, word) => {
      const parts = [];
      let remaining = word;
      while (remaining.length > 0) {
        let lo = 1;
        let hi = remaining.length;
        let best = 1;
        while (lo <= hi) {
          const mid = Math.floor((lo + hi) / 2);
          if (fits(probeTspan, remaining.slice(0, mid))) {
            best = mid;
            lo = mid + 1;
          } else {
            hi = mid - 1;
          }
        }
        parts.push(remaining.slice(0, best));
        remaining = remaining.slice(best);
      }
      return parts;
    };

    text.text(null);

    // Keep existing dy on the <text>. tspans start at dy=0 and then step down in px.
    let tspan = text.append('tspan').attr('x', 0).attr('dy', 0);
    let line = [];
    let lineCount = 1;

    const probe = text.append('tspan').attr('x', 0).attr('dy', 0).style('opacity', 0);

    const commitLine = () => {
      tspan.text(line.join(' '));
      line = [];
      lineCount += 1;
      if (maxLines && lineCount > maxLines) return false;
      tspan = text.append('tspan').attr('x', 0).attr('dy', lineHeightPx);
      return true;
    };

    for (const word of words) {
      const test = line.length ? `${line.join(' ')} ${word}` : word;

      if (fits(probe, test)) {
        line.push(word);
        continue;
      }

      if (line.length) {
        if (!commitLine()) break;
      }

      // Word may still not fit on an empty line => split it.
      if (!fits(probe, word)) {
        const parts = splitLongWord(probe, word);
        for (const part of parts) {
          line = [part];
          if (!commitLine()) break;
        }
        continue;
      }

      line.push(word);
    }

    if (line.length) tspan.text(line.join(' '));

    probe.remove();
    text
      .selectAll('tspan')
      .filter(function () { return !this.textContent; })
      .remove();
  });
};

