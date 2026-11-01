(() => {
  'use strict';

  // Reactions are created synchronously by article-actions.js, which loads first.
  const reactions = document.querySelector('.dm-end-actions');
  if (!reactions || !/^\/blog\/[a-z0-9][a-z0-9-]{0,95}\/?$/.test(location.pathname)) return;

  const normalize = (value) => String(value).normalize('NFKC').toLocaleLowerCase('ko-KR').replace(/\s+/g, ' ').trim();
  const generic = new Set(['etf', '투자 위험', '생활금융', '주식 투자', '투자 정보', '수익률', '절세']);
  const goalAnchors = new Set(['경제적 자유', '재무목표']);
  const goalTopics = new Set(['적립식 투자', '배당투자', '비상금']);
  const topicGroups = [
    new Set(['ai 투자', 'ai 반도체']),
    new Set(['per', 'pbr']),
    new Set(['종합소득세', '양도소득세', '배당소득세']),
    new Set(['isa', '청년형 isa', '비과세', '비과세종합저축'])
  ];
  const tagsOf = (article) => new Set((Array.isArray(article.primary_tags) && article.primary_tags.length
    ? article.primary_tags : Array.isArray(article.tags) ? article.tags : []).map(normalize).filter(Boolean));
  const intersects = (tags, candidates) => [...tags].some((tag) => candidates.has(tag));
  const canonicalPath = (path) => path.replace(/\/?$/, '/');

  const index = globalThis.dmBlogTagsIndex || (globalThis.dmBlogTagsIndex = fetch('/blog/tags-index.json')
    .then((response) => {
      if (!response.ok) throw new Error('Article index unavailable');
      return response.json();
    }));
  index.then(({articles}) => {
      if (!Array.isArray(articles)) return;
      const currentPath = canonicalPath(location.pathname);
      const valid = articles.filter((article) => article && typeof article.path === 'string' &&
        /^\/blog\/[a-z0-9][a-z0-9-]{0,95}\/$/.test(article.path) &&
        typeof article.title === 'string' && article.title.trim());
      const current = valid.find((article) => article.path === currentPath);
      if (!current) return;
      const currentTags = tagsOf(current);
      const currentTitle = normalize(current.title).replace(/\s+/g, '');
      const counts = new Map();
      valid.forEach((article) => tagsOf(article).forEach((tag) => counts.set(tag, (counts.get(tag) || 0) + 1)));
      const seen = new Set([currentPath]);
      const ranked = valid.map((article, order) => {
        const tags = tagsOf(article);
        const title = normalize(article.title).replace(/\s+/g, '');
        let score = 0;
        currentTags.forEach((tag) => {
          if (tags.has(tag) && !generic.has(tag)) score += 1 + Math.log((valid.length + 1) / ((counts.get(tag) || 0) + 1));
          else if (!generic.has(tag) && tag.length >= 2 && title.includes(tag.replace(/\s+/g, ''))) score += 0.8;
        });
        tags.forEach((tag) => {
          if (!currentTags.has(tag) && !generic.has(tag) && tag.length >= 2 && currentTitle.includes(tag.replace(/\s+/g, ''))) score += 0.8;
        });
        // Financial-goal articles can lead to saving and investing guides even
        // when their editorial tags use different but related terms.
        if ((intersects(currentTags, goalAnchors) && intersects(tags, goalTopics)) ||
            (intersects(tags, goalAnchors) && intersects(currentTags, goalTopics))) score += 1;
        topicGroups.forEach((group) => {
          if (intersects(currentTags, group) && intersects(tags, group)) score += 0.75;
        });
        return {article, order, score};
      }).filter(({article, score}) => {
        if (!score || seen.has(article.path)) return false;
        seen.add(article.path);
        return true;
      }).sort((a, b) => b.score - a.score || a.order - b.order).slice(0, 4);
      if (!ranked.length) return;

      const section = document.createElement('aside');
      section.className = 'dm-related-posts';
      section.setAttribute('aria-labelledby', 'dm-related-heading');
      const title = document.createElement('h2');
      title.id = 'dm-related-heading';
      title.textContent = '함께 읽으면 좋은 글';
      const list = document.createElement('ul');
      ranked.forEach(({article}) => {
        const item = document.createElement('li');
        const link = document.createElement('a');
        link.href = article.path;
        const label = document.createElement('span');
        label.textContent = article.title;
        const arrow = document.createElement('span');
        arrow.className = 'dm-related-arrow';
        arrow.setAttribute('aria-hidden', 'true');
        arrow.textContent = '→';
        link.append(label, arrow);
        item.append(link);
        list.append(item);
      });
      section.append(title, list);
      reactions.before(section);
    })
    .catch(() => {});
})();
