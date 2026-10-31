(() => {
  const card = document.getElementById('ai-traffic-card');
  const number = document.getElementById('ai-traffic-sessions');
  if (!card || !number) return;

  fetch('/blog/ai-traffic.json', {cache:'no-cache'})
    .then(response => {
      if (!response.ok) throw new Error('AI traffic unavailable');
      return response.json();
    })
    .then(data => {
      const updated = Date.parse(data.updatedAt);
      if (!Number.isSafeInteger(data.sessions) || data.sessions < 100 || data.periodDays !== 28 ||
          !Number.isFinite(updated) || updated > Date.now() + 3600000 || Date.now() - updated > 7 * 86400000) return;
      number.textContent = data.sessions.toLocaleString('ko-KR');
      card.hidden = false;
    })
    .catch(() => {});
})();
