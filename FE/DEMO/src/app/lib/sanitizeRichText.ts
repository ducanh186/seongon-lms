const allowedTags = new Set(['P', 'BR', 'H2', 'H3', 'STRONG', 'EM', 'UL', 'OL', 'LI', 'A', 'IMG', 'BLOCKQUOTE']);

export function sanitizeRichText(value: string, resolveUrl: (value: string) => string = (url) => url): string {
  if (typeof DOMParser === 'undefined') return value.replace(/<script[\s\S]*?<\/script>/gi, '');

  const document = new DOMParser().parseFromString(`<div>${value}</div>`, 'text/html');
  const root = document.body.firstElementChild;
  if (!root) return '';

  root.querySelectorAll('script,style,iframe,object,embed,form,link,meta').forEach((node) => node.remove());
  root.querySelectorAll('*').forEach((element) => {
    if (!allowedTags.has(element.tagName)) {
      element.replaceWith(...Array.from(element.childNodes));
      return;
    }

    Array.from(element.attributes).forEach((attribute) => {
      if (attribute.name.toLowerCase().startsWith('on') || attribute.name.toLowerCase() === 'style') {
        element.removeAttribute(attribute.name);
      }
    });

    if (element.tagName === 'IMG') {
      const src = element.getAttribute('src') ?? '';
      if (!isSafeUrl(src)) element.remove();
      else element.setAttribute('src', resolveUrl(src));
      Array.from(element.attributes).forEach((attribute) => { if (!['src', 'alt'].includes(attribute.name)) element.removeAttribute(attribute.name); });
    }

    if (element.tagName === 'A') {
      const href = element.getAttribute('href') ?? '';
      if (!isSafeUrl(href)) element.removeAttribute('href');
      else element.setAttribute('href', href);
      element.setAttribute('rel', 'noreferrer');
      element.setAttribute('target', '_blank');
      Array.from(element.attributes).forEach((attribute) => { if (!['href', 'rel', 'target'].includes(attribute.name)) element.removeAttribute(attribute.name); });
    }
  });

  return root.innerHTML;
}

function isSafeUrl(value: string): boolean {
  return (value.startsWith('/') && !value.startsWith('//')) || /^https?:\/\//i.test(value);
}
