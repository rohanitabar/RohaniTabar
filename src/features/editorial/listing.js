function newestFirst(items) {
  return [...items].sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0));
}

function getSelectedTag(search) {
  return new URLSearchParams(search).get('tag');
}

function matchesTag(post, tag) {
  return Object.values(post.tags || {}).some((tags) => Array.isArray(tags) && tags.includes(tag));
}

function getPublishedPosts(posts) {
  return newestFirst(posts.filter((post) => post.published !== false));
}

function filterPostsByTag(posts, tag) {
  return tag ? posts.filter((post) => matchesTag(post, tag)) : posts;
}

function getListingCover(route, data, search = '') {
  if (route === '/blog') {
    const posts = getPublishedPosts(data?.posts || []);
    return filterPostsByTag(posts, getSelectedTag(search))[0]?.image;
  }

  if (route === '/projects' || route === '/featured-projects') {
    const projects = data?.projects || [];
    const first = route === '/projects' ? projects[0] : projects.find((project) => project.featured !== false);
    return first?.displayImage || first?.image;
  }

  return undefined;
}

module.exports = { filterPostsByTag, getListingCover, getPublishedPosts, getSelectedTag, newestFirst };
