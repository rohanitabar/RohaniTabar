const sectionPaths = {
  about: '/about',
  experience: '/experience',
  skills: '/skills',
  projects: '/featured-projects',
  blog: '/latest-posts',
  contact: '/contact'
};

const sectionIdsByPath = Object.fromEntries(Object.entries(sectionPaths).map(([id, path]) => [path, id]));

module.exports = { sectionPaths, sectionIdsByPath };
