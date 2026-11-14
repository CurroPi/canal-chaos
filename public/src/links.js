// The one place that opens a web page (the privacy page, a sponsor's website).
// In a browser it opens a new tab. The phone apps will swap this for the in-app browser (milestone: app stores).
export function openLink(url) {
  window.open(url, '_blank', 'noopener');
}
